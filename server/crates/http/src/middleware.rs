use axum::{
    body::Body,
    extract::State,
    http::{header::AUTHORIZATION, Method, Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use sha2::{Digest, Sha256};
use threadkit_common::{auth, redis::RateLimitResult};

use crate::state::AppState;

/// Route type for rate limiting
#[derive(Debug, Clone, Copy)]
pub enum RouteType {
    /// Auth routes (register, login, forgot password) - strictest limits
    Auth,
    /// Write operations (POST, PUT, DELETE) - strict limits
    Write,
    /// Read operations (GET) - lenient limits
    Read,
}

impl RouteType {
    /// Determine route type from request
    pub fn from_request(method: &Method, path: &str) -> Self {
        // Auth routes get the strictest limits
        // Note: Check both with and without /v1 prefix since middleware can be applied at different levels
        if path.starts_with("/v1/auth/register")
            || path.starts_with("/v1/auth/login")
            || path.starts_with("/v1/auth/forgot")
            || path.starts_with("/v1/auth/reset")
            || path.starts_with("/auth/register")
            || path.starts_with("/auth/login")
            || path.starts_with("/auth/forgot")
            || path.starts_with("/auth/reset")
        {
            return RouteType::Auth;
        }

        // All non-GET methods are writes
        match *method {
            Method::GET | Method::HEAD | Method::OPTIONS => RouteType::Read,
            _ => RouteType::Write,
        }
    }

    /// Get the window size in seconds
    pub fn window_secs(&self) -> u64 {
        match self {
            RouteType::Auth => 3600, // 1 hour
            RouteType::Write => 60,  // 1 minute
            RouteType::Read => 60,   // 1 minute
        }
    }
}

/// Extract client IP from request, handling X-Forwarded-For for proxies
fn extract_client_ip(request: &Request<Body>, trusted_proxies: &[String]) -> String {
    // Try to get X-Forwarded-For header
    if let Some(forwarded_for) = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
    {
        // X-Forwarded-For is a comma-separated list: client, proxy1, proxy2, ...
        // We want the first non-trusted IP from the right
        let ips: Vec<&str> = forwarded_for.split(',').map(|s| s.trim()).collect();

        // Find the rightmost IP that isn't from a trusted proxy
        for ip in ips.iter().rev() {
            if !trusted_proxies.iter().any(|p| p == *ip) {
                return ip.to_string();
            }
        }

        // If all IPs are trusted, use the leftmost (client)
        if let Some(first) = ips.first() {
            return first.to_string();
        }
    }

    // Try X-Real-IP header
    if let Some(real_ip) = request
        .headers()
        .get("x-real-ip")
        .and_then(|v| v.to_str().ok())
    {
        return real_ip.to_string();
    }

    // Fall back to peer address from extensions (if set by server)
    if let Some(addr) = request.extensions().get::<std::net::SocketAddr>() {
        return addr.ip().to_string();
    }

    // Last resort - use a placeholder
    "unknown".to_string()
}

/// Hash an IP address for storage (privacy)
fn hash_ip(ip: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(ip.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)[..16].to_string()
}

/// Rate limiting middleware
pub async fn rate_limit(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, Response> {
    // Skip if rate limiting is disabled
    if !state.config.rate_limit.enabled {
        return Ok(next.run(request).await);
    }

    let method = request.method().clone();
    let path = request.uri().path().to_string();
    let route_type = RouteType::from_request(&method, &path);
    let window_secs = route_type.window_secs();

    // Extract identifiers
    let client_ip = extract_client_ip(&request, &state.config.rate_limit.trusted_proxies);
    let ip_hash = hash_ip(&client_ip);

    // Get API key info if present
    let project_id_header = request
        .headers()
        .get("projectid")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Get user ID from JWT if present
    let user_id = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .and_then(|token| auth::verify_token(token, &state.config.jwt_secret).ok())
        .map(|claims| claims.sub);

    // Get site-specific rate limit overrides
    let (site_id, site_overrides) = if let Some(ref project_id) = project_id_header {
        if let Ok(Some(info)) = state.redis.get_cached_project_id(project_id).await {
            (Some(info.site_id), Some(info.settings.rate_limits))
        } else if let Some(standalone) = state.config.standalone() {
            if project_id == &standalone.project_id_public || project_id == &standalone.project_id_secret {
                if let Ok(Some(config)) = state.redis.get_site_config_by_api_key(&standalone.project_id_public).await {
                    (Some(config.id), Some(config.settings.rate_limits))
                } else {
                    (None, None)
                }
            } else {
                (None, None)
            }
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    // Calculate effective limits (site overrides > global defaults)
    let global = &state.config.rate_limit;
    let (ip_limit, user_limit) = match route_type {
        RouteType::Auth => {
            let ip = site_overrides
                .as_ref()
                .and_then(|s| s.auth_attempts_per_hour)
                .unwrap_or(global.auth_attempts_per_hour);
            (ip, ip) // Auth uses same limit for IP and user
        }
        RouteType::Write => {
            let ip = site_overrides
                .as_ref()
                .and_then(|s| s.ip_writes_per_minute)
                .unwrap_or(global.ip_writes_per_minute);
            let user = site_overrides
                .as_ref()
                .and_then(|s| s.user_writes_per_minute)
                .unwrap_or(global.user_writes_per_minute);
            (ip, user)
        }
        RouteType::Read => {
            let ip = site_overrides
                .as_ref()
                .and_then(|s| s.ip_reads_per_minute)
                .unwrap_or(global.ip_reads_per_minute);
            let user = site_overrides
                .as_ref()
                .and_then(|s| s.user_reads_per_minute)
                .unwrap_or(global.user_reads_per_minute);
            (ip, user)
        }
    };

    let route_suffix = match route_type {
        RouteType::Auth => "auth",
        RouteType::Write => "write",
        RouteType::Read => "read",
    };

    // Check IP rate limit
    let ip_key = format!("ratelimit:ip:{}:{}", ip_hash, route_suffix);
    let ip_result = state
        .redis
        .check_rate_limit(&ip_key, ip_limit, window_secs)
        .await
        .map_err(|e| {
            tracing::error!("Rate limit check failed: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Rate limit error").into_response()
        })?;

    if !ip_result.allowed {
        return Err(rate_limit_response(&ip_result, "IP"));
    }

    // Check API key rate limit (if present and for write operations)
    if let (Some(sid), RouteType::Write) = (site_id, route_type) {
        let project_id_limit = global.project_id_writes_per_minute;
        let project_id_key = format!("ratelimit:apikey:{}:{}", sid, route_suffix);
        let api_result = state
            .redis
            .check_rate_limit(&project_id_key, project_id_limit, 60)
            .await
            .map_err(|e| {
                tracing::error!("Rate limit check failed: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Rate limit error").into_response()
            })?;

        if !api_result.allowed {
            return Err(rate_limit_response(&api_result, "project_id"));
        }
    }

    // Check user rate limit (if authenticated)
    let final_result = if let (Some(uid), Some(sid)) = (user_id, site_id) {
        let user_key = format!("ratelimit:user:{}:{}:{}", sid, uid, route_suffix);
        let user_result = state
            .redis
            .check_rate_limit(&user_key, user_limit, window_secs)
            .await
            .map_err(|e| {
                tracing::error!("Rate limit check failed: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Rate limit error").into_response()
            })?;

        if !user_result.allowed {
            return Err(rate_limit_response(&user_result, "user"));
        }
        user_result
    } else {
        ip_result
    };

    // Run the actual request
    let mut response = next.run(request).await;

    // Add rate limit headers to successful responses
    let headers = response.headers_mut();
    headers.insert(
        "X-RateLimit-Limit",
        final_result.limit.to_string().parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Remaining",
        final_result.remaining.to_string().parse().unwrap(),
    );
    headers.insert(
        "X-RateLimit-Reset",
        final_result.reset_at.to_string().parse().unwrap(),
    );

    Ok(response)
}

/// Create a 429 rate limit exceeded response
fn rate_limit_response(result: &RateLimitResult, layer: &str) -> Response {
    let body = serde_json::json!({
        "error": "Rate limit exceeded",
        "layer": layer,
        "retry_after": result.reset_at - chrono::Utc::now().timestamp(),
    });

    let mut response = (
        StatusCode::TOO_MANY_REQUESTS,
        axum::Json(body),
    )
        .into_response();

    let headers = response.headers_mut();
    headers.insert(
        "X-RateLimit-Limit",
        result.limit.to_string().parse().unwrap(),
    );
    headers.insert("X-RateLimit-Remaining", "0".parse().unwrap());
    headers.insert(
        "X-RateLimit-Reset",
        result.reset_at.to_string().parse().unwrap(),
    );
    headers.insert(
        "Retry-After",
        (result.reset_at - chrono::Utc::now().timestamp())
            .max(1)
            .to_string()
            .parse()
            .unwrap(),
    );

    response
}

/// Security headers middleware
/// Adds Content-Security-Policy and other security headers to responses
pub async fn security_headers(
    request: Request<Body>,
    next: Next,
) -> Response {
    let mut response = next.run(request).await;

    let headers = response.headers_mut();

    // Content Security Policy
    // This policy is designed for a REST API server:
    // - default-src 'none': No resources loaded by default
    // - frame-ancestors 'none': Prevent embedding in frames (clickjacking protection)
    // - base-uri 'none': Prevent <base> tag manipulation
    headers.insert(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
            .parse()
            .unwrap(),
    );

    // Prevent MIME type sniffing
    headers.insert("X-Content-Type-Options", "nosniff".parse().unwrap());

    // Prevent clickjacking
    headers.insert("X-Frame-Options", "DENY".parse().unwrap());

    // Force HTTPS in production (strict transport security)
    // 1 year max-age, include subdomains
    headers.insert(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains".parse().unwrap(),
    );

    // Disable client-side caching of sensitive data
    headers.insert(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
            .parse()
            .unwrap(),
    );
    headers.insert("Pragma", "no-cache".parse().unwrap());

    // Prevent DNS prefetching
    headers.insert("X-DNS-Prefetch-Control", "off".parse().unwrap());

    // Disable browser features that could leak information
    headers.insert(
        "Permissions-Policy",
        "geolocation=(), microphone=(), camera=()".parse().unwrap(),
    );

    response
}
