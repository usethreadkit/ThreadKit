use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use threadkit_common::types::{
    Comment, CommentStatus, CommentWithAuthor, ModerationAction, ModerationMode, Notification,
    NotificationType, Report, ReportReason, SortOrder, TurnstileEnforcement, UserPublic, VoteDirection,
};
use threadkit_common::moderation::ModerationCheckResult;

use super::turnstile::verify_with_cloudflare;

use crate::{
    extractors::{ApiKey, AuthUser, AuthUserWithRole, MaybeAuthUser},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/comments", get(get_comments).post(create_comment))
        .route("/comments/{id}", put(update_comment).delete(delete_comment))
        .route("/comments/{id}/vote", post(vote_comment))
        .route("/comments/{id}/report", post(report_comment))
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct GetCommentsQuery {
    /// URL of the page to get comments for
    pub page_url: String,
    /// Sort order (new, top, hot)
    pub sort: Option<SortOrder>,
    /// Pagination offset
    pub offset: Option<usize>,
    /// Max comments to return (max 100)
    pub limit: Option<usize>,
    /// Get replies to a specific comment
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GetCommentsResponse {
    pub comments: Vec<CommentWithAuthor>,
    pub total: usize,
    pub pageviews: Option<i64>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateCommentRequest {
    /// URL of the page
    pub page_url: String,
    /// Comment content (markdown)
    pub content: String,
    /// Parent comment ID for replies
    pub parent_id: Option<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CreateCommentResponse {
    pub comment: CommentWithAuthor,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCommentRequest {
    /// New comment content (markdown)
    pub content: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VoteRequest {
    /// Vote direction (up or down)
    pub direction: VoteDirection,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct VoteResponse {
    pub upvotes: i64,
    pub downvotes: i64,
    pub user_vote: Option<VoteDirection>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReportRequest {
    /// Reason for the report
    pub reason: ReportReason,
    /// Additional details
    pub details: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get comments for a page
#[utoipa::path(
    get,
    path = "/comments",
    tag = "comments",
    params(GetCommentsQuery),
    responses(
        (status = 200, description = "List of comments", body = GetCommentsResponse),
        (status = 400, description = "Invalid request")
    ),
    security(("api_key" = []))
)]
pub async fn get_comments(
    State(state): State<AppState>,
    api_key: ApiKey,
    maybe_auth: MaybeAuthUser,
    Query(query): Query<GetCommentsQuery>,
) -> Result<Json<GetCommentsResponse>, (StatusCode, String)> {
    // Generate page_id from URL (hash or lookup)
    let page_id = generate_page_id(&api_key.0.site_id, &query.page_url);

    // Increment pageview
    let _ = state.redis.increment_pageview(page_id).await;
    let _ = state.redis.increment_usage(api_key.0.site_id, "pageviews", 1).await;

    // Get comments
    let sort = query.sort.unwrap_or_default();
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(500).min(1000);

    let comment_ids = if let Some(parent_id) = query.parent_id {
        state.redis.get_comment_replies(parent_id, offset, limit).await
    } else {
        state.redis.get_page_comments(page_id, sort, offset, limit).await
    }
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Get the list of users blocked by the current user (if authenticated)
    let blocked_users: std::collections::HashSet<Uuid> = if let Some(ref auth) = maybe_auth.0 {
        state
            .redis
            .get_blocked_users(auth.user_id)
            .await
            .unwrap_or_default()
            .into_iter()
            .collect()
    } else {
        std::collections::HashSet::new()
    };

    // Batch fetch all comments concurrently
    let all_comments = state.redis.get_comments_batch(&comment_ids).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Filter comments based on status and blocked users
    let current_user_id = maybe_auth.0.as_ref().map(|u| u.user_id);
    let visible_comments: Vec<_> = all_comments
        .into_iter()
        .filter(|c| {
            // Skip comments from blocked users
            if blocked_users.contains(&c.author_id) {
                return false;
            }
            // Only show approved comments (or pending if it's the author)
            match c.status {
                CommentStatus::Approved => true,
                CommentStatus::Pending => current_user_id == Some(c.author_id),
                _ => false,
            }
        })
        .collect();

    // Collect unique author IDs and comment IDs for batch fetching
    let author_ids: Vec<_> = visible_comments.iter().map(|c| c.author_id).collect();
    let visible_comment_ids: Vec<_> = visible_comments.iter().map(|c| c.id).collect();

    // Batch fetch authors and votes concurrently
    let (authors_map, votes_map) = tokio::join!(
        state.redis.get_users_batch(&author_ids),
        async {
            if let Some(ref auth) = maybe_auth.0 {
                state.redis.get_votes_batch(auth.user_id, &visible_comment_ids).await
            } else {
                Ok(std::collections::HashMap::new())
            }
        }
    );

    let authors_map = authors_map.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let votes_map = votes_map.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Build final response
    let comments: Vec<_> = visible_comments
        .into_iter()
        .filter_map(|comment| {
            authors_map.get(&comment.author_id).map(|author| {
                let user_vote = votes_map.get(&comment.id).copied();
                CommentWithAuthor {
                    comment,
                    author: UserPublic::from(author.clone()),
                    user_vote,
                }
            })
        })
        .collect();

    // Get pageviews if enabled
    let pageviews = if api_key.0.settings.display.show_pageviews {
        state.redis.get_pageviews(page_id).await.ok()
    } else {
        None
    };

    Ok(Json(GetCommentsResponse {
        total: comments.len(),
        comments,
        pageviews,
    }))
}

/// Create a new comment
#[utoipa::path(
    post,
    path = "/comments",
    tag = "comments",
    request_body = CreateCommentRequest,
    responses(
        (status = 200, description = "Comment created", body = CreateCommentResponse),
        (status = 400, description = "Invalid request"),
        (status = 403, description = "User is blocked or Turnstile verification failed"),
        (status = 404, description = "Parent comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn create_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateCommentRequest>,
) -> Result<Json<CreateCommentResponse>, (StatusCode, String)> {
    // Check if user is blocked
    if auth.role == threadkit_common::types::Role::Blocked {
        return Err((StatusCode::FORBIDDEN, "User is blocked".into()));
    }

    // Check if site-wide posting is disabled
    if api_key.0.settings.posting_disabled {
        return Err((StatusCode::FORBIDDEN, "Posting is currently disabled".into()));
    }

    // Check if page-level posting is disabled
    let page_id = generate_page_id(&api_key.0.site_id, &req.page_url);
    let page_locked = state
        .redis
        .is_page_locked(api_key.0.site_id, page_id)
        .await
        .unwrap_or(false);

    if page_locked {
        return Err((StatusCode::FORBIDDEN, "Posting is disabled on this page".into()));
    }

    // Turnstile verification (bot protection)
    let turnstile_settings = &api_key.0.settings.turnstile;
    if turnstile_settings.enabled && turnstile_settings.enforce_on != TurnstileEnforcement::None {
        // Check if verification is required for this user
        let requires_verification = match turnstile_settings.enforce_on {
            TurnstileEnforcement::All => true,
            TurnstileEnforcement::Anonymous => {
                // For now, all authenticated users pass this check
                // In the future, we might check if user has anonymous auth provider
                false
            }
            TurnstileEnforcement::Unverified => {
                // Check if user has verified email or phone
                let user = state.redis.get_user(auth.user_id).await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
                    .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "User not found".into()))?;
                !user.email_verified && !user.phone_verified
            }
            TurnstileEnforcement::None => false,
        };

        if requires_verification {
            // Check for cached verification (if caching is enabled)
            let cache_key = format!("turnstile:verified:{}:{}", api_key.0.site_id, auth.user_id);
            let has_cached_verification = if turnstile_settings.cache_duration_seconds > 0 {
                state.redis.exists(&cache_key).await.unwrap_or(false)
            } else {
                false
            };

            if !has_cached_verification {
                // Get Turnstile token from header
                let turnstile_token = headers
                    .get("X-Turnstile-Token")
                    .and_then(|v| v.to_str().ok())
                    .ok_or((StatusCode::FORBIDDEN, "Turnstile verification required".into()))?;

                // Verify with Cloudflare
                let secret_key = state.config.turnstile.secret_key.as_ref()
                    .ok_or((StatusCode::SERVICE_UNAVAILABLE, "Turnstile not configured on server".into()))?;

                let client_ip = headers
                    .get("x-forwarded-for")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|s| s.split(',').next())
                    .map(|s| s.trim());

                let result = verify_with_cloudflare(secret_key, turnstile_token, client_ip).await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Turnstile verification error: {}", e)))?;

                if !result.success {
                    return Err((StatusCode::FORBIDDEN, format!(
                        "Turnstile verification failed: {}",
                        result.error_codes.join(", ")
                    )));
                }

                // Cache successful verification if enabled
                if turnstile_settings.cache_duration_seconds > 0 {
                    let _ = state.redis.set_with_expiry(
                        &cache_key,
                        "1",
                        turnstile_settings.cache_duration_seconds as u64
                    ).await;
                }
            }
        }
    }

    // Validate comment length
    let max_length = state.config.max_comment_length;
    if req.content.chars().count() > max_length {
        return Err((
            StatusCode::BAD_REQUEST,
            format!("Comment exceeds maximum length of {} characters", max_length),
        ));
    }

    // Check if shadow banned
    let is_shadowbanned = state
        .redis
        .is_shadowbanned(api_key.0.site_id, auth.user_id)
        .await
        .unwrap_or(false);

    // Content moderation check (blocking)
    let content_moderation_settings = &api_key.0.settings.content_moderation;
    let moderation_result = state
        .moderation
        .check(&req.content, content_moderation_settings)
        .await;

    let mut moderation_flagged = false;
    if let Ok(ModerationCheckResult::Blocked { category, result }) = moderation_result {
        match content_moderation_settings.action {
            ModerationAction::Reject => {
                tracing::info!(
                    category = %category,
                    reason = ?result.reason,
                    "Comment rejected by content moderation"
                );
                return Err((
                    StatusCode::FORBIDDEN,
                    format!("Content rejected: {}", result.reason.unwrap_or_else(|| category)),
                ));
            }
            ModerationAction::Queue | ModerationAction::Flag => {
                moderation_flagged = true;
            }
        }
    }

    // Determine depth
    let depth = if let Some(parent_id) = req.parent_id {
        let parent = state
            .redis
            .get_comment(parent_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::NOT_FOUND, "Parent comment not found".into()))?;
        parent.depth + 1
    } else {
        0
    };

    // Determine status based on moderation mode and content moderation result
    let status = if moderation_flagged && content_moderation_settings.action == ModerationAction::Queue {
        CommentStatus::Pending
    } else {
        match api_key.0.settings.moderation_mode {
            ModerationMode::Pre => CommentStatus::Pending,
            _ => CommentStatus::Approved,
        }
    };

    let now = Utc::now();
    let comment = Comment {
        id: Uuid::now_v7(),
        site_id: api_key.0.site_id,
        page_id,
        page_url: req.page_url,
        author_id: auth.user_id,
        parent_id: req.parent_id,
        content: req.content.clone(),
        content_html: markdown_to_html(&req.content),
        upvotes: 0,
        downvotes: 0,
        reply_count: 0,
        depth,
        status: status.clone(),
        edited: false,
        created_at: now,
        updated_at: now,
    };

    // If shadow banned, pretend to save but don't actually
    if !is_shadowbanned {
        state
            .redis
            .set_comment(&comment)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // Track this comment in user's comment list
        let _ = state.redis.add_user_comment(auth.user_id, comment.id).await;

        // Update usage
        let _ = state.redis.increment_usage(api_key.0.site_id, "comments", 1).await;

        // Send notification to parent comment author if this is a reply
        if let Some(parent_id) = req.parent_id {
            if let Ok(Some(parent)) = state.redis.get_comment(parent_id).await {
                if parent.author_id != auth.user_id {
                    let notification = Notification {
                        id: Uuid::now_v7(),
                        notification_type: NotificationType::Reply,
                        comment_id: comment.id,
                        from_user_id: auth.user_id,
                        read: false,
                        created_at: now,
                    };
                    let _ = state.redis.add_notification(parent.author_id, &notification).await;
                }
            }
        }

        // Publish for WebSocket subscribers
        let _ = state
            .redis
            .publish(
                &format!("page:{}", page_id),
                &serde_json::json!({
                    "type": "new_comment",
                    "comment_id": comment.id,
                })
                .to_string(),
            )
            .await;
    }

    let author = state
        .redis
        .get_user(auth.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "User not found".into()))?;

    Ok(Json(CreateCommentResponse {
        comment: CommentWithAuthor {
            comment,
            author: UserPublic::from(author),
            user_vote: None,
        },
    }))
}

/// Update a comment
#[utoipa::path(
    put,
    path = "/comments/{id}",
    tag = "comments",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = UpdateCommentRequest,
    responses(
        (status = 200, description = "Comment updated", body = CommentWithAuthor),
        (status = 403, description = "Not your comment"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn update_comment(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<UpdateCommentRequest>,
) -> Result<Json<CommentWithAuthor>, (StatusCode, String)> {
    let mut comment = state
        .redis
        .get_comment(comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Check ownership
    if comment.author_id != auth.user_id {
        return Err((StatusCode::FORBIDDEN, "Not your comment".into()));
    }

    // Update comment
    comment.content = req.content.clone();
    comment.content_html = markdown_to_html(&req.content);
    comment.edited = true;
    comment.updated_at = Utc::now();

    state
        .redis
        .set_comment(&comment)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Publish update
    let _ = state
        .redis
        .publish(
            &format!("page:{}", comment.page_id),
            &serde_json::json!({
                "type": "edit_comment",
                "comment_id": comment.id,
            })
            .to_string(),
        )
        .await;

    let author = state
        .redis
        .get_user(auth.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "User not found".into()))?;

    let user_vote = state.redis.get_vote(auth.user_id, comment_id).await.ok().flatten();

    Ok(Json(CommentWithAuthor {
        comment,
        author: UserPublic::from(author),
        user_vote,
    }))
}

/// Delete a comment (author or moderator+)
#[utoipa::path(
    delete,
    path = "/comments/{id}",
    tag = "comments",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    responses(
        (status = 204, description = "Comment deleted"),
        (status = 403, description = "Not authorized"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn delete_comment(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(comment_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let mut comment = state
        .redis
        .get_comment(comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Check ownership or moderator
    if comment.author_id != auth.user_id && auth.role < threadkit_common::types::Role::Moderator {
        return Err((StatusCode::FORBIDDEN, "Not authorized".into()));
    }

    comment.status = CommentStatus::Deleted;
    comment.updated_at = Utc::now();

    state
        .redis
        .set_comment(&comment)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Publish deletion
    let _ = state
        .redis
        .publish(
            &format!("page:{}", comment.page_id),
            &serde_json::json!({
                "type": "delete_comment",
                "comment_id": comment.id,
            })
            .to_string(),
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// Vote on a comment (toggle up/down)
#[utoipa::path(
    post,
    path = "/comments/{id}/vote",
    tag = "comments",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = VoteRequest,
    responses(
        (status = 200, description = "Vote recorded", body = VoteResponse),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn vote_comment(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<VoteRequest>,
) -> Result<Json<VoteResponse>, (StatusCode, String)> {
    let comment = state
        .redis
        .get_comment(comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    let existing_vote = state
        .redis
        .get_vote(auth.user_id, comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (new_vote, upvote_delta, downvote_delta): (Option<VoteDirection>, i64, i64) =
        match (existing_vote, req.direction) {
            // No existing vote, add new vote
            (None, VoteDirection::Up) => (Some(VoteDirection::Up), 1, 0),
            (None, VoteDirection::Down) => (Some(VoteDirection::Down), 0, 1),

            // Same vote, remove it
            (Some(VoteDirection::Up), VoteDirection::Up) => (None, -1, 0),
            (Some(VoteDirection::Down), VoteDirection::Down) => (None, 0, -1),

            // Different vote, switch
            (Some(VoteDirection::Up), VoteDirection::Down) => (Some(VoteDirection::Down), -1, 1),
            (Some(VoteDirection::Down), VoteDirection::Up) => (Some(VoteDirection::Up), 1, -1),
        };

    // Update vote record and track for GDPR cleanup
    if let Some(direction) = new_vote {
        state
            .redis
            .set_vote(auth.user_id, comment_id, direction)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        // Track this vote for the user (for account deletion)
        let _ = state.redis.add_user_vote(auth.user_id, comment_id).await;
    } else {
        state
            .redis
            .delete_vote(auth.user_id, comment_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        // Remove from user's vote tracking
        let _ = state.redis.remove_user_vote(auth.user_id, comment_id).await;
    }

    // Update comment vote counts
    let new_upvotes = (comment.upvotes + upvote_delta).max(0);
    let new_downvotes = (comment.downvotes + downvote_delta).max(0);

    state
        .redis
        .update_comment_votes(comment_id, new_upvotes, new_downvotes)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update author karma (only if voting on someone else's comment)
    if comment.author_id != auth.user_id {
        // Karma change = upvote_delta - downvote_delta
        // Upvotes add karma, downvotes subtract karma
        let karma_delta = upvote_delta - downvote_delta;
        if karma_delta != 0 {
            let _ = state.redis.update_user_karma(comment.author_id, karma_delta).await;
        }
    }

    // Publish vote update
    let _ = state
        .redis
        .publish(
            &format!("page:{}", comment.page_id),
            &serde_json::json!({
                "type": "vote_update",
                "comment_id": comment.id,
                "upvotes": new_upvotes,
                "downvotes": new_downvotes,
            })
            .to_string(),
        )
        .await;

    Ok(Json(VoteResponse {
        upvotes: new_upvotes,
        downvotes: new_downvotes,
        user_vote: new_vote,
    }))
}

/// Report a comment for moderation
#[utoipa::path(
    post,
    path = "/comments/{id}/report",
    tag = "comments",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = ReportRequest,
    responses(
        (status = 204, description = "Report submitted"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn report_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<ReportRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Verify comment exists
    let _ = state
        .redis
        .get_comment(comment_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    let report = Report {
        comment_id,
        reporter_id: auth.user_id,
        reason: req.reason,
        details: req.details,
        created_at: Utc::now(),
    };

    state
        .redis
        .add_report(api_key.0.site_id, &report)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================================
// Helpers
// ============================================================================

fn generate_page_id(site_id: &Uuid, page_url: &str) -> Uuid {
    // Create deterministic UUID from site_id + URL
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    site_id.hash(&mut hasher);
    page_url.hash(&mut hasher);
    let hash = hasher.finish();

    // Use hash to create a UUID v5-like ID
    Uuid::from_u64_pair(hash, hash.rotate_left(32))
}

fn markdown_to_html(content: &str) -> String {
    // Simple markdown conversion - in production use pulldown-cmark or similar
    // For now, just escape HTML and convert basic formatting
    let escaped = content
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");

    // Very basic: wrap in <p> tag
    format!("<p>{}</p>", escaped.replace("\n\n", "</p><p>"))
}
