use serde::{Deserialize, Serialize};
use uuid::Uuid;

use threadkit_common::types::{CommentWithAuthor, UserPublic};

// ============================================================================
// Client -> Server Messages
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Subscribe { page_id: Uuid },
    Unsubscribe { page_id: Uuid },
    Typing { page_id: Uuid },
    StopTyping { page_id: Uuid },
    Ping,
}

// ============================================================================
// Server -> Client Messages
// ============================================================================

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    // Connection
    Connected {
        user_id: Option<Uuid>,
    },
    Error {
        message: String,
    },
    Pong,

    // Comments
    NewComment {
        comment: CommentWithAuthor,
    },
    EditComment {
        comment_id: Uuid,
        content: String,
        content_html: String,
    },
    DeleteComment {
        comment_id: Uuid,
    },
    VoteUpdate {
        comment_id: Uuid,
        upvotes: i64,
        downvotes: i64,
    },

    // Presence
    Typing {
        page_id: Uuid,
        user: UserPublic,
    },
    StopTyping {
        page_id: Uuid,
        user_id: Uuid,
    },
    Presence {
        page_id: Uuid,
        users: Vec<UserPublic>,
    },
    UserJoined {
        page_id: Uuid,
        user: UserPublic,
    },
    UserLeft {
        page_id: Uuid,
        user_id: Uuid,
    },

    // Notifications
    Notification {
        notification_type: String,
        comment_id: Uuid,
        from_user: UserPublic,
    },
}
