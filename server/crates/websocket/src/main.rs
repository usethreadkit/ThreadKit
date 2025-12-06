use anyhow::Result;
use axum::{
    extract::{ws::WebSocketUpgrade, Query, State},
    response::Response,
    routing::get,
    Router,
};
use clap::Parser;
use serde::Deserialize;
use std::net::SocketAddr;
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use threadkit_common::Config;
use threadkit_websocket::{handler::handle_socket, state::WsState};

#[derive(Parser)]
#[command(name = "threadkit-websocket")]
#[command(about = "ThreadKit WebSocket server")]
#[command(version)]
struct Args {
    /// Path to .env file (e.g., .env.loadtest)
    #[arg(short, long)]
    env: Option<String>,

    /// Log level (e.g., "info", "debug", "info,threadkit=debug")
    #[arg(short, long)]
    log: Option<String>,

    /// Host to bind to (overrides WS_HOST env var)
    #[arg(long)]
    host: Option<String>,

    /// Port to listen on (overrides WS_PORT env var)
    #[arg(short, long)]
    port: Option<u16>,

    /// Redis URL (overrides REDIS_URL env var)
    #[arg(long)]
    redis_url: Option<String>,
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
        config.ws_host = host;
    }
    if let Some(port) = args.port {
        config.ws_port = port;
    }
    if let Some(redis_url) = args.redis_url {
        config.redis_url = redis_url;
    }

    tracing::info!("Starting ThreadKit WebSocket server");

    // Initialize state
    let state = WsState::new(config.clone()).await?;

    // Build router
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(|| async { "ok" }))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let host: std::net::IpAddr = config.ws_host.parse().unwrap_or_else(|_| {
        tracing::warn!("Invalid WS_HOST '{}', defaulting to 127.0.0.1", config.ws_host);
        std::net::IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))
    });
    let addr = SocketAddr::from((host, config.ws_port));
    tracing::info!("WebSocket server listening on {}", addr);

    let listener = TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

#[derive(Debug, Deserialize)]
struct WsQuery {
    api_key: String,
    token: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<WsState>,
    Query(query): Query<WsQuery>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state, query.api_key, query.token))
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C handler");
    tracing::info!("Shutting down WebSocket server...");
}
