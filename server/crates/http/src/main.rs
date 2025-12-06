use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use clap::Parser;
use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};
use serde::Serialize;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::{
    compression::CompressionLayer,
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::OpenApi;
use utoipa_scalar::{Scalar, Servable};

use threadkit_common::{Config, Mode, ModerationMode};
use threadkit_http::{middleware::rate_limit, openapi::ApiDoc, routes, state::AppState};

#[derive(Parser)]
#[command(name = "threadkit-http")]
#[command(about = "ThreadKit HTTP API server")]
#[command(version)]
struct Args {
    /// Path to .env file (e.g., .env.loadtest)
    #[arg(short, long)]
    env: Option<String>,

    /// Log level (e.g., "info", "debug", "info,threadkit=debug")
    #[arg(short, long)]
    log: Option<String>,

    /// Host to bind to (overrides HTTP_HOST env var)
    #[arg(long)]
    host: Option<String>,

    /// Port to listen on (overrides HTTP_PORT env var)
    #[arg(short, long)]
    port: Option<u16>,

    /// Redis URL (overrides REDIS_URL env var)
    #[arg(long)]
    redis_url: Option<String>,

    /// Disable rate limiting
    #[arg(long)]
    no_rate_limit: bool,

    /// Allow localhost/127.0.0.1/::1 origins (development only)
    #[arg(long)]
    allow_localhost_origin: bool,

    /// Site ID (standalone mode, overrides SITE_ID)
    #[arg(long)]
    site_id: Option<String>,

    /// Site name (standalone mode, overrides SITE_NAME)
    #[arg(long)]
    site_name: Option<String>,

    /// Site domain (standalone mode, overrides SITE_DOMAIN)
    #[arg(long)]
    site_domain: Option<String>,

    /// Public API key (standalone mode, overrides API_KEY_PUBLIC)
    #[arg(long)]
    api_key_public: Option<String>,

    /// Secret API key (standalone mode, overrides API_KEY_SECRET)
    #[arg(long)]
    api_key_secret: Option<String>,

    /// Moderation mode: none, pre, or post (standalone mode)
    #[arg(long)]
    moderation_mode: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize tracing (CLI --log takes precedence over RUST_LOG env var)
    let log_filter = args
        .log
        .clone()
        .or_else(|| std::env::var("RUST_LOG").ok())
        .unwrap_or_else(|| "info,threadkit=debug".into());

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(&log_filter))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let mut config = match &args.env {
        Some(path) => {
            tracing::info!("Loading config from: {}", path);
            Config::from_env_file(path)?
        }
        None => Config::from_env()?,
    };

    // Apply CLI arg overrides
    if let Some(host) = args.host {
        config.http_host = host;
    }
    if let Some(port) = args.port {
        config.http_port = port;
    }
    if let Some(redis_url) = args.redis_url {
        config.redis_url = redis_url;
    }
    if args.no_rate_limit {
        config.rate_limit.enabled = false;
    }
    if args.allow_localhost_origin {
        config.allow_localhost_origin = true;
    }

    // Standalone mode overrides
    if let Mode::Standalone(ref mut standalone) = config.mode {
        if let Some(site_id) = args.site_id {
            if let Ok(id) = site_id.parse() {
                standalone.site_id = id;
            } else {
                tracing::warn!("Invalid --site-id '{}', ignoring", site_id);
            }
        }
        if let Some(name) = args.site_name {
            standalone.site_name = name;
        }
        if let Some(domain) = args.site_domain {
            standalone.site_domain = domain;
        }
        if let Some(key) = args.api_key_public {
            standalone.api_key_public = key;
        }
        if let Some(key) = args.api_key_secret {
            standalone.api_key_secret = key;
        }
        if let Some(mode) = args.moderation_mode {
            standalone.moderation_mode = match mode.to_lowercase().as_str() {
                "pre" => ModerationMode::Pre,
                "post" => ModerationMode::Post,
                _ => ModerationMode::None,
            };
        }
    }

    tracing::info!("Starting ThreadKit HTTP server");
    tracing::info!("Mode: {:?}", if config.is_standalone() { "standalone" } else { "saas" });

    // Print API keys in standalone mode
    if let Some(standalone) = config.standalone() {
        tracing::info!("Site ID: {}", standalone.site_id);
        tracing::info!("Public key: {}", standalone.api_key_public);
        tracing::info!("Secret key: {}", standalone.api_key_secret);
    }

    // Initialize Prometheus metrics
    let metrics_handle = setup_metrics();

    // Initialize state
    let state = AppState::new(config.clone()).await?;

    // Build router
    let app = Router::new()
        // Health check (no rate limiting)
        .route("/health", get(health_check))
        // Prometheus metrics (no rate limiting)
        .route("/metrics", get({
            let handle = metrics_handle.clone();
            move || {
                let h = handle.clone();
                async move { h.render() }
            }
        }))
        // OpenAPI JSON endpoint (no rate limiting)
        .route("/openapi.json", get(|| async {
            axum::Json(ApiDoc::openapi())
        }))
        // OpenAPI docs UI (no rate limiting)
        .merge(Scalar::with_url("/docs", ApiDoc::openapi()))
        // API routes (with rate limiting)
        .nest("/v1", routes::router()
            .layer(middleware::from_fn_with_state(state.clone(), rate_limit))
        )
        // Global middleware
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new())
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    // Start server
    let host: std::net::IpAddr = config.http_host.parse().unwrap_or_else(|_| {
        tracing::warn!("Invalid HTTP_HOST '{}', defaulting to 127.0.0.1", config.http_host);
        std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))
    });
    let addr = SocketAddr::from((host, config.http_port));
    tracing::info!("Listening on {}", addr);

    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

fn setup_metrics() -> PrometheusHandle {
    const EXPONENTIAL_SECONDS: &[f64] = &[
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0,
    ];

    PrometheusBuilder::new()
        .set_buckets_for_metric(
            Matcher::Full("http_request_duration_seconds".to_string()),
            EXPONENTIAL_SECONDS,
        )
        .unwrap()
        .install_recorder()
        .expect("Failed to install Prometheus recorder")
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    redis: &'static str,
}

async fn health_check(State(state): State<AppState>) -> impl IntoResponse {
    let redis_ok = state.redis.ping().await.is_ok();

    let response = HealthResponse {
        status: if redis_ok { "healthy" } else { "degraded" },
        redis: if redis_ok { "connected" } else { "disconnected" },
    };

    let status = if redis_ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (status, Json(response))
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C handler");
    tracing::info!("Shutting down...");
}
