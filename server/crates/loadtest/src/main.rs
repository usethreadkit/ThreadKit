use anyhow::Result;
use clap::{Parser, Subcommand};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Parser)]
#[command(name = "threadkit-loadtest")]
#[command(about = "Load testing tool for ThreadKit")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Run HTTP load test
    Http {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long)]
        api_key: String,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "10")]
        workers: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,

        /// Requests per second (0 = unlimited)
        #[arg(short, long, default_value = "0")]
        rps: u64,
    },

    /// Run WebSocket load test
    Ws {
        /// Target URL (e.g., ws://localhost:8081)
        #[arg(short, long, default_value = "ws://localhost:8081")]
        url: String,

        /// API key
        #[arg(short, long)]
        api_key: String,

        /// Number of concurrent connections
        #[arg(short, long, default_value = "100")]
        connections: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,

        /// Messages per second per connection
        #[arg(short, long, default_value = "1")]
        mps: u64,
    },
}

#[derive(Default)]
struct Stats {
    requests: AtomicU64,
    successes: AtomicU64,
    failures: AtomicU64,
    total_latency_us: AtomicU64,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Http {
            url,
            api_key,
            workers,
            duration,
            rps,
        } => {
            run_http_test(&url, &api_key, workers, duration, rps).await?;
        }
        Commands::Ws {
            url,
            api_key,
            connections,
            duration,
            mps,
        } => {
            run_ws_test(&url, &api_key, connections, duration, mps).await?;
        }
    }

    Ok(())
}

async fn run_http_test(
    url: &str,
    api_key: &str,
    workers: usize,
    duration: u64,
    rps: u64,
) -> Result<()> {
    tracing::info!("Starting HTTP load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Duration: {}s", duration);
    tracing::info!("  RPS limit: {}", if rps == 0 { "unlimited".to_string() } else { rps.to_string() });

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);

    // Rate limiter
    let rate_limiter = if rps > 0 {
        Some(Arc::new(Semaphore::new(rps as usize)))
    } else {
        None
    };

    let mut handles = Vec::new();

    for _ in 0..workers {
        let client = client.clone();
        let stats = stats.clone();
        let url = format!("{}/v1/comments?page_url=test-page", url);
        let api_key = api_key.to_string();
        let rate_limiter = rate_limiter.clone();

        handles.push(tokio::spawn(async move {
            while start.elapsed() < duration {
                // Rate limiting
                let _permit = if let Some(ref rl) = rate_limiter {
                    Some(rl.acquire().await.unwrap())
                } else {
                    None
                };

                let req_start = Instant::now();
                stats.requests.fetch_add(1, Ordering::Relaxed);

                let result = client
                    .get(&url)
                    .header("X-API-Key", &api_key)
                    .send()
                    .await;

                let latency = req_start.elapsed().as_micros() as u64;
                stats.total_latency_us.fetch_add(latency, Ordering::Relaxed);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    _ => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }));
    }

    // Rate limiter replenishment
    if let Some(ref rl) = rate_limiter {
        let rl = rl.clone();
        tokio::spawn(async move {
            let interval = Duration::from_secs(1);
            loop {
                tokio::time::sleep(interval).await;
                rl.add_permits(rps as usize);
            }
        });
    }

    // Progress reporter
    let stats_clone = stats.clone();
    tokio::spawn(async move {
        let mut last_requests = 0;
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let current = stats_clone.requests.load(Ordering::Relaxed);
            let rps = current - last_requests;
            last_requests = current;
            tracing::info!("  RPS: {} | Total: {}", rps, current);
        }
    });

    // Wait for all workers
    for handle in handles {
        let _ = handle.await;
    }

    // Print results
    let total_requests = stats.requests.load(Ordering::Relaxed);
    let successes = stats.successes.load(Ordering::Relaxed);
    let failures = stats.failures.load(Ordering::Relaxed);
    let total_latency = stats.total_latency_us.load(Ordering::Relaxed);
    let avg_latency = if total_requests > 0 {
        total_latency / total_requests
    } else {
        0
    };
    let elapsed = start.elapsed();

    println!("\n========== Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Total requests: {}", total_requests);
    println!("Successful: {}", successes);
    println!("Failed: {}", failures);
    println!("RPS: {:.2}", total_requests as f64 / elapsed.as_secs_f64());
    println!("Avg latency: {:.2}ms", avg_latency as f64 / 1000.0);
    println!("Success rate: {:.2}%", successes as f64 / total_requests as f64 * 100.0);

    Ok(())
}

async fn run_ws_test(
    url: &str,
    api_key: &str,
    connections: usize,
    duration: u64,
    mps: u64,
) -> Result<()> {
    tracing::info!("Starting WebSocket load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Connections: {}", connections);
    tracing::info!("  Duration: {}s", duration);
    tracing::info!("  Messages/sec/conn: {}", mps);

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);

    let mut handles = Vec::new();

    for i in 0..connections {
        let stats = stats.clone();
        let url = format!("{}/ws?api_key={}", url, api_key);
        let page_id = uuid::Uuid::now_v7();

        handles.push(tokio::spawn(async move {
            use futures_util::{SinkExt, StreamExt};
            use tokio_tungstenite::connect_async;

            let connect_result = connect_async(&url).await;
            let (mut ws, _) = match connect_result {
                Ok(conn) => conn,
                Err(e) => {
                    tracing::error!("Connection {} failed: {}", i, e);
                    stats.failures.fetch_add(1, Ordering::Relaxed);
                    return;
                }
            };

            stats.successes.fetch_add(1, Ordering::Relaxed);

            // Subscribe to a page
            let subscribe_msg = serde_json::json!({
                "type": "subscribe",
                "page_id": page_id.to_string()
            });
            let _ = ws.send(tokio_tungstenite::tungstenite::Message::Text(
                subscribe_msg.to_string().into(),
            )).await;

            let msg_interval = if mps > 0 {
                Duration::from_millis(1000 / mps)
            } else {
                Duration::from_secs(3600) // Effectively no messages
            };

            let mut interval = tokio::time::interval(msg_interval);

            while start.elapsed() < duration {
                tokio::select! {
                    _ = interval.tick() => {
                        let ping_msg = serde_json::json!({ "type": "ping" });
                        stats.requests.fetch_add(1, Ordering::Relaxed);
                        if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                            ping_msg.to_string().into(),
                        )).await.is_err() {
                            break;
                        }
                    }
                    msg = ws.next() => {
                        match msg {
                            Some(Ok(_)) => {}
                            _ => break,
                        }
                    }
                }
            }

            let _ = ws.close(None).await;
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let current = stats_clone.requests.load(Ordering::Relaxed);
            let connected = stats_clone.successes.load(Ordering::Relaxed);
            tracing::info!("  Connected: {} | Messages: {}", connected, current);
        }
    });

    // Wait for all connections
    for handle in handles {
        let _ = handle.await;
    }

    // Print results
    let total_messages = stats.requests.load(Ordering::Relaxed);
    let connected = stats.successes.load(Ordering::Relaxed);
    let failed = stats.failures.load(Ordering::Relaxed);
    let elapsed = start.elapsed();

    println!("\n========== Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Connections attempted: {}", connections);
    println!("Connections successful: {}", connected);
    println!("Connections failed: {}", failed);
    println!("Total messages sent: {}", total_messages);
    println!("Messages/sec: {:.2}", total_messages as f64 / elapsed.as_secs_f64());

    Ok(())
}
