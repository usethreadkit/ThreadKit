use axum::{
    extract::{ws::WebSocketUpgrade, Query, State},
    routing::get,
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use testcontainers::{runners::AsyncRunner, ContainerAsync, ImageExt};
use testcontainers_modules::redis::Redis;
use tokio_tungstenite::{connect_async, tungstenite::Message, MaybeTlsStream, WebSocketStream};
use uuid::Uuid;

use threadkit_common::{
    config::{RateLimitConfig, StandaloneConfig},
    redis::RedisClient,
    Config,
};
use threadkit_websocket::{handler::handle_socket, state::WsState};

#[derive(Debug, Deserialize)]
struct WsQuery {
    project_id: String,
    token: Option<String>,
}

pub struct TestContext {
    pub server_addr: String,
    pub ws_state: WsState,
    pub site_id: Uuid,
    pub project_id: String,
    pub redis_client: Arc<RedisClient>,
    #[allow(dead_code)]
    redis_container: ContainerAsync<Redis>,
}

impl TestContext {
    pub async fn new() -> Self {
        Self::new_with_rate_limit(true).await
    }

    pub async fn new_with_rate_limit(rate_limit_enabled: bool) -> Self {
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

        let redis_url = format!("redis://{}:{}", host, port);
        let redis_client = Arc::new(
            RedisClient::new(&redis_url)
                .await
                .expect("Failed to create Redis client"),
        );

        // Create site and API key
        let site_id = Uuid::now_v7();
        let project_id = format!(
            "tk_pub_{}",
            Uuid::now_v7().to_string().replace('-', "")[..32].to_lowercase()
        );
        let secret_key = format!(
            "tk_sec_{}",
            Uuid::now_v7().to_string().replace('-', "")[..32].to_lowercase()
        );

        // Create SiteConfig and save it to Redis
        let settings = threadkit_common::types::SiteSettings::default();
        let site_config = threadkit_common::types::SiteConfig {
            id: site_id,
            name: "Test Site".to_string(),
            domain: "localhost".to_string(),
            project_id_public: project_id.clone(),
            project_id_secret: secret_key.clone(),
            settings,
        };
        redis_client
            .set_site_config(&site_config)
            .await
            .expect("Failed to set site config in Redis");

        // Create config
        let config = Config {
            redis_url: redis_url.clone(),
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
                enabled: rate_limit_enabled,
                ip_writes_per_minute: 100,
                ip_reads_per_minute: 300,
                project_id_writes_per_minute: 1000,
                project_id_reads_per_minute: 5000,
                user_writes_per_minute: 100,
                user_reads_per_minute: 300,
                auth_attempts_per_hour: 100,
                ws_messages_per_sec: 10,
                otp_per_target_per_hour: 10,
                otp_per_ip_per_hour: 100,
                trusted_proxies: vec!["127.0.0.1".to_string()],
            },
            content_moderation: Default::default(),
            email: Default::default(),
            turnstile: Default::default(),
            s3: None,
            max_comment_length: 10_000,
            allow_localhost_origin: true,
        };

        // Create WebSocket state
        let ws_state = WsState::new(config).await.expect("Failed to create WsState");

        // Start the batcher flush loop (in background)
        let _batcher_handle = ws_state.batcher.start();

        // Create Axum app
        let state_clone = ws_state.clone();
        let app = Router::new()
            .route(
                "/ws",
                get(
                    |ws: WebSocketUpgrade,
                     State(state): State<WsState>,
                     Query(query): Query<WsQuery>| async move {
                        ws.on_upgrade(move |socket| {
                            handle_socket(socket, state, query.project_id, query.token)
                        })
                    },
                ),
            )
            .with_state(state_clone);

        // Start test server
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
            .await
            .expect("Failed to bind");
        let server_addr = format!("127.0.0.1:{}", listener.local_addr().unwrap().port());

        tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });

        // Give server time to start
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        TestContext {
            server_addr,
            ws_state,
            site_id,
            project_id,
            redis_client,
            redis_container,
        }
    }

    /// Connect a WebSocket client with the test project_id
    pub async fn connect(&self) -> TestWebSocketClient {
        self.connect_with_token(None).await
    }

    /// Connect a WebSocket client with optional JWT token
    pub async fn connect_with_token(&self, token: Option<String>) -> TestWebSocketClient {
        let url = if let Some(token) = token {
            format!(
                "ws://{}/ws?project_id={}&token={}",
                self.server_addr, self.project_id, token
            )
        } else {
            format!(
                "ws://{}/ws?project_id={}",
                self.server_addr, self.project_id
            )
        };

        let (ws_stream, _) = connect_async(&url)
            .await
            .expect("Failed to connect WebSocket");

        TestWebSocketClient { ws_stream }
    }

    /// Create a test user and return JWT token
    pub async fn create_test_user(&self) -> (Uuid, String) {
        let user_id = Uuid::now_v7();
        let username = format!("testuser_{}", &user_id.to_string()[..8]);

        // Save user to Redis
        let user = threadkit_common::types::User {
            id: user_id,
            name: username.clone(),
            email: Some(format!("{}@test.com", username)),
            avatar_url: None,
            provider: threadkit_common::types::AuthProvider::Email,
            provider_id: None,
            email_verified: true,
            karma: 0,
            global_banned: false,
            shadow_banned: false,
            created_at: chrono::Utc::now(),
            username_set: true,
            social_links: threadkit_common::types::SocialLinks::default(),
            total_comments: 0,
        };

        self.redis_client
            .set_user(&user)
            .await
            .expect("Failed to save user");

        // Generate JWT token (valid for 24 hours)
        let token = threadkit_common::auth::create_token(
            user_id,
            self.site_id,
            Uuid::now_v7(), // session_id
            &"test_jwt_secret_for_testing".to_string(),
            24, // expiry_hours
        )
        .expect("Failed to create token");

        (user_id, token)
    }
}

pub struct TestWebSocketClient {
    pub ws_stream: WebSocketStream<MaybeTlsStream<tokio::net::TcpStream>>,
}

impl TestWebSocketClient {
    /// Send a JSON-RPC message
    pub async fn send_message(&mut self, method: &str, params: serde_json::Value) {
        let msg = json!({
            "jsonrpc": "2.0",
            "method": method,
            "params": params
        });

        self.ws_stream
            .send(Message::Text(msg.to_string()))
            .await
            .expect("Failed to send message");
    }

    /// Receive the next message (with timeout)
    pub async fn recv_message(&mut self) -> serde_json::Value {
        let timeout = tokio::time::Duration::from_secs(5);
        let msg = tokio::time::timeout(timeout, self.ws_stream.next())
            .await
            .expect("Timeout waiting for message")
            .expect("Stream ended")
            .expect("Failed to receive message");

        match msg {
            Message::Text(text) => serde_json::from_str(&text).expect("Failed to parse JSON"),
            _ => panic!("Expected text message"),
        }
    }

    /// Receive message with specific timeout
    pub async fn recv_message_timeout(
        &mut self,
        duration: tokio::time::Duration,
    ) -> Option<serde_json::Value> {
        match tokio::time::timeout(duration, self.ws_stream.next()).await {
            Ok(Some(Ok(Message::Text(text)))) => {
                Some(serde_json::from_str(&text).expect("Failed to parse JSON"))
            }
            _ => None,
        }
    }

    /// Subscribe to a page
    pub async fn subscribe(&mut self, page_id: Uuid) {
        self.send_message("subscribe", json!({ "page_id": page_id.to_string() }))
            .await;
    }

    /// Unsubscribe from a page
    pub async fn unsubscribe(&mut self, page_id: Uuid) {
        self.send_message("unsubscribe", json!({ "page_id": page_id.to_string() }))
            .await;
    }

    /// Send typing indicator
    pub async fn send_typing(&mut self, page_id: Uuid, reply_to: Option<Uuid>) {
        let mut params = json!({ "page_id": page_id.to_string() });
        if let Some(reply_to) = reply_to {
            params["reply_to"] = json!(reply_to.to_string());
        }
        self.send_message("typing", params).await;
    }

    /// Send ping
    pub async fn send_ping(&mut self) {
        self.send_message("ping", json!({})).await;
    }

    /// Close the connection
    pub async fn close(mut self) {
        let _ = self.ws_stream.close(None).await;
    }

    /// Wait for a specific message method, consuming other messages
    pub async fn wait_for_method(&mut self, expected_method: &str) -> serde_json::Value {
        for _ in 0..10 {
            // Try up to 10 messages
            if let Some(msg) = self
                .recv_message_timeout(tokio::time::Duration::from_millis(500))
                .await
            {
                if msg["method"] == expected_method {
                    return msg;
                }
            } else {
                panic!("Timeout waiting for method: {}", expected_method);
            }
        }
        panic!(
            "Did not receive expected method '{}' in 10 messages",
            expected_method
        );
    }
}
