//! Redis Pub/Sub subscriber for receiving events from the HTTP server.
//!
//! Subscribes to `threadkit:page:*:events` and relays messages to in-memory broadcast channels.

use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::task::JoinHandle;
use uuid::Uuid;

use threadkit_common::redis::RedisClient;

use crate::messages::ServerMessage;

/// Event payload from Redis Pub/Sub
#[derive(Debug, serde::Deserialize)]
struct PubSubEvent {
    #[serde(rename = "type")]
    event_type: String,
    page_id: Uuid,
    data: serde_json::Value,
}

/// Redis Pub/Sub subscriber
///
/// Subscribes to Redis pub/sub channels and relays events to in-memory broadcast channels.
pub struct PubSubSubscriber {
    redis: Arc<RedisClient>,
    page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
}

impl PubSubSubscriber {
    /// Create a new subscriber
    pub fn new(
        redis: Arc<RedisClient>,
        page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
    ) -> Self {
        Self {
            redis,
            page_channels,
        }
    }

    /// Start the subscriber loop
    ///
    /// This subscribes to `threadkit:page:*:events` using pattern subscription
    /// and relays received messages to the appropriate broadcast channels.
    pub fn start(self) -> JoinHandle<()> {
        tokio::spawn(async move {
            if let Err(e) = self.run().await {
                tracing::error!("PubSub subscriber error: {}", e);
            }
        })
    }

    async fn run(&self) -> anyhow::Result<()> {
        // For now, we use a polling approach since fred's subscriber API
        // requires a separate subscriber client. In production, you'd want
        // to use fred's SubscriberClient for proper pub/sub.
        //
        // TODO: Implement proper Redis pub/sub using fred's SubscriberClient
        //
        // The current implementation relies on the HTTP server and WS server
        // sharing in-memory broadcast channels when running in the same process,
        // or using the batcher's publish queue when running separately.

        tracing::info!("PubSub subscriber started (using polling mode)");

        // Keep the task alive
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }
    }

    /// Broadcast a message to a page's subscribers
    #[allow(dead_code)]
    fn broadcast(&self, page_id: Uuid, message: ServerMessage) {
        if let Some(tx) = self.page_channels.get(&page_id) {
            let _ = tx.send(message);
        }
    }

    /// Handle a received pub/sub message
    #[allow(dead_code)]
    fn handle_message(&self, channel: &str, payload: &str) {
        // Parse channel to extract page_id: "threadkit:page:{page_id}:events"
        let parts: Vec<&str> = channel.split(':').collect();
        if parts.len() != 4 || parts[0] != "threadkit" || parts[1] != "page" || parts[3] != "events" {
            return;
        }

        let page_id = match parts[2].parse::<Uuid>() {
            Ok(id) => id,
            Err(_) => return,
        };

        // Parse event payload
        let event: PubSubEvent = match serde_json::from_str(payload) {
            Ok(e) => e,
            Err(e) => {
                tracing::warn!("Failed to parse pub/sub event: {}", e);
                return;
            }
        };

        // Convert to ServerMessage and broadcast
        let message = match event.event_type.as_str() {
            "new_comment" => {
                if let Ok(comment) = serde_json::from_value(event.data.get("comment").cloned().unwrap_or_default()) {
                    Some(ServerMessage::new_comment(page_id, comment))
                } else {
                    None
                }
            }
            "edit_comment" => {
                let comment_id = event.data.get("comment_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok());
                let content = event.data.get("content")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());
                let content_html = event.data.get("content_html")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string());

                match (comment_id, content, content_html) {
                    (Some(cid), Some(c), Some(ch)) => {
                        Some(ServerMessage::edit_comment(page_id, cid, c, ch))
                    }
                    _ => None,
                }
            }
            "delete_comment" => {
                event.data.get("comment_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .map(|cid| ServerMessage::delete_comment(page_id, cid))
            }
            "vote_update" => {
                let comment_id = event.data.get("comment_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok());
                let upvotes = event.data.get("upvotes")
                    .and_then(|v| v.as_i64());
                let downvotes = event.data.get("downvotes")
                    .and_then(|v| v.as_i64());

                match (comment_id, upvotes, downvotes) {
                    (Some(cid), Some(u), Some(d)) => {
                        Some(ServerMessage::vote_update(page_id, cid, u, d))
                    }
                    _ => None,
                }
            }
            _ => {
                tracing::debug!("Unknown event type: {}", event.event_type);
                None
            }
        };

        if let Some(msg) = message {
            self.broadcast(page_id, msg);
        }
    }
}
