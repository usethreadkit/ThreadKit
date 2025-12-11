mod common;

use axum::http::StatusCode;
use common::TestContext;

#[tokio::test]
async fn test_upload_avatar_requires_s3() {
    let ctx = TestContext::new().await;

    // Try to upload avatar without S3 configured
    let user = ctx.register_user("testuser", "test@example.com", "password123").await;
    let token = user["token"].as_str().unwrap();

    let (auth_name, auth_value) = TestContext::auth_header(token);

    let response = ctx
        .server
        .post("/v1/upload/avatar")
        .add_header(ctx.project_id_header().0, ctx.project_id_header().1)
        .add_header(auth_name, auth_value)
        .multipart(
            axum_test::multipart::MultipartForm::new()
                .add_text("file", "fake image data")
        )
        .await;

    // Should return error because S3 is not configured
    // The exact status code depends on implementation, but it shouldn't be 200
    assert_ne!(response.status_code(), StatusCode::OK);
}

// TODO: Implement actual multipart upload tests once we figure out axum_test API
// For now, these tests verify the infrastructure is set up correctly

#[tokio::test]
async fn test_s3_config_available_with_minio() {
    let ctx = TestContext::new_with_s3(true).await;

    // Verify S3 config was created
    assert!(ctx.s3_config.is_some());

    let s3_config = ctx.s3_config.as_ref().unwrap();
    assert!(s3_config.endpoint.contains("localhost") || s3_config.endpoint.contains("127.0.0.1"));
    assert_eq!(s3_config.bucket, "threadkit-media");
    assert!(s3_config.public_url.contains("threadkit"));
}

#[tokio::test]
async fn test_s3_not_configured_without_flag() {
    let ctx = TestContext::new().await;

    // Verify S3 config is None when not requested
    assert!(ctx.s3_config.is_none());
}
