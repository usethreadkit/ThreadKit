use anyhow::Result;
use axum::{
    extract::{ws::WebSocketUpgrade, Query, State},
    response::{Json, Response},
    routing::get,
    Router,
};
use clap::Parser;
use serde::Deserialize;
use std::net::SocketAddr;
use std::sync::atomic::Ordering;
use std::time::Duration;
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use threadkit_common::Config;
use threadkit_websocket::{handler::handle_socket, pubsub::PubSubSubscriber, state::WsState};

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

    /// Disable rate limiting (for load testing)
    #[arg(long)]
    no_rate_limit: bool,

}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize Sentry if DSN is configured
    let _sentry_guard = std::env::var("SENTRY_DSN_WS").ok().map(|dsn| {
        sentry::init((dsn, sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        }))
    });

    // Raise file descriptor limit for high connection counts
    raise_fd_limit();

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
    if args.no_rate_limit {
        config.rate_limit.enabled = false;
    }

    tracing::info!("Starting ThreadKit WebSocket server");
    if !config.rate_limit.enabled {
        tracing::warn!("Rate limiting is DISABLED");
    }

    // Initialize state
    let state = WsState::new(config.clone()).await?;

    // Start the batcher flush loop
    let batcher_handle = state.batcher.start();
    tracing::info!("Redis batcher started (20ms flush interval)");

    // Start the pub/sub subscriber
    let pubsub_subscriber = PubSubSubscriber::new(
        config.redis_url.clone(),
        state.page_channels.clone(),
    );
    let _pubsub_handle = pubsub_subscriber.start();
    tracing::info!("Redis pub/sub subscriber started");

    // Start metrics logging task
    let metrics_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            let metrics = metrics_state.get_metrics();
            tracing::debug!(
                active_connections = metrics.active_connections,
                total_connections = metrics.total_connections,
                messages_received = metrics.total_messages_received,
                messages_sent = metrics.total_messages_sent,
                batcher_flushes = metrics.batcher_flushes,
                page_channels = metrics.page_channels_count,
                "WebSocket server metrics"
            );
        }
    });

    // Start connection snapshot task for analytics
    let snapshot_state = state.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            snapshot_connections(&snapshot_state).await;
        }
    });

    // Build router
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(|| async { "ok" }))
        .route("/metrics", get(metrics_handler))
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

    // Cleanup
    batcher_handle.abort();
    tracing::info!("WebSocket server shut down");

    Ok(())
}

#[derive(Debug, Deserialize)]
struct WsQuery {
    project_id: String,
    token: Option<String>,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<WsState>,
    Query(query): Query<WsQuery>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state, query.project_id, query.token))
}

async fn metrics_handler(State(state): State<WsState>) -> Json<serde_json::Value> {
    let metrics = state.get_metrics();
    Json(serde_json::json!({
        "active_connections": metrics.active_connections,
        "total_connections": metrics.total_connections,
        "messages_received": metrics.total_messages_received,
        "messages_sent": metrics.total_messages_sent,
        "batcher_flushes": metrics.batcher_flushes,
        "batcher_writes_batched": metrics.batcher_writes_batched,
        "batcher_reads_batched": metrics.batcher_reads_batched,
        "page_channels": metrics.page_channels_count,
    }))
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C handler");
    tracing::info!("Shutdown signal received, draining connections...");

    // Grace period for connections to close
    tokio::time::sleep(Duration::from_secs(10)).await;
}

/// Snapshot current connection counts to Redis for analytics
async fn snapshot_connections(state: &WsState) {
    let hour_key = chrono::Utc::now().format("%Y%m%d%H").to_string();
    let minute = chrono::Utc::now().format("%M").to_string().parse::<u32>().unwrap_or(0);

    for entry in state.connections_per_site.iter() {
        let site_id = *entry.key();
        let count = entry.value().load(Ordering::Relaxed);

        if count > 0 {
            // Store in Redis: ZADD threadkit:stats:{site_id}:connections:{hour} minute count
            let key = format!("threadkit:stats:{}:connections:{}", site_id, hour_key);
            if let Err(e) = state.redis.set_with_expiry(
                &format!("{}:{}", key, minute),
                &count.to_string(),
                7 * 24 * 3600, // 7 days TTL
            ).await {
                tracing::warn!("Failed to snapshot connections: {}", e);
            }
        }
    }
}

/// Raise the file descriptor limit for handling many connections
fn raise_fd_limit() {
    #[cfg(unix)]
    {
        use std::io;

        // Get current limits
        let mut rlim = libc::rlimit {
            rlim_cur: 0,
            rlim_max: 0,
        };

        unsafe {
            if libc::getrlimit(libc::RLIMIT_NOFILE, &mut rlim) != 0 {
                tracing::warn!("Failed to get file descriptor limit: {:?}", io::Error::last_os_error());
                return;
            }
        }

        let current = rlim.rlim_cur;
        let max = rlim.rlim_max;

        // Try to raise to 65536 or max, whichever is lower
        let target = 65536.min(max);

        if current < target {
            rlim.rlim_cur = target;

            unsafe {
                if libc::setrlimit(libc::RLIMIT_NOFILE, &rlim) != 0 {
                    tracing::warn!(
                        "Failed to raise file descriptor limit from {} to {}: {:?}",
                        current,
                        target,
                        io::Error::last_os_error()
                    );
                } else {
                    tracing::info!("Raised file descriptor limit from {} to {}", current, target);
                }
            }
        } else {
            tracing::debug!("File descriptor limit already at {} (max: {})", current, max);
        }
    }
}
