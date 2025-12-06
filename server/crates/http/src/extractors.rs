use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header::AUTHORIZATION, request::Parts, HeaderMap, StatusCode},
};
use threadkit_common::{
    auth,
    types::{ApiKeyInfo, ApiKeyType, Role},
};
use url::Url;
use uuid::Uuid;

use crate::state::AppState;

/// Extract the origin from Referer or Origin headers
fn extract_request_origin(headers: &HeaderMap) -> Option<String> {
    // Prefer Origin header (set by browsers for CORS requests)
    if let Some(origin) = headers.get("Origin").and_then(|v| v.to_str().ok()) {
        // Origin header is just the origin (e.g., "https://example.com")
        if let Ok(url) = Url::parse(origin) {
            return url.host_str().map(|h| h.to_lowercase());
        }
    }

    // Fall back to Referer header
    if let Some(referer) = headers.get("Referer").and_then(|v| v.to_str().ok()) {
        if let Ok(url) = Url::parse(referer) {
            return url.host_str().map(|h| h.to_lowercase());
        }
    }

    None
}

/// Check if a request origin matches allowed origins
/// Supports exact matches and wildcard subdomains (e.g., "*.example.com")
fn is_origin_allowed(origin: &str, primary_domain: &str, allowed_origins: &[String]) -> bool {
    let origin = origin.to_lowercase();
    let primary = primary_domain.to_lowercase();

    // Always allow localhost for development
    if origin == "localhost" || origin.starts_with("127.0.0.1") || origin == "::1" {
        return true;
    }

    // Check primary domain (exact match or subdomain)
    if origin == primary || origin.ends_with(&format!(".{}", primary)) {
        return true;
    }

    // Check additional allowed origins
    for allowed in allowed_origins {
        let allowed = allowed.to_lowercase();

        // Wildcard subdomain match (e.g., "*.example.com")
        if let Some(suffix) = allowed.strip_prefix("*.") {
            if origin == suffix || origin.ends_with(&format!(".{}", suffix)) {
                return true;
            }
        } else if origin == allowed {
            // Exact match
            return true;
        }
    }

    false
}

/// Extracts and validates API key from X-API-Key header
/// Also validates that the request origin matches the site's allowed domains
pub struct ApiKey(pub ApiKeyInfo);

impl<S> FromRequestParts<S> for ApiKey
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        let api_key = parts
            .headers
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing X-API-Key header".to_string()))?;

        // Check cache first
        if let Ok(Some(info)) = state.redis.get_cached_api_key(api_key).await {
            // Validate origin for cached API keys too
            validate_origin(&parts.headers, &info)?;
            return Ok(ApiKey(info));
        }

        // In standalone mode, validate against config
        if let Some(standalone) = state.config.standalone() {
            let key_type = if api_key == standalone.api_key_public {
                ApiKeyType::Public
            } else if api_key == standalone.api_key_secret {
                ApiKeyType::Secret
            } else {
                return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
            };

            let site_config = state
                .redis
                .get_site_config(standalone.site_id)
                .await
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get site config".to_string()))?
                .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Site config not found".to_string()))?;

            let info = ApiKeyInfo {
                site_id: standalone.site_id,
                key_type,
                settings: site_config.settings,
                domain: site_config.domain,
            };

            // Validate origin before caching
            validate_origin(&parts.headers, &info)?;

            // Cache for future requests
            let _ = state.redis.cache_api_key(api_key, &info).await;

            return Ok(ApiKey(info));
        }

        // In SaaS mode, would call internal API here
        // TODO: Implement SaaS mode API key validation
        Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()))
    }
}

/// Validate that the request origin is allowed for this API key
fn validate_origin(headers: &HeaderMap, info: &ApiKeyInfo) -> Result<(), (StatusCode, String)> {
    // Secret keys skip origin validation (server-to-server)
    if info.key_type == ApiKeyType::Secret {
        return Ok(());
    }

    // If no Origin/Referer header, allow the request (could be server-side or curl)
    // This is a trade-off: we can't block all non-browser requests, but we can
    // block browser requests from unauthorized origins
    let Some(origin) = extract_request_origin(headers) else {
        return Ok(());
    };

    if is_origin_allowed(&origin, &info.domain, &info.settings.allowed_origins) {
        Ok(())
    } else {
        Err((
            StatusCode::FORBIDDEN,
            format!("Origin '{}' is not allowed for this API key", origin),
        ))
    }
}

/// Extracts authenticated user from JWT in Authorization header
pub struct AuthUser {
    pub user_id: Uuid,
    pub site_id: Uuid,
    pub session_id: Uuid,
}

impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing Authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or((StatusCode::UNAUTHORIZED, "Invalid Authorization header format".to_string()))?;

        let claims = auth::verify_token(token, &state.config.jwt_secret)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

        // Verify session still exists
        let session_user = state
            .redis
            .get_session_user(claims.session_id)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to verify session".to_string()))?;

        if session_user != Some(claims.sub) {
            return Err((StatusCode::UNAUTHORIZED, "Session expired".to_string()));
        }

        Ok(AuthUser {
            user_id: claims.sub,
            site_id: claims.site_id,
            session_id: claims.session_id,
        })
    }
}

/// Optional auth - doesn't fail if no token provided
pub struct MaybeAuthUser(pub Option<AuthUser>);

impl<S> FromRequestParts<S> for MaybeAuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(user) => Ok(MaybeAuthUser(Some(user))),
            Err(_) => Ok(MaybeAuthUser(None)),
        }
    }
}

/// Extracts user with role check
pub struct AuthUserWithRole {
    pub user_id: Uuid,
    pub site_id: Uuid,
    pub role: Role,
}

impl AuthUserWithRole {
    pub fn require_moderator(&self) -> Result<(), (StatusCode, String)> {
        if self.role >= Role::Moderator {
            Ok(())
        } else {
            Err((StatusCode::FORBIDDEN, "Moderator access required".to_string()))
        }
    }

    pub fn require_admin(&self) -> Result<(), (StatusCode, String)> {
        if self.role >= Role::Admin {
            Ok(())
        } else {
            Err((StatusCode::FORBIDDEN, "Admin access required".to_string()))
        }
    }
}

impl<S> FromRequestParts<S> for AuthUserWithRole
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let auth_user = AuthUser::from_request_parts(parts, state).await?;

        let role = app_state
            .redis
            .get_user_role(auth_user.site_id, auth_user.user_id)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get user role".to_string()))?;

        if role == Role::Blocked {
            return Err((StatusCode::FORBIDDEN, "User is blocked".to_string()));
        }

        Ok(AuthUserWithRole {
            user_id: auth_user.user_id,
            site_id: auth_user.site_id,
            role,
        })
    }
}

/// Owner access via secret API key
pub struct OwnerAccess {
    pub site_id: Uuid,
}

impl<S> FromRequestParts<S> for OwnerAccess
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let api_key = ApiKey::from_request_parts(parts, state).await?;

        if api_key.0.key_type != ApiKeyType::Secret {
            return Err((StatusCode::FORBIDDEN, "Secret API key required".to_string()));
        }

        Ok(OwnerAccess {
            site_id: api_key.0.site_id,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderValue;

    #[test]
    fn test_extract_origin_from_origin_header() {
        let mut headers = HeaderMap::new();
        headers.insert("Origin", HeaderValue::from_static("https://example.com"));

        assert_eq!(extract_request_origin(&headers), Some("example.com".to_string()));
    }

    #[test]
    fn test_extract_origin_from_origin_header_with_port() {
        let mut headers = HeaderMap::new();
        headers.insert("Origin", HeaderValue::from_static("https://example.com:8080"));

        assert_eq!(extract_request_origin(&headers), Some("example.com".to_string()));
    }

    #[test]
    fn test_extract_origin_from_referer_header() {
        let mut headers = HeaderMap::new();
        headers.insert("Referer", HeaderValue::from_static("https://example.com/page/123?foo=bar"));

        assert_eq!(extract_request_origin(&headers), Some("example.com".to_string()));
    }

    #[test]
    fn test_extract_origin_prefers_origin_over_referer() {
        let mut headers = HeaderMap::new();
        headers.insert("Origin", HeaderValue::from_static("https://origin.com"));
        headers.insert("Referer", HeaderValue::from_static("https://referer.com/page"));

        assert_eq!(extract_request_origin(&headers), Some("origin.com".to_string()));
    }

    #[test]
    fn test_extract_origin_none_when_missing() {
        let headers = HeaderMap::new();
        assert_eq!(extract_request_origin(&headers), None);
    }

    #[test]
    fn test_extract_origin_none_for_invalid_url() {
        let mut headers = HeaderMap::new();
        headers.insert("Origin", HeaderValue::from_static("not-a-valid-url"));

        assert_eq!(extract_request_origin(&headers), None);
    }

    #[test]
    fn test_is_origin_allowed_exact_primary_domain() {
        assert!(is_origin_allowed("example.com", "example.com", &[]));
    }

    #[test]
    fn test_is_origin_allowed_subdomain_of_primary() {
        assert!(is_origin_allowed("blog.example.com", "example.com", &[]));
        assert!(is_origin_allowed("app.blog.example.com", "example.com", &[]));
    }

    #[test]
    fn test_is_origin_allowed_case_insensitive() {
        assert!(is_origin_allowed("EXAMPLE.COM", "example.com", &[]));
        assert!(is_origin_allowed("example.com", "EXAMPLE.COM", &[]));
        assert!(is_origin_allowed("Blog.Example.Com", "example.com", &[]));
    }

    #[test]
    fn test_is_origin_allowed_localhost() {
        assert!(is_origin_allowed("localhost", "example.com", &[]));
        assert!(is_origin_allowed("127.0.0.1", "example.com", &[]));
        assert!(is_origin_allowed("::1", "example.com", &[]));
    }

    #[test]
    fn test_is_origin_allowed_different_domain_rejected() {
        assert!(!is_origin_allowed("evil.com", "example.com", &[]));
        assert!(!is_origin_allowed("example.com.evil.com", "example.com", &[]));
        assert!(!is_origin_allowed("notexample.com", "example.com", &[]));
    }

    #[test]
    fn test_is_origin_allowed_exact_match_in_allowed_origins() {
        let allowed = vec!["staging.myapp.com".to_string(), "other-site.org".to_string()];

        assert!(is_origin_allowed("staging.myapp.com", "example.com", &allowed));
        assert!(is_origin_allowed("other-site.org", "example.com", &allowed));
        // Subdomains of allowed origins are NOT automatically allowed (need wildcard)
        assert!(!is_origin_allowed("sub.staging.myapp.com", "example.com", &allowed));
    }

    #[test]
    fn test_is_origin_allowed_wildcard_subdomain() {
        let allowed = vec!["*.partner.com".to_string()];

        assert!(is_origin_allowed("app.partner.com", "example.com", &allowed));
        assert!(is_origin_allowed("blog.partner.com", "example.com", &allowed));
        assert!(is_origin_allowed("deep.nested.partner.com", "example.com", &allowed));
        // The base domain itself should also match
        assert!(is_origin_allowed("partner.com", "example.com", &allowed));
    }

    #[test]
    fn test_is_origin_allowed_wildcard_not_partial_match() {
        let allowed = vec!["*.partner.com".to_string()];

        // Should not match domains that just contain "partner.com"
        assert!(!is_origin_allowed("fakepartner.com", "example.com", &allowed));
        assert!(!is_origin_allowed("partner.com.evil.com", "example.com", &allowed));
    }

    #[test]
    fn test_is_origin_allowed_multiple_wildcards() {
        let allowed = vec![
            "*.staging.example.com".to_string(),
            "*.partner.org".to_string(),
        ];

        assert!(is_origin_allowed("app.staging.example.com", "example.com", &allowed));
        assert!(is_origin_allowed("api.partner.org", "example.com", &allowed));
        assert!(!is_origin_allowed("random.com", "example.com", &allowed));
    }

    #[test]
    fn test_is_origin_allowed_mixed_exact_and_wildcard() {
        let allowed = vec![
            "specific.other.com".to_string(),
            "*.wildcard.com".to_string(),
        ];

        assert!(is_origin_allowed("specific.other.com", "example.com", &allowed));
        assert!(!is_origin_allowed("sub.specific.other.com", "example.com", &allowed));
        assert!(is_origin_allowed("any.wildcard.com", "example.com", &allowed));
    }
}
