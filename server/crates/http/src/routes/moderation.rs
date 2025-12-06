use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use threadkit_common::types::{CommentStatus, TreeComment, UserPublic, DELETED_USER_ID};

use crate::{
    extractors::{ApiKey, AuthUserWithRole},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/moderation/queue", get(get_queue))
        .route("/moderation/reports", get(get_reports))
        .route("/moderation/approve/{id}", post(approve_comment))
        .route("/moderation/reject/{id}", post(reject_comment))
        .route("/moderation/ban/{user_id}", post(ban_user))
        .route("/moderation/unban/{user_id}", post(unban_user))
        .route("/moderation/shadowban/{user_id}", post(shadowban_user))
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PaginationQuery {
    /// Pagination offset
    pub offset: Option<usize>,
    /// Max items to return
    pub limit: Option<usize>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QueueResponse {
    /// Pending comments with their page context
    pub items: Vec<QueueItem>,
    /// Total count
    pub total: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct QueueItem {
    /// Page ID where the comment is located
    pub page_id: Uuid,
    /// The pending comment
    pub comment: TreeComment,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportsResponse {
    /// List of reports with comment info
    pub items: Vec<ReportItem>,
    /// Total count
    pub total: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportItem {
    /// Page ID where the reported comment is located
    pub page_id: Uuid,
    /// Comment ID that was reported
    pub comment_id: Uuid,
    /// The reported comment (if found)
    pub comment: Option<TreeComment>,
    /// The user who made the report
    pub reporter: Option<UserPublic>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ModerateCommentRequest {
    /// Page ID where the comment is located
    pub page_id: Uuid,
    /// Path to the comment (array of UUIDs from root to target)
    pub path: Vec<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BanUserRequest {
    /// If true, delete all of user's comments on this site
    #[serde(default)]
    pub delete_comments: bool,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BanUserResponse {
    /// Number of comments deleted (if delete_comments was true)
    pub comments_deleted: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get pending comments for moderation (moderator+)
#[utoipa::path(
    get,
    path = "/moderation/queue",
    tag = "moderation",
    params(PaginationQuery),
    responses(
        (status = 200, description = "Moderation queue", body = QueueResponse),
        (status = 403, description = "Not a moderator")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_queue(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<QueueResponse>, (StatusCode, String)> {
    auth.require_moderator()?;

    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(100);

    // Get modqueue items (page_id:comment_id pairs)
    let queue_items = state
        .redis
        .get_modqueue_v2(api_key.0.site_id, offset, limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut items = Vec::with_capacity(queue_items.len());
    for (page_id, comment_id) in queue_items {
        // Get the page tree and find the comment
        if let Ok(Some(tree)) = state.redis.get_page_tree(page_id).await {
            // Search for the comment in the tree
            if let Some(comment) = find_comment_in_tree(&tree.comments, comment_id) {
                items.push(QueueItem {
                    page_id,
                    comment: comment.clone(),
                });
            }
        }
    }

    Ok(Json(QueueResponse {
        total: items.len(),
        items,
    }))
}

/// Get user reports (moderator+)
#[utoipa::path(
    get,
    path = "/moderation/reports",
    tag = "moderation",
    params(PaginationQuery),
    responses(
        (status = 200, description = "List of reports", body = ReportsResponse),
        (status = 403, description = "Not a moderator")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_reports(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<ReportsResponse>, (StatusCode, String)> {
    auth.require_moderator()?;

    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(100);

    // Get report items (page_id:comment_id pairs)
    let report_items = state
        .redis
        .get_reports_v2(api_key.0.site_id, offset, limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut items = Vec::with_capacity(report_items.len());
    for (page_id, comment_id) in report_items {
        // Get the page tree and find the comment
        let comment = if let Ok(Some(tree)) = state.redis.get_page_tree(page_id).await {
            find_comment_in_tree(&tree.comments, comment_id).cloned()
        } else {
            None
        };

        // For now, reporter info is not stored in the new schema
        // We could add a separate reports hash if needed
        items.push(ReportItem {
            page_id,
            comment_id,
            comment,
            reporter: None,
        });
    }

    Ok(Json(ReportsResponse {
        total: items.len(),
        items,
    }))
}

/// Approve a pending comment (moderator+)
#[utoipa::path(
    post,
    path = "/moderation/approve/{id}",
    tag = "moderation",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = ModerateCommentRequest,
    responses(
        (status = 200, description = "Comment approved"),
        (status = 403, description = "Not a moderator"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn approve_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<ModerateCommentRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_moderator()?;

    // Validate path ends with the correct comment ID
    if req.path.is_empty() || *req.path.last().unwrap() != comment_id {
        return Err((StatusCode::BAD_REQUEST, "Path must end with comment ID".into()));
    }

    // Get the page tree
    let mut tree = state
        .redis
        .get_page_tree(req.page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Page not found".into()))?;

    // Find and update the comment
    let comment = tree
        .find_by_path_mut(&req.path)
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Set status to approved (None in our schema means approved)
    comment.status = None;

    // Save the updated tree
    state
        .redis
        .set_page_tree(req.page_id, &tree)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Remove from modqueue
    let _ = state
        .redis
        .remove_from_modqueue_v2(api_key.0.site_id, req.page_id, comment_id)
        .await;

    // Publish update for real-time clients
    let _ = state
        .redis
        .publish(
            &format!("page:{}", req.page_id),
            &serde_json::json!({
                "type": "new_comment",
                "comment_id": comment_id,
            })
            .to_string(),
        )
        .await;

    Ok(StatusCode::OK)
}

/// Reject a pending comment (moderator+)
#[utoipa::path(
    post,
    path = "/moderation/reject/{id}",
    tag = "moderation",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = ModerateCommentRequest,
    responses(
        (status = 200, description = "Comment rejected"),
        (status = 403, description = "Not a moderator"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn reject_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<ModerateCommentRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_moderator()?;

    // Validate path
    if req.path.is_empty() || *req.path.last().unwrap() != comment_id {
        return Err((StatusCode::BAD_REQUEST, "Path must end with comment ID".into()));
    }

    // Get the page tree
    let mut tree = state
        .redis
        .get_page_tree(req.page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Page not found".into()))?;

    // Find and update the comment
    let comment = tree
        .find_by_path_mut(&req.path)
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    comment.status = Some(CommentStatus::Rejected);

    // Save the updated tree
    state
        .redis
        .set_page_tree(req.page_id, &tree)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Remove from modqueue
    let _ = state
        .redis
        .remove_from_modqueue_v2(api_key.0.site_id, req.page_id, comment_id)
        .await;

    Ok(StatusCode::OK)
}

/// Ban a user from commenting (moderator+)
/// Optionally delete all their comments on this site
#[utoipa::path(
    post,
    path = "/moderation/ban/{user_id}",
    tag = "moderation",
    params(
        ("user_id" = Uuid, Path, description = "User ID to ban")
    ),
    request_body = BanUserRequest,
    responses(
        (status = 200, description = "User banned", body = BanUserResponse),
        (status = 400, description = "Cannot ban yourself"),
        (status = 403, description = "Cannot ban user with equal or higher role")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn ban_user(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(user_id): Path<Uuid>,
    Json(req): Json<BanUserRequest>,
) -> Result<Json<BanUserResponse>, (StatusCode, String)> {
    auth.require_moderator()?;

    // Can't ban yourself
    if user_id == auth.user_id {
        return Err((StatusCode::BAD_REQUEST, "Cannot ban yourself".into()));
    }

    // Check target's role - can't ban someone with higher role
    let target_role = state
        .redis
        .get_user_role(api_key.0.site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if target_role >= auth.role {
        return Err((StatusCode::FORBIDDEN, "Cannot ban user with equal or higher role".into()));
    }

    // Block the user
    state
        .redis
        .block_user(api_key.0.site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Optionally delete all their comments
    let mut comments_deleted = 0i64;
    if req.delete_comments {
        // Get user's comments on this site
        let comments = state
            .redis
            .get_user_site_comments(user_id, api_key.0.site_id, 0, 10000) // Get all
            .await
            .unwrap_or_default();

        // Group by page_id for batch updates
        let mut pages: std::collections::HashMap<Uuid, Vec<Uuid>> = std::collections::HashMap::new();
        for (page_id, comment_id) in comments {
            pages.entry(page_id).or_default().push(comment_id);
        }

        // Update each page tree
        for (page_id, comment_ids) in pages {
            if let Ok(Some(mut tree)) = state.redis.get_page_tree(page_id).await {
                let mut modified = false;
                for comment_id in comment_ids {
                    if mark_comment_deleted_by_admin(&mut tree.comments, comment_id) {
                        comments_deleted += 1;
                        modified = true;
                    }
                }
                if modified {
                    let _ = state.redis.set_page_tree(page_id, &tree).await;
                }
            }
        }
    }

    Ok(Json(BanUserResponse { comments_deleted }))
}

/// Unban a user (moderator+)
#[utoipa::path(
    post,
    path = "/moderation/unban/{user_id}",
    tag = "moderation",
    params(
        ("user_id" = Uuid, Path, description = "User ID to unban")
    ),
    responses(
        (status = 200, description = "User unbanned")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn unban_user(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_moderator()?;

    state
        .redis
        .unblock_user(api_key.0.site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

/// Shadowban a user (comments appear to them but invisible to others)
#[utoipa::path(
    post,
    path = "/moderation/shadowban/{user_id}",
    tag = "moderation",
    params(
        ("user_id" = Uuid, Path, description = "User ID to shadowban")
    ),
    responses(
        (status = 200, description = "User shadowbanned"),
        (status = 400, description = "Cannot shadowban yourself"),
        (status = 403, description = "Cannot shadowban user with equal or higher role")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn shadowban_user(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_moderator()?;

    // Can't shadowban yourself
    if user_id == auth.user_id {
        return Err((StatusCode::BAD_REQUEST, "Cannot shadowban yourself".into()));
    }

    // Check target's role
    let target_role = state
        .redis
        .get_user_role(api_key.0.site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if target_role >= auth.role {
        return Err((StatusCode::FORBIDDEN, "Cannot shadowban user with equal or higher role".into()));
    }

    state
        .redis
        .shadowban_user(api_key.0.site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// ============================================================================
// Helpers
// ============================================================================

/// Recursively search for a comment by ID in the tree
fn find_comment_in_tree(comments: &[TreeComment], target_id: Uuid) -> Option<&TreeComment> {
    for comment in comments {
        if comment.id == target_id {
            return Some(comment);
        }
        if let Some(found) = find_comment_in_tree(&comment.replies, target_id) {
            return Some(found);
        }
    }
    None
}

/// Mark a comment as deleted by admin - sets special user ID and text
fn mark_comment_deleted_by_admin(comments: &mut [TreeComment], target_id: Uuid) -> bool {
    for comment in comments.iter_mut() {
        if comment.id == target_id {
            comment.author_id = DELETED_USER_ID;
            comment.name = "[deleted]".to_string();
            comment.avatar = None;
            comment.karma = 0;
            comment.text = "[deleted by admin]".to_string();
            comment.html = "[deleted by admin]".to_string();
            comment.status = Some(CommentStatus::Deleted);
            return true;
        }
        if mark_comment_deleted_by_admin(&mut comment.replies, target_id) {
            return true;
        }
    }
    false
}
