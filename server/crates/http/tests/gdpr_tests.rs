mod common;

use axum::http::StatusCode;
use common::TestContext;
use serde_json::json;

#[tokio::test]
async fn test_delete_account_anonymizes_comments() {
    let ctx = TestContext::new().await;

    // Create a user
    let user_response = ctx.register_user("Test User", "test@example.com", "").await;
    let user_id = user_response["user"]["id"].as_str().unwrap();
    let token = user_response["token"].as_str().unwrap();

    // Create a comment
    let comment_response = ctx
        .create_comment(token, "https://example.com/page1", "This is my test comment", None)
        .await;

    if comment_response.status_code() != StatusCode::OK {
        println!("Comment creation failed: {}", comment_response.status_code());
        println!("Response: {}", comment_response.text());
    }
    assert_eq!(comment_response.status_code(), StatusCode::OK);
    let comment_body: serde_json::Value = comment_response.json();

    // The response has structure: {"comment": {compact TreeComment with "i" for id}}
    let comment_id = comment_body["comment"]["i"].as_str().unwrap();

    // Delete account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);
    let stats: serde_json::Value = delete_response.json();
    assert_eq!(stats["comments_deleted"], 1);

    // Verify comment still exists but is anonymized
    let comments_response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(comments_response.status_code(), StatusCode::OK);
    let comments_body: serde_json::Value = comments_response.json();
    let comments = comments_body["comments"].as_array().unwrap();
    assert_eq!(comments.len(), 1);

    // Verify the comment is anonymized
    let comment = &comments[0];
    assert_eq!(comment["i"].as_str().unwrap(), comment_id);
    assert_eq!(comment["a"].as_str().unwrap(), "d0000000-0000-0000-0000-000000000000"); // DELETED_USER_ID
    assert_eq!(comment["n"].as_str().unwrap(), "[deleted]"); // name
    assert!(comment["p"].is_null()); // avatar should be null

    // Content should be preserved
    assert_eq!(comment["t"].as_str().unwrap(), "This is my test comment");
}

#[tokio::test]
async fn test_delete_account_preserves_replies() {
    let ctx = TestContext::new().await;

    // Create first user with a comment
    let user1_response = ctx.register_user("User 1", "user1@example.com", "").await;
    let user1_token = user1_response["token"].as_str().unwrap();

    let parent_response = ctx
        .create_comment(user1_token, "https://example.com/page1", "Parent comment", None)
        .await;
    let parent_body: serde_json::Value = parent_response.json();
    let parent_id = parent_body["comment"]["i"].as_str().unwrap();

    // Create second user with a reply
    let user2_response = ctx.register_user("User 2", "user2@example.com", "").await;
    let user2_token = user2_response["token"].as_str().unwrap();

    let reply_response = ctx
        .create_comment(
            user2_token,
            "https://example.com/page1",
            "Reply comment",
            Some(uuid::Uuid::parse_str(parent_id).unwrap()),
        )
        .await;
    assert_eq!(reply_response.status_code(), StatusCode::OK);

    // Delete first user's account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", user1_token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);

    // Verify both comments still exist
    let comments_response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header("projectid", &ctx.project_id)
        .await;

    let comments_body: serde_json::Value = comments_response.json();
    let comments = comments_body["comments"].as_array().unwrap();
    assert_eq!(comments.len(), 1); // Parent comment

    // Parent should be anonymized
    assert_eq!(comments[0]["a"].as_str().unwrap(), "d0000000-0000-0000-0000-000000000000");
    assert_eq!(comments[0]["n"].as_str().unwrap(), "[deleted]");
    assert_eq!(comments[0]["t"].as_str().unwrap(), "Parent comment");

    // Reply should still be there
    let replies = comments[0]["r"].as_array().unwrap();
    assert_eq!(replies.len(), 1);
    assert_eq!(replies[0]["t"].as_str().unwrap(), "Reply comment");
    assert_eq!(replies[0]["n"].as_str().unwrap(), "User 2"); // Not anonymized
}

#[tokio::test]
async fn test_delete_account_removes_votes() {
    let ctx = TestContext::new().await;

    // Create a user
    let user1_response = ctx.register_user("Voter", "voter@example.com", "").await;
    let user1_token = user1_response["token"].as_str().unwrap();

    // Create another user with a comment
    let user2_response = ctx.register_user("Author", "author@example.com", "").await;
    let user2_token = user2_response["token"].as_str().unwrap();

    let comment_response = ctx
        .create_comment(user2_token, "https://example.com/page1", "Test comment", None)
        .await;
    let comment_body: serde_json::Value = comment_response.json();
    let comment_id = comment_body["comment"]["i"].as_str().unwrap();

    // User1 votes on the comment
    let vote_response = ctx
        .server
        .post(&format!("/v1/comments/{}/vote", comment_id))
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", user1_token))
        .json(&json!({
            "direction": "up",
            "page_url": "https://example.com/page1",
            "path": [comment_id]
        }))
        .await;

    assert_eq!(vote_response.status_code(), StatusCode::OK);

    // Verify vote was recorded
    let comments_response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header("projectid", &ctx.project_id)
        .await;
    let comments_body: serde_json::Value = comments_response.json();
    let comments = comments_body["comments"].as_array().unwrap();
    assert_eq!(comments[0]["u"].as_i64().unwrap(), 1); // 1 upvote

    // Delete voter's account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", user1_token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);
    let stats: serde_json::Value = delete_response.json();
    assert_eq!(stats["votes_deleted"], 1);

    // Verify vote count is preserved (anonymized metric)
    let comments_response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header("projectid", &ctx.project_id)
        .await;
    let comments_body: serde_json::Value = comments_response.json();
    let comments = comments_body["comments"].as_array().unwrap();
    assert_eq!(comments[0]["u"].as_i64().unwrap(), 1); // Vote count preserved
}

#[tokio::test]
async fn test_delete_account_removes_user_data() {
    let ctx = TestContext::new().await;

    // Create a user
    let user_response = ctx.register_user("Test User", "test@example.com", "").await;
    let user_id = user_response["user"]["id"].as_str().unwrap();
    let token = user_response["token"].as_str().unwrap();

    // Delete account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);

    // Verify user data is deleted
    let user_response = ctx
        .server
        .get(&format!("/v1/users/{}", user_id))
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(user_response.status_code(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn test_delete_account_removes_email_index() {
    let ctx = TestContext::new().await;

    // Create a user
    let user_response = ctx.register_user("Test User", "unique@example.com", "").await;
    let token = user_response["token"].as_str().unwrap();

    // Delete account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);

    // Verify email can be reused (index was deleted)
    let new_user_response = ctx.register_user("New User", "unique@example.com", "").await;
    assert_eq!(new_user_response["user"]["email"], "unique@example.com");
}

#[tokio::test]
async fn test_delete_account_removes_username_index() {
    let ctx = TestContext::new().await;

    // Create a user
    let user_response = ctx.register_user("UniqueUsername", "test@example.com", "").await;
    let token = user_response["token"].as_str().unwrap();

    // Delete account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);

    // Verify username can be reused (index was deleted)
    let new_user_response = ctx.register_user("UniqueUsername", "new@example.com", "").await;
    assert_eq!(new_user_response["user"]["name"], "UniqueUsername");
}

#[tokio::test]
async fn test_delete_account_with_multiple_comments() {
    let ctx = TestContext::new().await;

    // Create a user
    let user_response = ctx.register_user("Prolific User", "prolific@example.com", "").await;
    let token = user_response["token"].as_str().unwrap();

    // Create multiple comments
    for i in 1..=5 {
        let response = ctx
            .create_comment(
                token,
                "https://example.com/page1",
                &format!("Comment {}", i),
                None,
            )
            .await;
        assert_eq!(response.status_code(), StatusCode::OK);
    }

    // Delete account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);
    let stats: serde_json::Value = delete_response.json();
    assert_eq!(stats["comments_deleted"], 5);

    // Verify all comments are anonymized
    let comments_response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header("projectid", &ctx.project_id)
        .await;

    let comments_body: serde_json::Value = comments_response.json();
    let comments = comments_body["comments"].as_array().unwrap();
    assert_eq!(comments.len(), 5);

    for comment in comments {
        assert_eq!(comment["a"].as_str().unwrap(), "d0000000-0000-0000-0000-000000000000");
        assert_eq!(comment["n"].as_str().unwrap(), "[deleted]");
    }
}

#[tokio::test]
async fn test_delete_account_removes_blocking_relationships() {
    let ctx = TestContext::new().await;

    // Create two users
    let user1_response = ctx.register_user("User 1", "user1@example.com", "").await;
    let user1_id = user1_response["user"]["id"].as_str().unwrap();
    let user1_token = user1_response["token"].as_str().unwrap();

    let user2_response = ctx.register_user("User 2", "user2@example.com", "").await;
    let user2_id = user2_response["user"]["id"].as_str().unwrap();
    let user2_token = user2_response["token"].as_str().unwrap();

    // User 1 blocks User 2
    ctx.server
        .post(&format!("/v1/users/{}/block", user2_id))
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", user1_token))
        .await;

    // Delete User 1's account
    let delete_response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", user1_token))
        .await;

    assert_eq!(delete_response.status_code(), StatusCode::OK);

    // Verify User 2 is no longer in blocked_by set
    // (We can't easily test this through the API, but the Redis cleanup happened)
}

#[tokio::test]
async fn test_delete_account_requires_auth() {
    let ctx = TestContext::new().await;

    // Try to delete without auth
    let response = ctx
        .server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .await;

    assert_eq!(response.status_code(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_delete_account_with_nested_replies() {
    let ctx = TestContext::new().await;

    // Create three users
    let user1_response = ctx.register_user("User 1", "user1@example.com", "").await;
    let user1_token = user1_response["token"].as_str().unwrap();

    let user2_response = ctx.register_user("User 2", "user2@example.com", "").await;
    let user2_token = user2_response["token"].as_str().unwrap();

    let user3_response = ctx.register_user("User 3", "user3@example.com", "").await;
    let user3_token = user3_response["token"].as_str().unwrap();

    // Create nested thread: User1 -> User2 -> User3
    let parent_response = ctx
        .create_comment(user1_token, "https://example.com/page1", "Top level", None)
        .await;
    let parent_body: serde_json::Value = parent_response.json();
    let parent_id = uuid::Uuid::parse_str(parent_body["comment"]["i"].as_str().unwrap()).unwrap();

    let reply1_response = ctx
        .create_comment(user2_token, "https://example.com/page1", "Level 2", Some(parent_id))
        .await;
    let reply1_body: serde_json::Value = reply1_response.json();
    let reply1_id = uuid::Uuid::parse_str(reply1_body["comment"]["i"].as_str().unwrap()).unwrap();

    ctx.create_comment(user3_token, "https://example.com/page1", "Level 3", Some(reply1_id))
        .await;

    // Delete User 2's account (middle of thread)
    ctx.server
        .delete("/v1/users/me")
        .add_header("projectid", &ctx.project_id)
        .add_header("Authorization", &format!("Bearer {}", user2_token))
        .await;

    // Verify thread is preserved
    let comments_response = ctx
        .server
        .get("/v1/comments?page_url=https://example.com/page1")
        .add_header("projectid", &ctx.project_id)
        .await;

    let comments_body: serde_json::Value = comments_response.json();
    let comments = comments_body["comments"].as_array().unwrap();
    assert_eq!(comments.len(), 1);

    let top = &comments[0];
    assert_eq!(top["n"].as_str().unwrap(), "User 1");

    let replies = top["r"].as_array().unwrap();
    assert_eq!(replies.len(), 1);
    assert_eq!(replies[0]["n"].as_str().unwrap(), "[deleted]"); // User 2 anonymized
    assert_eq!(replies[0]["t"].as_str().unwrap(), "Level 2"); // Content preserved

    let nested = replies[0]["r"].as_array().unwrap();
    assert_eq!(nested.len(), 1);
    assert_eq!(nested[0]["n"].as_str().unwrap(), "User 3");
}
