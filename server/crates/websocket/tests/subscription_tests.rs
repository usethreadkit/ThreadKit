mod common;

use common::TestContext;
use futures_util::StreamExt;
use serde_json::json;
use uuid::Uuid;

#[tokio::test]
async fn test_subscribe_to_page() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;

    // Skip connected message
    let _ = client.recv_message().await;

    // Subscribe to a page
    let page_id = Uuid::now_v7();
    client.subscribe(page_id).await;

    // Should receive presence message with empty user list
    let msg = client.recv_message().await;
    assert_eq!(msg["jsonrpc"], "2.0");
    assert_eq!(msg["method"], "presence");
    assert_eq!(msg["params"]["page_id"], page_id.to_string());
    assert!(msg["params"]["users"].is_array());
    assert_eq!(msg["params"]["users"].as_array().unwrap().len(), 0);

    client.close().await;
}

#[tokio::test]
async fn test_subscribe_with_presence() {
    let ctx = TestContext::new().await;

    // Create authenticated user
    let (user_id, token) = ctx.create_test_user().await;
    let mut client = ctx.connect_with_token(Some(token)).await;

    // Skip connected message
    let msg = client.recv_message().await;
    assert_eq!(msg["params"]["user_id"], user_id.to_string());

    // Subscribe to a page
    let page_id = Uuid::now_v7();
    client.subscribe(page_id).await;

    // Should receive presence message with the user in it
    let msg = client.recv_message().await;
    assert_eq!(msg["method"], "presence");
    assert_eq!(msg["params"]["page_id"], page_id.to_string());
    let users = msg["params"]["users"].as_array().unwrap();
    assert_eq!(users.len(), 1);
    assert_eq!(users[0]["id"], user_id.to_string());

    client.close().await;
}

#[tokio::test]
async fn test_multiple_users_presence() {
    let ctx = TestContext::new().await;

    // Create two authenticated users
    let (user_id_1, token_1) = ctx.create_test_user().await;
    let (user_id_2, token_2) = ctx.create_test_user().await;

    let mut client1 = ctx.connect_with_token(Some(token_1)).await;
    let mut client2 = ctx.connect_with_token(Some(token_2)).await;

    // Skip connected messages
    let _ = client1.recv_message().await;
    let _ = client2.recv_message().await;

    let page_id = Uuid::now_v7();

    // Client 1 subscribes first
    client1.subscribe(page_id).await;
    let msg = client1.recv_message().await;
    assert_eq!(msg["method"], "presence");
    let users = msg["params"]["users"].as_array().unwrap();
    assert_eq!(users.len(), 1);

    // Give batcher time to flush presence
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Client 2 subscribes
    client2.subscribe(page_id).await;

    // Client 2 should receive presence with both users
    let msg = client2.wait_for_method("presence").await;
    let users = msg["params"]["users"].as_array().unwrap();
    assert_eq!(users.len(), 2);

    // Client 1 should receive user_joined notification for user 2
    // May also receive user_joined for itself, so we need to filter
    let mut found_user2_joined = false;
    for _ in 0..5 {
        if let Some(msg) = client1
            .recv_message_timeout(tokio::time::Duration::from_millis(500))
            .await
        {
            if msg["method"] == "user_joined"
                && msg["params"]["user"]["id"] == user_id_2.to_string()
            {
                assert_eq!(msg["params"]["page_id"], page_id.to_string());
                found_user2_joined = true;
                break;
            }
        } else {
            break;
        }
    }
    assert!(
        found_user2_joined,
        "Should have received user_joined for user 2"
    );

    client1.close().await;
    client2.close().await;
}

#[tokio::test]
async fn test_unsubscribe_from_page() {
    let ctx = TestContext::new().await;
    let (user_id, token) = ctx.create_test_user().await;

    let mut client = ctx.connect_with_token(Some(token)).await;
    let _ = client.recv_message().await;

    let page_id = Uuid::now_v7();

    // Subscribe
    client.subscribe(page_id).await;
    let _ = client.recv_message().await; // presence

    // Unsubscribe
    client.unsubscribe(page_id).await;

    // No message expected for unsubscribe
    let msg = client
        .recv_message_timeout(tokio::time::Duration::from_millis(200))
        .await;
    assert!(msg.is_none());

    client.close().await;
}

#[tokio::test]
async fn test_user_left_notification() {
    let ctx = TestContext::new().await;

    let (user_id_1, token_1) = ctx.create_test_user().await;
    let (user_id_2, token_2) = ctx.create_test_user().await;

    let mut client1 = ctx.connect_with_token(Some(token_1)).await;
    let mut client2 = ctx.connect_with_token(Some(token_2)).await;

    let _ = client1.recv_message().await;
    let _ = client2.recv_message().await;

    let page_id = Uuid::now_v7();

    // Both subscribe
    client1.subscribe(page_id).await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    client2.subscribe(page_id).await;
    let _ = client2.recv_message().await;
    let _ = client1.recv_message().await; // user_joined

    // Client 2 unsubscribes
    client2.unsubscribe(page_id).await;

    // Client 1 should receive user_left notification (may have other messages first)
    let msg = client1.wait_for_method("user_left").await;
    assert_eq!(msg["params"]["page_id"], page_id.to_string());
    assert_eq!(msg["params"]["user_id"], user_id_2.to_string());

    client1.close().await;
    client2.close().await;
}

#[tokio::test]
async fn test_max_subscriptions_limit() {
    let ctx = TestContext::new_with_rate_limit(false).await; // Disable rate limits
    let mut client = ctx.connect().await;
    let _ = client.recv_message().await;

    // Subscribe to 10 pages (the default max)
    for _ in 0..10 {
        let page_id = Uuid::now_v7();
        client.subscribe(page_id).await;
        let _ = client.recv_message().await; // presence
    }

    // Try to subscribe to 11th page
    let page_id = Uuid::now_v7();
    client.subscribe(page_id).await;

    // Should receive error
    let msg = client.recv_message().await;
    assert_eq!(msg["method"], "error");
    assert_eq!(msg["params"]["code"], "subscription_limit");
    assert!(msg["params"]["message"]
        .as_str()
        .unwrap()
        .contains("Too many"));

    client.close().await;
}

#[tokio::test]
async fn test_duplicate_subscription() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;
    let _ = client.recv_message().await;

    let page_id = Uuid::now_v7();

    // Subscribe once
    client.subscribe(page_id).await;
    let _ = client.recv_message().await; // presence

    // Subscribe again to same page
    client.subscribe(page_id).await;

    // Should not receive another presence message (idempotent)
    let msg = client
        .recv_message_timeout(tokio::time::Duration::from_millis(200))
        .await;
    assert!(msg.is_none());

    client.close().await;
}

#[tokio::test]
async fn test_subscribe_multiple_pages() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;
    let _ = client.recv_message().await;

    let page_id_1 = Uuid::now_v7();
    let page_id_2 = Uuid::now_v7();
    let page_id_3 = Uuid::now_v7();

    // Subscribe to multiple pages
    client.subscribe(page_id_1).await;
    let msg = client.recv_message().await;
    assert_eq!(msg["params"]["page_id"], page_id_1.to_string());

    client.subscribe(page_id_2).await;
    let msg = client.recv_message().await;
    assert_eq!(msg["params"]["page_id"], page_id_2.to_string());

    client.subscribe(page_id_3).await;
    let msg = client.recv_message().await;
    assert_eq!(msg["params"]["page_id"], page_id_3.to_string());

    client.close().await;
}

#[tokio::test]
async fn test_presence_cleanup_on_disconnect() {
    let ctx = TestContext::new().await;

    let (user_id_1, token_1) = ctx.create_test_user().await;
    let (user_id_2, token_2) = ctx.create_test_user().await;

    let mut client1 = ctx.connect_with_token(Some(token_1)).await;
    let mut client2 = ctx.connect_with_token(Some(token_2)).await;

    let _ = client1.recv_message().await;
    let _ = client2.recv_message().await;

    let page_id = Uuid::now_v7();

    // Both subscribe
    client1.subscribe(page_id).await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    client2.subscribe(page_id).await;
    let _ = client2.recv_message().await;
    let _ = client1.recv_message().await; // user_joined

    // Give batcher time to flush before disconnect
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Client 2 disconnects (without explicit unsubscribe)
    client2.close().await;

    // Client 1 should receive user_left notification (may have other messages first)
    let msg = client1.wait_for_method("user_left").await;
    assert_eq!(msg["params"]["user_id"], user_id_2.to_string());

    client1.close().await;
}

#[tokio::test]
async fn test_typing_indicator() {
    let ctx = TestContext::new().await;

    let (user_id_1, token_1) = ctx.create_test_user().await;
    let (user_id_2, token_2) = ctx.create_test_user().await;

    let mut client1 = ctx.connect_with_token(Some(token_1)).await;
    let mut client2 = ctx.connect_with_token(Some(token_2)).await;

    let _ = client1.recv_message().await;
    let _ = client2.recv_message().await;

    let page_id = Uuid::now_v7();

    // Both subscribe
    client1.subscribe(page_id).await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    client2.subscribe(page_id).await;
    let _ = client2.recv_message().await;
    let _ = client1.recv_message().await; // user_joined

    // Give batcher time to flush
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Client 1 sends typing indicator
    client1.send_typing(page_id, None).await;

    // Client 2 should receive typing notification (may also get user_joined first)
    let mut received_typing = false;
    for _ in 0..2 {
        let msg = client2
            .recv_message_timeout(tokio::time::Duration::from_millis(500))
            .await;
        if let Some(msg) = msg {
            if msg["method"] == "typing" {
                assert_eq!(msg["params"]["page_id"], page_id.to_string());
                assert_eq!(msg["params"]["user"]["id"], user_id_1.to_string());
                assert!(msg["params"]["reply_to"].is_null());
                received_typing = true;
                break;
            }
        } else {
            break;
        }
    }
    assert!(received_typing, "Should have received typing notification");

    client1.close().await;
    client2.close().await;
}

#[tokio::test]
async fn test_typing_indicator_with_reply_to() {
    let ctx = TestContext::new().await;

    let (user_id_1, token_1) = ctx.create_test_user().await;
    let (user_id_2, token_2) = ctx.create_test_user().await;

    let mut client1 = ctx.connect_with_token(Some(token_1)).await;
    let mut client2 = ctx.connect_with_token(Some(token_2)).await;

    let _ = client1.recv_message().await;
    let _ = client2.recv_message().await;

    let page_id = Uuid::now_v7();
    let comment_id = Uuid::now_v7();

    // Both subscribe
    client1.subscribe(page_id).await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    client2.subscribe(page_id).await;
    let _ = client2.recv_message().await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Client 1 sends typing indicator with reply_to
    client1.send_typing(page_id, Some(comment_id)).await;

    // Client 2 should receive typing notification with reply_to
    let mut received_typing = false;
    for _ in 0..2 {
        let msg = client2
            .recv_message_timeout(tokio::time::Duration::from_millis(500))
            .await;
        if let Some(msg) = msg {
            if msg["method"] == "typing" {
                assert_eq!(msg["params"]["reply_to"], comment_id.to_string());
                received_typing = true;
                break;
            }
        } else {
            break;
        }
    }
    assert!(received_typing, "Should have received typing notification");

    client1.close().await;
    client2.close().await;
}

#[tokio::test]
async fn test_typing_debounce() {
    let ctx = TestContext::new().await;

    let (_, token_1) = ctx.create_test_user().await;
    let (_, token_2) = ctx.create_test_user().await;

    let mut client1 = ctx.connect_with_token(Some(token_1)).await;
    let mut client2 = ctx.connect_with_token(Some(token_2)).await;

    let _ = client1.recv_message().await;
    let _ = client2.recv_message().await;

    let page_id = Uuid::now_v7();

    // Both subscribe
    client1.subscribe(page_id).await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    client2.subscribe(page_id).await;
    let _ = client2.recv_message().await;
    let _ = client1.recv_message().await;

    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

    // Client 1 sends typing indicator twice rapidly
    client1.send_typing(page_id, None).await;

    // Find and consume first typing message
    let mut found_first_typing = false;
    for _ in 0..2 {
        let msg = client2
            .recv_message_timeout(tokio::time::Duration::from_millis(500))
            .await;
        if let Some(msg) = msg {
            if msg["method"] == "typing" {
                found_first_typing = true;
                break;
            }
        }
    }
    assert!(found_first_typing, "Should receive first typing");

    // Send another typing immediately (within debounce period of 500ms)
    client1.send_typing(page_id, None).await;

    // Client 2 should NOT receive second typing (debounced)
    let msg = client2
        .recv_message_timeout(tokio::time::Duration::from_millis(200))
        .await;
    assert!(msg.is_none());

    // Wait for debounce to expire
    tokio::time::sleep(tokio::time::Duration::from_millis(600)).await;

    // Now send typing again
    client1.send_typing(page_id, None).await;

    // Client 2 should receive it
    let msg = client2.recv_message().await;
    assert_eq!(msg["method"], "typing");

    client1.close().await;
    client2.close().await;
}

#[tokio::test]
async fn test_unauthenticated_typing_ignored() {
    let ctx = TestContext::new().await;

    // Unauthenticated client
    let mut client = ctx.connect().await;
    let _ = client.recv_message().await;

    let page_id = Uuid::now_v7();

    // Subscribe
    client.subscribe(page_id).await;
    let _ = client.recv_message().await;

    // Try to send typing indicator (should be ignored - no auth)
    client.send_typing(page_id, None).await;

    // Should not receive anything
    let msg = client
        .recv_message_timeout(tokio::time::Duration::from_millis(200))
        .await;
    assert!(msg.is_none());

    client.close().await;
}

#[tokio::test]
async fn test_typing_only_on_subscribed_page() {
    let ctx = TestContext::new().await;

    let (_, token) = ctx.create_test_user().await;
    let mut client = ctx.connect_with_token(Some(token)).await;
    let _ = client.recv_message().await;

    let page_id_1 = Uuid::now_v7();
    let page_id_2 = Uuid::now_v7();

    // Subscribe to page 1 only
    client.subscribe(page_id_1).await;
    let _ = client.recv_message().await; // presence

    // May receive user_joined for self
    let _ = client
        .recv_message_timeout(tokio::time::Duration::from_millis(100))
        .await;

    // Try to send typing on page 2 (not subscribed)
    client.send_typing(page_id_2, None).await;

    // Should not receive anything (typing ignored for non-subscribed pages)
    let msg = client
        .recv_message_timeout(tokio::time::Duration::from_millis(300))
        .await;
    assert!(msg.is_none(), "Should not receive typing for unsubscribed page");

    client.close().await;
}
