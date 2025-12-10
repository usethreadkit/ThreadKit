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
async fn test_create_comment() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("commenter", "commenter@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token, "https://example.com/page1", "This is a test comment", None)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    // TreeComment uses compact keys: t=text, n=author name, i=id
    assert_eq!(body["comment"]["t"], "This is a test comment");
    assert_eq!(body["comment"]["n"], "commenter");
}

#[tokio::test]
async fn test_create_reply() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("replier", "replier@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create parent comment
    let response = ctx
        .create_comment(token, "https://example.com/page2", "Parent comment", None)
        .await;
    response.assert_status(StatusCode::OK);
    let parent: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let parent_id = parent["comment"]["i"].as_str().unwrap();

    // Create reply
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token);
    let response = ctx
        .server
        .post("/v1/comments")
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/page2",
            "content": "This is a reply",
            "parent_path": [parent_id]
        }))
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    // t=text in TreeComment format
    assert_eq!(body["comment"]["t"], "This is a reply");
}

#[tokio::test]
async fn test_get_comments() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("reader", "reader@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create a few comments
    for i in 1..=3 {
        ctx.create_comment(
            token,
            "https://example.com/page3",
            &format!("Comment {}", i),
            None,
        )
        .await;
    }

    // Get comments
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/page3")
        .add_header(key_name, key_value)
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    assert_eq!(body["total"], 3);
    // Uses tree.c format where c=comments array
    assert_eq!(body["tree"]["c"].as_array().unwrap().len(), 3);
}

#[tokio::test]
async fn test_update_comment() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("editor", "editor@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token, "https://example.com/page4", "Original content", None)
        .await;
    let comment: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Update comment - requires page_url and path
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token);
    let response = ctx
        .server
        .put(&format!("/v1/comments/{}", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/page4",
            "content": "Updated content",
            "path": [comment_id]
        }))
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    // update_comment returns TreeComment with compact keys: t=text, m=modified_at
    assert_eq!(body["t"], "Updated content");
    // Verify modified_at is set (it's a timestamp)
    assert!(body["m"].is_number());
}

#[tokio::test]
async fn test_update_comment_not_owner() {
    let ctx = TestContext::new().await;

    // Register first user
    let auth1 = ctx
        .register_user("owner", "owner@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    // Register second user
    let auth2 = ctx
        .register_user("other", "other@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment as first user
    let response = ctx
        .create_comment(token1, "https://example.com/page5", "My comment", None)
        .await;
    let comment: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Try to update as second user
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token2);
    let response = ctx
        .server
        .put(&format!("/v1/comments/{}", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/page5",
            "content": "Hijacked content",
            "path": [comment_id]
        }))
        .await;

    response.assert_status(StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn test_delete_comment() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("deleter", "deleter@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token, "https://example.com/page6", "To be deleted", None)
        .await;
    let comment: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Delete comment - delete endpoint accepts JSON body with page_url and path
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token);
    let response = ctx
        .server
        .delete(&format!("/v1/comments/{}", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/page6",
            "path": [comment_id]
        }))
        .await;

    response.assert_status(StatusCode::NO_CONTENT);

    // Verify comment is not visible
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/page6")
        .add_header(key_name, key_value)
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["total"], 0);
}

#[tokio::test]
async fn test_vote_comment() {
    let ctx = TestContext::new().await;

    // Register two users
    let auth1 = ctx
        .register_user("voter1", "voter1@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("voter2", "voter2@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment as first user
    let response = ctx
        .create_comment(token1, "https://example.com/page7", "Vote on me", None)
        .await;
    let comment: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Upvote as second user
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token2);
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/page7",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;

    response.assert_status(StatusCode::OK);
    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 1);
    assert_eq!(body["downvotes"], 0);
    assert_eq!(body["user_vote"], "up");
}

#[tokio::test]
async fn test_vote_toggle() {
    let ctx = TestContext::new().await;

    // Register users
    let auth1 = ctx
        .register_user("toggler1", "toggler1@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("toggler2", "toggler2@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/page8", "Toggle vote", None)
        .await;
    let comment: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Upvote
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token2);
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({ "page_url": "https://example.com/page8", "direction": "up", "path": [comment_id] }))
        .await;
    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 1);

    // Upvote again to remove
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({ "page_url": "https://example.com/page8", "direction": "up", "path": [comment_id] }))
        .await;
    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 0);
    assert!(body["user_vote"].is_null());
}

#[tokio::test]
async fn test_report_comment() {
    let ctx = TestContext::new().await;

    // Register users
    let auth1 = ctx
        .register_user("reported", "reported@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("reporter", "reporter@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/page9", "Report me", None)
        .await;
    let comment: serde_json::Value = response.json();
    // TreeComment uses compact keys: i=id
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Report comment
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let (auth_name, auth_value) = auth_header(token2);
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/report", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/page9",
            "reason": "spam",
            "details": "This is spam content",
            "path": [comment_id]
        }))
        .await;

    response.assert_status(StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn test_create_comment_requires_auth() {
    let ctx = TestContext::new().await;

    // Try to create comment without auth
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .post("/v1/comments")
        .add_header(key_name, key_value)
        .json(&json!({
            "page_url": "https://example.com/page10",
            "content": "Unauthenticated comment"
        }))
        .await;

    response.assert_status(StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_comment_count_increments() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("counter", "counter@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();
    let user_id = auth["user"]["id"].as_str().unwrap();

    // Get initial user profile
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name.clone(), key_value.clone())
        .await;
    response.assert_status(StatusCode::OK);
    let user: serde_json::Value = response.json();
    assert_eq!(user["total_comments"], 0);

    // Post one comment
    ctx.create_comment(token, "https://example.com/count1", "First comment", None)
        .await;

    // Wait a bit for background task to complete
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Check count is now 1
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name.clone(), key_value.clone())
        .await;
    response.assert_status(StatusCode::OK);
    let user: serde_json::Value = response.json();
    assert_eq!(user["total_comments"], 1);

    // Post another comment
    ctx.create_comment(token, "https://example.com/count1", "Second comment", None)
        .await;

    // Wait for background task
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Check count is now 2
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name, key_value)
        .await;
    response.assert_status(StatusCode::OK);
    let user: serde_json::Value = response.json();
    assert_eq!(user["total_comments"], 2);
}

#[tokio::test]
async fn test_multiple_comments_increment_count() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("multi", "multi@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();
    let user_id = auth["user"]["id"].as_str().unwrap();

    // Post multiple comments
    for i in 1..=5 {
        ctx.create_comment(
            token,
            "https://example.com/multi",
            &format!("Comment {}", i),
            None,
        )
        .await;
    }

    // Wait for background tasks
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    // Verify count is 5
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name, key_value)
        .await;
    response.assert_status(StatusCode::OK);
    let user: serde_json::Value = response.json();
    assert_eq!(user["total_comments"], 5);
}

#[tokio::test]
async fn test_user_endpoint_returns_total_comments() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("getter", "getter@example.com", "password123")
        .await;
    let user_id = auth["user"]["id"].as_str().unwrap();

    // Get user with 0 comments
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name, key_value)
        .await;

    response.assert_status(StatusCode::OK);
    let user: serde_json::Value = response.json();

    // Verify all expected fields are present
    assert!(user["id"].is_string());
    assert!(user["name"].is_string());
    assert!(user["karma"].is_number());
    assert!(user["created_at"].is_number());
    assert_eq!(user["total_comments"], 0);
}

#[tokio::test]
async fn test_user_endpoint_with_multiple_comments() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("prolific", "prolific@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();
    let user_id = auth["user"]["id"].as_str().unwrap();

    // Post 3 comments
    for i in 1..=3 {
        ctx.create_comment(
            token,
            "https://example.com/prolific",
            &format!("Comment {}", i),
            None,
        )
        .await;
    }

    // Wait for background tasks
    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;

    // Get user profile
    let (key_name, key_value) = project_id_header(&ctx.project_id);
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name, key_value)
        .await;

    response.assert_status(StatusCode::OK);
    let user: serde_json::Value = response.json();
    assert_eq!(user["total_comments"], 3);
    assert_eq!(user["name"], "prolific");
}

// ========================================================================
// Comprehensive Voting Tests
// ========================================================================


#[tokio::test]
async fn test_vote_switch_up_to_down() {
    let ctx = TestContext::new().await;

    // Register users
    let auth1 = ctx
        .register_user("author_switch", "author_switch@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("voter_switch", "voter_switch@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/switch", "Switch test", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Upvote
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let (auth_name, auth_value) = (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token2)).unwrap(),
    );
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/switch",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 1);
    assert_eq!(body["downvotes"], 0);
    assert_eq!(body["user_vote"], "up");

    // Switch to downvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/switch",
            "direction": "down",
            "path": [comment_id]
        }))
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 0);
    assert_eq!(body["downvotes"], 1);
    assert_eq!(body["user_vote"], "down");
}

#[tokio::test]
async fn test_vote_switch_down_to_up() {
    let ctx = TestContext::new().await;

    // Register users
    let auth1 = ctx
        .register_user("author_switch2", "author_switch2@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("voter_switch2", "voter_switch2@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/switch2", "Switch test 2", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Downvote
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let (auth_name, auth_value) = (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token2)).unwrap(),
    );
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/switch2",
            "direction": "down",
            "path": [comment_id]
        }))
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 0);
    assert_eq!(body["downvotes"], 1);
    assert_eq!(body["user_vote"], "down");

    // Switch to upvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/switch2",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["upvotes"], 1);
    assert_eq!(body["downvotes"], 0);
    assert_eq!(body["user_vote"], "up");
}

#[tokio::test]
async fn test_multiple_users_voting() {
    let ctx = TestContext::new().await;

    // Register author and 3 voters
    let auth1 = ctx
        .register_user("author_multi", "author_multi@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let voters = vec![
        ctx.register_user("voter1_multi", "voter1_multi@example.com", "password123").await,
        ctx.register_user("voter2_multi", "voter2_multi@example.com", "password123").await,
        ctx.register_user("voter3_multi", "voter3_multi@example.com", "password123").await,
    ];

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/multi_vote", "Multi voter test", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Have 2 users upvote and 1 downvote
    for (i, voter) in voters.iter().enumerate() {
        let token = voter["token"].as_str().unwrap();
        let direction = if i < 2 { "up" } else { "down" };

        let (key_name, key_value) = (
            HeaderName::from_static("projectid"),
            HeaderValue::from_str(&ctx.project_id).unwrap(),
        );
        let (auth_name, auth_value) = (
            HeaderName::from_static("authorization"),
            HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
        );

        ctx.server
            .post(&format!("/v1/comments/{}/vote", comment_id))
            .add_header(key_name, key_value)
            .add_header(auth_name, auth_value)
            .json(&json!({
                "page_url": "https://example.com/multi_vote",
                "direction": direction,
                "path": [comment_id]
            }))
            .await;
    }

    // Verify final counts
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let response = ctx
        .server
        .get("/v1/comments")
        .add_query_param("page_url", "https://example.com/multi_vote")
        .add_header(key_name, key_value)
        .await;

    let body: serde_json::Value = response.json();
    let comments = body["tree"]["c"].as_array().unwrap();
    let comment = &comments[0];

    assert_eq!(comment["u"].as_i64().unwrap(), 2);
    assert_eq!(comment["d"].as_i64().unwrap(), 1);
}

#[tokio::test]
async fn test_vote_removes_on_second_same_vote() {
    let ctx = TestContext::new().await;

    // Register users
    let auth1 = ctx
        .register_user("author_remove", "author_remove@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("voter_remove", "voter_remove@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/remove", "Remove test", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Downvote
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let (auth_name, auth_value) = (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token2)).unwrap(),
    );
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/remove",
            "direction": "down",
            "path": [comment_id]
        }))
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["downvotes"], 1);
    assert_eq!(body["user_vote"], "down");

    // Downvote again to remove
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/remove",
            "direction": "down",
            "path": [comment_id]
        }))
        .await;

    let body: serde_json::Value = response.json();
    assert_eq!(body["downvotes"], 0);
    assert!(body["user_vote"].is_null());
}

#[tokio::test]
async fn test_vote_complex_sequence() {
    let ctx = TestContext::new().await;

    // Register users
    let auth1 = ctx
        .register_user("author_complex", "author_complex@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();

    let auth2 = ctx
        .register_user("voter_complex", "voter_complex@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/complex", "Complex test", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let (auth_name, auth_value) = (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token2)).unwrap(),
    );

    // Upvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/complex",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;
    assert_eq!(response.json::<serde_json::Value>()["upvotes"], 1);

    // Remove upvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/complex",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;
    let body = response.json::<serde_json::Value>();
    assert_eq!(body["upvotes"], 0);
    assert!(body["user_vote"].is_null());

    // Downvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/complex",
            "direction": "down",
            "path": [comment_id]
        }))
        .await;
    assert_eq!(response.json::<serde_json::Value>()["downvotes"], 1);

    // Switch to upvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/complex",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;
    let body = response.json::<serde_json::Value>();
    assert_eq!(body["upvotes"], 1);
    assert_eq!(body["downvotes"], 0);

    // Remove upvote
    let response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name, key_value)
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/complex",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;
    let body = response.json::<serde_json::Value>();
    assert_eq!(body["upvotes"], 0);
    assert_eq!(body["downvotes"], 0);
    assert!(body["user_vote"].is_null());
}

#[tokio::test]
async fn test_vote_updates_author_karma() {
    let ctx = TestContext::new().await;

    // Register author and voter
    let auth1 = ctx
        .register_user("author_karma", "author_karma@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();
    let author_id = auth1["user"]["id"].as_str().unwrap();

    let auth2 = ctx
        .register_user("voter_karma", "voter_karma@example.com", "password123")
        .await;
    let token2 = auth2["token"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/karma", "Karma test", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Get initial karma
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", author_id))
        .add_header(key_name.clone(), key_value.clone())
        .await;
    let initial_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();

    // Upvote
    let (auth_name, auth_value) = (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token2)).unwrap(),
    );
    ctx.server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name.clone(), auth_value.clone())
        .json(&json!({
            "page_url": "https://example.com/karma",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;

    // Wait for background task
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Check karma increased by 1
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", author_id))
        .add_header(key_name.clone(), key_value.clone())
        .await;
    let new_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();
    assert_eq!(new_karma, initial_karma + 1);

    // Downvote (switch from up to down, delta is -2)
    ctx.server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/karma",
            "direction": "down",
            "path": [comment_id]
        }))
        .await;

    // Wait for background task
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Check karma decreased by 2 (removed upvote and added downvote)
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", author_id))
        .add_header(key_name, key_value)
        .await;
    let final_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();
    assert_eq!(final_karma, initial_karma - 1);
}

#[tokio::test]
async fn test_vote_on_own_comment_no_karma_change() {
    let ctx = TestContext::new().await;

    // Register user
    let auth = ctx
        .register_user("self_voter", "self_voter@example.com", "password123")
        .await;
    let token = auth["token"].as_str().unwrap();
    let user_id = auth["user"]["id"].as_str().unwrap();

    // Create comment
    let response = ctx
        .create_comment(token, "https://example.com/self_vote", "Self vote", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Get initial karma
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name.clone(), key_value.clone())
        .await;
    let initial_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();

    // Upvote own comment
    let (auth_name, auth_value) = (
        HeaderName::from_static("authorization"),
        HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
    );
    ctx.server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header(key_name.clone(), key_value.clone())
        .add_header(auth_name, auth_value)
        .json(&json!({
            "page_url": "https://example.com/self_vote",
            "direction": "up",
            "path": [comment_id]
        }))
        .await;

    // Wait for background task
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Karma should not change (can't vote on own comments for karma)
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header(key_name, key_value)
        .await;
    let final_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();
    assert_eq!(final_karma, initial_karma);
}

#[tokio::test]
async fn test_multiple_votes_karma_accumulation() {
    let ctx = TestContext::new().await;

    // Register author and 3 voters
    let auth1 = ctx
        .register_user("author_karma_multi", "author_karma_multi@example.com", "password123")
        .await;
    let token1 = auth1["token"].as_str().unwrap();
    let author_id = auth1["user"]["id"].as_str().unwrap();

    let voters = vec![
        ctx.register_user("v1_karma", "v1_karma@example.com", "password123").await,
        ctx.register_user("v2_karma", "v2_karma@example.com", "password123").await,
        ctx.register_user("v3_karma", "v3_karma@example.com", "password123").await,
    ];

    // Create comment
    let response = ctx
        .create_comment(token1, "https://example.com/karma_multi", "Multi karma", None)
        .await;
    let comment: serde_json::Value = response.json();
    let comment_id = comment["comment"]["i"].as_str().unwrap();

    // Get initial karma
    let (key_name, key_value) = (
        HeaderName::from_static("projectid"),
        HeaderValue::from_str(&ctx.project_id).unwrap(),
    );
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", author_id))
        .add_header(key_name.clone(), key_value.clone())
        .await;
    let initial_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();

    // Have 2 users upvote and 1 downvote
    for (i, voter) in voters.iter().enumerate() {
        let token = voter["token"].as_str().unwrap();
        let direction = if i < 2 { "up" } else { "down" };

        let (auth_name, auth_value) = (
            HeaderName::from_static("authorization"),
            HeaderValue::from_str(&format!("Bearer {}", token)).unwrap(),
        );

        ctx.server
            .post(&format!("/v1/comments/{}/vote", comment_id))
            .add_header(key_name.clone(), key_value.clone())
            .add_header(auth_name, auth_value)
            .json(&json!({
                "page_url": "https://example.com/karma_multi",
                "direction": direction,
                "path": [comment_id]
            }))
            .await;
    }

    // Wait for background tasks
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    // Karma should be +1 (2 upvotes - 1 downvote)
    let response = ctx
        .server
        .get(&format!("/v1/users/{}", author_id))
        .add_header(key_name, key_value)
        .await;
    let final_karma = response.json::<serde_json::Value>()["karma"].as_i64().unwrap();
    assert_eq!(final_karma, initial_karma + 1);
}
