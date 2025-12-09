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
