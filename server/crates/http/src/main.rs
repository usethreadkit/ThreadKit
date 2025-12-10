use anyhow::Result;
use axum::{
    extract::State,
    http::StatusCode,
    middleware,
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use clap::Parser;
use metrics_exporter_prometheus::{Matcher, PrometheusBuilder, PrometheusHandle};
use serde::Serialize;
use std::env;
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

#[derive(Parser)]
#[command(name = "threadkit-http")]
#[command(about = "ThreadKit HTTP API server")]
#[command(version)]
struct Args {
    /// Create a new site: --create-site NAME DOMAIN [MODERATION_MODE] [PUBLIC_KEY] [SECRET_KEY]
    /// Outputs the site ID on success, or an error message on failure.
    #[arg(long, value_names = ["NAME", "DOMAIN", "MODERATION_MODE", "PUBLIC_KEY", "SECRET_KEY"], num_args = 2..=5)]
    create_site: Option<Vec<String>>,

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

    /// Edit a site config: --edit-site SITE_ID KEY VALUE
    /// Keys: name, domain, moderation_mode, project_id_public, project_id_secret
    #[arg(long, value_names = ["SITE_ID", "KEY", "VALUE"], num_args = 3)]
    edit_site: Option<Vec<String>>,

    /// Enable auth methods (comma-separated): google,github,email,phone,anonymous,ethereum,solana
    /// Example: --enable-auth email,anonymous
    #[arg(long, value_delimiter = ',')]
    enable_auth: Option<Vec<String>>,

}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // Initialize Sentry if DSN is configured
    let _sentry_guard = std::env::var("SENTRY_DSN_HTTP").ok().map(|dsn| {
        sentry::init((dsn, sentry::ClientOptions {
            release: sentry::release_name!(),
            ..Default::default()
        }))
    });

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

    // Load .env file early so that --create-site and --edit-site can access env vars
    if let Some(path) = &args.env {
        dotenvy::from_filename(path).ok();
    } else {
        dotenvy::dotenv().ok();
    }

    // Handle --create-site mode - generate new site and exit
    if let Some(ref site_args) = args.create_site {
        return create_site(&args, site_args).await;
    }

    // Handle --edit-site mode - edit site config and exit
    if let Some(ref edit_args) = args.edit_site {
        return edit_site(&args, edit_args).await;
    }

    // Load config
    let mut config = match &args.env {
        Some(path) => {
            tracing::info!("Loading config from: {}", path);
            Config::from_env_file(path)?
        }
        None => Config::from_env()?,
    };

    // Apply CLI arg overrides
    if let Some(host) = args.host.clone() {
        config.http_host = host;
    }
    if let Some(port) = args.port {
        config.http_port = port;
    }
    if let Some(redis_url) = args.redis_url.clone() {
        config.redis_url = redis_url;
    }
    if args.no_rate_limit {
        config.rate_limit.enabled = false;
    }
    if args.allow_localhost_origin {
        config.allow_localhost_origin = true;
    }

    tracing::info!("Starting ThreadKit HTTP server");
    tracing::info!("Mode: {:?}", if config.is_standalone() { "standalone" } else { "saas" });

    // Print API keys in standalone mode
    if let Some(standalone) = config.standalone() {
        tracing::info!("Public key: {}", standalone.project_id_public);
        tracing::info!("Secret key: {}", standalone.project_id_secret);
    }

    // Initialize Prometheus metrics
    let metrics_handle = setup_metrics();

    // Initialize state
    let state = AppState::new(config.clone()).await?;

    // Build router
    let app = Router::new()
        // Easter egg
        .route("/", get(spider_easter_egg))
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
        // Version endpoint (no rate limiting)
        .merge(routes::version::router())
        // Browser-facing OAuth routes (not under /v1, no rate limiting)
        .merge(routes::auth::oauth_router())
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

async fn spider_easter_egg() -> Html<&'static str> {
    Html(r##"<!DOCTYPE html>
<html>
<head>
    <title>ThreadKit</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #fff;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
            cursor: default;
        }
        .spider {
            position: absolute;
            font-size: 24px;
            user-select: none;
            transition: opacity 8s ease-in;
            opacity: 0;
        }
        .spider.visible { opacity: 1; }
        .message {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            font-family: system-ui, -apple-system, sans-serif;
            color: #000;
            opacity: 0;
            transition: opacity 3s ease-in;
            pointer-events: none;
        }
        .message.visible { opacity: 1; pointer-events: auto; }
        .message h1 {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: 2px;
            margin-bottom: 16px;
        }
        .message a {
            color: #000;
            font-size: 14px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="message" id="message">
        <h1>COME HACK WITH US</h1>
        <a href="https://github.com/usethreadkit/threadkit">https://github.com/usethreadkit/threadkit</a>
    </div>
    <script>
        const spiders = [];
        const maxSpiders = 8;

        function createSpider() {
            const spider = document.createElement('div');
            spider.className = 'spider';
            spider.innerHTML = '🕷️';
            spider.style.left = Math.random() * (window.innerWidth - 40) + 'px';
            spider.style.top = Math.random() * (window.innerHeight - 40) + 'px';
            spider.style.filter = 'grayscale(100%) brightness(100)'; // Start white
            spider.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(spider);

            // Fade in after a moment
            setTimeout(() => spider.classList.add('visible'), 100);

            // Slowly become visible (darken over time)
            let brightness = 100;
            const darkenInterval = setInterval(() => {
                brightness -= 2;
                if (brightness <= 0) {
                    clearInterval(darkenInterval);
                    spider.style.filter = 'grayscale(0%)';
                    // Start stalking the cursor
                    spider.dataset.stalking = 'true';
                }
                spider.style.filter = `grayscale(${Math.max(0, 100 - (100 - brightness))}%) brightness(${brightness / 100 + 0.05})`;
            }, 400);

            spiders.push({ el: spider, vx: 0, vy: 0 });
            return spider;
        }

        // Show the message after a delay
        setTimeout(() => {
            document.getElementById('message').classList.add('visible');
        }, 8000);

        // Spawn first spider after a delay
        setTimeout(createSpider, 2000 + Math.random() * 3000);

        // Spawn more spiders over time
        setInterval(() => {
            if (spiders.length < maxSpiders) {
                createSpider();
            }
        }, 8000 + Math.random() * 7000);

        // Track mouse
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Animate spiders toward cursor
        function animate() {
            spiders.forEach(spider => {
                if (spider.el.dataset.stalking !== 'true') return;

                const rect = spider.el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                const dx = mouseX - x;
                const dy = mouseY - y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 5) {
                    // Slow, creepy movement
                    const speed = 0.3 + Math.random() * 0.2;
                    spider.vx += (dx / dist) * speed * 0.1;
                    spider.vy += (dy / dist) * speed * 0.1;

                    // Damping
                    spider.vx *= 0.95;
                    spider.vy *= 0.95;

                    const newX = parseFloat(spider.el.style.left) + spider.vx;
                    const newY = parseFloat(spider.el.style.top) + spider.vy;

                    spider.el.style.left = newX + 'px';
                    spider.el.style.top = newY + 'px';

                    // Rotate toward movement direction
                    const angle = Math.atan2(spider.vy, spider.vx) * 180 / Math.PI + 90;
                    spider.el.style.transform = `rotate(${angle}deg)`;
                }
            });
            requestAnimationFrame(animate);
        }
        animate();

        // Jump scare if you stay too long
        setTimeout(() => {
            if (spiders.length > 0) {
                const spider = spiders[0].el;
                spider.style.transition = 'none';
                spider.style.fontSize = '120px';
                spider.style.left = (mouseX - 60) + 'px';
                spider.style.top = (mouseY - 60) + 'px';
                spider.style.filter = 'none';
                spider.style.zIndex = '9999';
            }
        }, 45000 + Math.random() * 15000);
    </script>
</body>
</html>
"##)
}

/// Create a new site in Redis
/// Args: NAME DOMAIN [MODERATION_MODE] [PUBLIC_KEY] [SECRET_KEY]
/// Outputs site_id on success, error message on failure
async fn create_site(args: &Args, site_args: &[String]) -> Result<()> {
    use threadkit_common::redis::RedisClient;
    use threadkit_common::types::{
        SiteConfig, SiteSettings, AuthSettings, DisplaySettings,
        ModerationMode as TypeModerationMode, ContentModerationSettings, TurnstileSettings,
    };
    use uuid::Uuid;
    use std::io::{self, Write};

    // Parse positional args
    let site_name = &site_args[0];
    let site_domain = &site_args[1];
    let moderation_mode = site_args.get(2).map(|s| s.as_str()).unwrap_or("none");

    // Read API keys from CLI args, then env vars, then generate if needed
    let project_id_public = site_args.get(3)
        .cloned()
        .or_else(|| env::var("PROJECT_ID_PUBLIC").ok().filter(|s| !s.is_empty()))
        .unwrap_or_else(|| "tk_pub_your_public_key".to_string());

    let project_id_secret = site_args.get(4)
        .cloned()
        .or_else(|| env::var("THREADKIT_SECRET_KEY")
            .or_else(|_| env::var("PROJECT_ID_SECRET"))
            .ok()
            .filter(|s| !s.is_empty() && s != "tk_sec_your_secret_key"))
        .unwrap_or_else(|| format!("tk_sec_{}", generate_key()));

    // Validate moderation mode
    let moderation = match moderation_mode.to_lowercase().as_str() {
        "none" => TypeModerationMode::None,
        "pre" => TypeModerationMode::Pre,
        "post" => TypeModerationMode::Post,
        _ => {
            eprintln!("error: invalid moderation mode '{}' (must be: none, pre, post)", moderation_mode);
            std::process::exit(1);
        }
    };

    // Validate key prefixes
    if !project_id_public.starts_with("tk_pub_") {
        eprintln!("error: public key must start with 'tk_pub_'");
        std::process::exit(1);
    }
    if !project_id_secret.starts_with("tk_sec_") {
        eprintln!("error: secret key must start with 'tk_sec_'");
        std::process::exit(1);
    }

    // Get Redis URL
    let redis_url = args.redis_url.clone()
        .or_else(|| std::env::var("REDIS_URL").ok())
        .unwrap_or_else(|| "redis://localhost:6379".to_string());

    // Connect to Redis
    let redis = match RedisClient::new(&redis_url).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("error: failed to connect to redis: {}", e);
            std::process::exit(1);
        }
    };

    // Check if the public key already exists
    if let Ok(Some((existing_site_id, existing_config))) = redis.get_site_by_project_id(&project_id_public).await {
        eprintln!("warning: public key '{}' is already in use by site '{}' ({})",
            project_id_public, existing_config.name, existing_site_id);
        eprint!("Do you want to overwrite this site? [y/N] ");
        io::stderr().flush().ok();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).is_err() || !input.trim().eq_ignore_ascii_case("y") {
            eprintln!("Aborted.");
            std::process::exit(1);
        }
    }

    // Generate a new site ID
    let site_id = Uuid::now_v7();

    // Parse auth methods from CLI flag (default to email only)
    let auth_methods: Vec<String> = args.enable_auth.clone().unwrap_or_else(|| vec!["email".to_string()]);
    let auth = AuthSettings {
        google: auth_methods.iter().any(|m| m == "google"),
        github: auth_methods.iter().any(|m| m == "github"),
        email: auth_methods.iter().any(|m| m == "email"),
        phone: auth_methods.iter().any(|m| m == "phone"),
        anonymous: auth_methods.iter().any(|m| m == "anonymous" || m == "anon"),
        ethereum: auth_methods.iter().any(|m| m == "ethereum" || m == "eth"),
        solana: auth_methods.iter().any(|m| m == "solana" || m == "sol"),
    };

    // Create site config
    let site_config = SiteConfig {
        id: site_id,
        name: site_name.clone(),
        domain: site_domain.clone(),
        project_id_public,
        project_id_secret,
        settings: SiteSettings {
            moderation_mode: moderation,
            auth,
            display: DisplaySettings::default(),
            rate_limits: Default::default(),
            content_moderation: ContentModerationSettings::default(),
            turnstile: TurnstileSettings::default(),
            allowed_origins: vec![],
            posting_disabled: false,
        },
    };

    // Store in Redis
    if let Err(e) = redis.set_site_config(&site_config).await {
        eprintln!("error: failed to save site config: {}", e);
        std::process::exit(1);
    }

    // Output the configuration
    println!("\n✓ Site created successfully!\n");
    println!("Add this to your .env file:\n");
    println!("THREADKIT_SECRET_KEY={}", site_config.project_id_secret);
    println!("\nOptional (for local development):");
    println!("PROJECT_ID_PUBLIC={}", site_config.project_id_public);
    println!("\nSite ID: {}", site_id);

    // Show enabled auth methods
    let auth = &site_config.settings.auth;
    let mut enabled_methods = Vec::new();
    if auth.email { enabled_methods.push("email"); }
    if auth.google { enabled_methods.push("google"); }
    if auth.github { enabled_methods.push("github"); }
    if auth.phone { enabled_methods.push("phone"); }
    if auth.anonymous { enabled_methods.push("anonymous"); }
    if auth.ethereum { enabled_methods.push("ethereum"); }
    if auth.solana { enabled_methods.push("solana"); }

    if !enabled_methods.is_empty() {
        println!("\nEnabled auth methods: {}", enabled_methods.join(", "));
    }

    Ok(())
}

/// Edit a site config in Redis
/// Args: SITE_ID KEY VALUE
async fn edit_site(args: &Args, edit_args: &[String]) -> Result<()> {
    use threadkit_common::redis::RedisClient;
    use threadkit_common::types::ModerationMode;
    use uuid::Uuid;

    let site_id_str = &edit_args[0];
    let key = &edit_args[1];
    let value = &edit_args[2];

    // Parse site ID
    let site_id: Uuid = match site_id_str.parse() {
        Ok(id) => id,
        Err(_) => {
            eprintln!("error: invalid site ID '{}'", site_id_str);
            std::process::exit(1);
        }
    };

    // Get Redis URL
    let redis_url = args.redis_url.clone()
        .or_else(|| std::env::var("REDIS_URL").ok())
        .unwrap_or_else(|| "redis://localhost:6379".to_string());

    // Connect to Redis
    let redis = match RedisClient::new(&redis_url).await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("error: failed to connect to redis: {}", e);
            std::process::exit(1);
        }
    };

    // Get existing config
    let mut config = match redis.get_site_config(site_id).await {
        Ok(Some(c)) => c,
        Ok(None) => {
            eprintln!("error: site '{}' not found", site_id);
            std::process::exit(1);
        }
        Err(e) => {
            eprintln!("error: failed to get site config: {}", e);
            std::process::exit(1);
        }
    };

    // Update the specified field
    match key.as_str() {
        "name" => config.name = value.clone(),
        "domain" => config.domain = value.clone(),
        "moderation_mode" => {
            config.settings.moderation_mode = match value.to_lowercase().as_str() {
                "none" => ModerationMode::None,
                "pre" => ModerationMode::Pre,
                "post" => ModerationMode::Post,
                _ => {
                    eprintln!("error: invalid moderation mode '{}' (must be: none, pre, post)", value);
                    std::process::exit(1);
                }
            };
        }
        "project_id_public" => {
            if !value.starts_with("tk_pub_") {
                eprintln!("error: public key must start with 'tk_pub_'");
                std::process::exit(1);
            }
            config.project_id_public = value.clone();
        }
        "project_id_secret" => {
            if !value.starts_with("tk_sec_") {
                eprintln!("error: secret key must start with 'tk_sec_'");
                std::process::exit(1);
            }
            config.project_id_secret = value.clone();
        }
        "auth" => {
            // Value is comma-separated list of auth methods
            let methods: Vec<&str> = value.split(',').map(|s| s.trim()).collect();
            config.settings.auth.google = methods.iter().any(|m| *m == "google");
            config.settings.auth.github = methods.iter().any(|m| *m == "github");
            config.settings.auth.email = methods.iter().any(|m| *m == "email");
            config.settings.auth.phone = methods.iter().any(|m| *m == "phone");
            config.settings.auth.anonymous = methods.iter().any(|m| *m == "anonymous" || *m == "anon");
            config.settings.auth.ethereum = methods.iter().any(|m| *m == "ethereum" || *m == "eth");
            config.settings.auth.solana = methods.iter().any(|m| *m == "solana" || *m == "sol");
        }
        _ => {
            eprintln!("error: unknown key '{}' (valid keys: name, domain, moderation_mode, project_id_public, project_id_secret, auth)", key);
            std::process::exit(1);
        }
    }

    // Save updated config
    if let Err(e) = redis.set_site_config(&config).await {
        eprintln!("error: failed to save site config: {}", e);
        std::process::exit(1);
    }

    // Output nothing on success (Unix convention)
    Ok(())
}

/// Generate a cryptographically secure random alphanumeric key
fn generate_key() -> String {
    use rand::{Rng, rngs::OsRng};
    const CHARSET: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    (0..32)
        .map(|_| {
            let idx = OsRng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}
