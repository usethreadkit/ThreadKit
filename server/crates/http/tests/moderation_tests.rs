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

/// Test that comments go to moderation queue when required
#[tokio::test]
async fn test_comment_enters_moderation_queue() {
    let ctx = TestContext::new().await;

    // Configure site for pre-moderation
    ctx.set_moderation_mode("pre_moderation").await;

    // Register user
    let auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token, "https://example.com/page1", "Test comment", None)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();

    // Comment should have status "pending"
    assert_eq!(body["comment"]["s"], "pending");
}

/// Test that moderators can view moderation queue
#[tokio::test]
async fn test_moderator_can_view_queue() {
    let ctx = TestContext::new().await;
    ctx.set_moderation_mode("pre_moderation").await;

    // Register regular user and post comment
    let user_auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let user_token = user_auth["token"].as_str().unwrap();

    ctx.create_comment(user_token, "https://example.com/page1", "Pending comment", None)
        .await;

    // Register moderator
    let mod_auth = ctx
        .register_user("moderator", "moderator@example.com", "password123")
        .await;
    let mod_token = mod_auth["token"].as_str().unwrap();

    // Set moderator role
    ctx.set_user_role(mod_token, "Moderator").await;

    // Get moderation queue
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(mod_token);

    let response = ctx
        .server
        .get("/v1/moderation/queue")
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();

    // Should have at least one pending comment
    assert!(body["comments"].as_array().unwrap().len() > 0);
}

/// Test that moderators can approve comments
#[tokio::test]
async fn test_moderator_can_approve_comment() {
    let ctx = TestContext::new().await;
    ctx.set_moderation_mode("pre_moderation").await;

    // User posts comment
    let user_auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let user_token = user_auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(user_token, "https://example.com/page1", "Test comment", None)
        .await;
    let body: serde_json::Value = response.json();
    let comment_id = body["comment"]["i"].as_str().unwrap();

    // Moderator approves
    let mod_auth = ctx
        .register_user("moderator", "moderator@example.com", "password123")
        .await;
    let mod_token = mod_auth["token"].as_str().unwrap();
    ctx.set_user_role(mod_token, "Moderator").await;

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(mod_token);

    let response = ctx
        .server
        .post(&format!("/v1/moderation/approve/{}", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    response.assert_status(StatusCode::OK);

    // Verify comment is now approved
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get(&format!("/v1/comments?page_url=https://example.com/page1"))
        .add_header(key_name, key_value)
        .await;

    let body: serde_json::Value = response.json();
    let comments = body["tree"].as_array().unwrap();

    assert_eq!(comments.len(), 1);
    // Status should be "approved" or not present (approved is default)
    assert!(comments[0]["s"].is_null() || comments[0]["s"] == "approved");
}

/// Test that moderators can reject comments
#[tokio::test]
async fn test_moderator_can_reject_comment() {
    let ctx = TestContext::new().await;
    ctx.set_moderation_mode("pre_moderation").await;

    // User posts comment
    let user_auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let user_token = user_auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(user_token, "https://example.com/page1", "Bad comment", None)
        .await;
    let body: serde_json::Value = response.json();
    let comment_id = body["comment"]["i"].as_str().unwrap();

    // Moderator rejects
    let mod_auth = ctx
        .register_user("moderator", "moderator@example.com", "password123")
        .await;
    let mod_token = mod_auth["token"].as_str().unwrap();
    ctx.set_user_role(mod_token, "Moderator").await;

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(mod_token);

    let response = ctx
        .server
        .post(&format!("/v1/moderation/reject/{}", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    response.assert_status(StatusCode::OK);

    // Verify comment is not visible
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get(&format!("/v1/comments?page_url=https://example.com/page1"))
        .add_header(key_name, key_value)
        .await;

    let body: serde_json::Value = response.json();
    let comments = body["tree"].as_array().unwrap();

    // Rejected comment should not appear
    assert_eq!(comments.len(), 0);
}

/// Test that regular users cannot approve/reject comments
#[tokio::test]
async fn test_regular_user_cannot_moderate() {
    let ctx = TestContext::new().await;
    ctx.set_moderation_mode("pre_moderation").await;

    // User posts comment
    let user_auth = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let user_token = user_auth["token"].as_str().unwrap();

    let response = ctx
        .create_comment(user_token, "https://example.com/page1", "Test comment", None)
        .await;
    let body: serde_json::Value = response.json();
    let comment_id = body["comment"]["i"].as_str().unwrap();

    // Try to approve with regular user
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(user_token);

    let response = ctx
        .server
        .post(&format!("/v1/moderation/approve/{}", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    // Should be forbidden
    response.assert_status(StatusCode::FORBIDDEN);
}

/// Test comment reporting system
#[tokio::test]
async fn test_user_can_report_comment() {
    let ctx = TestContext::new().await;

    // User 1 posts comment
    let auth1 = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let response = ctx
        .create_comment(token1, "https://example.com/page1", "Controversial comment", None)
        .await;
    let body: serde_json::Value = response.json();
    let comment_id = body["comment"]["i"].as_str().unwrap();

    // User 2 reports it
    let auth2 = ctx
        .register_user("user2", "user2@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token2);

    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/report", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "reason": "spam"
        }))
        .await;

    response.assert_status(StatusCode::OK);
}

/// Test that moderators can view reported comments
#[tokio::test]
async fn test_moderator_can_view_reports() {
    let ctx = TestContext::new().await;

    // User 1 posts and User 2 reports
    let auth1 = ctx
        .register_user("user1", "user1@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let response = ctx
        .create_comment(token1, "https://example.com/page1", "Reported comment", None)
        .await;
    let body: serde_json::Value = response.json();
    let comment_id = body["comment"]["i"].as_str().unwrap();

    let auth2 = ctx
        .register_user("user2", "user2@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    ctx.report_comment(token2, comment_id, "spam").await;

    // Moderator views reports
    let mod_auth = ctx
        .register_user("moderator", "moderator@example.com", "password123")
        .await;
    let mod_token = mod_auth["token"].as_str().unwrap();
    ctx.set_user_role(mod_token, "Moderator").await;

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(mod_token);

    let response = ctx
        .server
        .get("/v1/moderation/reports")
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();

    // Should have at least one report
    assert!(body["reports"].as_array().unwrap().len() > 0);
}

/// Test user banning
#[tokio::test]
async fn test_moderator_can_ban_user() {
    let ctx = TestContext::new().await;

    // Register users
    let user_auth = ctx
        .register_user("baduser", "baduser@example.com", "password123")
        .await;
    let user_id = user_auth["user"]["id"].as_str().unwrap();

    let mod_auth = ctx
        .register_user("moderator", "moderator@example.com", "password123")
        .await;
    let mod_token = mod_auth["token"].as_str().unwrap();
    ctx.set_user_role(mod_token, "Moderator").await;

    // Ban user
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(mod_token);

    let response = ctx
        .server
        .post(&format!("/v1/moderation/ban/{}", user_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "reason": "Violating community guidelines"
        }))
        .await;

    response.assert_status(StatusCode::OK);

    // Verify banned user cannot post
    let user_token = user_auth["token"].as_str().unwrap();
    let response = ctx
        .create_comment(user_token, "https://example.com/page1", "Should fail", None)
        .await;

    response.assert_status(StatusCode::FORBIDDEN);
}

/// Test shadowban functionality
#[tokio::test]
async fn test_moderator_can_shadowban_user() {
    let ctx = TestContext::new().await;

    // Register users
    let user_auth = ctx
        .register_user("shadowuser", "shadowuser@example.com", "password123")
        .await;
    let user_token = user_auth["token"].as_str().unwrap();
    let user_id = user_auth["user"]["id"].as_str().unwrap();

    let mod_auth = ctx
        .register_user("moderator", "moderator@example.com", "password123")
        .await;
    let mod_token = mod_auth["token"].as_str().unwrap();
    ctx.set_user_role(mod_token, "Moderator").await;

    // Shadowban user
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(mod_token);

    let response = ctx
        .server
        .post(&format!("/v1/moderation/shadowban/{}", user_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    response.assert_status(StatusCode::OK);

    // Shadowbanned user can post (thinks it worked)
    let response = ctx
        .create_comment(user_token, "https://example.com/page1", "Invisible comment", None)
        .await;

    response.assert_status(StatusCode::OK);

    // But their comment is not visible to others
    let other_auth = ctx
        .register_user("otheruser", "other@example.com", "password123")
        .await;
    let other_token = other_auth["token"].as_str().unwrap();

    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(other_token);

    let response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .await;

    let body: serde_json::Value = response.json();
    let comments = body["tree"].as_array().unwrap();

    // Should not see shadowbanned user's comment
    assert_eq!(comments.len(), 0);
}
