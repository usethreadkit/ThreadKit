use anyhow::Result;
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::broadcast;
use uuid::Uuid;

use threadkit_common::{redis::RedisClient, Config};

use crate::messages::ServerMessage;

#[derive(Clone)]
pub struct WsState {
    pub config: Arc<Config>,
    pub redis: Arc<RedisClient>,
    pub page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
}

impl WsState {
    pub async fn new(config: Config) -> Result<Self> {
        let redis = RedisClient::new(&config.redis_url).await?;
        tracing::info!("WebSocket server connected to Redis");

        Ok(WsState {
            config: Arc::new(config),
            redis: Arc::new(redis),
            page_channels: Arc::new(DashMap::new()),
        })
    }

    pub fn get_or_create_channel(&self, page_id: Uuid) -> broadcast::Sender<ServerMessage> {
        self.page_channels
            .entry(page_id)
            .or_insert_with(|| {
                let (tx, _) = broadcast::channel(1000);
                tx
            })
            .clone()
    }

    pub fn subscribe(&self, page_id: Uuid) -> broadcast::Receiver<ServerMessage> {
        self.get_or_create_channel(page_id).subscribe()
    }

    pub fn broadcast(&self, page_id: Uuid, message: ServerMessage) {
        if let Some(tx) = self.page_channels.get(&page_id) {
            let _ = tx.send(message);
        }
    }
}
