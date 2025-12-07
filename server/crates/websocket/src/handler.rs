//! WebSocket connection handler.

use axum::extract::ws::{Message, WebSocket};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tokio::sync::broadcast;
use uuid::Uuid;

use threadkit_common::{
    auth,
    types::{ApiKeyInfo, ApiKeyType, UserPublic},
};

use crate::{
    messages::{ClientMessage, ClientRpcMessage, ServerMessage},
    state::WsState,
};

/// Configuration for connection handling
struct ConnectionConfig {
    /// Max messages per second per connection
    rate_limit_per_sec: u32,
    /// Idle timeout in seconds
    idle_timeout_secs: u64,
    /// Typing debounce in milliseconds
    typing_debounce_ms: u64,
    /// Max pages a client can subscribe to
    max_subscriptions: usize,
}

impl Default for ConnectionConfig {
    fn default() -> Self {
        Self {
            rate_limit_per_sec: 10,
            idle_timeout_secs: 300, // 5 minutes
            typing_debounce_ms: 500,
            max_subscriptions: 10,
        }
    }
}

/// Handle an incoming WebSocket connection
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

    let site_id = site_info.site_id;

    // Track connection
    state.connection_opened(site_id);

    // Validate JWT token if provided
    let user_id = if let Some(ref token) = token {
        match auth::verify_token(token, &state.config.jwt_secret) {
            Ok(claims) if claims.site_id == site_info.site_id => Some(claims.sub),
            _ => None,
        }
    } else {
        None
    };

    // Get user info for presence (via batcher)
    let user_public: Option<UserPublic> = if let Some(uid) = user_id {
        state.batcher.get_user(uid).await.map(UserPublic::from)
    } else {
        None
    };

    // Run the connection loop
    run_connection(socket, state.clone(), site_id, user_id, user_public).await;

    // Track disconnection
    state.connection_closed(site_id);
}

async fn run_connection(
    socket: WebSocket,
    state: WsState,
    site_id: Uuid,
    user_id: Option<Uuid>,
    user_public: Option<UserPublic>,
) {
    let config = ConnectionConfig::default();
    let (mut sender, mut receiver) = socket.split();

    // Send connected message
    if let Ok(json) = ServerMessage::connected(user_id).to_json() {
        let _ = sender.send(Message::Text(json.into())).await;
        state.message_sent();
    }

    // Connection state
    let mut subscribed_pages: HashSet<Uuid> = HashSet::new();
    let mut page_receivers: Vec<(Uuid, broadcast::Receiver<ServerMessage>)> = Vec::new();
    let mut last_activity = Instant::now();
    let mut last_typing: HashMap<Uuid, Instant> = HashMap::new();
    let mut messages_this_second = 0u32;
    let mut second_start = Instant::now();

    // Get hour key for analytics
    let hour_key = Utc::now().format("%Y%m%d%H").to_string();

    // Track unique user if authenticated
    if let Some(uid) = user_id {
        state.batcher.queue_unique_user(site_id, hour_key.clone(), uid);
    }

    loop {
        tokio::select! {
            // Handle incoming WebSocket messages
            msg = receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        state.message_received();

                        // Rate limit check
                        if second_start.elapsed() >= Duration::from_secs(1) {
                            messages_this_second = 0;
                            second_start = Instant::now();
                        }
                        messages_this_second += 1;

                        if messages_this_second > config.rate_limit_per_sec {
                            if let Ok(json) = ServerMessage::error("rate_limit", "Too many messages").to_json() {
                                let _ = sender.send(Message::Text(json.into())).await;
                                state.message_sent();
                            }
                            continue;
                        }

                        last_activity = Instant::now();

                        // Parse and handle message
                        if let Ok(rpc) = serde_json::from_str::<ClientRpcMessage>(&text) {
                            if let Ok(client_msg) = ClientMessage::from_rpc(rpc) {
                                // Track message for analytics
                                state.batcher.queue_message_count(site_id, hour_key.clone());

                                handle_client_message(
                                    &state,
                                    &mut sender,
                                    &mut subscribed_pages,
                                    &mut page_receivers,
                                    &mut last_typing,
                                    client_msg,
                                    user_id,
                                    user_public.as_ref(),
                                    site_id,
                                    &config,
                                ).await;
                            } else {
                                if let Ok(json) = ServerMessage::error("invalid_method", "Unknown method").to_json() {
                                    let _ = sender.send(Message::Text(json.into())).await;
                                    state.message_sent();
                                }
                            }
                        } else {
                            if let Ok(json) = ServerMessage::error("invalid_json", "Invalid JSON-RPC message").to_json() {
                                let _ = sender.send(Message::Text(json.into())).await;
                                state.message_sent();
                            }
                        }
                    }
                    Some(Ok(Message::Ping(data))) => {
                        let _ = sender.send(Message::Pong(data)).await;
                        last_activity = Instant::now();
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        break;
                    }
                    _ => {}
                }
            }

            // Handle broadcast messages from subscribed pages (check every 10ms)
            _ = tokio::time::sleep(Duration::from_millis(10)) => {
                for (_page_id, rx) in page_receivers.iter_mut() {
                    while let Ok(msg) = rx.try_recv() {
                        if let Ok(json) = msg.to_json() {
                            let _ = sender.send(Message::Text(json.into())).await;
                            state.message_sent();
                        }
                    }
                }

                // Check idle timeout
                if last_activity.elapsed() > Duration::from_secs(config.idle_timeout_secs) {
                    tracing::debug!("Connection timed out due to inactivity");
                    break;
                }
            }
        }
    }

    // Cleanup: remove presence from all subscribed pages
    if let Some(uid) = user_id {
        for page_id in subscribed_pages {
            state.batcher.queue_presence_remove(page_id, uid);

            // Broadcast user left
            state.broadcast(
                page_id,
                ServerMessage::user_left(page_id, uid),
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
    last_typing: &mut HashMap<Uuid, Instant>,
    message: ClientMessage,
    user_id: Option<Uuid>,
    user_public: Option<&UserPublic>,
    _site_id: Uuid,
    config: &ConnectionConfig,
) {
    match message {
        ClientMessage::Subscribe { page_id } => {
            // Check subscription limit
            if subscribed_pages.len() >= config.max_subscriptions {
                if let Ok(json) = ServerMessage::error("subscription_limit", "Too many subscriptions").to_json() {
                    let _ = sender.send(Message::Text(json.into())).await;
                    state.message_sent();
                }
                return;
            }

            if !subscribed_pages.contains(&page_id) {
                subscribed_pages.insert(page_id);

                // Subscribe to broadcast channel
                let rx = state.subscribe(page_id);
                page_receivers.push((page_id, rx));

                // Add presence if authenticated (via batcher)
                if let Some(uid) = user_id {
                    state.batcher.queue_presence_add(page_id, uid);

                    // Broadcast user joined
                    if let Some(user) = user_public {
                        state.broadcast(
                            page_id,
                            ServerMessage::user_joined(page_id, user.clone()),
                        );
                    }
                }

                // Send current presence (via batcher)
                let presence_ids = state.batcher.get_presence(page_id).await;
                let mut users = Vec::new();
                for uid in presence_ids {
                    if let Some(user) = state.batcher.get_user(uid).await {
                        users.push(UserPublic::from(user));
                    }
                }

                let msg = ServerMessage::presence(page_id, users);
                if let Ok(json) = msg.to_json() {
                    let _ = sender.send(Message::Text(json.into())).await;
                    state.message_sent();
                }
            }
        }

        ClientMessage::Unsubscribe { page_id } => {
            subscribed_pages.remove(&page_id);
            page_receivers.retain(|(pid, _)| *pid != page_id);

            // Remove presence if authenticated (via batcher)
            if let Some(uid) = user_id {
                state.batcher.queue_presence_remove(page_id, uid);

                state.broadcast(
                    page_id,
                    ServerMessage::user_left(page_id, uid),
                );
            }
        }

        ClientMessage::Typing { page_id, reply_to } => {
            if let (Some(uid), Some(user)) = (user_id, user_public) {
                if subscribed_pages.contains(&page_id) {
                    // Debounce: ignore if sent less than debounce_ms ago for this page
                    let should_send = match last_typing.get(&page_id) {
                        Some(last) => last.elapsed() >= Duration::from_millis(config.typing_debounce_ms),
                        None => true,
                    };

                    if should_send {
                        last_typing.insert(page_id, Instant::now());

                        // Queue typing update (via batcher)
                        let timestamp = Utc::now().timestamp_millis();
                        state.batcher.queue_typing(page_id, uid, reply_to, timestamp);

                        // Broadcast to local subscribers immediately
                        state.broadcast(
                            page_id,
                            ServerMessage::typing(page_id, user.clone(), reply_to),
                        );
                    }
                }
            }
        }

        ClientMessage::Ping => {
            let msg = ServerMessage::pong();
            if let Ok(json) = msg.to_json() {
                let _ = sender.send(Message::Text(json.into())).await;
                state.message_sent();
            }
        }
    }
}

/// Validate an API key
async fn validate_api_key(state: &WsState, api_key: &str) -> Result<ApiKeyInfo, String> {
    // Check cache first (via batcher for batching)
    if let Some(info) = state.batcher.get_cached_api_key(api_key).await {
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
