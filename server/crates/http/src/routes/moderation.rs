use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use threadkit_common::types::{Comment, CommentStatus, CommentWithAuthor, Report, UserPublic};

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
    /// Pending comments
    pub comments: Vec<CommentWithAuthor>,
    /// Total count
    pub total: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportsResponse {
    /// List of reports
    pub reports: Vec<ReportWithComment>,
    /// Total count
    pub total: usize,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReportWithComment {
    #[serde(flatten)]
    pub report: Report,
    /// The reported comment
    pub comment: Option<Comment>,
    /// The user who made the report
    pub reporter: Option<UserPublic>,
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

    let comment_ids = state
        .redis
        .get_moderation_queue(api_key.0.site_id, offset, limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut comments = Vec::with_capacity(comment_ids.len());
    for comment_id in &comment_ids {
        if let Ok(Some(comment)) = state.redis.get_comment(*comment_id).await {
            if let Ok(Some(author)) = state.redis.get_user(comment.author_id).await {
                comments.push(CommentWithAuthor {
                    comment,
                    author: UserPublic::from(author),
                    user_vote: None,
                });
            }
        }
    }

    Ok(Json(QueueResponse {
        total: comments.len(),
        comments,
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

    let reports = state
        .redis
        .get_reports(api_key.0.site_id, offset, limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut results = Vec::with_capacity(reports.len());
    for report in reports {
        let comment = state.redis.get_comment(report.comment_id).await.ok().flatten();
        let reporter = state.redis.get_user(report.reporter_id).await.ok().flatten().map(UserPublic::from);

        results.push(ReportWithComment {
            report,
            comment,
            reporter,
        });
    }

    Ok(Json(ReportsResponse {
        total: results.len(),
        reports: results,
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
    responses(
        (status = 200, description = "Comment approved"),
        (status = 403, description = "Not a moderator or comment not in site"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn approve_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(comment_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_moderator()?;

    let mut comment = state
        .redis
        .get_comment(comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Verify comment belongs to this site
    if comment.site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Comment not in this site".into()));
    }

    comment.status = CommentStatus::Approved;
    comment.updated_at = Utc::now();

    state
        .redis
        .set_comment(&comment)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Remove from modqueue
    state
        .redis
        .remove_from_modqueue(api_key.0.site_id, comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Publish update
    let _ = state
        .redis
        .publish(
            &format!("page:{}", comment.page_id),
            &serde_json::json!({
                "type": "new_comment",
                "comment_id": comment.id,
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
    responses(
        (status = 200, description = "Comment rejected"),
        (status = 403, description = "Not a moderator or comment not in site"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn reject_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(comment_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_moderator()?;

    let mut comment = state
        .redis
        .get_comment(comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    if comment.site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Comment not in this site".into()));
    }

    comment.status = CommentStatus::Rejected;
    comment.updated_at = Utc::now();

    state
        .redis
        .set_comment(&comment)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Remove from modqueue
    state
        .redis
        .remove_from_modqueue(api_key.0.site_id, comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

/// Ban a user from commenting (moderator+)
#[utoipa::path(
    post,
    path = "/moderation/ban/{user_id}",
    tag = "moderation",
    params(
        ("user_id" = Uuid, Path, description = "User ID to ban")
    ),
    responses(
        (status = 200, description = "User banned"),
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
) -> Result<StatusCode, (StatusCode, String)> {
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

    state
        .redis
        .block_user(api_key.0.site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
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
