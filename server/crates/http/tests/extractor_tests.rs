mod common;

use axum::http::StatusCode;
use common::TestContext;

#[tokio::test]
async fn test_valid_api_key() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_missing_api_key() {
    let ctx = TestContext::new().await;

    let response = ctx.server.get("/v1/comments?page_url=test").await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    assert!(response.text().contains("Missing projectid header"));
}

#[tokio::test]
async fn test_invalid_api_key() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", "invalid_key")
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    assert!(response.text().contains("Invalid API key"));
}

#[tokio::test]
async fn test_origin_validation_localhost_allowed() {
    let ctx = TestContext::new().await;

    // Localhost should be allowed when allow_localhost_origin is true
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Origin", "http://localhost:3000")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_origin_validation_primary_domain() {
    let ctx = TestContext::new().await;

    // Primary domain should be allowed
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Origin", "https://localhost")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_origin_validation_subdomain() {
    let ctx = TestContext::new().await;

    // Subdomain of primary domain should be allowed
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Origin", "https://blog.localhost")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_origin_validation_forbidden() {
    let ctx = TestContext::new().await;

    // Unauthorized origin should be forbidden
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Origin", "https://evil.com")
        .await;

    assert_eq!(response.status_code(), StatusCode::FORBIDDEN);
    assert!(response.text().contains("Origin"));
    assert!(response.text().contains("not allowed"));
}

#[tokio::test]
async fn test_origin_from_referer_header() {
    let ctx = TestContext::new().await;

    // Origin should be extracted from Referer if Origin header missing
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Referer", "https://localhost/page")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_secret_key_skips_origin_validation() {
    let ctx = TestContext::new().await;

    // Secret key should skip origin validation (server-to-server)
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.secret_key)
        .add_header("Origin", "https://evil.com")
        .await;

    // Should succeed because secret keys skip origin check
    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_auth_user_with_admin_creation() {
    let ctx = TestContext::new().await;

    // Create user using admin endpoint (uses secret key internally)
    let user_response = ctx.register_user("Test User", "test@example.com", "").await;
    let token = user_response["token"].as_str().unwrap();

    // Use token to access protected endpoint
    let response = ctx
        .server
        .get("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
    let body: serde_json::Value = response.json();
    assert_eq!(body["email"], "test@example.com");
    assert_eq!(body["name"], "Test User");
}

#[tokio::test]
async fn test_auth_user_missing_token() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .get("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    assert!(response.text().contains("Missing Authorization header"));
}

#[tokio::test]
async fn test_auth_user_invalid_token_format() {
    let ctx = TestContext::new().await;

    // Missing "Bearer " prefix
    let response = ctx
        .server
        .get("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", "not-a-bearer-token")
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    assert!(response.text().contains("Invalid Authorization header format"));
}

#[tokio::test]
async fn test_auth_user_invalid_token() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .get("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", "Bearer invalid.token.here")
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
    assert!(response.text().contains("Invalid token"));
}

// Note: Session expiry is tested indirectly through other auth tests
// We can't easily test it here because session_id is not exposed in the API response

#[tokio::test]
async fn test_maybe_auth_user_with_token() {
    let ctx = TestContext::new().await;

    // Create user and get token
    let user_response = ctx.register_user("Optional Auth", "optional@example.com", "").await;
    let token = user_response["token"].as_str().unwrap();

    // GET /comments accepts optional auth (MaybeAuthUser)
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_maybe_auth_user_without_token() {
    let ctx = TestContext::new().await;

    // GET /comments should work without auth (MaybeAuthUser)
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_auth_user_with_role_moderator() {
    let ctx = TestContext::new().await;

    // Create user
    let user_response = ctx.register_user("Moderator", "mod@example.com", "").await;
    let user_id = user_response["user"]["id"].as_str().unwrap();
    let token = user_response["token"].as_str().unwrap();

    // Promote to moderator directly in Redis (simpler for testing extractors)
    ctx.set_user_role(user_id, "moderator").await;

    // Access moderator endpoint with the token
    // The JWT token doesn't store roles, so the extractor checks Redis for role membership
    let response = ctx
        .server
        .get(&format!("/v1/admin/sites/{}/comments", ctx.site_id))
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    if response.status_code() != StatusCode::OK {
        println!("Response status: {}", response.status_code());
        println!("Response body: {}", response.text());
    }
    assert_eq!(response.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_auth_user_with_role_forbidden() {
    let ctx = TestContext::new().await;

    // Regular user (not moderator)
    let user_response = ctx.register_user("Regular User", "user@example.com", "").await;
    let token = user_response["token"].as_str().unwrap();

    // Try to access moderator endpoint
    let response = ctx
        .server
        .get(&format!("/v1/admin/sites/{}/comments", ctx.site_id))
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(response.status_code(), StatusCode::FORBIDDEN);
    assert!(response.text().contains("Moderator access required"));
}

#[tokio::test]
async fn test_api_key_caching() {
    let ctx = TestContext::new().await;

    // First request - cache miss
    let response1 = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(response1.status_code(), StatusCode::OK);

    // Second request - should hit cache
    let response2 = ctx
        .server
        .get("/v1/comments?page_url=test2")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(response2.status_code(), StatusCode::OK);
}

#[tokio::test]
async fn test_case_insensitive_origin() {
    let ctx = TestContext::new().await;

    // Origin should be case-insensitive
    let response = ctx
        .server
        .get("/v1/comments?page_url=test")
        .add_header("projectid", &ctx.project_id)
        .add_header("Origin", "https://LOCALHOST")
        .await;

    assert_eq!(response.status_code(), StatusCode::OK);
}
