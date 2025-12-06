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

#[tokio::test]
async fn test_rate_limit_headers_present() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/page")
        .add_header(key_name, key_value)
        .await;

    response.assert_status(StatusCode::OK);

    // Check rate limit headers are present
    let headers = response.headers();
    assert!(headers.contains_key("x-ratelimit-limit"));
    assert!(headers.contains_key("x-ratelimit-remaining"));
    assert!(headers.contains_key("x-ratelimit-reset"));
}

#[tokio::test]
async fn test_rate_limit_decrements() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // First request
    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/page1")
        .add_header(key_name.clone(), key_value.clone())
        .await;

    let remaining1: i64 = response
        .headers()
        .get("x-ratelimit-remaining")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();

    // Second request
    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/page2")
        .add_header(key_name, key_value)
        .await;

    let remaining2: i64 = response
        .headers()
        .get("x-ratelimit-remaining")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();

    assert!(remaining2 < remaining1);
}

#[tokio::test]
async fn test_auth_rate_limit_stricter() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Auth route should have stricter limits
    let response = ctx
        .server
        .post("/v1/auth/login")
        .add_header(key_name, key_value)
        .json(&json!({
            "email": "nonexistent@example.com",
            "password": "wrong"
        }))
        .await;

    let limit: i64 = response
        .headers()
        .get("x-ratelimit-limit")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();

    // Auth limit should be 10/hour (stricter than read's 30/min)
    assert_eq!(limit, 10);
}

#[tokio::test]
async fn test_write_rate_limit() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("writer", "writer@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create comment (write operation)
    let response = ctx
        .create_comment(token, "https://example.com/ratelimit", "Test comment", None)
        .await;

    let limit: i64 = response
        .headers()
        .get("x-ratelimit-limit")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();

    // Write limit should be 5/min
    assert_eq!(limit, 5);
}

#[tokio::test]
async fn test_rate_limit_exceeded() {
    let ctx = TestContext::new().await;

    // Make many requests to exhaust the rate limit (5 writes per minute)
    let auth = ctx
        .register_user("spammer", "spammer@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // The register call counts as a write, so we have 4 remaining
    // Make 4 more write requests
    for i in 0..4 {
        let response = ctx
            .create_comment(
                token,
                &format!("https://example.com/spam{}", i),
                "Spam comment",
                None,
            )
            .await;

        if i < 3 {
            response.assert_status(StatusCode::OK);
        }
    }

    // The 5th write should be rate limited
    let response = ctx
        .create_comment(token, "https://example.com/spam_final", "Final spam", None)
        .await;

    response.assert_status(StatusCode::TOO_MANY_REQUESTS);

    // Check 429 response has proper headers
    let headers = response.headers();
    assert!(headers.contains_key("retry-after"));
    assert_eq!(
        headers.get("x-ratelimit-remaining").unwrap().to_str().unwrap(),
        "0"
    );
}

#[tokio::test]
async fn test_read_limit_higher_than_write() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Get read limit
    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/read")
        .add_header(key_name, key_value)
        .await;

    let read_limit: i64 = response
        .headers()
        .get("x-ratelimit-limit")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();

    // Register user to get write limit
    let auth = ctx
        .register_user("limiter", "limiter@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(token, "https://example.com/write", "Test", None)
        .await;

    let write_limit: i64 = response
        .headers()
        .get("x-ratelimit-limit")
        .unwrap()
        .to_str()
        .unwrap()
        .parse()
        .unwrap();

    // Read limit (30) should be higher than write limit (5)
    assert!(read_limit > write_limit);
    assert_eq!(read_limit, 30);
    assert_eq!(write_limit, 5);
}

#[tokio::test]
async fn test_rate_limit_response_body() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = api_key_header(&ctx.api_key);

    // Exhaust auth rate limit (10 attempts per hour)
    for _ in 0..11 {
        let response = ctx
            .server
            .post("/v1/auth/login")
            .add_header(key_name.clone(), key_value.clone())
            .json(&json!({
                "email": "fake@example.com",
                "password": "wrong"
            }))
            .await;

        if response.status_code() == StatusCode::TOO_MANY_REQUESTS {
            // Verify the response body
            let body: serde_json::Value = response.json();
            assert_eq!(body["error"], "Rate limit exceeded");
            assert!(body.get("layer").is_some());
            assert!(body.get("retry_after").is_some());
            return;
        }
    }

    panic!("Rate limit was not triggered");
}
