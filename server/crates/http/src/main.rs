use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
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

use threadkit_common::Config;
use threadkit_http::{middleware::rate_limit, openapi::ApiDoc, routes, state::AppState};

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,threadkit=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = Config::from_env()?;
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
    let addr = SocketAddr::from(([0, 0, 0, 0], config.http_port));
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
