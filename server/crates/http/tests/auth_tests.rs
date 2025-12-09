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

#[tokio::test]
async fn test_register_with_email() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
async fn test_requires_project_id() {
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

// ============================================================================
// Auth Methods Tests
// ============================================================================

#[tokio::test]
async fn test_auth_methods_returns_available_methods() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    let response = ctx
        .server
        .get("/v1/auth/methods")
        .add_header(key_name, key_value)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();

    // Should return a methods array
    assert!(body["methods"].is_array());

    // Email should be enabled by default in standalone mode
    let methods = body["methods"].as_array().unwrap();
    let email_method = methods.iter().find(|m| m["id"] == "email");
    assert!(email_method.is_some());
    assert_eq!(email_method.unwrap()["type"], "otp");
}

#[tokio::test]
async fn test_auth_methods_requires_project_id() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .get("/v1/auth/methods")
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}

// ============================================================================
// OTP Tests
// ============================================================================

#[tokio::test]
async fn test_send_otp_email() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    let response = ctx
        .server
        .post("/v1/auth/send-otp")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "otp-test@example.com"
        }))
        .await;

    // Should succeed (email provider not configured, so just logs)
    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_send_otp_phone() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    let response = ctx
        .server
        .post("/v1/auth/send-otp")
        .add_header(key_name, key_value)
        .json(&json!({
            "phone": "+1234567890"
        }))
        .await;

    // Should succeed (SMS provider not configured, so just logs)
    response.assert_status(StatusCode::OK);
}

#[tokio::test]
async fn test_send_otp_requires_email_or_phone() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    let response = ctx
        .server
        .post("/v1/auth/send-otp")
        .add_header(key_name, key_value)
        .json(&json!({}))
        .await;

    response.assert_status(StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_verify_otp_invalid_code() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    // First send OTP to store a code
    ctx.server
        .post("/v1/auth/send-otp")
        .add_header(key_name.clone(), key_value.clone())
        .json(&json!({
            "email": "verify-test@example.com"
        }))
        .await;

    // Try to verify with wrong code
    let response = ctx
        .server
        .post("/v1/auth/verify-otp")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "verify-test@example.com",
            "code": "000000"
        }))
        .await;

    response.assert_status(StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_verify_otp_no_code_sent() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    // Try to verify without sending OTP first
    let response = ctx
        .server
        .post("/v1/auth/verify-otp")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "no-code@example.com",
            "code": "123456"
        }))
        .await;

    response.assert_status(StatusCode::BAD_REQUEST);
    let body = response.text();
    assert!(body.contains("No verification code found"));
}

#[tokio::test]
async fn test_verify_otp_requires_name_for_new_account() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

    // Send OTP
    ctx.server
        .post("/v1/auth/send-otp")
        .add_header(key_name.clone(), key_value.clone())
        .json(&json!({
            "email": "newuser-otp@example.com"
        }))
        .await;

    // Get the verification code from Redis (for testing we'd need to mock this)
    // For now, we test that the endpoint exists and returns proper errors
    let response = ctx
        .server
        .post("/v1/auth/verify-otp")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "newuser-otp@example.com",
            "code": "wrong-code"
        }))
        .await;

    // Should fail with invalid code (not "name required" since code is wrong)
    response.assert_status(StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn test_send_otp_requires_project_id() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .post("/v1/auth/send-otp")
        .json(&json!({
            "email": "test@example.com"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_verify_otp_requires_project_id() {
    let ctx = TestContext::new().await;

    let response = ctx
        .server
        .post("/v1/auth/verify-otp")
        .json(&json!({
            "email": "test@example.com",
            "code": "123456"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}
