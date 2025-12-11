use axum::{http::HeaderName, http::HeaderValue, middleware, Router};
use axum_test::TestServer;
use redis::AsyncCommands;
use serde_json::json;
use testcontainers::{runners::AsyncRunner, ContainerAsync, ImageExt};
use testcontainers_modules::{minio::MinIO, redis::Redis};
use uuid::Uuid;

use threadkit_common::{
    config::{
        ContentModerationConfig, EmailConfig, RateLimitConfig, S3Config,
        StandaloneConfig, TurnstileConfig,
    },
    Config,
};
use threadkit_http::{middleware::rate_limit, routes, state::AppState};

pub struct TestContext {
    pub server: TestServer,
    pub project_id: String,
    pub secret_key: String,
    pub site_id: Uuid,
    #[allow(dead_code)]
    redis_container: ContainerAsync<Redis>,
    #[allow(dead_code)]
    pub minio_container: Option<ContainerAsync<MinIO>>,
    pub s3_config: Option<S3Config>,
}

impl TestContext {
    pub async fn new() -> Self {
        Self::new_with_s3(false).await
    }

    pub async fn new_with_s3(enable_s3: bool) -> Self {
        // Start Redis container
        let redis_container = Redis::default()
            .with_tag("7-alpine")
            .start()
            .await
            .expect("Failed to start Redis container");

        let host = redis_container.get_host().await.expect("Failed to get host");
        let port = redis_container
            .get_host_port_ipv4(6379)
            .await
            .expect("Failed to get port");

        // Optionally start MinIO container
        let (minio_container, s3_config) = if enable_s3 {
            let minio = MinIO::default()
                .start()
                .await
                .expect("Failed to start MinIO container");

            let minio_host = minio.get_host().await.expect("Failed to get MinIO host");
            let minio_port = minio
                .get_host_port_ipv4(9000)
                .await
                .expect("Failed to get MinIO port");

            let endpoint = format!("http://{}:{}", minio_host, minio_port);

            // Create buckets
            let access_key = "minioadmin";
            let secret_key = "minioadmin";

            let config = S3Config {
                endpoint: endpoint.clone(),
                region: "us-east-1".to_string(),
                bucket: "threadkit-media".to_string(),
                access_key_id: access_key.to_string(),
                secret_access_key: secret_key.to_string(),
                public_url: format!("{}/threadkit-media", endpoint),
            };

            (Some(minio), Some(config))
        } else {
            (None, None)
        };

        // Create config
        let site_id = Uuid::now_v7();
        let project_id = format!(
            "tk_pub_{}",
            Uuid::now_v7().to_string().replace('-', "")[..32].to_lowercase()
        );
        let secret_key = format!(
            "tk_sec_{}",
            Uuid::now_v7().to_string().replace('-', "")[..32].to_lowercase()
        );

        let redis_url = format!("redis://{}:{}", host, port);
        let redis_client = threadkit_common::redis::RedisClient::new(&redis_url)
            .await
            .expect("Failed to create Redis client");

        // Create SiteConfig and save it to Redis
        let mut settings = threadkit_common::types::SiteSettings::default();
        // Enable email auth by default for tests (but not anonymous)
        settings.auth.email = true;

        let site_config = threadkit_common::types::SiteConfig {
            id: site_id,
            name: "Test Site".to_string(), // Matches site_name in Config
            domain: "localhost".to_string(), // Matches site_domain in Config
            project_id_public: project_id.clone(),
            project_id_secret: secret_key.clone(),
            settings,
        };
        redis_client
            .set_site_config(&site_config)
            .await
            .expect("Failed to set site config in Redis");

        let config = Config {
            redis_url,
            http_host: "127.0.0.1".to_string(),
            http_port: 8080,
            ws_host: "127.0.0.1".to_string(),
            ws_port: 8081,
            jwt_secret: "test_jwt_secret_for_testing".to_string(),
            jwt_expiry_hours: 24,
            mode: threadkit_common::config::Mode::Standalone(StandaloneConfig {
                project_id_public: project_id.clone(),
                project_id_secret: secret_key.clone(),
                allowed_origins: vec![],
            }),
            oauth: Default::default(),
            rate_limit: RateLimitConfig {
                enabled: true,
                ip_writes_per_minute: 100,  // Higher limit for tests
                ip_reads_per_minute: 300,
                project_id_writes_per_minute: 1000,
                project_id_reads_per_minute: 5000,
                user_writes_per_minute: 100,  // Higher limit for tests
                user_reads_per_minute: 300,
                auth_attempts_per_hour: 100,  // Higher limit for tests
                ws_messages_per_sec: 100,
                otp_per_target_per_hour: 10,  // Higher limit for tests
                otp_per_ip_per_hour: 100,  // Higher limit for tests
                trusted_proxies: vec!["127.0.0.1".to_string()],
            },
            content_moderation: ContentModerationConfig::default(),
            email: EmailConfig::default(),
            turnstile: TurnstileConfig::default(),
            s3: s3_config.clone(),
            max_comment_length: 10_000,
            allow_localhost_origin: true,
        };

        // Create action logger (no JSON logging for tests)
        let action_logger = std::sync::Arc::new(
            threadkit_common::ActionLogger::new(None)
                .expect("Failed to create action logger")
        );

        // Create app state (this also initializes site config in Redis)
        let state = AppState::new(config, action_logger)
            .await
            .expect("Failed to create app state");

        // Build router
        let app = Router::new()
            .nest(
                "/v1",
                routes::router().layer(middleware::from_fn_with_state(state.clone(), rate_limit)),
            )
            .with_state(state);

        let server = TestServer::new(app).expect("Failed to create test server");

        Self {
            server,
            project_id,
            secret_key,
            site_id,
            redis_container,
            minio_container,
            s3_config,
        }
    }

    pub fn project_id_header(&self) -> (HeaderName, HeaderValue) {
        (
            HeaderName::from_static("projectid"),
            HeaderValue::from_str(&self.project_id).unwrap(),
        )
    }

    pub fn auth_header(token: &str) -> (HeaderName, HeaderValue) {
        (
            HeaderName::from_static("authorization"),
            HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
        )
    }

    /// Create a new user using admin endpoint (for testing)
    pub async fn register_user(&self, name: &str, email: &str, _password: &str) -> serde_json::Value {
        // Use secret key for admin endpoint (OwnerAccess extractor expects projectid header)
        let (key_name, key_value) = (
            HeaderName::from_static("projectid"),
            HeaderValue::from_str(&self.secret_key).unwrap(),
        );

        let response = self
            .server
            .post("/v1/admin/create-user")
            .add_header(key_name, key_value)
            .json(&json!({
                "name": name,
                "email": email
            }))
            .await;

        // Debug: Check status
        println!("Create user response status: {}", response.status_code());
        println!("Create user response body: {}", response.text());

        // Response contains { user: {...}, token: "..." }
        response.json::<serde_json::Value>()
    }

    /// Login and return auth response
    #[allow(dead_code)]
    pub async fn login(&self, email: &str, password: &str) -> serde_json::Value {
        let (key_name, key_value) = self.project_id_header();
        let response = self
            .server
            .post("/v1/auth/login")
            .add_header(key_name, key_value)
            .json(&json!({
                "email": email,
                "password": password
            }))
            .await;

        response.json::<serde_json::Value>()
    }

    /// Create a comment and return the response
    pub async fn create_comment(
        &self,
        token: &str,
        page_url: &str,
        content: &str,
        parent_id: Option<Uuid>,
    ) -> axum_test::TestResponse {
        let mut payload = json!({
            "page_url": page_url,
            "content": content,
        });
        if let Some(pid) = parent_id {
            payload["parent_id"] = json!(pid);
        }

        let (key_name, key_value) = self.project_id_header();
        let (auth_name, auth_value) = Self::auth_header(token);

        self.server
            .post("/v1/comments")
            .add_header(key_name, key_value)
            .add_header(auth_name, auth_value)
            .json(&payload)
            .await
    }

    /// Set moderation mode for the site
    pub async fn set_moderation_mode(&self, mode: &str) {
        use threadkit_common::redis::RedisClient;
        use threadkit_common::types::ModerationMode;

        let host = self.redis_container.get_host().await.expect("Failed to get redis host");
        let port = self.redis_container.get_host_port_ipv4(6379).await.expect("Failed to get redis port");
        let redis_url = format!("redis://{}:{}", host, port);

        let redis = RedisClient::new(&redis_url)
            .await
            .expect("Failed to connect to Redis");

        // Get current site config
        let mut config = redis
            .get_site_config(self.site_id)
            .await
            .expect("Failed to get site config")
            .expect("Site config not found");

        // Update moderation mode
        config.settings.moderation_mode = match mode {
            "none" => ModerationMode::None,
            "pre_moderation" | "pre" => ModerationMode::Pre,
            "post_moderation" | "post" => ModerationMode::Post,
            _ => panic!("Invalid moderation mode: {}", mode),
        };

        // Save updated config
        redis
            .set_site_config(&config)
            .await
            .expect("Failed to update site config");

        // Invalidate the API key cache
        redis
            .invalidate_project_id_cache(&self.project_id)
            .await
            .expect("Failed to invalidate cache");
    }

    /// Set user role (Owner, Admin, Moderator, User, Blocked)
    /// For testing purposes, directly updates Redis instead of using API
    pub async fn set_user_role(&self, user_id: &str, role: &str) {
        use threadkit_common::redis::RedisClient;

        let user_uuid = Uuid::parse_str(user_id).expect("Invalid user ID");

        let host = self.redis_container.get_host().await.expect("Failed to get redis host");
        let port = self.redis_container.get_host_port_ipv4(6379).await.expect("Failed to get redis port");
        let redis_url = format!("redis://{}:{}", host, port);

        let redis = RedisClient::new(&redis_url)
            .await
            .expect("Failed to connect to Redis");

        match role {
            "Owner" | "owner" => {
                // Owner is typically set in site config, but for tests we'll use Admin
                redis.add_admin(self.site_id, user_uuid).await.expect("Failed to add admin");
            }
            "Admin" | "admin" => {
                redis.add_admin(self.site_id, user_uuid).await.expect("Failed to add admin");
            }
            "Moderator" | "moderator" => {
                redis.add_moderator(self.site_id, user_uuid).await.expect("Failed to add moderator");
            }
            "User" | "user" => {
                // Remove from admin/moderator sets if present
                let _ = redis.remove_admin(self.site_id, user_uuid).await;
                let _ = redis.remove_moderator(self.site_id, user_uuid).await;
            }
            "Blocked" | "blocked" => {
                // Would need a block_user method in RedisClient
                panic!("Blocked role not yet implemented in tests");
            }
            _ => panic!("Invalid role: {}", role),
        }
    }

    /// Report a comment
    pub async fn report_comment(&self, token: &str, comment_id: &str, page_url: &str, reason: &str) {
        let (key_name, key_value) = self.project_id_header();
        let (auth_name, auth_value) = Self::auth_header(token);

        let _ = self
            .server
            .post(&format!("/v1/comments/{}/report", comment_id))
            .add_header(key_name, key_value)
            .add_header(auth_name, auth_value)
            .json(&json!({
                "page_url": page_url,
                "reason": reason,
                "path": [comment_id]
            }))
            .await;
    }

    /// Update site settings directly in Redis (for testing)
    pub async fn update_site_settings(&self, partial_settings: serde_json::Value) {
        use threadkit_common::redis::RedisClient;
        use threadkit_common::types::TurnstileSettings;

        // Get Redis URL from the test server's state
        let host = self.redis_container.get_host().await.expect("Failed to get redis host");
        let port = self.redis_container.get_host_port_ipv4(6379).await.expect("Failed to get redis port");
        let redis_url = format!("redis://{}:{}", host, port);

        // Create a temporary Redis client
        let redis = RedisClient::new(&redis_url)
            .await
            .expect("Failed to connect to Redis");

        // Get current site config
        let mut config = redis
            .get_site_config(self.site_id)
            .await
            .expect("Failed to get site config")
            .expect("Site config not found");

        // Update only the fields provided in partial_settings
        if let Some(turnstile_obj) = partial_settings.get("turnstile") {
            config.settings.turnstile = serde_json::from_value::<TurnstileSettings>(turnstile_obj.clone())
                .expect("Failed to parse turnstile settings");
        }

        // Save updated config
        redis
            .set_site_config(&config)
            .await
            .expect("Failed to update site config");

        // Invalidate the API key cache so the server picks up the new settings
        self.invalidate_project_id_cache().await;
    }

    /// Get Redis client for direct testing
    pub async fn get_redis_client(&self) -> threadkit_common::redis::RedisClient {
        use threadkit_common::redis::RedisClient;

        let host = self.redis_container.get_host().await.expect("Failed to get redis host");
        let port = self.redis_container.get_host_port_ipv4(6379).await.expect("Failed to get redis port");
        let redis_url = format!("redis://{}:{}", host, port);

        RedisClient::new(&redis_url)
            .await
            .expect("Failed to create Redis client")
    }

    /// Invalidate the project ID cache (forces server to reload config from Redis)
    #[allow(dead_code)]
    async fn invalidate_project_id_cache(&self) {
        use threadkit_common::redis::RedisClient;

        let host = self.redis_container.get_host().await.expect("Failed to get redis host");
        let port = self.redis_container.get_host_port_ipv4(6379).await.expect("Failed to get redis port");
        let redis_url = format!("redis://{}:{}", host, port);

        let redis_client = RedisClient::new(&redis_url)
            .await
            .expect("Failed to create Redis client");

        // Delete the cache key for this project ID
        redis_client
            .invalidate_project_id_cache(&self.project_id)
            .await
            .expect("Failed to invalidate cache");
    }

    /// Get the Redis URL for direct access
    pub async fn get_redis_url(&self) -> String {
        let host = self.redis_container.get_host().await.expect("Failed to get redis host");
        let port = self.redis_container.get_host_port_ipv4(6379).await.expect("Failed to get redis port");
        format!("redis://{}:{}", host, port)
    }

    /// Manually add a comment to user's comment index (for testing background task simulation)
    /// This is needed because comment indexing happens asynchronously in tokio::spawn,
    /// which may not complete before tests check the indexes
    pub async fn index_comment(&self, user_id: &str, page_url: &str, comment_id: &str) {
        use threadkit_common::redis::RedisClient;

        let user_uuid = Uuid::parse_str(user_id).expect("Invalid user ID");
        let comment_uuid = Uuid::parse_str(comment_id).expect("Invalid comment ID");

        let redis_url = self.get_redis_url().await;
        let redis = RedisClient::new(&redis_url)
            .await
            .expect("Failed to connect to Redis");

        // Generate page_id from page_url (deterministic hash)
        let page_id = RedisClient::generate_page_id(self.site_id, page_url);

        // Add to user's comment index
        redis
            .add_user_comment_index(user_uuid, page_id, comment_uuid)
            .await
            .expect("Failed to add comment to user index");
    }
}
