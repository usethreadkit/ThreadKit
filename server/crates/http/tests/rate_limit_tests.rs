mod common;

use axum::http::{HeaderName, HeaderValue, StatusCode};
use common::TestContext;

fn project_id_header(project_id: &str) -> (HeaderName, HeaderValue) {
    (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(project_id).unwrap(),
    )
}

#[tokio::test]
async fn test_rate_limit_headers_present() {
    let ctx = TestContext::new().await;
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
    let (key_name, key_value) = project_id_header(&ctx.project_id);

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
