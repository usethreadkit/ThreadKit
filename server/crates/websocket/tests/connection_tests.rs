mod common;

use common::TestContext;
use futures_util::StreamExt;
use uuid::Uuid;

#[tokio::test]
async fn test_connection_lifecycle() {
    let ctx = TestContext::new().await;

    // Connect
    let mut client = ctx.connect().await;

    // Should receive connected message
    let msg = client.recv_message().await;
    assert_eq!(msg["jsonrpc"], "2.0");
    assert_eq!(msg["method"], "connected");
    assert!(msg["params"]["user_id"].is_null());

    // Verify metrics
    let metrics = ctx.ws_state.get_metrics();
    assert_eq!(metrics.active_connections, 1);
    assert_eq!(metrics.total_connections, 1);

    // Close connection
    client.close().await;

    // Give server time to process disconnection
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Verify metrics updated
    let metrics = ctx.ws_state.get_metrics();
    assert_eq!(metrics.active_connections, 0);
    assert_eq!(metrics.total_connections, 1); // total doesn't decrease
}

#[tokio::test]
async fn test_authenticated_connection() {
    let ctx = TestContext::new().await;

    // Create test user and get token
    let (user_id, token) = ctx.create_test_user().await;

    // Connect with token
    let mut client = ctx.connect_with_token(Some(token)).await;

    // Should receive connected message with user_id
    let msg = client.recv_message().await;
    assert_eq!(msg["jsonrpc"], "2.0");
    assert_eq!(msg["method"], "connected");
    assert_eq!(msg["params"]["user_id"], user_id.to_string());

    client.close().await;
}

#[tokio::test]
async fn test_invalid_api_key() {
    let ctx = TestContext::new().await;

    let url = format!("ws://{}/ws?project_id=invalid_key", ctx.server_addr);

    // Connection establishes but handler returns early, so connection just closes
    let result = tokio_tungstenite::connect_async(&url).await;

    if let Ok((mut ws, _)) = result {
        let timeout = tokio::time::Duration::from_millis(500);
        let msg = tokio::time::timeout(timeout, ws.next()).await;

        // Connection should close without sending any message
        // Either timeout or None (connection closed)
        match msg {
            Err(_) => {} // Timeout is acceptable
            Ok(Some(Ok(_))) => panic!("Should not receive any message with invalid API key"),
            Ok(Some(Err(_))) => {} // Connection error is acceptable
            Ok(None) => {}         // Connection closed is acceptable
        }
    }
}

#[tokio::test]
async fn test_expired_jwt_token() {
    let ctx = TestContext::new().await;

    // Create an expired token (manually construct with past expiry)
    let expired_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJzaXRlX2lkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwiZXhwIjoxMDAwMDAwMDAwLCJpYXQiOjkwMDAwMDAwMCwic2Vzc2lvbl9pZCI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9.invalid";

    // Connect with expired token
    let mut client = ctx.connect_with_token(Some(expired_token.to_string())).await;

    // Should receive connected message without user_id (token rejected)
    let msg = client.recv_message().await;
    assert_eq!(msg["jsonrpc"], "2.0");
    assert_eq!(msg["method"], "connected");
    assert!(msg["params"]["user_id"].is_null());

    client.close().await;
}

#[tokio::test]
async fn test_multiple_connections() {
    let ctx = TestContext::new().await;

    // Connect 5 clients
    let mut clients = Vec::new();
    for _ in 0..5 {
        let mut client = ctx.connect().await;
        // Receive connected message
        let _ = client.recv_message().await;
        clients.push(client);
    }

    // Verify metrics
    let metrics = ctx.ws_state.get_metrics();
    assert_eq!(metrics.active_connections, 5);
    assert_eq!(metrics.total_connections, 5);

    // Close all clients
    for client in clients {
        client.close().await;
    }

    // Give server time to process disconnections
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Verify all disconnected
    let metrics = ctx.ws_state.get_metrics();
    assert_eq!(metrics.active_connections, 0);
}

#[tokio::test]
async fn test_ping_pong() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;

    // Skip connected message
    let _ = client.recv_message().await;

    // Send ping
    client.send_ping().await;

    // Should receive pong
    let msg = client.recv_message().await;
    assert_eq!(msg["jsonrpc"], "2.0");
    assert_eq!(msg["method"], "pong");

    client.close().await;
}

#[tokio::test]
async fn test_invalid_json_rpc_version() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;

    // Skip connected message
    let _ = client.recv_message().await;

    // Send message with wrong jsonrpc version
    use futures_util::SinkExt;
    use serde_json::json;
    use tokio_tungstenite::tungstenite::Message;

    client
        .ws_stream
        .send(Message::Text(
            json!({
                "jsonrpc": "1.0",
                "method": "ping",
                "params": {}
            })
            .to_string(),
        ))
        .await
        .expect("Failed to send");

    // Should receive error (implementation validates version first in ClientMessage::from_rpc)
    // but if version passes, then checks method
    let msg = client.recv_message().await;
    assert_eq!(msg["method"], "error");
    // The error could be about JSON-RPC version or unknown method depending on parse order
    assert!(msg["params"]["message"].as_str().is_some());

    client.close().await;
}

#[tokio::test]
async fn test_unknown_method() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;

    // Skip connected message
    let _ = client.recv_message().await;

    // Send message with unknown method
    use futures_util::SinkExt;
    use serde_json::json;
    use tokio_tungstenite::tungstenite::Message;

    client
        .ws_stream
        .send(Message::Text(
            json!({
                "jsonrpc": "2.0",
                "method": "unknown_method",
                "params": {}
            })
            .to_string(),
        ))
        .await
        .expect("Failed to send");

    // Should receive error
    let msg = client.recv_message().await;
    assert_eq!(msg["method"], "error");
    assert!(msg["params"]["message"].as_str().unwrap().contains("Unknown"));

    client.close().await;
}

#[tokio::test]
async fn test_malformed_json() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;

    // Skip connected message
    let _ = client.recv_message().await;

    // Send malformed JSON
    use futures_util::SinkExt;
    use tokio_tungstenite::tungstenite::Message;

    client
        .ws_stream
        .send(Message::Text("{invalid json".to_string()))
        .await
        .expect("Failed to send");

    // Should receive error
    let msg = client.recv_message().await;
    assert_eq!(msg["method"], "error");

    client.close().await;
}

#[tokio::test]
async fn test_message_metrics() {
    let ctx = TestContext::new().await;
    let mut client = ctx.connect().await;

    // Connected message was sent
    let _ = client.recv_message().await;

    let metrics_before = ctx.ws_state.get_metrics();

    // Send 3 pings
    for _ in 0..3 {
        client.send_ping().await;
        let _ = client.recv_message().await; // pong
    }

    let metrics_after = ctx.ws_state.get_metrics();

    // Should have received 3 messages and sent 3 pongs (+ 1 connected)
    assert_eq!(
        metrics_after.total_messages_received,
        metrics_before.total_messages_received + 3
    );
    assert_eq!(
        metrics_after.total_messages_sent,
        metrics_before.total_messages_sent + 3
    );

    client.close().await;
}
