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

use threadkit_common::redis::RedisClient;
use threadkit_common::types::{
    CommentStatus, ModerationAction, ModerationMode, Notification, NotificationType, PageTree,
    Report, ReportReason, SortOrder, TreeComment, TurnstileEnforcement, VoteDirection,
    ANONYMOUS_USER_ID, DELETED_USER_ID,
};
use threadkit_common::moderation::ModerationCheckResult;

// Re-export shared types for OpenAPI docs and external use
pub use threadkit_common::types::{
    CreateCommentRequest, CreateCommentResponse, GetCommentsResponse,
};

use super::turnstile::verify_with_cloudflare;

use crate::{
    extractors::{ApiKey, AuthUser, AuthUserWithRole, MaybeAuthUser, MaybeAuthUserWithRole},
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
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCommentRequest {
    /// Page URL where the comment exists
    pub page_url: String,
    /// New comment content (markdown)
    pub content: String,
    /// Path to the comment (array of UUIDs from root to target)
    pub path: Vec<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VoteRequest {
    /// Page URL where the comment exists
    pub page_url: String,
    /// Vote direction (up or down)
    pub direction: VoteDirection,
    /// Path to the comment (array of UUIDs from root to target)
    pub path: Vec<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct VoteResponse {
    pub upvotes: i64,
    pub downvotes: i64,
    pub user_vote: Option<VoteDirection>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct DeleteRequest {
    /// Page URL where the comment exists
    pub page_url: String,
    /// Path to the comment (array of UUIDs from root to target)
    pub path: Vec<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ReportRequest {
    /// Page URL where the comment exists
    pub page_url: String,
    /// Reason for the report
    pub reason: ReportReason,
    /// Additional details
    pub details: Option<String>,
    /// Path to the comment being reported
    pub path: Vec<Uuid>,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get comments for a page (single Redis GET - fast!)
#[utoipa::path(
    get,
    path = "/comments",
    tag = "comments",
    params(GetCommentsQuery),
    responses(
        (status = 200, description = "Comment tree", body = GetCommentsResponse),
        (status = 304, description = "Not modified (ETag match)"),
        (status = 400, description = "Invalid request")
    ),
    security(("api_key" = []))
)]
pub async fn get_comments(
    State(state): State<AppState>,
    api_key: ApiKey,
    maybe_auth: MaybeAuthUser,
    headers: axum::http::HeaderMap,
    Query(query): Query<GetCommentsQuery>,
) -> Result<axum::response::Response, (StatusCode, String)> {
    use axum::response::IntoResponse;
    use std::time::Instant;

    let request_start = Instant::now();

    // Generate page_id from URL
    let page_id = RedisClient::generate_page_id(api_key.0.site_id, &query.page_url);

    // Check in-memory ETag cache FIRST (avoids Redis entirely for unchanged pages)
    if let Some(if_none_match) = headers.get("if-none-match").and_then(|v| v.to_str().ok()) {
        if let Some(cached_ts) = state.etag_cache.get(&page_id).await {
            let cached_etag = format!("\"{}\"", cached_ts);
            if if_none_match == cached_etag || if_none_match == format!("W/{}", cached_etag) {
                // Sub-millisecond 304 response - no Redis hit!
                return Ok((
                    StatusCode::NOT_MODIFIED,
                    [
                        ("ETag", cached_etag),
                        ("Cache-Control", "public, max-age=0, must-revalidate".to_string()),
                    ],
                )
                    .into_response());
            }
        }
    }

    // Fire-and-forget pageview increments (spawned task, no await blocking response)
    // Uses pipeline to batch both increments into a single Redis round trip
    {
        let redis = state.redis.clone();
        let site_id = api_key.0.site_id;
        tokio::spawn(async move {
            let _ = redis.increment_pageview_with_usage(page_id, site_id).await;
        });
    }

    // Prepare concurrent fetches - we need blocked_users and pageviews in parallel with tree
    let user_id_for_blocked = maybe_auth.0.as_ref().map(|u| u.user_id);
    let show_pageviews = api_key.0.settings.display.show_pageviews;

    // Run all Redis reads concurrently using tokio::join!
    let redis_start = Instant::now();
    let (tree_result, blocked_users, pageviews) = tokio::join!(
        // Primary: get the page tree
        state.redis.get_or_create_page_tree(page_id),
        // Get blocked users (if authenticated)
        async {
            if let Some(user_id) = user_id_for_blocked {
                state
                    .redis
                    .get_blocked_users(user_id)
                    .await
                    .unwrap_or_default()
                    .into_iter()
                    .collect::<std::collections::HashSet<Uuid>>()
            } else {
                std::collections::HashSet::new()
            }
        },
        // Get pageviews (if enabled)
        async {
            if show_pageviews {
                state.redis.get_pageviews(page_id).await.ok()
            } else {
                None
            }
        }
    );
    let redis_elapsed = redis_start.elapsed();

    let mut tree = tree_result.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update in-memory cache with latest timestamp
    state.etag_cache.insert(page_id, tree.updated_at).await;

    // Generate ETag from updated_at timestamp
    let etag = format!("\"{}\"", tree.updated_at);

    // Check If-None-Match header again (cache miss case - ETag from Redis)
    if let Some(if_none_match) = headers.get("if-none-match").and_then(|v| v.to_str().ok()) {
        if if_none_match == etag || if_none_match == format!("W/{}", etag) {
            // Return 304 Not Modified
            return Ok((
                StatusCode::NOT_MODIFIED,
                [
                    ("ETag", etag),
                    ("Cache-Control", "public, max-age=0, must-revalidate".to_string()),
                ],
            )
                .into_response());
        }
    }

    let current_user_id = maybe_auth.0.as_ref().map(|u| u.user_id);

    // Filter comments in place and strip vote lists
    let filter_start = Instant::now();
    filter_tree_for_response(&mut tree, current_user_id, &blocked_users);
    let filter_elapsed = filter_start.elapsed();

    // Sort if requested
    let sort_start = Instant::now();
    let sort = query.sort.unwrap_or_default();
    sort_tree(&mut tree, sort);
    let sort_elapsed = sort_start.elapsed();

    let total = tree.total_count();

    let serialize_start = Instant::now();
    let response = GetCommentsResponse {
        tree,
        total,
        pageviews,
    };

    let json_response = Json(response);
    let serialize_elapsed = serialize_start.elapsed();
    let total_elapsed = request_start.elapsed();

    // Log timing breakdown for slow requests (>10ms)
    if total_elapsed.as_millis() > 10 {
        tracing::debug!(
            redis_ms = redis_elapsed.as_millis(),
            filter_ms = filter_elapsed.as_micros() as f64 / 1000.0,
            sort_ms = sort_elapsed.as_micros() as f64 / 1000.0,
            serialize_ms = serialize_elapsed.as_micros() as f64 / 1000.0,
            total_ms = total_elapsed.as_millis(),
            comment_count = total,
            "get_comments timing breakdown"
        );
    }

    Ok((
        StatusCode::OK,
        [
            ("ETag", etag),
            ("Cache-Control", "public, max-age=0, must-revalidate".to_string()),
        ],
        json_response,
    )
        .into_response())
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
    auth: MaybeAuthUserWithRole,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateCommentRequest>,
) -> Result<Json<CreateCommentResponse>, (StatusCode, String)> {
    // Check if anonymous comments are allowed
    let is_anonymous = !auth.is_authenticated();
    if is_anonymous && !api_key.0.settings.auth.anonymous {
        return Err((
            StatusCode::UNAUTHORIZED,
            "Authentication required. Anonymous comments are not enabled.".into(),
        ));
    }

    // Anonymous comments require author_name
    if is_anonymous && req.author_name.as_ref().map_or(true, |n| n.trim().is_empty()) {
        return Err((
            StatusCode::BAD_REQUEST,
            "author_name is required for anonymous comments".into(),
        ));
    }

    // Check if user is blocked (only for authenticated users)
    if auth.role == threadkit_common::types::Role::Blocked {
        return Err((StatusCode::FORBIDDEN, "User is blocked".into()));
    }

    // Check if site-wide posting is disabled
    if api_key.0.settings.posting_disabled {
        return Err((StatusCode::FORBIDDEN, "Posting is currently disabled".into()));
    }

    // Generate page_id
    let page_id = RedisClient::generate_page_id(api_key.0.site_id, &req.page_url);

    // Check if page-level posting is disabled
    let page_locked = state
        .redis
        .is_page_locked(api_key.0.site_id, page_id)
        .await
        .unwrap_or(false);

    if page_locked {
        return Err((
            StatusCode::FORBIDDEN,
            "Posting is disabled on this page".into(),
        ));
    }

    // Turnstile verification (if configured)
    verify_turnstile(&state, &api_key, is_anonymous, &headers).await?;

    // Validate comment length
    let max_length = state.config.max_comment_length;
    if req.content.chars().count() > max_length {
        return Err((
            StatusCode::BAD_REQUEST,
            format!(
                "Comment exceeds maximum length of {} characters",
                max_length
            ),
        ));
    }

    // Check if shadow banned (only for authenticated users)
    let is_shadowbanned = if let Some(user_id) = auth.user_id {
        state
            .redis
            .is_shadowbanned(api_key.0.site_id, user_id)
            .await
            .unwrap_or(false)
    } else {
        false
    };

    // Content moderation check
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
                    format!(
                        "Content rejected: {}",
                        result.reason.unwrap_or_else(|| category)
                    ),
                ));
            }
            ModerationAction::Queue | ModerationAction::Flag => {
                moderation_flagged = true;
            }
        }
    }

    // Determine status
    let status =
        if moderation_flagged && content_moderation_settings.action == ModerationAction::Queue {
            Some(CommentStatus::Pending)
        } else {
            match api_key.0.settings.moderation_mode {
                ModerationMode::Pre => Some(CommentStatus::Pending),
                _ => None, // None means approved (default)
            }
        };

    // Get author info - either from authenticated user or anonymous
    let (author_id, author_name, author_avatar, author_karma) = if let Some(user_id) = auth.user_id {
        let author = state
            .redis
            .get_user(user_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "User not found".into()))?;
        (user_id, author.name.clone(), author.avatar_url.clone(), author.karma)
    } else {
        // Anonymous user
        (
            ANONYMOUS_USER_ID,
            req.author_name.clone().unwrap_or_else(|| "Anonymous".to_string()),
            None,
            0,
        )
    };

    let now = Utc::now();
    let now_ts = now.timestamp();
    let comment_id = Uuid::now_v7();

    // Create the tree comment
    let tree_comment = TreeComment {
        id: comment_id,
        author_id,
        name: author_name,
        avatar: author_avatar,
        karma: author_karma,
        text: req.content.clone(),
        html: markdown_to_html(&req.content),
        upvotes: 0,
        downvotes: 0,
        created_at: now_ts,
        modified_at: now_ts,
        upvoters: Vec::new(),
        downvoters: Vec::new(),
        replies: Vec::new(),
        status: status.clone(),
    };

    // If shadow banned, return success but don't actually save
    if is_shadowbanned {
        return Ok(Json(CreateCommentResponse {
            comment: tree_comment,
        }));
    }

    // Get current tree and add comment
    let mut tree = state
        .redis
        .get_or_create_page_tree(page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if req.parent_path.is_empty() {
        // Root comment
        tree.add_root(tree_comment.clone());
    } else {
        // Reply - find parent and add
        if !tree.add_reply(&req.parent_path, tree_comment.clone()) {
            return Err((StatusCode::NOT_FOUND, "Parent comment not found".into()));
        }
    }

    // Save updated tree
    state
        .redis
        .set_page_tree(page_id, &tree)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update ETag cache with new timestamp
    state.etag_cache.insert(page_id, tree.updated_at).await;

    // Fire-and-forget: update indexes, usage, notifications, and publish in background
    // These don't block the response - the comment is already saved
    {
        let redis = state.redis.clone();
        let site_id = api_key.0.site_id;
        let is_pending = status == Some(CommentStatus::Pending);
        let parent_path = req.parent_path.clone();

        // Find parent author for notification (if this is a reply)
        let notify_user_id = if !parent_path.is_empty() {
            tree.find_by_path(&parent_path)
                .filter(|parent| {
                    parent.author_id != author_id
                        && parent.author_id != DELETED_USER_ID
                        && parent.author_id != ANONYMOUS_USER_ID
                })
                .map(|parent| parent.author_id)
        } else {
            None
        };

        tokio::spawn(async move {
            // Run all index updates concurrently
            let mut futures: Vec<std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>>> =
                Vec::with_capacity(6);

            // User comment indexes (if authenticated)
            if let Some(user_id) = auth.user_id {
                let redis1 = redis.clone();
                let redis2 = redis.clone();
                futures.push(Box::pin(async move {
                    let _ = redis1.add_user_comment_index(user_id, page_id, comment_id).await;
                }));
                futures.push(Box::pin(async move {
                    let _ = redis2
                        .add_user_site_comment_index(user_id, site_id, page_id, comment_id)
                        .await;
                }));
            }

            // Site comment index
            {
                let redis = redis.clone();
                futures.push(Box::pin(async move {
                    let _ = redis.add_site_comment_index(site_id, page_id, comment_id).await;
                }));
            }

            // Modqueue (if pending)
            if is_pending {
                let redis = redis.clone();
                futures.push(Box::pin(async move {
                    let _ = redis.add_to_modqueue(site_id, page_id, comment_id).await;
                }));
            }

            // Usage increment
            {
                let redis = redis.clone();
                futures.push(Box::pin(async move {
                    let _ = redis.increment_usage(site_id, "comments", 1).await;
                }));
            }

            // Notification (if reply to another user)
            if let Some(parent_author_id) = notify_user_id {
                let redis = redis.clone();
                futures.push(Box::pin(async move {
                    let notification = Notification {
                        id: Uuid::now_v7(),
                        notification_type: NotificationType::Reply,
                        comment_id,
                        from_user_id: author_id,
                        read: false,
                        created_at: now,
                    };
                    let _ = redis.add_notification(parent_author_id, &notification).await;
                }));
            }

            // Publish for WebSocket subscribers
            {
                let redis = redis.clone();
                futures.push(Box::pin(async move {
                    let _ = redis
                        .publish(
                            &format!("page:{}", page_id),
                            &serde_json::json!({
                                "type": "new_comment",
                                "comment_id": comment_id,
                            })
                            .to_string(),
                        )
                        .await;
                }));
            }

            // Execute all concurrently
            futures::future::join_all(futures).await;
        });
    }

    Ok(Json(CreateCommentResponse {
        comment: tree_comment,
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
        (status = 200, description = "Comment updated", body = TreeComment),
        (status = 403, description = "Not your comment"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn update_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<UpdateCommentRequest>,
) -> Result<Json<TreeComment>, (StatusCode, String)> {
    // Validate path ends with the correct comment ID
    if req.path.is_empty() || *req.path.last().unwrap() != comment_id {
        return Err((StatusCode::BAD_REQUEST, "Path must end with comment ID".into()));
    }

    let page_id = RedisClient::generate_page_id(api_key.0.site_id, &req.page_url);

    let mut tree = state
        .redis
        .get_page_tree(page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Page not found".into()))?;

    let comment = tree
        .find_by_path_mut(&req.path)
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Check ownership
    if comment.author_id != auth.user_id {
        return Err((StatusCode::FORBIDDEN, "Not your comment".into()));
    }

    // Update comment
    comment.text = req.content.clone();
    comment.html = markdown_to_html(&req.content);
    comment.modified_at = Utc::now().timestamp();

    // Clone for response before saving
    let updated_comment = comment.clone();

    // Save tree
    state
        .redis
        .set_page_tree(page_id, &tree)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update ETag cache with new timestamp
    state.etag_cache.insert(page_id, tree.updated_at).await;

    // Publish update
    let _ = state
        .redis
        .publish(
            &format!("page:{}", page_id),
            &serde_json::json!({
                "type": "edit_comment",
                "comment_id": comment_id,
            })
            .to_string(),
        )
        .await;

    Ok(Json(updated_comment))
}

/// Delete a comment (marks as deleted, preserves replies)
#[utoipa::path(
    delete,
    path = "/comments/{id}",
    tag = "comments",
    params(
        ("id" = Uuid, Path, description = "Comment ID")
    ),
    request_body = DeleteRequest,
    responses(
        (status = 204, description = "Comment deleted"),
        (status = 403, description = "Not authorized"),
        (status = 404, description = "Comment not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn delete_comment(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<DeleteRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Validate path
    if req.path.is_empty() || *req.path.last().unwrap() != comment_id {
        return Err((StatusCode::BAD_REQUEST, "Path must end with comment ID".into()));
    }

    let page_id = RedisClient::generate_page_id(api_key.0.site_id, &req.page_url);

    let mut tree = state
        .redis
        .get_page_tree(page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Page not found".into()))?;

    let comment = tree
        .find_by_path_mut(&req.path)
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Check ownership or moderator
    if comment.author_id != auth.user_id && auth.role < threadkit_common::types::Role::Moderator {
        return Err((StatusCode::FORBIDDEN, "Not authorized".into()));
    }

    // Mark as deleted (preserves replies)
    comment.mark_deleted();

    // Save tree
    state
        .redis
        .set_page_tree(page_id, &tree)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update ETag cache with new timestamp
    state.etag_cache.insert(page_id, tree.updated_at).await;

    // Publish deletion
    let _ = state
        .redis
        .publish(
            &format!("page:{}", page_id),
            &serde_json::json!({
                "type": "delete_comment",
                "comment_id": comment_id,
            })
            .to_string(),
        )
        .await;

    Ok(StatusCode::NO_CONTENT)
}

/// Vote on a comment
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
    api_key: ApiKey,
    auth: AuthUser,
    Path(comment_id): Path<Uuid>,
    Json(req): Json<VoteRequest>,
) -> Result<Json<VoteResponse>, (StatusCode, String)> {
    // Validate path
    if req.path.is_empty() || *req.path.last().unwrap() != comment_id {
        return Err((StatusCode::BAD_REQUEST, "Path must end with comment ID".into()));
    }

    let page_id = RedisClient::generate_page_id(api_key.0.site_id, &req.page_url);

    let mut tree = state
        .redis
        .get_page_tree(page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Page not found".into()))?;

    let comment = tree
        .find_by_path_mut(&req.path)
        .ok_or((StatusCode::NOT_FOUND, "Comment not found".into()))?;

    // Check existing vote
    let existing_vote = if comment.upvoters.contains(&auth.user_id) {
        Some(VoteDirection::Up)
    } else if comment.downvoters.contains(&auth.user_id) {
        Some(VoteDirection::Down)
    } else {
        None
    };

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

    // Update vote arrays
    comment.upvoters.retain(|&id| id != auth.user_id);
    comment.downvoters.retain(|&id| id != auth.user_id);

    if let Some(dir) = new_vote {
        match dir {
            VoteDirection::Up => comment.upvoters.push(auth.user_id),
            VoteDirection::Down => comment.downvoters.push(auth.user_id),
        }
    }

    // Update counts
    comment.upvotes = (comment.upvotes + upvote_delta).max(0);
    comment.downvotes = (comment.downvotes + downvote_delta).max(0);

    let new_upvotes = comment.upvotes;
    let new_downvotes = comment.downvotes;
    let author_id = comment.author_id;

    // Save tree
    state
        .redis
        .set_page_tree(page_id, &tree)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Update ETag cache with new timestamp
    state.etag_cache.insert(page_id, tree.updated_at).await;

    // Fire-and-forget: vote index, karma update, and WebSocket publish
    {
        let redis = state.redis.clone();
        let user_id = auth.user_id;
        let karma_delta = upvote_delta - downvote_delta;

        tokio::spawn(async move {
            // Run all updates concurrently
            tokio::join!(
                // Update user vote index
                async {
                    if new_vote.is_some() {
                        let _ = redis.add_user_vote_index(user_id, page_id, comment_id).await;
                    } else {
                        let _ = redis.remove_user_vote_index(user_id, page_id, comment_id).await;
                    }
                },
                // Update author karma (only if voting on someone else's comment)
                async {
                    if author_id != user_id && author_id != DELETED_USER_ID && karma_delta != 0 {
                        let _ = redis.update_user_karma(author_id, karma_delta).await;
                    }
                },
                // Publish vote update for WebSocket subscribers
                async {
                    let _ = redis
                        .publish(
                            &format!("page:{}", page_id),
                            &serde_json::json!({
                                "type": "vote_update",
                                "comment_id": comment_id,
                                "upvotes": new_upvotes,
                                "downvotes": new_downvotes,
                            })
                            .to_string(),
                        )
                        .await;
                }
            );
        });
    }

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
    // Validate path
    if req.path.is_empty() || *req.path.last().unwrap() != comment_id {
        return Err((StatusCode::BAD_REQUEST, "Path must end with comment ID".into()));
    }

    let page_id = RedisClient::generate_page_id(api_key.0.site_id, &req.page_url);

    // Verify comment exists
    let tree = state
        .redis
        .get_page_tree(page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Page not found".into()))?;

    tree.find_by_path(&req.path)
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
        .add_report_v2(api_key.0.site_id, page_id, &report)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

// ============================================================================
// Helpers
// ============================================================================

/// Verify Turnstile if required for current user type
async fn verify_turnstile(
    state: &AppState,
    api_key: &ApiKey,
    is_anonymous: bool,
    headers: &axum::http::HeaderMap,
) -> Result<(), (StatusCode, String)> {
    let turnstile_settings = &api_key.0.settings.turnstile;
    if !turnstile_settings.enabled || turnstile_settings.enforce_on == TurnstileEnforcement::None {
        return Ok(());
    }

    // Check if anonymous users need verification
    let requires_verification = match turnstile_settings.enforce_on {
        TurnstileEnforcement::All => true,
        TurnstileEnforcement::Anonymous => is_anonymous,
        TurnstileEnforcement::Unverified => is_anonymous, // Anonymous users are "unverified"
        TurnstileEnforcement::None => false,
    };

    if !requires_verification {
        return Ok(());
    }

    // Get token and verify
    let turnstile_token = headers
        .get("X-Turnstile-Token")
        .and_then(|v| v.to_str().ok())
        .ok_or((StatusCode::FORBIDDEN, "Turnstile verification required".into()))?;

    let secret_key = state
        .config
        .turnstile
        .secret_key
        .as_ref()
        .ok_or((
            StatusCode::SERVICE_UNAVAILABLE,
            "Turnstile not configured".into(),
        ))?;

    let client_ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim());

    let result = verify_with_cloudflare(secret_key, turnstile_token, client_ip)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Turnstile error: {}", e),
            )
        })?;

    if !result.success {
        return Err((
            StatusCode::FORBIDDEN,
            format!("Turnstile failed: {}", result.error_codes.join(", ")),
        ));
    }

    Ok(())
}

/// Filter tree for API response:
/// - Remove comments from blocked users
/// - Only show approved or own pending comments
/// - Strip upvoters/downvoters arrays (compute user_vote on client from presence)
fn filter_tree_for_response(
    tree: &mut PageTree,
    current_user_id: Option<Uuid>,
    blocked_users: &std::collections::HashSet<Uuid>,
) {
    tree.comments.retain_mut(|comment| {
        filter_comment_recursive(comment, current_user_id, blocked_users)
    });
}

fn filter_comment_recursive(
    comment: &mut TreeComment,
    current_user_id: Option<Uuid>,
    blocked_users: &std::collections::HashSet<Uuid>,
) -> bool {
    // Skip blocked users (unless it's the current user's comment)
    if blocked_users.contains(&comment.author_id) && current_user_id != Some(comment.author_id) {
        return false;
    }

    // Recursively filter replies FIRST (so we know if there are any left)
    comment.replies.retain_mut(|reply| {
        filter_comment_recursive(reply, current_user_id, blocked_users)
    });

    // Check status
    let status = comment.effective_status();
    match status {
        CommentStatus::Approved => true,
        CommentStatus::Pending => current_user_id == Some(comment.author_id),
        // Show [deleted] placeholder only if comment has replies, otherwise remove entirely
        CommentStatus::Deleted => !comment.replies.is_empty(),
        CommentStatus::Rejected => false,
    }
}

/// Sort the tree by the specified order
fn sort_tree(tree: &mut PageTree, sort: SortOrder) {
    sort_comments(&mut tree.comments, sort);
}

fn sort_comments(comments: &mut [TreeComment], sort: SortOrder) {
    match sort {
        SortOrder::New => {
            comments.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        }
        SortOrder::Top => {
            comments.sort_by(|a, b| {
                let a_score = a.upvotes - a.downvotes;
                let b_score = b.upvotes - b.downvotes;
                b_score.cmp(&a_score)
            });
        }
        SortOrder::Hot => {
            // Simple hot algorithm: score / time_decay
            let now = Utc::now().timestamp();
            comments.sort_by(|a, b| {
                let a_score = (a.upvotes - a.downvotes) as f64;
                let b_score = (b.upvotes - b.downvotes) as f64;
                let a_age = ((now - a.created_at) as f64 / 3600.0).max(1.0); // hours
                let b_age = ((now - b.created_at) as f64 / 3600.0).max(1.0);
                let a_hot = a_score / a_age.powf(1.5);
                let b_hot = b_score / b_age.powf(1.5);
                b_hot.partial_cmp(&a_hot).unwrap_or(std::cmp::Ordering::Equal)
            });
        }
    }

    // Sort replies recursively
    for comment in comments.iter_mut() {
        sort_comments(&mut comment.replies, sort);
    }
}

fn markdown_to_html(content: &str) -> String {
    // Simple markdown conversion
    let escaped = content
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");

    format!("<p>{}</p>", escaped.replace("\n\n", "</p><p>"))
}
