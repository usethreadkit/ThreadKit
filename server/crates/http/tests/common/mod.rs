use axum::{http::HeaderName, http::HeaderValue, middleware, Router};
use axum_test::TestServer;
use serde_json::json;
use testcontainers::{runners::AsyncRunner, ContainerAsync, ImageExt};
use testcontainers_modules::redis::Redis;
use uuid::Uuid;

use threadkit_common::{
    config::{
        ContentModerationConfig, EmailConfig, ModerationMode, RateLimitConfig, SmsConfig,
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
    container: ContainerAsync<Redis>,
}

impl TestContext {
    pub async fn new() -> Self {
        // Start Redis container
        let container = Redis::default()
            .with_tag("7-alpine")
            .start()
            .await
            .expect("Failed to start Redis container");

        let host = container.get_host().await.expect("Failed to get host");
        let port = container
            .get_host_port_ipv4(6379)
            .await
            .expect("Failed to get port");

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
        let site_config = threadkit_common::types::SiteConfig {
            id: site_id,
            name: "Test Site".to_string(), // Matches site_name in Config
            domain: "localhost".to_string(), // Matches site_domain in Config
            project_id_public: project_id.clone(),
            project_id_secret: secret_key.clone(),
            settings: Default::default(),
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
                site_id,
                project_id_public: project_id.clone(),
                project_id_secret: secret_key.clone(),
                site_name: "Test Site".to_string(),
                site_domain: "localhost".to_string(),
                moderation_mode: ModerationMode::None,
                allowed_origins: vec![],
            }),
            oauth: Default::default(),
            rate_limit: RateLimitConfig {
                enabled: true,
                ip_writes_per_minute: 5,
                ip_reads_per_minute: 30,
                project_id_writes_per_minute: 100,
                project_id_reads_per_minute: 500,
                user_writes_per_minute: 5,
                user_reads_per_minute: 30,
                auth_attempts_per_hour: 10,
                ws_messages_per_sec: 10,
                otp_per_target_per_hour: 3,
                otp_per_ip_per_hour: 10,
                trusted_proxies: vec!["127.0.0.1".to_string()],
            },
            content_moderation: ContentModerationConfig::default(),
            email: EmailConfig::default(),
            sms: SmsConfig::default(),
            turnstile: TurnstileConfig::default(),
            max_comment_length: 10_000,
            allow_localhost_origin: true,
        };

        // Create app state (this also initializes site config in Redis)
        let state = AppState::new(config)
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
            container,
        }
    }

    fn project_id_header(&self) -> (HeaderName, HeaderValue) {
        (
            HeaderName::from_static("projectid"),
            HeaderValue::from_str(&self.project_id).unwrap(),
        )
    }

    fn auth_header(token: &str) -> (HeaderName, HeaderValue) {
        (
            HeaderName::from_static("authorization"),
            HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
        )
    }

    /// Register a new user and return auth response
    pub async fn register_user(&self, name: &str, email: &str, password: &str) -> serde_json::Value {
        let (key_name, key_value) = self.project_id_header();
        let response = self
            .server
            .post("/v1/auth/register")
            .add_header(key_name, key_value)
            .json(&json!({
                "name": name,
                "email": email,
                "password": password
            }))
            .await;

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
}
