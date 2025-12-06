use axum::extract::ws::{Message, WebSocket};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashSet;
use tokio::sync::broadcast;
use uuid::Uuid;

use threadkit_common::{
    auth,
    types::{ApiKeyInfo, ApiKeyType, UserPublic},
};

use crate::{
    messages::{ClientMessage, ServerMessage},
    state::WsState,
};

pub async fn handle_socket(
    socket: WebSocket,
    state: WsState,
    api_key: String,
    token: Option<String>,
) {
    // Validate API key
    let site_info = match validate_api_key(&state, &api_key).await {
        Ok(info) => info,
        Err(e) => {
            tracing::warn!("Invalid API key: {}", e);
            return;
        }
    };

    // Validate JWT token if provided
    let user_id = if let Some(ref token) = token {
        match auth::verify_token(token, &state.config.jwt_secret) {
            Ok(claims) if claims.site_id == site_info.site_id => Some(claims.sub),
            _ => None,
        }
    } else {
        None
    };

    let (mut sender, mut receiver) = socket.split();

    // Send connected message
    let connected_msg = ServerMessage::Connected { user_id };
    if let Ok(json) = serde_json::to_string(&connected_msg) {
        let _ = sender.send(Message::Text(json.into())).await;
    }

    // Track subscriptions
    let mut subscribed_pages: HashSet<Uuid> = HashSet::new();
    let mut page_receivers: Vec<(Uuid, broadcast::Receiver<ServerMessage>)> = Vec::new();

    // Get user info for presence
    let user_public: Option<UserPublic> = if let Some(uid) = user_id {
        state.redis.get_user(uid).await.ok().flatten().map(UserPublic::from)
    } else {
        None
    };

    loop {
        tokio::select! {
            // Handle incoming WebSocket messages
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        if let Ok(client_msg) = serde_json::from_str::<ClientMessage>(&text) {
                            handle_client_message(
                                &state,
                                &mut sender,
                                &mut subscribed_pages,
                                &mut page_receivers,
                                client_msg,
                                user_id,
                                user_public.as_ref(),
                                site_info.site_id,
                            ).await;
                        }
                    }
                    Some(Ok(Message::Ping(data))) => {
                        let _ = sender.send(Message::Pong(data)).await;
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break;
                    }
                    _ => {}
                }
            }

            // Handle broadcast messages from subscribed pages
            _ = async {
                for (_page_id, rx) in page_receivers.iter_mut() {
                    if let Ok(msg) = rx.try_recv() {
                        if let Ok(json) = serde_json::to_string(&msg) {
                            let _ = sender.send(Message::Text(json.into())).await;
                        }
                    }
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            } => {}
        }
    }

    // Cleanup: remove presence from all subscribed pages
    if let Some(uid) = user_id {
        for page_id in subscribed_pages {
            let _ = state.redis.remove_presence(page_id, uid).await;

            // Broadcast user left
            state.broadcast(
                page_id,
                ServerMessage::UserLeft {
                    page_id,
                    user_id: uid,
                },
            );
        }
    }

    tracing::debug!("WebSocket connection closed");
}

async fn handle_client_message(
    state: &WsState,
    sender: &mut futures_util::stream::SplitSink<WebSocket, Message>,
    subscribed_pages: &mut HashSet<Uuid>,
    page_receivers: &mut Vec<(Uuid, broadcast::Receiver<ServerMessage>)>,
    message: ClientMessage,
    user_id: Option<Uuid>,
    user_public: Option<&UserPublic>,
    _site_id: Uuid,
) {
    match message {
        ClientMessage::Subscribe { page_id } => {
            if !subscribed_pages.contains(&page_id) {
                subscribed_pages.insert(page_id);

                // Subscribe to broadcast channel
                let rx = state.subscribe(page_id);
                page_receivers.push((page_id, rx));

                // Add presence if authenticated
                if let Some(uid) = user_id {
                    let _ = state.redis.add_presence(page_id, uid).await;

                    // Broadcast user joined
                    if let Some(user) = user_public {
                        state.broadcast(
                            page_id,
                            ServerMessage::UserJoined {
                                page_id,
                                user: user.clone(),
                            },
                        );
                    }
                }

                // Send current presence
                if let Ok(presence_ids) = state.redis.get_presence(page_id).await {
                    let mut users = Vec::new();
                    for uid in presence_ids {
                        if let Ok(Some(user)) = state.redis.get_user(uid).await {
                            users.push(UserPublic::from(user));
                        }
                    }

                    let msg = ServerMessage::Presence { page_id, users };
                    if let Ok(json) = serde_json::to_string(&msg) {
                        let _ = sender.send(Message::Text(json.into())).await;
                    }
                }
            }
        }

        ClientMessage::Unsubscribe { page_id } => {
            subscribed_pages.remove(&page_id);
            page_receivers.retain(|(pid, _)| *pid != page_id);

            // Remove presence if authenticated
            if let Some(uid) = user_id {
                let _ = state.redis.remove_presence(page_id, uid).await;

                state.broadcast(
                    page_id,
                    ServerMessage::UserLeft {
                        page_id,
                        user_id: uid,
                    },
                );
            }
        }

        ClientMessage::Typing { page_id } => {
            if let (Some(uid), Some(user)) = (user_id, user_public) {
                if subscribed_pages.contains(&page_id) {
                    let _ = state.redis.set_typing(page_id, uid).await;

                    state.broadcast(
                        page_id,
                        ServerMessage::Typing {
                            page_id,
                            user: user.clone(),
                        },
                    );
                }
            }
        }

        ClientMessage::StopTyping { page_id } => {
            if let Some(uid) = user_id {
                if subscribed_pages.contains(&page_id) {
                    state.broadcast(
                        page_id,
                        ServerMessage::StopTyping {
                            page_id,
                            user_id: uid,
                        },
                    );
                }
            }
        }

        ClientMessage::Ping => {
            let msg = ServerMessage::Pong;
            if let Ok(json) = serde_json::to_string(&msg) {
                let _ = sender.send(Message::Text(json.into())).await;
            }
        }
    }
}

async fn validate_api_key(state: &WsState, api_key: &str) -> Result<ApiKeyInfo, String> {
    // Check cache first
    if let Ok(Some(info)) = state.redis.get_cached_api_key(api_key).await {
        return Ok(info);
    }

    // In standalone mode, validate against config
    if let Some(standalone) = state.config.standalone() {
        let key_type = if api_key == standalone.api_key_public {
            ApiKeyType::Public
        } else if api_key == standalone.api_key_secret {
            ApiKeyType::Secret
        } else {
            return Err("Invalid API key".into());
        };

        let site_config = state
            .redis
            .get_site_config(standalone.site_id)
            .await
            .map_err(|e| e.to_string())?
            .ok_or("Site config not found")?;

        let info = ApiKeyInfo {
            site_id: standalone.site_id,
            key_type,
            settings: site_config.settings,
            domain: site_config.domain,
        };

        // Cache for future requests
        let _ = state.redis.cache_api_key(api_key, &info).await;

        return Ok(info);
    }

    // In SaaS mode, would call internal API here
    Err("Invalid API key".into())
}
