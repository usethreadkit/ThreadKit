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
    pub async fn new(config: Config) -> Result<Self> {
        let redis = RedisClient::new(&config.redis_url).await?;
        tracing::info!("Connected to Redis");

        // Initialize moderation client
        let moderation = ModerationClient::new(config.content_moderation.clone())?;
        if moderation.is_enabled() {
            tracing::info!("Content moderation enabled");
        }

        // In standalone mode, ensure site config exists in Redis
        if let Some(standalone) = config.standalone() {
            use threadkit_common::types::{SiteConfig, SiteSettings, AuthSettings, DisplaySettings, ModerationMode, ContentModerationSettings, TurnstileSettings};
            use threadkit_common::config::ModerationMode as ConfigModerationMode;

            // Content moderation settings for standalone site
            let content_moderation_settings = if config.content_moderation.enabled {
                ContentModerationSettings {
                    enabled: true,
                    ..Default::default()
                }
            } else {
                ContentModerationSettings::default()
            };

            let site_config = SiteConfig {
                id: standalone.site_id,
                name: standalone.site_name.clone(),
                domain: standalone.site_domain.clone(),
                api_key_public: standalone.api_key_public.clone(),
                api_key_secret: standalone.api_key_secret.clone(),
                settings: SiteSettings {
                    moderation_mode: match standalone.moderation_mode {
                        ConfigModerationMode::None => ModerationMode::None,
                        ConfigModerationMode::Pre => ModerationMode::Pre,
                        ConfigModerationMode::Post => ModerationMode::Post,
                    },
                    auth: AuthSettings {
                        google: config.oauth.google.is_some(),
                        github: config.oauth.github.is_some(),
                        email: true,
                        phone: false,
                        anonymous: false,
                        ethereum: false,
                        solana: false,
                    },
                    display: DisplaySettings::default(),
                    require_verification: false,
                    auto_approve_verified: true,
                    rate_limits: Default::default(),
                    content_moderation: content_moderation_settings,
                    turnstile: TurnstileSettings::default(),
                    allowed_origins: standalone.allowed_origins.clone(),
                    posting_disabled: false,
                },
            };

            redis.set_site_config(&site_config).await?;
            tracing::info!("Initialized site config in Redis");
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
