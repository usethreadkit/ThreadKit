use anyhow::Result;
use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;
use threadkit_common::{redis::RedisClient, Config, ModerationClient};
use uuid::Uuid;

/// In-memory cache for page ETags (updated_at timestamps)
/// Key: page_id (Uuid), Value: updated_at timestamp (i64)
/// Max 1M entries, expires after 5 minutes of inactivity
pub type ETagCache = Cache<Uuid, i64>;

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub redis: Arc<RedisClient>,
    pub moderation: Arc<ModerationClient>,
    /// In-memory cache for page ETags - avoids Redis reads for unchanged pages
    pub etag_cache: ETagCache,
}

impl AppState {
    /// Publish an event to Redis Pub/Sub for WebSocket servers to relay
    ///
    /// Events are published to `threadkit:page:{page_id}:events`
    pub async fn publish_event(&self, page_id: uuid::Uuid, event_type: &str, data: serde_json::Value) {
        let channel = format!("threadkit:page:{}:events", page_id);
        let message = serde_json::json!({
            "type": event_type,
            "page_id": page_id,
            "data": data
        });

        if let Err(e) = self.redis.publish(&channel, &message.to_string()).await {
            tracing::warn!("Failed to publish event to Redis: {}", e);
        }
    }

    pub async fn new(config: Config) -> Result<Self> {
        let redis = RedisClient::new(&config.redis_url).await?;
        tracing::info!("Connected to Redis");

        // Initialize moderation client
        let moderation = ModerationClient::new(config.content_moderation.clone())?;
        if moderation.is_enabled() {
            tracing::info!("Content moderation enabled");
        }

        // In standalone mode, verify site exists in Redis and update settings
        if let Some(standalone) = config.standalone() {
            use threadkit_common::types::{AuthSettings, ModerationMode, ContentModerationSettings};
            use threadkit_common::config::ModerationMode as ConfigModerationMode;

            // Check if site exists in Redis
            let existing_site = redis.get_site_config(standalone.site_id).await?;

            if existing_site.is_none() {
                // Site not found - this could be:
                // 1. First run without using --create-site
                // 2. Redis was cleared
                // 3. Wrong SITE_ID in .env
                anyhow::bail!(
                    "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
                     Site not found in Redis.\n\n\
                     Site ID: {}\n\n\
                     This can happen if:\n\
                       1. This is a fresh installation (create a site first)\n\
                       2. Redis was cleared and needs re-initialization\n\
                       3. The SITE_ID in your .env is incorrect\n\n\
                     To create a new site, run:\n\
                       threadkit-http --create-site NAME DOMAIN\n\n\
                     Then update your .env with the generated site ID.\n\
                     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
                    standalone.site_id
                );
            }

            let mut existing = existing_site.unwrap();

            // Verify API keys match what's in Redis
            if existing.project_id_public != standalone.project_id_public {
                anyhow::bail!(
                    "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
                     API key mismatch!\n\n\
                     The PROJECT_ID_PUBLIC in your .env doesn't match the one stored in Redis.\n\n\
                     .env:   {}\n\
                     Redis:  {}\n\n\
                     Please update your .env with the correct API key.\n\
                     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
                    standalone.project_id_public,
                    existing.project_id_public
                );
            }

            // Update settings that can change at runtime (OAuth providers, moderation, etc.)
            // but never touch the keys - those are immutable
            existing.name = standalone.site_name.clone();
            existing.domain = standalone.site_domain.clone();
            existing.settings.moderation_mode = match standalone.moderation_mode {
                ConfigModerationMode::None => ModerationMode::None,
                ConfigModerationMode::Pre => ModerationMode::Pre,
                ConfigModerationMode::Post => ModerationMode::Post,
            };
            existing.settings.auth = AuthSettings {
                google: config.oauth.google.is_some(),
                github: config.oauth.github.is_some(),
                email: true,
                phone: false,
                anonymous: false,
                ethereum: false,
                solana: false,
            };
            existing.settings.content_moderation = if config.content_moderation.enabled {
                ContentModerationSettings {
                    enabled: true,
                    ..Default::default()
                }
            } else {
                ContentModerationSettings::default()
            };
            existing.settings.allowed_origins = standalone.allowed_origins.clone();

            redis.set_site_config(&existing).await?;
            tracing::info!("Updated site config in Redis");
        }

        // Build ETag cache: 1M entries max, 5 min TTI
        let etag_cache = Cache::builder()
            .max_capacity(1_000_000)
            .time_to_idle(Duration::from_secs(300))
            .build();

        Ok(AppState {
            config: Arc::new(config),
            redis: Arc::new(redis),
            moderation: Arc::new(moderation),
            etag_cache,
        })
    }
}
