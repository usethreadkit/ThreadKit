//! JSON-RPC 2.0 message types for WebSocket communication.
//!
//! All messages use JSON-RPC 2.0 notification format (no `id` field, no response expected).

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use threadkit_common::types::{TreeComment, UserPublic};

// ============================================================================
// Client -> Server Messages
// ============================================================================

/// Raw JSON-RPC message from client
#[derive(Debug, Deserialize)]
pub struct ClientRpcMessage {
    pub jsonrpc: String,
    pub method: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

/// Parsed client message
#[derive(Debug)]
pub enum ClientMessage {
    /// Subscribe to a page's real-time events
    Subscribe { page_id: Uuid },
    /// Unsubscribe from a page
    Unsubscribe { page_id: Uuid },
    /// Typing indicator (should be sent every ~1s while typing)
    Typing { page_id: Uuid, reply_to: Option<Uuid> },
    /// Heartbeat
    Ping,
}

impl ClientMessage {
    /// Parse a JSON-RPC message into a ClientMessage
    pub fn from_rpc(rpc: ClientRpcMessage) -> Result<Self, &'static str> {
        if rpc.jsonrpc != "2.0" {
            return Err("Invalid JSON-RPC version");
        }

        match rpc.method.as_str() {
            "subscribe" => {
                let page_id = rpc.params.get("page_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .ok_or("Missing or invalid page_id")?;
                Ok(ClientMessage::Subscribe { page_id })
            }
            "unsubscribe" => {
                let page_id = rpc.params.get("page_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .ok_or("Missing or invalid page_id")?;
                Ok(ClientMessage::Unsubscribe { page_id })
            }
            "typing" => {
                let page_id = rpc.params.get("page_id")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok())
                    .ok_or("Missing or invalid page_id")?;
                let reply_to = rpc.params.get("reply_to")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse().ok());
                Ok(ClientMessage::Typing { page_id, reply_to })
            }
            "ping" => Ok(ClientMessage::Ping),
            _ => Err("Unknown method"),
        }
    }
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

/// JSON-RPC 2.0 notification message (no id, no response expected)
#[derive(Debug, Clone, Serialize)]
pub struct ServerMessage {
    jsonrpc: &'static str,
    method: &'static str,
    params: serde_json::Value,
}

impl ServerMessage {
    fn new(method: &'static str, params: serde_json::Value) -> Self {
        Self {
            jsonrpc: "2.0",
            method,
            params,
        }
    }

    // === Connection Events ===

    /// Connection established
    pub fn connected(user_id: Option<Uuid>) -> Self {
        Self::new("connected", serde_json::json!({
            "user_id": user_id
        }))
    }

    /// Error message
    pub fn error(code: &str, message: &str) -> Self {
        Self::new("error", serde_json::json!({
            "code": code,
            "message": message
        }))
    }

    /// Heartbeat response
    pub fn pong() -> Self {
        Self::new("pong", serde_json::json!({}))
    }

    // === Presence Events ===

    /// Current users on page (sent on subscribe)
    pub fn presence(page_id: Uuid, users: Vec<UserPublic>) -> Self {
        Self::new("presence", serde_json::json!({
            "page_id": page_id,
            "users": users
        }))
    }

    /// User joined page
    pub fn user_joined(page_id: Uuid, user: UserPublic) -> Self {
        Self::new("user_joined", serde_json::json!({
            "page_id": page_id,
            "user": user
        }))
    }

    /// User left page
    pub fn user_left(page_id: Uuid, user_id: Uuid) -> Self {
        Self::new("user_left", serde_json::json!({
            "page_id": page_id,
            "user_id": user_id
        }))
    }

    // === Typing Events ===

    /// Someone is typing (expires after 3s of no refresh)
    pub fn typing(page_id: Uuid, user: UserPublic, reply_to: Option<Uuid>) -> Self {
        Self::new("typing", serde_json::json!({
            "page_id": page_id,
            "user": user,
            "reply_to": reply_to
        }))
    }

    // === Comment Events ===

    /// New comment posted
    pub fn new_comment(page_id: Uuid, comment: TreeComment) -> Self {
        Self::new("new_comment", serde_json::json!({
            "page_id": page_id,
            "comment": comment
        }))
    }

    /// Comment edited
    pub fn edit_comment(page_id: Uuid, comment_id: Uuid, content: String, content_html: String) -> Self {
        Self::new("edit_comment", serde_json::json!({
            "page_id": page_id,
            "comment_id": comment_id,
            "content": content,
            "content_html": content_html
        }))
    }

    /// Comment deleted
    pub fn delete_comment(page_id: Uuid, comment_id: Uuid) -> Self {
        Self::new("delete_comment", serde_json::json!({
            "page_id": page_id,
            "comment_id": comment_id
        }))
    }

    /// Vote counts changed
    pub fn vote_update(page_id: Uuid, comment_id: Uuid, upvotes: i64, downvotes: i64) -> Self {
        Self::new("vote_update", serde_json::json!({
            "page_id": page_id,
            "comment_id": comment_id,
            "upvotes": upvotes,
            "downvotes": downvotes
        }))
    }

    // === Notification Events ===

    /// User notification (reply, mention, upvote)
    pub fn notification(notification_type: &str, comment_id: Uuid, from_user: UserPublic) -> Self {
        Self::new("notification", serde_json::json!({
            "type": notification_type,
            "comment_id": comment_id,
            "from_user": from_user
        }))
    }

    /// Serialize to JSON string
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_subscribe() {
        let rpc = ClientRpcMessage {
            jsonrpc: "2.0".to_string(),
            method: "subscribe".to_string(),
            params: serde_json::json!({
                "page_id": "550e8400-e29b-41d4-a716-446655440000"
            }),
        };

        let msg = ClientMessage::from_rpc(rpc).unwrap();
        match msg {
            ClientMessage::Subscribe { page_id } => {
                assert_eq!(page_id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
            }
            _ => panic!("Expected Subscribe"),
        }
    }

    #[test]
    fn test_parse_typing() {
        let rpc = ClientRpcMessage {
            jsonrpc: "2.0".to_string(),
            method: "typing".to_string(),
            params: serde_json::json!({
                "page_id": "550e8400-e29b-41d4-a716-446655440000",
                "reply_to": "660e8400-e29b-41d4-a716-446655440001"
            }),
        };

        let msg = ClientMessage::from_rpc(rpc).unwrap();
        match msg {
            ClientMessage::Typing { page_id, reply_to } => {
                assert_eq!(page_id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
                assert!(reply_to.is_some());
            }
            _ => panic!("Expected Typing"),
        }
    }

    #[test]
    fn test_server_message_json() {
        let msg = ServerMessage::connected(Some(Uuid::nil()));
        let json = msg.to_json().unwrap();
        assert!(json.contains("\"jsonrpc\":\"2.0\""));
        assert!(json.contains("\"method\":\"connected\""));
    }

    #[test]
    fn test_error_message() {
        let msg = ServerMessage::error("rate_limit", "Too many requests");
        let json = msg.to_json().unwrap();
        assert!(json.contains("\"code\":\"rate_limit\""));
        assert!(json.contains("\"message\":\"Too many requests\""));
    }
}
