//! WebSocket server state management.

use anyhow::Result;
use dashmap::DashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

use threadkit_common::{redis::RedisClient, Config};

use crate::batcher::RedisBatcher;
use crate::messages::ServerMessage;

/// WebSocket server state
#[derive(Clone)]
pub struct WsState {
    pub config: Arc<Config>,
    pub redis: Arc<RedisClient>,
    pub batcher: Arc<RedisBatcher>,
    /// Broadcast channels per page for real-time events
    pub page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
    /// Active connections per site (for analytics)
    pub connections_per_site: Arc<DashMap<Uuid, AtomicU64>>,

    // === Metrics ===
    pub active_connections: Arc<AtomicU64>,
    pub total_connections: Arc<AtomicU64>,
    pub total_messages_received: Arc<AtomicU64>,
    pub total_messages_sent: Arc<AtomicU64>,
}

impl WsState {
    /// Create a new WebSocket server state
    pub async fn new(config: Config) -> Result<Self> {
        let redis = Arc::new(RedisClient::new(&config.redis_url).await?);
        tracing::info!("WebSocket server connected to Redis");

        let batcher = RedisBatcher::new(Arc::clone(&redis), 20); // 20ms flush interval

        Ok(WsState {
            config: Arc::new(config),
            redis,
            batcher,
            page_channels: Arc::new(DashMap::new()),
            connections_per_site: Arc::new(DashMap::new()),
            active_connections: Arc::new(AtomicU64::new(0)),
            total_connections: Arc::new(AtomicU64::new(0)),
            total_messages_received: Arc::new(AtomicU64::new(0)),
            total_messages_sent: Arc::new(AtomicU64::new(0)),
        })
    }

    /// Get or create a broadcast channel for a page
    pub fn get_or_create_channel(&self, page_id: Uuid) -> broadcast::Sender<ServerMessage> {
        self.page_channels
            .entry(page_id)
            .or_insert_with(|| {
                let (tx, _) = broadcast::channel(1000);
                tx
            })
            .clone()
    }

    /// Subscribe to a page's broadcast channel
    pub fn subscribe(&self, page_id: Uuid) -> broadcast::Receiver<ServerMessage> {
        self.get_or_create_channel(page_id).subscribe()
    }

    /// Broadcast a message to all subscribers of a page
    pub fn broadcast(&self, page_id: Uuid, message: ServerMessage) {
        if let Some(tx) = self.page_channels.get(&page_id) {
            let _ = tx.send(message);
        }
    }

    // === Connection Tracking ===

    /// Increment active connection count
    pub fn connection_opened(&self, site_id: Uuid) {
        self.active_connections.fetch_add(1, Ordering::Relaxed);
        self.total_connections.fetch_add(1, Ordering::Relaxed);
        self.connections_per_site
            .entry(site_id)
            .or_insert_with(|| AtomicU64::new(0))
            .fetch_add(1, Ordering::Relaxed);
    }

    /// Decrement active connection count
    pub fn connection_closed(&self, site_id: Uuid) {
        self.active_connections.fetch_sub(1, Ordering::Relaxed);
        if let Some(counter) = self.connections_per_site.get(&site_id) {
            counter.fetch_sub(1, Ordering::Relaxed);
        }
    }

    /// Increment messages received count
    pub fn message_received(&self) {
        self.total_messages_received.fetch_add(1, Ordering::Relaxed);
    }

    /// Increment messages sent count
    pub fn message_sent(&self) {
        self.total_messages_sent.fetch_add(1, Ordering::Relaxed);
    }

    // === Metrics ===

    /// Get current metrics snapshot
    pub fn get_metrics(&self) -> Metrics {
        Metrics {
            active_connections: self.active_connections.load(Ordering::Relaxed),
            total_connections: self.total_connections.load(Ordering::Relaxed),
            total_messages_received: self.total_messages_received.load(Ordering::Relaxed),
            total_messages_sent: self.total_messages_sent.load(Ordering::Relaxed),
            batcher_flushes: self.batcher.flushes.load(Ordering::Relaxed),
            batcher_writes_batched: self.batcher.writes_batched.load(Ordering::Relaxed),
            batcher_reads_batched: self.batcher.reads_batched.load(Ordering::Relaxed),
            page_channels_count: self.page_channels.len() as u64,
        }
    }
}

/// Metrics snapshot
#[derive(Debug, Clone)]
pub struct Metrics {
    pub active_connections: u64,
    pub total_connections: u64,
    pub total_messages_received: u64,
    pub total_messages_sent: u64,
    pub batcher_flushes: u64,
    pub batcher_writes_batched: u64,
    pub batcher_reads_batched: u64,
    pub page_channels_count: u64,
}
