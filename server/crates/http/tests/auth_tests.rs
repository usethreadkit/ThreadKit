mod common;

use axum::http::{HeaderName, HeaderValue, StatusCode};
use common::TestContext;
use serde_json::json;

fn api_key_header(api_key: &str) -> (HeaderName, HeaderValue) {
    (
        HeaderName::from_static("x-api-key"),
        HeaderValue::from_str(api_key).unwrap(),
    )
}

fn auth_header(token: &str) -> (HeaderName, HeaderValue) {
    (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
    )
}

#[tokio::test]
async fn test_register_with_email() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    let response = ctx
        .server
        .post("/v1/auth/register")
        .add_header(key_name, key_value)
        .json(&json!({
            "name": "testuser",
            "email": "test@example.com",
            "password": "password123"
        }))
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    assert!(body["token"].is_string());
    assert!(body["refresh_token"].is_string());
    assert_eq!(body["user"]["name"], "testuser");
    assert_eq!(body["user"]["email"], "test@example.com");
    assert_eq!(body["user"]["email_verified"], false);
}

#[tokio::test]
async fn test_register_requires_email_or_phone() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    let response = ctx
        .server
        .post("/v1/auth/register")
        .add_header(key_name, key_value)
        .json(&json!({
            "name": "testuser",
            "password": "password123"
        }))
        .await;

    response.assert_status(StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_register_duplicate_email() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // First registration
    let response = ctx
        .server
        .post("/v1/auth/register")
        .add_header(key_name.clone(), key_value.clone())
        .json(&json!({
            "name": "user1",
            "email": "duplicate@example.com",
            "password": "password123"
        }))
        .await;
    response.assert_status(StatusCode::OK);

    // Second registration with same email
    let response = ctx
        .server
        .post("/v1/auth/register")
        .add_header(key_name, key_value)
        .json(&json!({
            "name": "user2",
            "email": "duplicate@example.com",
            "password": "password123"
        }))
        .await;
    response.assert_status(StatusCode::CONFLICT);
}

#[tokio::test]
async fn test_register_duplicate_username() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // First registration
    let response = ctx
        .server
        .post("/v1/auth/register")
        .add_header(key_name.clone(), key_value.clone())
        .json(&json!({
            "name": "duplicateuser",
            "email": "user1@example.com",
            "password": "password123"
        }))
        .await;
    response.assert_status(StatusCode::OK);

    // Second registration with same username
    let response = ctx
        .server
        .post("/v1/auth/register")
        .add_header(key_name, key_value)
        .json(&json!({
            "name": "duplicateuser",
            "email": "user2@example.com",
            "password": "password123"
        }))
        .await;
    response.assert_status(StatusCode::CONFLICT);
}

#[tokio::test]
async fn test_login_success() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Register first
    ctx.register_user("loginuser", "login@example.com", "password123")
        .await;

    // Login
    let response = ctx
        .server
        .post("/v1/auth/login")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "login@example.com",
            "password": "password123"
        }))
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    assert!(body["token"].is_string());
    assert_eq!(body["user"]["name"], "loginuser");
}

#[tokio::test]
async fn test_login_wrong_password() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Register first
    ctx.register_user("wrongpassuser", "wrongpass@example.com", "correctpassword")
        .await;

    // Login with wrong password
    let response = ctx
        .server
        .post("/v1/auth/login")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "wrongpass@example.com",
            "password": "wrongpassword"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_login_nonexistent_user() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    let response = ctx
        .server
        .post("/v1/auth/login")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "nonexistent@example.com",
            "password": "password123"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_refresh_token() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Register and get refresh token
    let auth = ctx
        .register_user("refreshuser", "refresh@example.com", "password123")
        .await;

    let refresh_token = auth["refresh_token"].as_str().unwrap();

    // Use refresh token
    let response = ctx
        .server
        .post("/v1/auth/refresh")
        .add_header(key_name, key_value)
        .json(&json!({
            "refresh_token": refresh_token
        }))
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    assert!(body["token"].is_string());
    assert!(body["refresh_token"].is_string());
}

#[tokio::test]
async fn test_refresh_token_invalid() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    let response = ctx
        .server
        .post("/v1/auth/refresh")
        .add_header(key_name, key_value)
        .json(&json!({
            "refresh_token": "invalid_token"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_logout() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Register and get token
    let auth = ctx
        .register_user("logoutuser", "logout@example.com", "password123")
        .await;

    let token = auth["token"].as_str().unwrap();
    let (auth_name, auth_value) = auth_header(token);

    // Logout
    let response = ctx
        .server
        .post("/v1/auth/logout")
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_forgot_password() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Register first
    ctx.register_user("forgotuser", "forgot@example.com", "password123")
        .await;

    // Request password reset
    let response = ctx
        .server
        .post("/v1/auth/forgot")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "forgot@example.com"
        }))
        .await;

    // Should always return OK to prevent email enumeration
    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_requires_api_key() {
    let ctx = TestContext::new().await;

    // Try to register without API key
    let response = ctx
        .server
        .post("/v1/auth/register")
        .json(&json!({
            "name": "testuser",
            "email": "test@example.com",
            "password": "password123"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}
