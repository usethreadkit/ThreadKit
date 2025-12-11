mod common;

use axum::http::{HeaderName, HeaderValue, StatusCode};
use common::TestContext;
use serde_json::json;

fn project_id_header(project_id: &str) -> (HeaderName, HeaderValue) {
    (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(project_id).unwrap(),
    )
}

fn auth_header(token: &str) -> (HeaderName, HeaderValue) {
    (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
    )
}

fn turnstile_header(token: &str) -> (HeaderName, HeaderValue) {
    (
        HeaderName::from_static("x-turnstile-token"),
        HeaderValue::from_str(token).unwrap(),
    )
}

#[tokio::test]
async fn test_turnstile_disabled_by_default() {
    // Without Turnstile secret key configured, comments should work without token
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create comment without Turnstile token - should succeed
    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment without turnstile", None)
        .await;

    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_turnstile_config_endpoint() {
    let ctx = TestContext::new().await;

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get("/v1/turnstile/config")
        .add_header(key_name, key_value)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();

    // Default settings: disabled
    assert_eq!(body["enabled"], false);
    assert_eq!(body["enforce_on"], "anonymous");
    // server_configured depends on whether TURNSTILE_SECRET_KEY is set
    // In test context it's not set, so should be false
    assert_eq!(body["server_configured"], false);
}

#[tokio::test]
async fn test_turnstile_challenge_page_requires_site_key() {
    let ctx = TestContext::new().await;

    // Request challenge page without site_key
    let response = ctx
        .server
        .get("/v1/turnstile/challenge")
        .await;

    response.assert_status(StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_turnstile_challenge_page_returns_html() {
    let ctx = TestContext::new().await;

    // Request challenge page with site_key
    let response = ctx
        .server
        .get("/v1/turnstile/challenge")
        .add_query_param("site_key", "test_site_key_123")
        .await;

    response.assert_status(StatusCode::OK);

    let body = response.text();
    // Should contain the Turnstile script
    assert!(body.contains("challenges.cloudflare.com/turnstile"));
    // Should contain the site key
    assert!(body.contains("test_site_key_123"));
    // Should have postMessage handling
    assert!(body.contains("threadkit:turnstile:success"));
}

#[tokio::test]
async fn test_turnstile_verify_requires_secret_key() {
    let ctx = TestContext::new().await;

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .post("/v1/turnstile/verify")
        .add_header(key_name, key_value)
        .json(&json!({
            "token": "some_token"
        }))
        .await;

    // Should fail because no secret key is configured
    response.assert_status(StatusCode::SERVICE_UNAVAILABLE);
}

#[tokio::test]
async fn test_turnstile_enforcement_unverified_currently_same_as_anonymous() {
    // NOTE: Currently "unverified" enforcement behaves the same as "anonymous"
    // It only checks if is_anonymous, not if email/phone is verified
    // TODO: Implement actual email_verified/phone_verified checking
    let ctx = TestContext::new().await;

    // Register a user (email not verified by default)
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Enable Turnstile with "unverified" enforcement
    ctx.update_site_settings(json!({
        "turnstile": {
            "enabled": true,
            "enforce_on": "unverified",
            "cache_duration_seconds": 0
        }
    }))
    .await;

    // Currently, authenticated users (even unverified) can post without Turnstile
    // because "unverified" mode only checks is_anonymous (see comments.rs:1114)
    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment from unverified user", None)
        .await;

    // Currently passes - should require token once proper verification check is implemented
    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_turnstile_enforcement_all_requires_token_for_authenticated_users() {
    // Test that when enforce_on: "all", even authenticated users need Turnstile token
    let ctx = TestContext::new().await;

    // Register a user
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Enable Turnstile with "all" enforcement (but no secret key, so should fail with SERVICE_UNAVAILABLE)
    ctx.update_site_settings(json!({
        "turnstile": {
            "enabled": true,
            "enforce_on": "all",
            "cache_duration_seconds": 0
        }
    }))
    .await;

    // Try to create comment without Turnstile token - should fail
    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment", None)
        .await;

    // Should fail with FORBIDDEN because missing X-Turnstile-Token header
    // (Token header check happens before secret key check)
    response.assert_status(StatusCode::FORBIDDEN);
    let body = response.text();
    assert!(body.contains("Turnstile verification required"));
}

#[tokio::test]
async fn test_turnstile_enforcement_anonymous_allows_authenticated_users() {
    // Test that when enforce_on: "anonymous", authenticated users can post without Turnstile
    let ctx = TestContext::new().await;

    // Register a user
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Enable Turnstile with "anonymous" enforcement
    ctx.update_site_settings(json!({
        "turnstile": {
            "enabled": true,
            "enforce_on": "anonymous",
            "cache_duration_seconds": 0
        }
    }))
    .await;

    // Authenticated user should be able to post without Turnstile token
    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment from authenticated user", None)
        .await;

    // Should succeed because authenticated users are exempt when enforce_on: "anonymous"
    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_turnstile_enabled_but_missing_token_header() {
    // Test that when Turnstile is enabled and required, missing token returns proper error
    let ctx = TestContext::new().await;

    // Enable Turnstile with "all" enforcement
    ctx.update_site_settings(json!({
        "turnstile": {
            "enabled": true,
            "enforce_on": "all",
            "cache_duration_seconds": 0
        }
    }))
    .await;

    // Register user and try to post without X-Turnstile-Token header
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment", None)
        .await;

    // Should fail with FORBIDDEN because missing X-Turnstile-Token header
    // (Token header check happens before secret key check in the validation flow)
    response.assert_status(StatusCode::FORBIDDEN);
    let body = response.text();
    assert!(body.contains("Turnstile verification required"));
}

#[tokio::test]
async fn test_turnstile_disabled_allows_all_comments() {
    // Test that when Turnstile is disabled, all users can post
    let ctx = TestContext::new().await;

    // Explicitly disable Turnstile
    ctx.update_site_settings(json!({
        "turnstile": {
            "enabled": false,
            "enforce_on": "all",
            "cache_duration_seconds": 0
        }
    }))
    .await;

    // Register user and post without token
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment", None)
        .await;

    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_turnstile_enforce_none_allows_all_comments() {
    // Test that enforce_on: "none" allows all comments even when enabled: true
    let ctx = TestContext::new().await;

    ctx.update_site_settings(json!({
        "turnstile": {
            "enabled": true,
            "enforce_on": "none",
            "cache_duration_seconds": 0
        }
    }))
    .await;

    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(token, "https://example.com/page1", "Comment", None)
        .await;

    response.assert_status(StatusCode::OK);
}
