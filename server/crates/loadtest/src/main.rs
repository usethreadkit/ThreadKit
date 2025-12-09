use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use fred::interfaces::ClientLike;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
use rlimit::{Resource, getrlimit, setrlimit};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;

// Re-export shared types from threadkit-common
use threadkit_common::types::{
    AuthResponse, CreateCommentRequest, CreateCommentResponse, RegisterRequest,
};

// ============================================================================
// System Limit Helpers
// ============================================================================

/// Raise the file descriptor limit for high connection counts.
/// Returns the new soft limit.
fn raise_fd_limit() -> u64 {
    const DESIRED_LIMIT: u64 = 65536;

    match getrlimit(Resource::NOFILE) {
        Ok((soft, hard)) => {
            let new_soft = soft.max(DESIRED_LIMIT.min(hard));
            if new_soft > soft {
                match setrlimit(Resource::NOFILE, new_soft, hard) {
                    Ok(()) => {
                        tracing::info!("Raised file descriptor limit from {} to {} (hard: {})", soft, new_soft, hard);
                        new_soft
                    }
                    Err(e) => {
                        tracing::warn!("Failed to raise FD limit: {} (current: {}, hard: {})", e, soft, hard);
                        soft
                    }
                }
            } else {
                tracing::info!("File descriptor limit: {} (hard: {})", soft, hard);
                soft
            }
        }
        Err(e) => {
            tracing::warn!("Failed to get FD limit: {}", e);
            256
        }
    }
}

/// Print macOS-specific system limits that affect high-connection workloads.
#[cfg(target_os = "macos")]
fn print_system_limits() {
    use std::process::Command;

    // kern.ipc.somaxconn - TCP listen backlog
    if let Ok(output) = Command::new("sysctl").args(["-n", "kern.ipc.somaxconn"]).output() {
        if output.status.success() {
            if let Ok(val) = String::from_utf8_lossy(&output.stdout).trim().parse::<u32>() {
                if val < 1024 {
                    tracing::warn!("⚠ TCP backlog (kern.ipc.somaxconn) is {} - limits concurrent connections!", val);
                    tracing::warn!("  Fix: sudo sysctl -w kern.ipc.somaxconn=8192");
                } else {
                    tracing::info!("TCP backlog (kern.ipc.somaxconn): {}", val);
                }
            }
        }
    }

    // kern.maxfilesperproc - max open files per process
    if let Ok(output) = Command::new("sysctl").args(["-n", "kern.maxfilesperproc"]).output() {
        if output.status.success() {
            if let Ok(val) = String::from_utf8_lossy(&output.stdout).trim().parse::<u64>() {
                if val < 10000 {
                    tracing::warn!("⚠ Max files per process (kern.maxfilesperproc) is {} - may limit connections!", val);
                    tracing::warn!("  Fix: sudo sysctl -w kern.maxfilesperproc=65536");
                } else {
                    tracing::info!("Max files per process (kern.maxfilesperproc): {}", val);
                }
            }
        }
    }

    // Ephemeral port range
    let first = Command::new("sysctl")
        .args(["-n", "net.inet.ip.portrange.first"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse::<u32>().ok());
    let last = Command::new("sysctl")
        .args(["-n", "net.inet.ip.portrange.last"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8_lossy(&o.stdout).trim().parse::<u32>().ok());

    if let (Some(first), Some(last)) = (first, last) {
        let range = last.saturating_sub(first) + 1;
        tracing::info!("Ephemeral port range: {}-{} ({} ports available)", first, last, range);
    }
}

#[cfg(not(target_os = "macos"))]
fn print_system_limits() {
    // Linux/other: could add similar checks for /proc/sys/net/core/somaxconn etc.
}

#[derive(Parser)]
#[command(name = "threadkit-loadtest")]
#[command(about = "Load testing tool for ThreadKit")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Setup test data (users, comments, pages)
    Setup {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// Public API key
        #[arg(long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Secret API key (for admin operations)
        #[arg(long, default_value = "tk_sec_loadtest_secret_key_12345")]
        secret_key: String,

        /// Number of users to create
        #[arg(long, default_value = "100")]
        users: usize,

        /// Number of pages to create comments on
        #[arg(long, default_value = "10")]
        pages: usize,

        /// Number of comments per page
        #[arg(long, default_value = "50")]
        comments_per_page: usize,
    },

    /// Teardown test data (flush Redis)
    Teardown {
        /// Redis URL
        #[arg(short, long, default_value = "redis://localhost:6379")]
        redis_url: String,

        /// Confirm teardown (required)
        #[arg(long)]
        confirm: bool,
    },

    /// Run HTTP load test (reads)
    Read {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

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

    /// Run HTTP load test (writes - requires setup first)
    Write {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "5")]
        workers: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,

        /// Path to users.json file from setup
        #[arg(long, default_value = "loadtest_users.json")]
        users_file: String,
    },

    /// Run mixed workload (reads + writes)
    Mixed {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "10")]
        workers: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,

        /// Write percentage (0-100)
        #[arg(long, default_value = "20")]
        write_percent: u8,

        /// Path to users.json file from setup
        #[arg(long, default_value = "loadtest_users.json")]
        users_file: String,
    },

    /// Run WebSocket load test
    Ws {
        /// Target URL (e.g., ws://localhost:8081)
        #[arg(short, long, default_value = "ws://localhost:8081")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of concurrent connections
        #[arg(short, long, default_value = "100")]
        connections: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,

        /// Path to users.json file from setup (optional, for authenticated connections)
        #[arg(long)]
        users_file: Option<String>,

        /// Enable typing indicator simulation
        #[arg(long)]
        typing: bool,

        /// Typing interval in milliseconds (how often each client sends typing)
        #[arg(long, default_value = "1000")]
        typing_interval: u64,
    },

    /// WebSocket stress test with gradual ramp-up
    WsStress {
        /// Target URL (e.g., ws://localhost:8081)
        #[arg(short, long, default_value = "ws://localhost:8081")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Target number of connections
        #[arg(short, long, default_value = "1000")]
        connections: usize,

        /// Connections to add per second during ramp-up
        #[arg(long, default_value = "100")]
        ramp_rate: usize,

        /// Hold duration in seconds after reaching target connections
        #[arg(long, default_value = "60")]
        hold_duration: u64,

        /// Messages per second per connection (0 = subscribe only, no messages)
        #[arg(long, default_value = "2")]
        msg_rate: u64,

        /// Number of pages to distribute connections across
        #[arg(long, default_value = "100")]
        pages: usize,

        /// Stagger each connection by N milliseconds (0 = no stagger, spawn all at once in batch)
        #[arg(long, default_value = "5")]
        stagger_ms: u64,

        /// Maximum concurrent connection attempts (limits in-flight TCP handshakes)
        #[arg(long, default_value = "500")]
        max_concurrent_connects: usize,
    },

    /// Build a thread: N users each post M comments, randomly replying or starting new threads
    Thread {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of users to create
        #[arg(long, default_value = "1000")]
        users: usize,

        /// Comments per user
        #[arg(long, default_value = "1000")]
        comments_per_user: usize,

        /// Probability of replying to existing comment (0-100)
        #[arg(long, default_value = "70")]
        reply_percent: u8,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "50")]
        workers: usize,
    },

    /// Build a deeply nested chain of comments
    Deep {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Depth of the comment chain
        #[arg(long, default_value = "1000")]
        depth: usize,

        /// Number of parallel chains to create
        #[arg(long, default_value = "1")]
        chains: usize,
    },

    /// Load test voting endpoint
    Vote {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "10")]
        workers: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,

        /// Path to users.json file from setup
        #[arg(long, default_value = "loadtest_users.json")]
        users_file: String,
    },

    /// Load test authentication endpoints (login/register/refresh)
    Auth {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "10")]
        workers: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,
    },

    /// Benchmark with latency percentiles (p50/p95/p99)
    Bench {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        project_id: String,

        /// Number of concurrent workers
        #[arg(short, long, default_value = "10")]
        workers: usize,

        /// Number of requests per worker
        #[arg(short, long, default_value = "1000")]
        requests: usize,

        /// Test type: read, write, or mixed
        #[arg(long, default_value = "read")]
        test_type: String,

        /// Path to users.json file from setup
        #[arg(long, default_value = "loadtest_users.json")]
        users_file: String,
    },
}

// ============================================================================
// API Types
// ============================================================================

// TestUser and SetupData remain local as they're loadtest-specific
#[derive(Debug, Serialize, Deserialize, Clone)]
struct TestUser {
    email: String,
    password: String,
    name: String,
    token: String,
    user_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SetupData {
    users: Vec<TestUser>,
    pages: Vec<String>,
    comment_ids: Vec<String>,
}

// ============================================================================
// Stats
// ============================================================================

#[derive(Default)]
struct Stats {
    requests: AtomicU64,
    successes: AtomicU64,
    failures: AtomicU64,
    total_latency_us: AtomicU64,
}


// ============================================================================
// Main
// ============================================================================

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Setup {
            url,
            project_id,
            secret_key,
            users,
            pages,
            comments_per_page,
        } => {
            run_setup(&url, &project_id, &secret_key, users, pages, comments_per_page).await?;
        }
        Commands::Teardown { redis_url, confirm } => {
            run_teardown(&redis_url, confirm).await?;
        }
        Commands::Read {
            url,
            project_id,
            workers,
            duration,
            rps,
        } => {
            run_read_test(&url, &project_id, workers, duration, rps).await?;
        }
        Commands::Write {
            url,
            project_id,
            workers,
            duration,
            users_file,
        } => {
            run_write_test(&url, &project_id, workers, duration, &users_file).await?;
        }
        Commands::Mixed {
            url,
            project_id,
            workers,
            duration,
            write_percent,
            users_file,
        } => {
            run_mixed_test(&url, &project_id, workers, duration, write_percent, &users_file).await?;
        }
        Commands::Ws {
            url,
            project_id,
            connections,
            duration,
            users_file,
            typing,
            typing_interval,
        } => {
            run_ws_test(&url, &project_id, connections, duration, users_file.as_deref(), typing, typing_interval).await?;
        }
        Commands::WsStress {
            url,
            project_id,
            connections,
            ramp_rate,
            hold_duration,
            msg_rate,
            pages,
            stagger_ms,
            max_concurrent_connects,
        } => {
            // Raise limits and print system info for stress tests
            raise_fd_limit();
            print_system_limits();
            run_ws_stress_test(&url, &project_id, connections, ramp_rate, hold_duration, msg_rate, pages, stagger_ms, max_concurrent_connects).await?;
        }
        Commands::Thread {
            url,
            project_id,
            users,
            comments_per_user,
            reply_percent,
            workers,
        } => {
            run_thread_test(&url, &project_id, users, comments_per_user, reply_percent, workers).await?;
        }
        Commands::Deep {
            url,
            project_id,
            depth,
            chains,
        } => {
            run_deep_test(&url, &project_id, depth, chains).await?;
        }
        Commands::Vote {
            url,
            project_id,
            workers,
            duration,
            users_file,
        } => {
            run_vote_test(&url, &project_id, workers, duration, &users_file).await?;
        }
        Commands::Auth {
            url,
            project_id,
            workers,
            duration,
        } => {
            run_auth_test(&url, &project_id, workers, duration).await?;
        }
        Commands::Bench {
            url,
            project_id,
            workers,
            requests,
            test_type,
            users_file,
        } => {
            run_bench_test(&url, &project_id, workers, requests, &test_type, &users_file).await?;
        }
    }

    Ok(())
}

// ============================================================================
// Setup Command
// ============================================================================

async fn run_setup(
    url: &str,
    project_id: &str,
    _secret_key: &str,
    num_users: usize,
    num_pages: usize,
    comments_per_page: usize,
) -> Result<()> {
    tracing::info!("Setting up load test data");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Users: {}", num_users);
    tracing::info!("  Pages: {}", num_pages);
    tracing::info!("  Comments per page: {}", comments_per_page);

    let client = reqwest::Client::new();
    let mut users = Vec::with_capacity(num_users);
    let mut pages = Vec::with_capacity(num_pages);
    let mut comment_ids = Vec::new();

    // Create users
    tracing::info!("Creating {} users...", num_users);
    for i in 0..num_users {
        let email = format!("loadtest_user_{}@test.local", i);
        let password = "loadtest123".to_string();
        let name = format!("LoadTest User {}", i);

        let req = RegisterRequest {
            email: email.clone(),
            password: password.clone(),
            name: name.clone(),
        };

        let resp = client
            .post(format!("{}/v1/auth/register", url))
            .header("projectid", project_id)
            .json(&req)
            .send()
            .await
            .context("Failed to send register request")?;

        if resp.status().is_success() {
            let auth: AuthResponse = resp.json().await?;
            users.push(TestUser {
                email,
                password,
                name,
                token: auth.token,
                user_id: auth.user.id.to_string(),
            });
            if (i + 1) % 10 == 0 {
                tracing::info!("  Created {} users", i + 1);
            }
        } else {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            // User might already exist, try to login
            if body.contains("already") || body.contains("duplicate") {
                tracing::debug!("User {} already exists, skipping", email);
            } else {
                tracing::warn!("Failed to create user {}: {} - {}", email, status, body);
            }
        }
    }

    tracing::info!("Created {} users", users.len());

    if users.is_empty() {
        anyhow::bail!("No users created, cannot continue");
    }

    // Generate page URLs
    for i in 0..num_pages {
        pages.push(format!("https://loadtest.example.com/page/{}", i));
    }

    // Create comments on each page
    tracing::info!(
        "Creating {} comments across {} pages...",
        comments_per_page * num_pages,
        num_pages
    );

    let mut comment_count = 0;
    for page_url in &pages {
        for j in 0..comments_per_page {
            // Pick a random user
            let user = &users[comment_count % users.len()];

            let req = CreateCommentRequest {
                page_url: page_url.clone(),
                content: format!(
                    "Load test comment {} on page. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                    j
                ),
                parent_path: vec![],
                author_name: None,
            };

            let resp = client
                .post(format!("{}/v1/comments", url))
                .header("projectid", project_id)
                .header("Authorization", format!("Bearer {}", user.token))
                .json(&req)
                .send()
                .await;

            match resp {
                Ok(r) if r.status().is_success() => {
                    if let Ok(created) = r.json::<CreateCommentResponse>().await {
                        comment_ids.push(created.comment.id.to_string());
                    }
                    comment_count += 1;
                }
                Ok(r) => {
                    let body = r.text().await.unwrap_or_default();
                    tracing::warn!("Failed to create comment: {}", body);
                }
                Err(e) => {
                    tracing::warn!("Request failed: {}", e);
                }
            }

            if comment_count % 50 == 0 && comment_count > 0 {
                tracing::info!("  Created {} comments", comment_count);
            }
        }
    }

    tracing::info!("Created {} comments", comment_ids.len());

    // Save setup data to file
    let setup_data = SetupData {
        users,
        pages,
        comment_ids,
    };

    let json = serde_json::to_string_pretty(&setup_data)?;
    std::fs::write("loadtest_users.json", &json)?;

    tracing::info!("Setup complete! Data saved to loadtest_users.json");
    tracing::info!("  Users: {}", setup_data.users.len());
    tracing::info!("  Pages: {}", setup_data.pages.len());
    tracing::info!("  Comments: {}", setup_data.comment_ids.len());

    Ok(())
}

// ============================================================================
// Teardown Command
// ============================================================================

async fn run_teardown(redis_url: &str, confirm: bool) -> Result<()> {
    if !confirm {
        tracing::error!("Teardown requires --confirm flag");
        tracing::error!("This will FLUSH ALL DATA from Redis!");
        tracing::error!("Run with: threadkit-loadtest teardown --confirm");
        return Ok(());
    }

    tracing::warn!("Flushing Redis database at {}", redis_url);

    let client = fred::prelude::Client::new(
        fred::prelude::Config::from_url(redis_url)?,
        None,
        None,
        None,
    );
    client.init().await?;

    client.flushall::<()>(false).await?;

    tracing::info!("Redis flushed successfully");

    // Clean up local files
    if std::path::Path::new("loadtest_users.json").exists() {
        std::fs::remove_file("loadtest_users.json")?;
        tracing::info!("Removed loadtest_users.json");
    }

    Ok(())
}

// ============================================================================
// Read Test
// ============================================================================

async fn run_read_test(
    url: &str,
    project_id: &str,
    workers: usize,
    duration: u64,
    rps: u64,
) -> Result<()> {
    tracing::info!("Starting READ load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Duration: {}s", duration);
    tracing::info!(
        "  RPS limit: {}",
        if rps == 0 {
            "unlimited".to_string()
        } else {
            rps.to_string()
        }
    );

    // Load setup data if available
    let pages: Vec<String> = if let Ok(data) = std::fs::read_to_string("loadtest_users.json") {
        let setup: SetupData = serde_json::from_str(&data)?;
        tracing::info!("  Using {} pages from setup data", setup.pages.len());
        setup.pages
    } else {
        tracing::info!("  No setup data found, using default page");
        vec!["https://loadtest.example.com/page/0".to_string()]
    };

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);
    let pages = Arc::new(pages);

    // Rate limiter
    let rate_limiter = if rps > 0 {
        Some(Arc::new(Semaphore::new(rps as usize)))
    } else {
        None
    };

    let mut handles = Vec::new();

    for worker_id in 0..workers {
        let client = client.clone();
        let stats = stats.clone();
        let base_url = url.to_string();
        let project_id = project_id.to_string();
        let rate_limiter = rate_limiter.clone();
        let pages = pages.clone();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();

            while start.elapsed() < duration {
                // Rate limiting
                let _permit = if let Some(ref rl) = rate_limiter {
                    Some(rl.acquire().await.unwrap())
                } else {
                    None
                };

                // Pick a random page
                let page_url = &pages[rng.gen_range(0..pages.len())];
                let url = format!(
                    "{}/v1/comments?page_url={}",
                    base_url,
                    urlencoding::encode(page_url)
                );

                let req_start = Instant::now();
                stats.requests.fetch_add(1, Ordering::Relaxed);

                let result = client.get(&url).header("projectid", &project_id).send().await;

                let latency = req_start.elapsed().as_micros() as u64;
                stats.total_latency_us.fetch_add(latency, Ordering::Relaxed);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Ok(resp) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 {
                            tracing::debug!("Request failed: {}", resp.status());
                        }
                    }
                    Err(e) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 {
                            tracing::debug!("Request error: {}", e);
                        }
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
    let progress_handle = tokio::spawn(async move {
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
    progress_handle.abort();

    print_stats(&stats, start.elapsed());
    Ok(())
}

// ============================================================================
// Write Test
// ============================================================================

async fn run_write_test(
    url: &str,
    project_id: &str,
    workers: usize,
    duration: u64,
    users_file: &str,
) -> Result<()> {
    tracing::info!("Starting WRITE load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Duration: {}s", duration);

    // Load setup data
    let data = std::fs::read_to_string(users_file)
        .context("Failed to read users file. Run 'setup' command first.")?;
    let setup: SetupData = serde_json::from_str(&data)?;

    if setup.users.is_empty() {
        anyhow::bail!("No users in setup data");
    }

    tracing::info!("  Users: {}", setup.users.len());
    tracing::info!("  Pages: {}", setup.pages.len());

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);
    let users = Arc::new(setup.users);
    let pages = Arc::new(setup.pages);

    let mut handles = Vec::new();

    for worker_id in 0..workers {
        let client = client.clone();
        let stats = stats.clone();
        let base_url = url.to_string();
        let project_id = project_id.to_string();
        let users = users.clone();
        let pages = pages.clone();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();
            let mut counter = 0u64;

            while start.elapsed() < duration {
                // Pick a random user and page
                let user = &users[rng.gen_range(0..users.len())];
                let page_url = &pages[rng.gen_range(0..pages.len())];

                let req = CreateCommentRequest {
                    page_url: page_url.clone(),
                    content: format!(
                        "Load test comment from worker {} - {}",
                        worker_id, counter
                    ),
                    parent_path: vec![],
                    author_name: None,
                };

                let req_start = Instant::now();
                stats.requests.fetch_add(1, Ordering::Relaxed);

                let result = client
                    .post(format!("{}/v1/comments", base_url))
                    .header("projectid", &project_id)
                    .header("Authorization", format!("Bearer {}", user.token))
                    .json(&req)
                    .send()
                    .await;

                let latency = req_start.elapsed().as_micros() as u64;
                stats.total_latency_us.fetch_add(latency, Ordering::Relaxed);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Ok(resp) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 && counter % 100 == 0 {
                            tracing::debug!("Request failed: {}", resp.status());
                        }
                    }
                    Err(e) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 && counter % 100 == 0 {
                            tracing::debug!("Request error: {}", e);
                        }
                    }
                }

                counter += 1;
            }
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    let progress_handle = tokio::spawn(async move {
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
    progress_handle.abort();

    print_stats(&stats, start.elapsed());
    Ok(())
}

// ============================================================================
// Mixed Test
// ============================================================================

async fn run_mixed_test(
    url: &str,
    project_id: &str,
    workers: usize,
    duration: u64,
    write_percent: u8,
    users_file: &str,
) -> Result<()> {
    tracing::info!("Starting MIXED load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Duration: {}s", duration);
    tracing::info!("  Write %: {}%", write_percent);

    // Load setup data
    let data = std::fs::read_to_string(users_file)
        .context("Failed to read users file. Run 'setup' command first.")?;
    let setup: SetupData = serde_json::from_str(&data)?;

    if setup.users.is_empty() {
        anyhow::bail!("No users in setup data");
    }

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);
    let users = Arc::new(setup.users);
    let pages = Arc::new(setup.pages);

    let mut handles = Vec::new();

    for worker_id in 0..workers {
        let client = client.clone();
        let stats = stats.clone();
        let base_url = url.to_string();
        let project_id = project_id.to_string();
        let users = users.clone();
        let pages = pages.clone();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();
            let mut counter = 0u64;

            while start.elapsed() < duration {
                let is_write = rng.gen_range(0..100) < write_percent;
                let user = &users[rng.gen_range(0..users.len())];
                let page_url = &pages[rng.gen_range(0..pages.len())];

                let req_start = Instant::now();
                stats.requests.fetch_add(1, Ordering::Relaxed);

                let result = if is_write {
                    let req = CreateCommentRequest {
                        page_url: page_url.clone(),
                        content: format!("Mixed test comment {} - {}", worker_id, counter),
                        parent_path: vec![],
                        author_name: None,
                    };

                    client
                        .post(format!("{}/v1/comments", base_url))
                        .header("projectid", &project_id)
                        .header("Authorization", format!("Bearer {}", user.token))
                        .json(&req)
                        .send()
                        .await
                } else {
                    let url = format!(
                        "{}/v1/comments?page_url={}",
                        base_url,
                        urlencoding::encode(page_url)
                    );
                    client.get(&url).header("projectid", &project_id).send().await
                };

                let latency = req_start.elapsed().as_micros() as u64;
                stats.total_latency_us.fetch_add(latency, Ordering::Relaxed);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Ok(resp) => {
                        let status = resp.status();
                        let body = resp.text().await.unwrap_or_default();
                        tracing::warn!("Request failed: {} - {}", status, body);
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                    }
                    Err(e) => {
                        tracing::warn!("Request error: {}", e);
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                    }
                }

                counter += 1;
            }
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    let progress_handle = tokio::spawn(async move {
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
    progress_handle.abort();

    print_stats(&stats, start.elapsed());
    Ok(())
}

// ============================================================================
// WebSocket Test
// ============================================================================

/// WebSocket-specific stats
struct WsStats {
    connections_attempted: AtomicU64,
    connections_successful: AtomicU64,
    connections_failed: AtomicU64,
    messages_sent: AtomicU64,
    messages_received: AtomicU64,
    pings_sent: AtomicU64,
    pongs_received: AtomicU64,
    typing_sent: AtomicU64,
    subscribes_sent: AtomicU64,
    errors_received: AtomicU64,
}

impl Default for WsStats {
    fn default() -> Self {
        Self {
            connections_attempted: AtomicU64::new(0),
            connections_successful: AtomicU64::new(0),
            connections_failed: AtomicU64::new(0),
            messages_sent: AtomicU64::new(0),
            messages_received: AtomicU64::new(0),
            pings_sent: AtomicU64::new(0),
            pongs_received: AtomicU64::new(0),
            typing_sent: AtomicU64::new(0),
            subscribes_sent: AtomicU64::new(0),
            errors_received: AtomicU64::new(0),
        }
    }
}

async fn run_ws_test(
    url: &str,
    project_id: &str,
    connections: usize,
    duration: u64,
    users_file: Option<&str>,
    typing_enabled: bool,
    typing_interval_ms: u64,
) -> Result<()> {
    tracing::info!("Starting WebSocket load test (JSON-RPC 2.0)");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Connections: {}", connections);
    tracing::info!("  Duration: {}s", duration);
    tracing::info!("  Typing enabled: {}", typing_enabled);
    if typing_enabled {
        tracing::info!("  Typing interval: {}ms", typing_interval_ms);
    }

    // Load users if provided (for authenticated connections)
    let users: Option<Arc<Vec<TestUser>>> = if let Some(path) = users_file {
        let data = std::fs::read_to_string(path).ok();
        data.and_then(|d| serde_json::from_str::<SetupData>(&d).ok())
            .filter(|s| !s.users.is_empty())
            .map(|s| {
                tracing::info!("  Using {} users from setup data", s.users.len());
                Arc::new(s.users)
            })
    } else {
        None
    };

    // Load pages from setup data if available
    let pages: Vec<String> = if let Some(path) = users_file {
        std::fs::read_to_string(path)
            .ok()
            .and_then(|d| serde_json::from_str::<SetupData>(&d).ok())
            .map(|s| s.pages)
            .unwrap_or_else(|| {
                (0..10)
                    .map(|i| format!("https://loadtest.example.com/page/{}", i))
                    .collect()
            })
    } else {
        (0..10)
            .map(|i| format!("https://loadtest.example.com/page/{}", i))
            .collect()
    };
    let pages = Arc::new(pages);

    let stats = Arc::new(WsStats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);
    let typing_interval = Duration::from_millis(typing_interval_ms);

    let mut handles = Vec::new();

    for i in 0..connections {
        let stats = stats.clone();
        let users = users.clone();
        let pages = pages.clone();

        // Build connection URL with API key and optional token
        let token = users.as_ref().map(|u| u[i % u.len()].token.clone());
        let ws_url = if let Some(ref t) = token {
            format!("{}/ws?project_id={}&token={}", url, project_id, t)
        } else {
            format!("{}/ws?project_id={}", url, project_id)
        };

        handles.push(tokio::spawn(async move {
            use futures_util::{SinkExt, StreamExt};
            use tokio_tungstenite::connect_async;

            stats.connections_attempted.fetch_add(1, Ordering::Relaxed);

            let connect_result = connect_async(&ws_url).await;
            let (mut ws, _) = match connect_result {
                Ok(conn) => conn,
                Err(e) => {
                    tracing::debug!("Connection {} failed: {}", i, e);
                    stats.connections_failed.fetch_add(1, Ordering::Relaxed);
                    return;
                }
            };

            stats.connections_successful.fetch_add(1, Ordering::Relaxed);

            // Pick a random page to subscribe to
            let page_id = Uuid::new_v4(); // Use real page ID from hashing would be better
            let page_url = &pages[i % pages.len()];
            let _ = page_url; // We'd compute page_id from hash(site_id, page_url) in real usage

            // Subscribe to a page (JSON-RPC 2.0 format)
            let subscribe_msg = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "subscribe",
                "params": {
                    "page_id": page_id.to_string()
                }
            });
            if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                subscribe_msg.to_string().into(),
            )).await.is_ok() {
                stats.messages_sent.fetch_add(1, Ordering::Relaxed);
                stats.subscribes_sent.fetch_add(1, Ordering::Relaxed);
            }

            // Set up intervals
            let mut ping_interval = tokio::time::interval(Duration::from_secs(30));
            let mut typing_timer = if typing_enabled {
                Some(tokio::time::interval(typing_interval))
            } else {
                None
            };

            let mut rng = StdRng::from_entropy();

            while start.elapsed() < duration {
                tokio::select! {
                    // Ping every 30s
                    _ = ping_interval.tick() => {
                        let ping_msg = serde_json::json!({
                            "jsonrpc": "2.0",
                            "method": "ping"
                        });
                        if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                            ping_msg.to_string().into(),
                        )).await.is_ok() {
                            stats.messages_sent.fetch_add(1, Ordering::Relaxed);
                            stats.pings_sent.fetch_add(1, Ordering::Relaxed);
                        } else {
                            break;
                        }
                    }

                    // Typing indicator (if enabled)
                    _ = async {
                        if let Some(ref mut timer) = typing_timer {
                            timer.tick().await
                        } else {
                            std::future::pending::<tokio::time::Instant>().await
                        }
                    } => {
                        // Randomly decide to reply to something or type at root
                        let reply_to: Option<Uuid> = if rng.gen_bool(0.3) {
                            Some(Uuid::new_v4()) // Fake comment ID
                        } else {
                            None
                        };

                        let typing_msg = serde_json::json!({
                            "jsonrpc": "2.0",
                            "method": "typing",
                            "params": {
                                "page_id": page_id.to_string(),
                                "reply_to": reply_to.map(|u| u.to_string())
                            }
                        });
                        if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                            typing_msg.to_string().into(),
                        )).await.is_ok() {
                            stats.messages_sent.fetch_add(1, Ordering::Relaxed);
                            stats.typing_sent.fetch_add(1, Ordering::Relaxed);
                        } else {
                            break;
                        }
                    }

                    // Receive messages
                    msg = ws.next() => {
                        match msg {
                            Some(Ok(tokio_tungstenite::tungstenite::Message::Text(text))) => {
                                stats.messages_received.fetch_add(1, Ordering::Relaxed);

                                // Parse and track message types
                                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
                                    match json.get("method").and_then(|m| m.as_str()) {
                                        Some("pong") => {
                                            stats.pongs_received.fetch_add(1, Ordering::Relaxed);
                                        }
                                        Some("error") => {
                                            stats.errors_received.fetch_add(1, Ordering::Relaxed);
                                            tracing::debug!("Connection {} received error: {}", i, text);
                                        }
                                        Some("connected") => {
                                            // Expected on connection
                                        }
                                        Some("presence") => {
                                            // Expected after subscribe
                                        }
                                        Some(other) => {
                                            tracing::trace!("Connection {} received: {}", i, other);
                                        }
                                        None => {}
                                    }
                                }
                            }
                            Some(Ok(tokio_tungstenite::tungstenite::Message::Ping(data))) => {
                                let _ = ws.send(tokio_tungstenite::tungstenite::Message::Pong(data)).await;
                            }
                            Some(Ok(_)) => {
                                // Binary, Pong, Close, Frame
                            }
                            Some(Err(e)) => {
                                tracing::debug!("Connection {} error: {}", i, e);
                                break;
                            }
                            None => break,
                        }
                    }
                }
            }

            // Send unsubscribe before closing
            let unsubscribe_msg = serde_json::json!({
                "jsonrpc": "2.0",
                "method": "unsubscribe",
                "params": {
                    "page_id": page_id.to_string()
                }
            });
            let _ = ws.send(tokio_tungstenite::tungstenite::Message::Text(
                unsubscribe_msg.to_string().into(),
            )).await;

            let _ = ws.close(None).await;
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    let progress_handle = tokio::spawn(async move {
        let mut last_sent = 0u64;
        let mut last_recv = 0u64;
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let connected = stats_clone.connections_successful.load(Ordering::Relaxed);
            let failed = stats_clone.connections_failed.load(Ordering::Relaxed);
            let sent = stats_clone.messages_sent.load(Ordering::Relaxed);
            let recv = stats_clone.messages_received.load(Ordering::Relaxed);
            let sent_per_sec = sent - last_sent;
            let recv_per_sec = recv - last_recv;
            last_sent = sent;
            last_recv = recv;
            tracing::info!(
                "  Conn: {}/{} | Sent/s: {} | Recv/s: {} | Total: {}/{}",
                connected,
                connected + failed,
                sent_per_sec,
                recv_per_sec,
                sent,
                recv
            );
        }
    });

    // Wait for all connections
    for handle in handles {
        let _ = handle.await;
    }
    progress_handle.abort();

    // Print results
    let elapsed = start.elapsed();
    let attempted = stats.connections_attempted.load(Ordering::Relaxed);
    let successful = stats.connections_successful.load(Ordering::Relaxed);
    let failed = stats.connections_failed.load(Ordering::Relaxed);
    let sent = stats.messages_sent.load(Ordering::Relaxed);
    let recv = stats.messages_received.load(Ordering::Relaxed);
    let pings = stats.pings_sent.load(Ordering::Relaxed);
    let pongs = stats.pongs_received.load(Ordering::Relaxed);
    let typing = stats.typing_sent.load(Ordering::Relaxed);
    let subscribes = stats.subscribes_sent.load(Ordering::Relaxed);
    let errors = stats.errors_received.load(Ordering::Relaxed);

    println!("\n========== WebSocket Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!();
    println!("Connections:");
    println!("  Attempted: {}", attempted);
    println!("  Successful: {}", successful);
    println!("  Failed: {}", failed);
    println!("  Success rate: {:.2}%", if attempted > 0 { successful as f64 / attempted as f64 * 100.0 } else { 0.0 });
    println!();
    println!("Messages:");
    println!("  Total sent: {}", sent);
    println!("  Total received: {}", recv);
    println!("  Sent/sec: {:.2}", sent as f64 / elapsed.as_secs_f64());
    println!("  Recv/sec: {:.2}", recv as f64 / elapsed.as_secs_f64());
    println!();
    println!("By type:");
    println!("  Subscribes: {}", subscribes);
    println!("  Pings sent: {}", pings);
    println!("  Pongs received: {}", pongs);
    println!("  Typing sent: {}", typing);
    println!("  Errors received: {}", errors);

    Ok(())
}

// ============================================================================
// Helpers
// ============================================================================

fn print_stats(stats: &Stats, elapsed: Duration) {
    let total_requests = stats.requests.load(Ordering::Relaxed);
    let successes = stats.successes.load(Ordering::Relaxed);
    let failures = stats.failures.load(Ordering::Relaxed);
    let total_latency = stats.total_latency_us.load(Ordering::Relaxed);
    let avg_latency = if total_requests > 0 {
        total_latency / total_requests
    } else {
        0
    };

    println!("\n========== Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Total requests: {}", total_requests);
    println!("Successful: {}", successes);
    println!("Failed: {}", failures);
    println!(
        "RPS: {:.2}",
        total_requests as f64 / elapsed.as_secs_f64()
    );
    println!("Avg latency: {:.2}ms", avg_latency as f64 / 1000.0);
    if total_requests > 0 {
        println!(
            "Success rate: {:.2}%",
            successes as f64 / total_requests as f64 * 100.0
        );
    }
}

// ============================================================================
// Thread Test - Many users building a conversation with replies
// ============================================================================

async fn run_thread_test(
    url: &str,
    project_id: &str,
    num_users: usize,
    comments_per_user: usize,
    reply_percent: u8,
    num_workers: usize,
) -> Result<()> {
    tracing::info!("Starting THREAD building test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Users: {}", num_users);
    tracing::info!("  Comments per user: {}", comments_per_user);
    tracing::info!("  Reply probability: {}%", reply_percent);
    tracing::info!("  Workers: {}", num_workers);

    let client = reqwest::Client::new();
    let page_url = "https://loadtest.example.com/thread-test";

    // Step 1: Create users
    tracing::info!("Creating {} users...", num_users);
    let mut users = Vec::with_capacity(num_users);

    for i in 0..num_users {
        let email = format!("thread_user_{}@test.local", i);
        let password = "threadtest123".to_string();
        let name = format!("ThreadUser{}", i);

        let req = RegisterRequest {
            email: email.clone(),
            password: password.clone(),
            name: name.clone(),
        };

        let resp = client
            .post(format!("{}/v1/auth/register", url))
            .header("projectid", project_id)
            .json(&req)
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => {
                if let Ok(auth) = r.json::<AuthResponse>().await {
                    users.push(TestUser {
                        email,
                        password,
                        name,
                        token: auth.token,
                        user_id: auth.user.id.to_string(),
                    });
                }
            }
            _ => {}
        }

        if (i + 1) % 100 == 0 {
            tracing::info!("  Created {} users", users.len());
        }
    }

    tracing::info!("Created {} users", users.len());

    if users.is_empty() {
        anyhow::bail!("No users created");
    }

    // Step 2: Create comments with threading
    let total_comments = num_users * comments_per_user;
    tracing::info!("Creating {} comments with threading...", total_comments);

    let users = Arc::new(users);
    let comment_ids = Arc::new(tokio::sync::RwLock::new(Vec::<String>::new()));
    let stats = Arc::new(Stats::default());
    let start = Instant::now();

    // Distribute comments across workers
    let comments_per_worker = total_comments / num_workers;
    let mut handles = Vec::new();

    for worker_id in 0..num_workers {
        let client = client.clone();
        let users = users.clone();
        let comment_ids = comment_ids.clone();
        let stats = stats.clone();
        let url = url.to_string();
        let project_id = project_id.to_string();
        let page_url = page_url.to_string();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();

            for i in 0..comments_per_worker {
                let user = &users[rng.gen_range(0..users.len())];

                // For now, just create top-level comments
                // TODO: Track parent_path for replies when API returns it
                let _ = reply_percent; // suppress unused warning

                let req = CreateCommentRequest {
                    page_url: page_url.clone(),
                    content: format!(
                        "Thread comment {} from worker {}. This is a test comment with some content.",
                        i, worker_id
                    ),
                    parent_path: vec![],
                    author_name: None,
                };

                stats.requests.fetch_add(1, Ordering::Relaxed);

                let resp = client
                    .post(format!("{}/v1/comments", url))
                    .header("projectid", &project_id)
                    .header("Authorization", format!("Bearer {}", user.token))
                    .json(&req)
                    .send()
                    .await;

                match resp {
                    Ok(r) if r.status().is_success() => {
                        if let Ok(created) = r.json::<CreateCommentResponse>().await {
                            comment_ids.write().await.push(created.comment.id.to_string());
                            stats.successes.fetch_add(1, Ordering::Relaxed);
                        }
                    }
                    _ => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    let comment_ids_clone = comment_ids.clone();
    let progress_handle = tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let total = stats_clone.requests.load(Ordering::Relaxed);
            let success = stats_clone.successes.load(Ordering::Relaxed);
            let comments = comment_ids_clone.read().await.len();
            tracing::info!(
                "  Progress: {}/{} requests | {} comments created",
                success,
                total,
                comments
            );
        }
    });

    for handle in handles {
        let _ = handle.await;
    }
    progress_handle.abort();

    let elapsed = start.elapsed();
    let final_count = comment_ids.read().await.len();

    println!("\n========== Thread Test Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Users created: {}", users.len());
    println!("Comments created: {}", final_count);
    println!(
        "Comments/sec: {:.2}",
        final_count as f64 / elapsed.as_secs_f64()
    );
    print_stats(&stats, elapsed);

    Ok(())
}

// ============================================================================
// Deep Test - Build deeply nested comment chains
// ============================================================================

async fn run_deep_test(
    url: &str,
    project_id: &str,
    depth: usize,
    num_chains: usize,
) -> Result<()> {
    tracing::info!("Starting DEEP nesting test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Depth: {}", depth);
    tracing::info!("  Parallel chains: {}", num_chains);

    let client = reqwest::Client::new();

    // Create a test user
    tracing::info!("Creating test user...");
    let email = "deep_test_user@test.local";
    let password = "deeptest123";
    let name = "DeepTestUser";

    let req = RegisterRequest {
        email: email.to_string(),
        password: password.to_string(),
        name: name.to_string(),
    };

    let resp = client
        .post(format!("{}/v1/auth/register", url))
        .header("projectid", project_id)
        .json(&req)
        .send()
        .await
        .context("Failed to register user")?;

    let token = if resp.status().is_success() {
        let auth: AuthResponse = resp.json().await?;
        auth.token
    } else {
        anyhow::bail!("Failed to create test user: {}", resp.text().await?);
    };

    tracing::info!("User created, building {} chains of depth {}...", num_chains, depth);

    let start = Instant::now();
    let mut handles = Vec::new();

    for chain_id in 0..num_chains {
        let client = client.clone();
        let url = url.to_string();
        let project_id = project_id.to_string();
        let token = token.clone();

        handles.push(tokio::spawn(async move {
            let page_url = format!("https://loadtest.example.com/deep-chain-{}", chain_id);
            let mut parent_path: Vec<Uuid> = vec![];
            let mut created = 0;

            for level in 0..depth {
                let req = CreateCommentRequest {
                    page_url: page_url.clone(),
                    content: format!(
                        "Deep comment at level {} in chain {}. Lorem ipsum dolor sit amet.",
                        level, chain_id
                    ),
                    parent_path: parent_path.clone(),
                    author_name: None,
                };

                let resp = client
                    .post(format!("{}/v1/comments", url))
                    .header("projectid", &project_id)
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&req)
                    .send()
                    .await;

                match resp {
                    Ok(r) if r.status().is_success() => {
                        if let Ok(comment) = r.json::<CreateCommentResponse>().await {
                            // Add the new comment's ID to the path for the next reply
                            parent_path.push(comment.comment.id);
                            created += 1;
                        }
                    }
                    Ok(r) => {
                        let status = r.status();
                        let body = r.text().await.unwrap_or_default();
                        tracing::warn!(
                            "Chain {} level {} failed: {} - {}",
                            chain_id,
                            level,
                            status,
                            body
                        );
                        break;
                    }
                    Err(e) => {
                        tracing::warn!("Chain {} level {} error: {}", chain_id, level, e);
                        break;
                    }
                }

                if (level + 1) % 100 == 0 {
                    tracing::info!("  Chain {}: depth {}/{}", chain_id, level + 1, depth);
                }
            }

            created
        }));
    }

    let mut total_created = 0;
    for handle in handles {
        if let Ok(count) = handle.await {
            total_created += count;
        }
    }

    let elapsed = start.elapsed();

    println!("\n========== Deep Nesting Test Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Chains: {}", num_chains);
    println!("Target depth: {}", depth);
    println!("Total comments created: {}", total_created);
    println!(
        "Comments/sec: {:.2}",
        total_created as f64 / elapsed.as_secs_f64()
    );

    // Now test reading the deep chain
    tracing::info!("Testing read performance on deep chain...");
    let read_start = Instant::now();

    let page_url = "https://loadtest.example.com/deep-chain-0";
    let resp = client
        .get(format!(
            "{}/v1/comments?page_url={}",
            url,
            urlencoding::encode(page_url)
        ))
        .header("projectid", project_id)
        .send()
        .await?;

    let read_elapsed = read_start.elapsed();
    println!("Read deep chain: {:?} (status: {})", read_elapsed, resp.status());

    Ok(())
}

// ============================================================================
// Vote Test - Load test voting endpoint
// ============================================================================

async fn run_vote_test(
    url: &str,
    project_id: &str,
    workers: usize,
    duration: u64,
    users_file: &str,
) -> Result<()> {
    tracing::info!("Starting VOTE load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Duration: {}s", duration);

    // Load setup data
    let data = std::fs::read_to_string(users_file)
        .context("Failed to read users file. Run 'setup' command first.")?;
    let setup: SetupData = serde_json::from_str(&data)?;

    if setup.users.is_empty() || setup.comment_ids.is_empty() {
        anyhow::bail!("No users or comments in setup data. Run 'setup' first.");
    }

    tracing::info!("  Users: {}", setup.users.len());
    tracing::info!("  Comments to vote on: {}", setup.comment_ids.len());

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);
    let users = Arc::new(setup.users);
    let comment_ids = Arc::new(setup.comment_ids);
    let pages = Arc::new(setup.pages);

    let mut handles = Vec::new();

    for worker_id in 0..workers {
        let client = client.clone();
        let stats = stats.clone();
        let base_url = url.to_string();
        let project_id = project_id.to_string();
        let users = users.clone();
        let comment_ids = comment_ids.clone();
        let pages = pages.clone();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();

            while start.elapsed() < duration {
                // Pick random user, comment, and vote direction
                let user = &users[rng.gen_range(0..users.len())];
                let comment_id = &comment_ids[rng.gen_range(0..comment_ids.len())];
                let page_url = &pages[rng.gen_range(0..pages.len())];
                let direction = if rng.gen_bool(0.7) { "up" } else { "down" };

                let req = serde_json::json!({
                    "page_url": page_url,
                    "direction": direction
                });

                let req_start = Instant::now();
                stats.requests.fetch_add(1, Ordering::Relaxed);

                let result = client
                    .post(format!("{}/v1/comments/{}/vote", base_url, comment_id))
                    .header("projectid", &project_id)
                    .header("Authorization", format!("Bearer {}", user.token))
                    .json(&req)
                    .send()
                    .await;

                let latency = req_start.elapsed().as_micros() as u64;
                stats.total_latency_us.fetch_add(latency, Ordering::Relaxed);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Ok(resp) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 {
                            tracing::debug!("Vote failed: {}", resp.status());
                        }
                    }
                    Err(e) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 {
                            tracing::debug!("Vote error: {}", e);
                        }
                    }
                }
            }
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    let progress_handle = tokio::spawn(async move {
        let mut last_requests = 0;
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let current = stats_clone.requests.load(Ordering::Relaxed);
            let rps = current - last_requests;
            last_requests = current;
            tracing::info!("  RPS: {} | Total: {}", rps, current);
        }
    });

    for handle in handles {
        let _ = handle.await;
    }
    progress_handle.abort();

    print_stats(&stats, start.elapsed());
    Ok(())
}

// ============================================================================
// Auth Test - Load test authentication endpoints
// ============================================================================

async fn run_auth_test(
    url: &str,
    project_id: &str,
    workers: usize,
    duration: u64,
) -> Result<()> {
    tracing::info!("Starting AUTH load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Duration: {}s", duration);

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration_dur = Duration::from_secs(duration);

    let mut handles = Vec::new();

    for worker_id in 0..workers {
        let client = client.clone();
        let stats = stats.clone();
        let base_url = url.to_string();
        let project_id = project_id.to_string();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();
            let mut counter = 0u64;

            while start.elapsed() < duration_dur {
                // Rotate between register (new user) and login (attempt with random creds)
                let op = rng.gen_range(0..10);

                let req_start = Instant::now();
                stats.requests.fetch_add(1, Ordering::Relaxed);

                let result = if op < 3 {
                    // 30% - Register new user
                    let email = format!("authtest_{}_{}_{}@test.local", worker_id, counter, rng.r#gen::<u32>());
                    let req = RegisterRequest {
                        email,
                        password: "authtest123".to_string(),
                        name: format!("AuthTest {}", counter),
                    };

                    client
                        .post(format!("{}/v1/auth/register", base_url))
                        .header("projectid", &project_id)
                        .json(&req)
                        .send()
                        .await
                } else {
                    // 70% - Login attempt (may fail, that's ok)
                    let req = serde_json::json!({
                        "email": format!("authtest_{}_0@test.local", rng.gen_range(0..workers)),
                        "password": "authtest123"
                    });

                    client
                        .post(format!("{}/v1/auth/login", base_url))
                        .header("projectid", &project_id)
                        .json(&req)
                        .send()
                        .await
                };

                let latency = req_start.elapsed().as_micros() as u64;
                stats.total_latency_us.fetch_add(latency, Ordering::Relaxed);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Ok(_) => {
                        // Auth failures are expected for login attempts
                        stats.successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Err(e) => {
                        stats.failures.fetch_add(1, Ordering::Relaxed);
                        if worker_id == 0 {
                            tracing::debug!("Auth error: {}", e);
                        }
                    }
                }

                counter += 1;
            }
        }));
    }

    // Progress reporter
    let stats_clone = stats.clone();
    let progress_handle = tokio::spawn(async move {
        let mut last_requests = 0;
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let current = stats_clone.requests.load(Ordering::Relaxed);
            let rps = current - last_requests;
            last_requests = current;
            tracing::info!("  RPS: {} | Total: {}", rps, current);
        }
    });

    for handle in handles {
        let _ = handle.await;
    }
    progress_handle.abort();

    print_stats(&stats, start.elapsed());
    Ok(())
}

// ============================================================================
// Benchmark Test - With latency percentiles
// ============================================================================

async fn run_bench_test(
    url: &str,
    project_id: &str,
    workers: usize,
    requests_per_worker: usize,
    test_type: &str,
    users_file: &str,
) -> Result<()> {
    tracing::info!("Starting BENCHMARK test with percentiles");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Workers: {}", workers);
    tracing::info!("  Requests per worker: {}", requests_per_worker);
    tracing::info!("  Test type: {}", test_type);

    // Load setup data
    let setup: Option<SetupData> = std::fs::read_to_string(users_file)
        .ok()
        .and_then(|data| serde_json::from_str(&data).ok());

    let pages: Vec<String> = setup
        .as_ref()
        .map(|s| s.pages.clone())
        .unwrap_or_else(|| vec!["https://loadtest.example.com/page/0".to_string()]);

    let users: Vec<TestUser> = setup
        .as_ref()
        .map(|s| s.users.clone())
        .unwrap_or_default();

    if test_type != "read" && users.is_empty() {
        anyhow::bail!("Write/mixed tests require setup data with users");
    }

    let client = reqwest::Client::builder()
        .pool_max_idle_per_host(workers)
        .build()?;

    let latencies = Arc::new(tokio::sync::Mutex::new(Vec::with_capacity(
        workers * requests_per_worker,
    )));
    let successes = Arc::new(AtomicU64::new(0));
    let failures = Arc::new(AtomicU64::new(0));

    let start = Instant::now();
    let pages = Arc::new(pages);
    let users = Arc::new(users);

    let mut handles = Vec::new();

    for worker_id in 0..workers {
        let client = client.clone();
        let latencies = latencies.clone();
        let successes = successes.clone();
        let failures = failures.clone();
        let base_url = url.to_string();
        let project_id = project_id.to_string();
        let pages = pages.clone();
        let users = users.clone();
        let test_type = test_type.to_string();

        handles.push(tokio::spawn(async move {
            let mut rng = StdRng::from_entropy();
            let mut worker_latencies = Vec::with_capacity(requests_per_worker);

            for i in 0..requests_per_worker {
                let page_url = &pages[rng.gen_range(0..pages.len())];

                let req_start = Instant::now();

                let result = match test_type.as_str() {
                    "read" => {
                        let url = format!(
                            "{}/v1/comments?page_url={}",
                            base_url,
                            urlencoding::encode(page_url)
                        );
                        client.get(&url).header("projectid", &project_id).send().await
                    }
                    "write" => {
                        let user = &users[rng.gen_range(0..users.len())];
                        let req = CreateCommentRequest {
                            page_url: page_url.clone(),
                            content: format!("Bench comment {} from worker {}", i, worker_id),
                            parent_path: vec![],
                            author_name: None,
                        };
                        client
                            .post(format!("{}/v1/comments", base_url))
                            .header("projectid", &project_id)
                            .header("Authorization", format!("Bearer {}", user.token))
                            .json(&req)
                            .send()
                            .await
                    }
                    _ => {
                        // Mixed: 80% read, 20% write
                        if rng.gen_range(0..100) < 80 {
                            let url = format!(
                                "{}/v1/comments?page_url={}",
                                base_url,
                                urlencoding::encode(page_url)
                            );
                            client.get(&url).header("projectid", &project_id).send().await
                        } else {
                            let user = &users[rng.gen_range(0..users.len())];
                            let req = CreateCommentRequest {
                                page_url: page_url.clone(),
                                content: format!("Bench comment {} from worker {}", i, worker_id),
                                parent_path: vec![],
                                author_name: None,
                            };
                            client
                                .post(format!("{}/v1/comments", base_url))
                                .header("projectid", &project_id)
                                .header("Authorization", format!("Bearer {}", user.token))
                                .json(&req)
                                .send()
                                .await
                        }
                    }
                };

                let latency_us = req_start.elapsed().as_micros() as u64;
                worker_latencies.push(latency_us);

                match result {
                    Ok(resp) if resp.status().is_success() => {
                        successes.fetch_add(1, Ordering::Relaxed);
                    }
                    Ok(_) => {
                        failures.fetch_add(1, Ordering::Relaxed);
                    }
                    Err(_) => {
                        failures.fetch_add(1, Ordering::Relaxed);
                    }
                }
            }

            // Merge worker latencies into global
            latencies.lock().await.extend(worker_latencies);
        }));
    }

    // Progress reporter
    let successes_clone = successes.clone();
    let failures_clone = failures.clone();
    let total_requests = workers * requests_per_worker;
    let progress_handle = tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let done = successes_clone.load(Ordering::Relaxed) + failures_clone.load(Ordering::Relaxed);
            tracing::info!("  Progress: {}/{}", done, total_requests);
        }
    });

    for handle in handles {
        let _ = handle.await;
    }
    progress_handle.abort();

    let elapsed = start.elapsed();

    // Calculate percentiles
    let mut all_latencies = latencies.lock().await;
    all_latencies.sort();

    let total = all_latencies.len();
    let p50 = all_latencies.get(total * 50 / 100).copied().unwrap_or(0);
    let p95 = all_latencies.get(total * 95 / 100).copied().unwrap_or(0);
    let p99 = all_latencies.get(total * 99 / 100).copied().unwrap_or(0);
    let min = all_latencies.first().copied().unwrap_or(0);
    let max = all_latencies.last().copied().unwrap_or(0);
    let avg = if total > 0 {
        all_latencies.iter().sum::<u64>() / total as u64
    } else {
        0
    };

    let total_requests = successes.load(Ordering::Relaxed) + failures.load(Ordering::Relaxed);
    let success_count = successes.load(Ordering::Relaxed);
    let failure_count = failures.load(Ordering::Relaxed);

    println!("\n========== Benchmark Results ==========");
    println!("Test type: {}", test_type);
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Total requests: {}", total_requests);
    println!("Successful: {}", success_count);
    println!("Failed: {}", failure_count);
    println!("RPS: {:.2}", total_requests as f64 / elapsed.as_secs_f64());
    println!();
    println!("Latency (microseconds):");
    println!("  Min: {}µs ({:.2}ms)", min, min as f64 / 1000.0);
    println!("  Avg: {}µs ({:.2}ms)", avg, avg as f64 / 1000.0);
    println!("  p50: {}µs ({:.2}ms)", p50, p50 as f64 / 1000.0);
    println!("  p95: {}µs ({:.2}ms)", p95, p95 as f64 / 1000.0);
    println!("  p99: {}µs ({:.2}ms)", p99, p99 as f64 / 1000.0);
    println!("  Max: {}µs ({:.2}ms)", max, max as f64 / 1000.0);
    if total_requests > 0 {
        println!(
            "Success rate: {:.2}%",
            success_count as f64 / total_requests as f64 * 100.0
        );
    }

    Ok(())
}

// ============================================================================
// WebSocket Stress Test - Gradual ramp-up to find breaking point
// ============================================================================

/// Stress test stats with atomic counters
struct StressStats {
    connections_attempted: AtomicU64,
    connections_active: AtomicU64,
    connections_failed: AtomicU64,
    connections_dropped: AtomicU64,
    messages_sent: AtomicU64,
    messages_received: AtomicU64,
    errors: AtomicU64,
}

impl Default for StressStats {
    fn default() -> Self {
        Self {
            connections_attempted: AtomicU64::new(0),
            connections_active: AtomicU64::new(0),
            connections_failed: AtomicU64::new(0),
            connections_dropped: AtomicU64::new(0),
            messages_sent: AtomicU64::new(0),
            messages_received: AtomicU64::new(0),
            errors: AtomicU64::new(0),
        }
    }
}

async fn run_ws_stress_test(
    url: &str,
    project_id: &str,
    target_connections: usize,
    ramp_rate: usize,
    hold_duration: u64,
    msg_rate: u64,
    num_pages: usize,
    stagger_ms: u64,
    max_concurrent_connects: usize,
) -> Result<()> {
    tracing::info!("Starting WebSocket STRESS test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Target connections: {}", target_connections);
    tracing::info!("  Ramp rate: {} connections/sec", ramp_rate);
    tracing::info!("  Hold duration: {}s", hold_duration);
    tracing::info!("  Message rate: {} msg/sec/conn", msg_rate);
    tracing::info!("  Pages: {}", num_pages);
    tracing::info!("  Stagger: {}ms between connections", stagger_ms);
    tracing::info!("  Max concurrent connects: {}", max_concurrent_connects);

    let stats = Arc::new(StressStats::default());
    let start = Instant::now();

    // Semaphore to limit concurrent in-flight connection attempts
    let connect_semaphore = Arc::new(Semaphore::new(max_concurrent_connects));

    // Pre-generate page IDs
    let page_ids: Vec<Uuid> = (0..num_pages).map(|_| Uuid::new_v4()).collect();
    let page_ids = Arc::new(page_ids);

    // Channel to signal shutdown
    let (shutdown_tx, _) = tokio::sync::broadcast::channel::<()>(1);

    // Spawn connection handles
    let mut handles: Vec<tokio::task::JoinHandle<()>> = Vec::new();

    // Calculate ramp-up phases
    let ramp_duration_secs = (target_connections + ramp_rate - 1) / ramp_rate;
    let connections_per_batch = ramp_rate;
    let batch_interval = Duration::from_secs(1);

    // Stagger delay between connections within a batch
    let stagger_delay = Duration::from_millis(stagger_ms);

    tracing::info!("Ramp-up will take ~{}s to reach {} connections", ramp_duration_secs, target_connections);

    let mut connections_spawned = 0;

    // Ramp-up phase
    while connections_spawned < target_connections {
        let batch_size = (target_connections - connections_spawned).min(connections_per_batch);
        let batch_start = Instant::now();

        for i in 0..batch_size {
            let conn_id = connections_spawned + i;
            let stats = stats.clone();
            let page_ids = page_ids.clone();
            let mut shutdown_rx = shutdown_tx.subscribe();
            let ws_url = format!("{}/ws?project_id={}", url, project_id);
            let msg_interval = if msg_rate > 0 {
                Some(Duration::from_millis(1000 / msg_rate))
            } else {
                None
            };
            let semaphore = connect_semaphore.clone();

            // Stagger connection establishment to avoid overwhelming the server
            if stagger_ms > 0 && i > 0 {
                tokio::time::sleep(stagger_delay).await;
            }

            handles.push(tokio::spawn(async move {
                use futures_util::{SinkExt, StreamExt};
                use tokio::net::TcpSocket;
                use tokio_tungstenite::client_async;

                stats.connections_attempted.fetch_add(1, Ordering::Relaxed);

                // Parse the WebSocket URL to get host:port
                let url = url::Url::parse(&ws_url).unwrap();
                let host = url.host_str().unwrap_or("localhost");
                let port = url.port().unwrap_or(8081);

                // Resolve address - handle "localhost" specially
                let sock_addr: std::net::SocketAddr = if host == "localhost" {
                    format!("127.0.0.1:{}", port).parse().unwrap()
                } else {
                    use std::net::ToSocketAddrs;
                    match format!("{}:{}", host, port).to_socket_addrs() {
                        Ok(mut addrs) => match addrs.next() {
                            Some(addr) => addr,
                            None => {
                                tracing::debug!("Connection {} failed: DNS lookup returned no addresses", conn_id);
                                stats.connections_failed.fetch_add(1, Ordering::Relaxed);
                                return;
                            }
                        },
                        Err(e) => {
                            tracing::debug!("Connection {} failed: DNS lookup error: {}", conn_id, e);
                            stats.connections_failed.fetch_add(1, Ordering::Relaxed);
                            return;
                        }
                    }
                };

                // Acquire semaphore permit to limit concurrent connection attempts
                let _permit = semaphore.acquire().await.unwrap();

                // Create TCP socket with SO_REUSEADDR for faster port recycling
                let connect_result = tokio::time::timeout(Duration::from_secs(30), async {
                    let socket = TcpSocket::new_v4()?;
                    socket.set_reuseaddr(true)?;
                    let tcp_stream = socket.connect(sock_addr).await?;
                    client_async(&ws_url, tcp_stream).await
                        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
                }).await;

                // Release permit after connection established (drop happens automatically)
                drop(_permit);

                let (mut ws, _) = match connect_result {
                    Ok(Ok(conn)) => conn,
                    Ok(Err(e)) => {
                        tracing::debug!("Connection {} failed: {}", conn_id, e);
                        stats.connections_failed.fetch_add(1, Ordering::Relaxed);
                        return;
                    }
                    Err(_) => {
                        tracing::debug!("Connection {} timed out", conn_id);
                        stats.connections_failed.fetch_add(1, Ordering::Relaxed);
                        return;
                    }
                };

                stats.connections_active.fetch_add(1, Ordering::Relaxed);

                // Pick a page to subscribe to (distribute across pages)
                let page_id = page_ids[conn_id % page_ids.len()];

                // Subscribe
                let subscribe_msg = serde_json::json!({
                    "jsonrpc": "2.0",
                    "method": "subscribe",
                    "params": { "page_id": page_id.to_string() }
                });
                if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                    subscribe_msg.to_string().into(),
                )).await.is_ok() {
                    stats.messages_sent.fetch_add(1, Ordering::Relaxed);
                }

                // Message loop
                let mut msg_timer = msg_interval.map(tokio::time::interval);
                let mut ping_timer = tokio::time::interval(Duration::from_secs(30));

                loop {
                    tokio::select! {
                        // Check for shutdown
                        _ = shutdown_rx.recv() => {
                            break;
                        }

                        // Send ping periodically
                        _ = ping_timer.tick() => {
                            let ping_msg = serde_json::json!({
                                "jsonrpc": "2.0",
                                "method": "ping"
                            });
                            if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                                ping_msg.to_string().into(),
                            )).await.is_err() {
                                stats.connections_dropped.fetch_add(1, Ordering::Relaxed);
                                stats.connections_active.fetch_sub(1, Ordering::Relaxed);
                                return;
                            }
                            stats.messages_sent.fetch_add(1, Ordering::Relaxed);
                        }

                        // Send typing indicators at msg_rate
                        _ = async {
                            if let Some(ref mut timer) = msg_timer {
                                timer.tick().await
                            } else {
                                std::future::pending::<tokio::time::Instant>().await
                            }
                        } => {
                            let typing_msg = serde_json::json!({
                                "jsonrpc": "2.0",
                                "method": "typing",
                                "params": {
                                    "page_id": page_id.to_string(),
                                    "reply_to": null
                                }
                            });
                            if ws.send(tokio_tungstenite::tungstenite::Message::Text(
                                typing_msg.to_string().into(),
                            )).await.is_err() {
                                stats.connections_dropped.fetch_add(1, Ordering::Relaxed);
                                stats.connections_active.fetch_sub(1, Ordering::Relaxed);
                                return;
                            }
                            stats.messages_sent.fetch_add(1, Ordering::Relaxed);
                        }

                        // Receive messages
                        msg = ws.next() => {
                            match msg {
                                Some(Ok(tokio_tungstenite::tungstenite::Message::Text(_))) => {
                                    stats.messages_received.fetch_add(1, Ordering::Relaxed);
                                }
                                Some(Ok(tokio_tungstenite::tungstenite::Message::Ping(data))) => {
                                    let _ = ws.send(tokio_tungstenite::tungstenite::Message::Pong(data)).await;
                                }
                                Some(Ok(_)) => {}
                                Some(Err(e)) => {
                                    tracing::debug!("Connection {} error: {}", conn_id, e);
                                    stats.errors.fetch_add(1, Ordering::Relaxed);
                                    stats.connections_dropped.fetch_add(1, Ordering::Relaxed);
                                    stats.connections_active.fetch_sub(1, Ordering::Relaxed);
                                    return;
                                }
                                None => {
                                    stats.connections_dropped.fetch_add(1, Ordering::Relaxed);
                                    stats.connections_active.fetch_sub(1, Ordering::Relaxed);
                                    return;
                                }
                            }
                        }
                    }
                }

                // Clean shutdown
                let _ = ws.close(None).await;
                stats.connections_active.fetch_sub(1, Ordering::Relaxed);
            }));
        }

        connections_spawned += batch_size;

        // Print progress
        let active = stats.connections_active.load(Ordering::Relaxed);
        let failed = stats.connections_failed.load(Ordering::Relaxed);
        let dropped = stats.connections_dropped.load(Ordering::Relaxed);
        let sent = stats.messages_sent.load(Ordering::Relaxed);
        let recv = stats.messages_received.load(Ordering::Relaxed);

        tracing::info!(
            "RAMP: {} spawned | {} active | {} failed | {} dropped | sent/recv: {}/{}",
            connections_spawned, active, failed, dropped, sent, recv
        );

        // Wait for remaining time in batch interval (accounting for stagger time spent)
        if connections_spawned < target_connections {
            let batch_elapsed = batch_start.elapsed();
            if batch_elapsed < batch_interval {
                tokio::time::sleep(batch_interval - batch_elapsed).await;
            }
        }
    }

    tracing::info!("Ramp-up complete! Holding {} connections for {}s...",
        stats.connections_active.load(Ordering::Relaxed), hold_duration);

    // Hold phase - monitor stats every second
    for sec in 0..hold_duration {
        tokio::time::sleep(Duration::from_secs(1)).await;

        let active = stats.connections_active.load(Ordering::Relaxed);
        let failed = stats.connections_failed.load(Ordering::Relaxed);
        let dropped = stats.connections_dropped.load(Ordering::Relaxed);
        let sent = stats.messages_sent.load(Ordering::Relaxed);
        let recv = stats.messages_received.load(Ordering::Relaxed);
        let errors = stats.errors.load(Ordering::Relaxed);

        tracing::info!(
            "HOLD [{}/{}s]: {} active | {} failed | {} dropped | {} errors | sent/recv: {}/{}",
            sec + 1, hold_duration, active, failed, dropped, errors, sent, recv
        );

        // Early exit if too many connections dropped
        if active == 0 && (failed + dropped) > 0 {
            tracing::error!("All connections lost! Stopping early.");
            break;
        }
    }

    // Shutdown all connections
    tracing::info!("Shutting down connections...");
    let _ = shutdown_tx.send(());

    // Wait for all handles with timeout
    let shutdown_timeout = Duration::from_secs(10);
    let _ = tokio::time::timeout(shutdown_timeout, async {
        for handle in handles {
            let _ = handle.await;
        }
    }).await;

    // Final stats
    let elapsed = start.elapsed();
    let attempted = stats.connections_attempted.load(Ordering::Relaxed);
    let active = stats.connections_active.load(Ordering::Relaxed);
    let failed = stats.connections_failed.load(Ordering::Relaxed);
    let dropped = stats.connections_dropped.load(Ordering::Relaxed);
    let sent = stats.messages_sent.load(Ordering::Relaxed);
    let recv = stats.messages_received.load(Ordering::Relaxed);
    let errors = stats.errors.load(Ordering::Relaxed);

    println!("\n========== WebSocket Stress Test Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Target connections: {}", target_connections);
    println!();
    println!("Connections:");
    println!("  Attempted: {}", attempted);
    println!("  Peak active: {}", attempted - failed); // Approximate peak
    println!("  Final active: {}", active);
    println!("  Failed to connect: {}", failed);
    println!("  Dropped during test: {}", dropped);
    println!("  Connect success rate: {:.2}%",
        if attempted > 0 { (attempted - failed) as f64 / attempted as f64 * 100.0 } else { 0.0 });
    println!();
    println!("Messages:");
    println!("  Total sent: {}", sent);
    println!("  Total received: {}", recv);
    println!("  Avg sent/sec: {:.2}", sent as f64 / elapsed.as_secs_f64());
    println!("  Avg recv/sec: {:.2}", recv as f64 / elapsed.as_secs_f64());
    println!();
    println!("Errors: {}", errors);

    // Verdict
    if failed == 0 && dropped == 0 {
        println!("\n✓ SUCCESS: All {} connections maintained throughout test", target_connections);
    } else if failed > attempted / 2 {
        println!("\n✗ FAILURE: Most connections failed to establish ({}/{})", failed, attempted);
    } else if dropped > 0 {
        println!("\n⚠ WARNING: {} connections dropped during test", dropped);
    } else {
        println!("\n⚠ WARNING: {} connections failed to establish", failed);
    }

    Ok(())
}
