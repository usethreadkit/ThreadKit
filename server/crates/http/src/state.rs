use anyhow::Result;
use moka::future::Cache;
use std::sync::Arc;
use std::time::Duration;
use threadkit_common::{redis::RedisClient, Config, ModerationClient, StorageClient};
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
    pub storage: Option<Arc<StorageClient>>,
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

        // Initialize S3 storage client if enabled
        let storage = if let Some(s3_config) = &config.s3 {
            match StorageClient::new(s3_config).await {
                Ok(client) => {
                    tracing::info!("S3 storage enabled: {}", s3_config.bucket);
                    Some(Arc::new(client))
                }
                Err(e) => {
                    tracing::warn!("Failed to initialize S3 storage: {}", e);
                    None
                }
            }
        } else {
            tracing::info!("S3 storage not configured");
            None
        };

        // In standalone mode, look up site from API key
        if let Some(standalone) = config.standalone() {
            // Look up site config by API key
            let existing_site = redis.get_site_config_by_api_key(&standalone.project_id_public).await?;

            if existing_site.is_none() {
                // Site not found - this could be:
                // 1. First run without using --create-site
                // 2. Redis was cleared
                // 3. Wrong API keys in .env
                anyhow::bail!(
                    "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
                     Site not found in Redis for the provided API key.\n\n\
                     API Key: {}\n\n\
                     This can happen if:\n\
                       1. This is a fresh installation (create a site first)\n\
                       2. Redis was cleared and needs re-initialization\n\
                       3. The API keys in your .env are incorrect\n\n\
                     To create a new site, run:\n\
                       threadkit-http --create-site NAME DOMAIN\n\n\
                     Then add the generated API keys to your .env file.\n\
                     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
                    standalone.project_id_public
                );
            }

            let existing = existing_site.unwrap();

            // Verify both API keys match
            if existing.project_id_public != standalone.project_id_public
                || existing.project_id_secret != standalone.project_id_secret {
                anyhow::bail!(
                    "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\
                     API key mismatch!\n\n\
                     The API keys in your .env don't match the ones stored in Redis.\n\n\
                     .env public:   {}\n\
                     Redis public:  {}\n\n\
                     .env secret:   {}\n\
                     Redis secret:  {}\n\n\
                     Please update your .env with the correct API keys.\n\
                     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n",
                    standalone.project_id_public,
                    existing.project_id_public,
                    standalone.project_id_secret,
                    existing.project_id_secret
                );
            }

            // In standalone mode, we don't modify site settings on boot.
            // All settings are managed via --create-site and --edit-site commands.
            // NOTE: OAuth methods are filtered at runtime in auth_methods() based on whether
            // secrets are configured, so we don't need to update the settings here.
            tracing::info!("Loaded site config from Redis: {} ({})", existing.name, existing.id);
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
            storage,
            etag_cache,
        })
    }
}
