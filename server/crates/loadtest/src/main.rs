use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use fred::interfaces::ClientLike;
use rand::{Rng, SeedableRng};
use rand::rngs::StdRng;
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
        api_key: String,

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

    /// Run HTTP load test (writes - requires setup first)
    Write {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(short, long, default_value = "tk_pub_loadtest_public_key_12345")]
        api_key: String,

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
        api_key: String,

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
        api_key: String,

        /// Number of concurrent connections
        #[arg(short, long, default_value = "100")]
        connections: usize,

        /// Test duration in seconds
        #[arg(short, long, default_value = "30")]
        duration: u64,
    },

    /// Build a thread: N users each post M comments, randomly replying or starting new threads
    Thread {
        /// Target URL (e.g., http://localhost:8080)
        #[arg(short, long, default_value = "http://localhost:8080")]
        url: String,

        /// API key
        #[arg(long, default_value = "tk_pub_loadtest_public_key_12345")]
        api_key: String,

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
        api_key: String,

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
        api_key: String,

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
        api_key: String,

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
        api_key: String,

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
            api_key,
            secret_key,
            users,
            pages,
            comments_per_page,
        } => {
            run_setup(&url, &api_key, &secret_key, users, pages, comments_per_page).await?;
        }
        Commands::Teardown { redis_url, confirm } => {
            run_teardown(&redis_url, confirm).await?;
        }
        Commands::Read {
            url,
            api_key,
            workers,
            duration,
            rps,
        } => {
            run_read_test(&url, &api_key, workers, duration, rps).await?;
        }
        Commands::Write {
            url,
            api_key,
            workers,
            duration,
            users_file,
        } => {
            run_write_test(&url, &api_key, workers, duration, &users_file).await?;
        }
        Commands::Mixed {
            url,
            api_key,
            workers,
            duration,
            write_percent,
            users_file,
        } => {
            run_mixed_test(&url, &api_key, workers, duration, write_percent, &users_file).await?;
        }
        Commands::Ws {
            url,
            api_key,
            connections,
            duration,
        } => {
            run_ws_test(&url, &api_key, connections, duration).await?;
        }
        Commands::Thread {
            url,
            api_key,
            users,
            comments_per_user,
            reply_percent,
            workers,
        } => {
            run_thread_test(&url, &api_key, users, comments_per_user, reply_percent, workers).await?;
        }
        Commands::Deep {
            url,
            api_key,
            depth,
            chains,
        } => {
            run_deep_test(&url, &api_key, depth, chains).await?;
        }
        Commands::Vote {
            url,
            api_key,
            workers,
            duration,
            users_file,
        } => {
            run_vote_test(&url, &api_key, workers, duration, &users_file).await?;
        }
        Commands::Auth {
            url,
            api_key,
            workers,
            duration,
        } => {
            run_auth_test(&url, &api_key, workers, duration).await?;
        }
        Commands::Bench {
            url,
            api_key,
            workers,
            requests,
            test_type,
            users_file,
        } => {
            run_bench_test(&url, &api_key, workers, requests, &test_type, &users_file).await?;
        }
    }

    Ok(())
}

// ============================================================================
// Setup Command
// ============================================================================

async fn run_setup(
    url: &str,
    api_key: &str,
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
            .header("X-API-Key", api_key)
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
                .header("X-API-Key", api_key)
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
    api_key: &str,
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
        let api_key = api_key.to_string();
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

                let result = client.get(&url).header("X-API-Key", &api_key).send().await;

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
    api_key: &str,
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
        let api_key = api_key.to_string();
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
                    .header("X-API-Key", &api_key)
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
    api_key: &str,
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
        let api_key = api_key.to_string();
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
                        .header("X-API-Key", &api_key)
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
                    client.get(&url).header("X-API-Key", &api_key).send().await
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

async fn run_ws_test(
    url: &str,
    api_key: &str,
    connections: usize,
    duration: u64,
) -> Result<()> {
    tracing::info!("Starting WebSocket load test");
    tracing::info!("  URL: {}", url);
    tracing::info!("  Connections: {}", connections);
    tracing::info!("  Duration: {}s", duration);

    let stats = Arc::new(Stats::default());
    let start = Instant::now();
    let duration = Duration::from_secs(duration);

    let mut handles = Vec::new();

    for i in 0..connections {
        let stats = stats.clone();
        let url = format!("{}?api_key={}", url, api_key);
        let page_id = format!("loadtest-page-{}", i % 10);

        handles.push(tokio::spawn(async move {
            use futures_util::{SinkExt, StreamExt};
            use tokio_tungstenite::connect_async;

            let connect_result = connect_async(&url).await;
            let (mut ws, _) = match connect_result {
                Ok(conn) => conn,
                Err(e) => {
                    tracing::debug!("Connection {} failed: {}", i, e);
                    stats.failures.fetch_add(1, Ordering::Relaxed);
                    return;
                }
            };

            stats.successes.fetch_add(1, Ordering::Relaxed);

            // Subscribe to a page
            let subscribe_msg = serde_json::json!({
                "type": "subscribe",
                "page_id": page_id
            });
            let _ = ws
                .send(tokio_tungstenite::tungstenite::Message::Text(
                    subscribe_msg.to_string().into(),
                ))
                .await;

            // Keep connection alive, occasionally send pings
            let mut interval = tokio::time::interval(Duration::from_secs(5));

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
    let progress_handle = tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(1)).await;
            let connected = stats_clone.successes.load(Ordering::Relaxed);
            let failed = stats_clone.failures.load(Ordering::Relaxed);
            let messages = stats_clone.requests.load(Ordering::Relaxed);
            tracing::info!(
                "  Connected: {} | Failed: {} | Messages: {}",
                connected,
                failed,
                messages
            );
        }
    });

    // Wait for all connections
    for handle in handles {
        let _ = handle.await;
    }
    progress_handle.abort();

    // Print results
    let total_messages = stats.requests.load(Ordering::Relaxed);
    let connected = stats.successes.load(Ordering::Relaxed);
    let failed = stats.failures.load(Ordering::Relaxed);
    let elapsed = start.elapsed();

    println!("\n========== WebSocket Results ==========");
    println!("Duration: {:.2}s", elapsed.as_secs_f64());
    println!("Connections attempted: {}", connections);
    println!("Connections successful: {}", connected);
    println!("Connections failed: {}", failed);
    println!("Total messages sent: {}", total_messages);
    println!(
        "Messages/sec: {:.2}",
        total_messages as f64 / elapsed.as_secs_f64()
    );

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
    api_key: &str,
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
            .header("X-API-Key", api_key)
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
        let api_key = api_key.to_string();
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
                    .header("X-API-Key", &api_key)
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
    api_key: &str,
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
        .header("X-API-Key", api_key)
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
        let api_key = api_key.to_string();
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
                    .header("X-API-Key", &api_key)
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
        .header("X-API-Key", api_key)
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
    api_key: &str,
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
        let api_key = api_key.to_string();
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
                    .header("X-API-Key", &api_key)
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
    api_key: &str,
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
        let api_key = api_key.to_string();

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
                        .header("X-API-Key", &api_key)
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
                        .header("X-API-Key", &api_key)
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
    api_key: &str,
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
        let api_key = api_key.to_string();
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
                        client.get(&url).header("X-API-Key", &api_key).send().await
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
                            .header("X-API-Key", &api_key)
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
                            client.get(&url).header("X-API-Key", &api_key).send().await
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
                                .header("X-API-Key", &api_key)
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
