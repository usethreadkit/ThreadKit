//! Redis Pub/Sub subscriber for receiving events from the HTTP server.
//!
//! Subscribes to `threadkit:page:*:events` and relays messages to in-memory broadcast channels.

use dashmap::DashMap;
use fred::prelude::*;
use fred::types::Message as RedisMessage;
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::task::JoinHandle;
use uuid::Uuid;

use crate::messages::ServerMessage;

/// Event payload from Redis Pub/Sub
/// Note: page_id is extracted from the Redis channel name (threadkit:page:{page_id}:events)
/// rather than from the event payload, so it's not included in this struct.
#[derive(Debug, serde::Deserialize)]
struct PubSubEvent {
    #[serde(rename = "type")]
    event_type: String,
    data: serde_json::Value,
}

/// Redis Pub/Sub subscriber
///
/// Subscribes to Redis pub/sub channels and relays events to in-memory broadcast channels.
/// Uses fred's SubscriberClient for efficient pub/sub handling.
pub struct PubSubSubscriber {
    redis_url: String,
    page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
}

impl PubSubSubscriber {
    /// Create a new subscriber
    pub fn new(
        redis_url: String,
        page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
    ) -> Self {
        Self {
            redis_url,
            page_channels,
        }
    }

    /// Start the subscriber loop
    ///
    /// This subscribes to `threadkit:page:*:events` using pattern subscription
    /// and relays received messages to the appropriate broadcast channels.
    pub fn start(self) -> JoinHandle<()> {
        tokio::spawn(async move {
            loop {
                if let Err(e) = self.run().await {
                    tracing::error!("PubSub subscriber error: {}, reconnecting in 5s...", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                }
            }
        })
    }

    async fn run(&self) -> anyhow::Result<()> {
        // Create a dedicated subscriber client
        let config = Config::from_url(&self.redis_url)?;
        let subscriber = Builder::from_config(config).build_subscriber_client()?;

        // Initialize the connection
        subscriber.init().await?;
        tracing::info!("PubSub subscriber connected to Redis");

        // Get the message receiver before subscribing
        let mut message_rx = subscriber.message_rx();

        // Subscribe to all page events using pattern matching
        // Pattern: threadkit:page:*:events
        subscriber.psubscribe("threadkit:page:*:events").await?;
        tracing::info!("Subscribed to pattern: threadkit:page:*:events");

        // Spawn a task to manage re-subscriptions after reconnects
        subscriber.manage_subscriptions();

        // Process incoming messages
        while let Ok(message) = message_rx.recv().await {
            self.handle_message(&message);
        }

        tracing::warn!("PubSub message receiver closed");
        Ok(())
    }

    /// Handle a received pub/sub message
    fn handle_message(&self, message: &RedisMessage) {
        // Get the channel name (for pattern subscriptions, this is the actual channel that matched)
        let channel = message.channel.to_string();

        // Parse channel to extract page_id: "threadkit:page:{page_id}:events"
        let parts: Vec<&str> = channel.split(':').collect();
        if parts.len() != 4 || parts[0] != "threadkit" || parts[1] != "page" || parts[3] != "events" {
            tracing::debug!("Ignoring message from unexpected channel: {}", channel);
            return;
        }

        let page_id = match parts[2].parse::<Uuid>() {
            Ok(id) => id,
            Err(_) => {
                tracing::debug!("Failed to parse page_id from channel: {}", channel);
                return;
            }
        };

        // Get the message payload - convert Value to string
        let payload: String = match message.value.clone().convert() {
            Ok(s) => s,
            Err(_) => {
                tracing::debug!("Message value is not a string");
                return;
            }
        };

        // Parse event payload
        let event: PubSubEvent = match serde_json::from_str(&payload) {
            Ok(e) => e,
            Err(e) => {
                tracing::warn!("Failed to parse pub/sub event: {} - payload: {}", e, payload);
                return;
            }
        };

        // Convert to ServerMessage and broadcast
        let message = match event.event_type.as_str() {
            "new_comment" => {
                if let Ok(comment) = serde_json::from_value(event.data.get("comment").cloned().unwrap_or_default()) {
                    Some(ServerMessage::new_comment(page_id, comment))
                } else {
                    tracing::debug!("Failed to parse new_comment data");
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
                    _ => {
                        tracing::debug!("Failed to parse edit_comment data");
                        None
                    }
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
                    _ => {
                        tracing::debug!("Failed to parse vote_update data");
                        None
                    }
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

    /// Broadcast a message to a page's subscribers
    fn broadcast(&self, page_id: Uuid, message: ServerMessage) {
        if let Some(tx) = self.page_channels.get(&page_id) {
            match tx.send(message) {
                Ok(n) => {
                    tracing::trace!("Broadcast to {} receivers on page {}", n, page_id);
                }
                Err(_) => {
                    // No receivers - channel might be empty, that's ok
                }
            }
        } else {
            // No channel for this page - no one is subscribed, that's ok
            tracing::trace!("No broadcast channel for page {}", page_id);
        }
    }
}
