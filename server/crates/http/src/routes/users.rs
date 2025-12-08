use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use threadkit_common::types::{DeletedAccountStats, Notification, SocialLinks, TreeComment, UserPublic};

use crate::{
    extractors::{ApiKey, AuthUser, MaybeAuthUser},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users/me", get(get_me).put(update_me).delete(delete_account))
        .route("/users/me/blocked", get(get_blocked_users))
        .route("/users/me/comments", get(get_my_comments))
        .route("/users/check-username", post(check_username))
        .route("/users/{id}", get(get_user))
        .route("/users/{id}/block", post(block_user).delete(unblock_user))
        .route("/users/{id}/comments", get(get_user_comments))
        .route("/notifications", get(get_notifications))
        .route("/notifications/read", post(mark_read))
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize, ToSchema)]
pub struct MeResponse {
    /// User ID
    pub id: Uuid,
    /// Username
    pub name: String,
    /// Email address (if set)
    pub email: Option<String>,
    /// Phone number (if set)
    pub phone: Option<String>,
    /// Avatar URL
    pub avatar_url: Option<String>,
    /// Whether email is verified
    pub email_verified: bool,
    /// Whether phone is verified
    pub phone_verified: bool,
    /// User karma from votes
    pub karma: i64,
    /// Number of unread notifications
    pub unread_notifications: i64,
    /// Whether the user has explicitly chosen their username
    pub username_set: bool,
    /// Social media links
    pub social_links: SocialLinks,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateMeRequest {
    /// New username
    pub name: Option<String>,
    /// New avatar URL
    pub avatar_url: Option<String>,
    /// Social media links
    pub social_links: Option<SocialLinks>,
}

#[derive(Debug, Deserialize, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct PaginationQuery {
    /// Pagination offset
    pub offset: Option<usize>,
    /// Max items to return
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CheckUsernameRequest {
    /// Username to check
    pub username: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct CheckUsernameResponse {
    /// Whether the username is available
    pub available: bool,
    /// Validation error if username format is invalid
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationsResponse {
    /// List of notifications
    pub notifications: Vec<NotificationWithDetails>,
    /// Number of unread notifications
    pub unread_count: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NotificationWithDetails {
    #[serde(flatten)]
    pub notification: Notification,
    /// User who triggered the notification
    pub from_user: Option<UserPublic>,
}

/// A comment item with page context
#[derive(Debug, Serialize, ToSchema)]
pub struct CommentItem {
    /// Page ID where the comment exists
    pub page_id: Uuid,
    /// The comment
    pub comment: TreeComment,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UserCommentsResponse {
    /// List of comments
    pub comments: Vec<CommentItem>,
    /// Whether there are more comments available
    pub has_more: bool,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get current user profile
#[utoipa::path(
    get,
    path = "/users/me",
    tag = "users",
    responses(
        (status = 200, description = "User profile", body = MeResponse),
        (status = 401, description = "Not authenticated"),
        (status = 404, description = "User not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_me(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    // Parallelize user and unread count fetches
    let (user_result, unread) = tokio::join!(
        state.redis.get_user(auth.user_id),
        async { state.redis.get_unread_count(auth.user_id).await.unwrap_or(0) }
    );

    let user = user_result
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    Ok(Json(MeResponse {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        karma: user.karma,
        unread_notifications: unread,
        username_set: user.username_set,
        social_links: user.social_links,
    }))
}

/// Update current user profile
#[utoipa::path(
    put,
    path = "/users/me",
    tag = "users",
    request_body = UpdateMeRequest,
    responses(
        (status = 200, description = "Profile updated", body = MeResponse),
        (status = 401, description = "Not authenticated"),
        (status = 409, description = "Username already taken")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn update_me(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
    Json(req): Json<UpdateMeRequest>,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    let mut user = state
        .redis
        .get_user(auth.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    if let Some(ref name) = req.name {
        // Validate username format
        threadkit_common::validate_username(name)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

        // Check if new username is available (excluding current user)
        if !state
            .redis
            .is_username_available(name, Some(auth.user_id))
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        {
            return Err((StatusCode::CONFLICT, "Username already taken".into()));
        }

        // Delete old username index
        let _ = state.redis.delete_user_username_index(&user.name).await;
        // Set new username index
        state
            .redis
            .set_user_username_index(name, auth.user_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        user.name = name.clone();
        user.username_set = true; // User has explicitly set their username
    }

    if let Some(avatar_url) = req.avatar_url {
        user.avatar_url = Some(avatar_url);
    }

    if let Some(social_links) = req.social_links {
        user.social_links = social_links;
    }

    state
        .redis
        .set_user(&user)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let unread = state
        .redis
        .get_unread_count(auth.user_id)
        .await
        .unwrap_or(0);

    Ok(Json(MeResponse {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
        phone_verified: user.phone_verified,
        karma: user.karma,
        unread_notifications: unread,
        username_set: user.username_set,
        social_links: user.social_links,
    }))
}

/// Get a user's public profile
#[utoipa::path(
    get,
    path = "/users/{id}",
    tag = "users",
    params(
        ("id" = Uuid, Path, description = "User ID")
    ),
    responses(
        (status = 200, description = "User profile", body = UserPublic),
        (status = 404, description = "User not found")
    ),
    security(("api_key" = []))
)]
pub async fn get_user(
    State(state): State<AppState>,
    _api_key: ApiKey,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserPublic>, (StatusCode, String)> {
    let user = state
        .redis
        .get_user(user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    Ok(Json(UserPublic::from(user)))
}

/// Check if a username is available
#[utoipa::path(
    post,
    path = "/users/check-username",
    tag = "users",
    request_body = CheckUsernameRequest,
    responses(
        (status = 200, description = "Username availability", body = CheckUsernameResponse)
    )
)]
pub async fn check_username(
    State(state): State<AppState>,
    _api_key: ApiKey,
    MaybeAuthUser(auth): MaybeAuthUser,
    Json(req): Json<CheckUsernameRequest>,
) -> Result<Json<CheckUsernameResponse>, (StatusCode, String)> {
    // First validate the username format
    if let Err(validation_error) = threadkit_common::validate_username(&req.username) {
        return Ok(Json(CheckUsernameResponse {
            available: false,
            error: Some(validation_error.to_string()),
        }));
    }

    // Exclude current user from check (so they can keep their own username)
    let exclude_user_id = auth.map(|a| a.user_id);

    let available = state
        .redis
        .is_username_available(&req.username, exclude_user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(CheckUsernameResponse { available, error: None }))
}

/// Get user notifications
#[utoipa::path(
    get,
    path = "/notifications",
    tag = "notifications",
    params(PaginationQuery),
    responses(
        (status = 200, description = "List of notifications", body = NotificationsResponse),
        (status = 401, description = "Not authenticated")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_notifications(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<NotificationsResponse>, (StatusCode, String)> {
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(100);

    // Fetch notifications and unread count in parallel
    let (notifications_result, unread_count) = tokio::join!(
        state.redis.get_notifications(auth.user_id, offset, limit),
        async { state.redis.get_unread_count(auth.user_id).await.unwrap_or(0) }
    );

    let notifications = notifications_result
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch all from_users in parallel
    let user_futures: Vec<_> = notifications
        .iter()
        .map(|n| state.redis.get_user(n.from_user_id))
        .collect();

    let user_results = futures::future::join_all(user_futures).await;

    let results: Vec<_> = notifications
        .into_iter()
        .zip(user_results)
        .map(|(notification, user_result)| {
            let from_user = user_result.ok().flatten().map(UserPublic::from);
            NotificationWithDetails {
                notification,
                from_user,
            }
        })
        .collect();

    Ok(Json(NotificationsResponse {
        notifications: results,
        unread_count,
    }))
}

/// Mark all notifications as read
#[utoipa::path(
    post,
    path = "/notifications/read",
    tag = "notifications",
    responses(
        (status = 200, description = "Notifications marked as read"),
        (status = 401, description = "Not authenticated")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn mark_read(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
) -> Result<StatusCode, (StatusCode, String)> {
    state
        .redis
        .mark_notifications_read(auth.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// ============================================================================
// User Blocking
// ============================================================================

#[derive(Debug, Serialize, ToSchema)]
pub struct BlockedUsersResponse {
    /// List of blocked users
    pub users: Vec<UserPublic>,
}

/// Get list of users blocked by current user
#[utoipa::path(
    get,
    path = "/users/me/blocked",
    tag = "users",
    responses(
        (status = 200, description = "List of blocked users", body = BlockedUsersResponse),
        (status = 401, description = "Not authenticated")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_blocked_users(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
) -> Result<Json<BlockedUsersResponse>, (StatusCode, String)> {
    let blocked_ids = state
        .redis
        .get_blocked_users(auth.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Fetch all blocked users in parallel
    let user_futures: Vec<_> = blocked_ids
        .iter()
        .map(|&user_id| state.redis.get_user(user_id))
        .collect();

    let user_results = futures::future::join_all(user_futures).await;

    let users: Vec<_> = user_results
        .into_iter()
        .filter_map(|r| r.ok().flatten().map(UserPublic::from))
        .collect();

    Ok(Json(BlockedUsersResponse { users }))
}

/// Block a user (hide their comments from you)
#[utoipa::path(
    post,
    path = "/users/{id}/block",
    tag = "users",
    params(
        ("id" = Uuid, Path, description = "User ID to block")
    ),
    responses(
        (status = 200, description = "User blocked"),
        (status = 400, description = "Cannot block yourself"),
        (status = 404, description = "User not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn block_user(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    // Can't block yourself
    if user_id == auth.user_id {
        return Err((StatusCode::BAD_REQUEST, "Cannot block yourself".into()));
    }

    // Verify target user exists
    let _ = state
        .redis
        .get_user(user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    state
        .redis
        .block_user_by_user(auth.user_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

/// Unblock a user
#[utoipa::path(
    delete,
    path = "/users/{id}/block",
    tag = "users",
    params(
        ("id" = Uuid, Path, description = "User ID to unblock")
    ),
    responses(
        (status = 200, description = "User unblocked")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn unblock_user(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
    Path(user_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    state
        .redis
        .unblock_user_by_user(auth.user_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// ============================================================================
// Account Deletion (GDPR)
// ============================================================================

/// Delete current user account (GDPR)
#[utoipa::path(
    delete,
    path = "/users/me",
    tag = "users",
    responses(
        (status = 200, description = "Account deleted", body = DeletedAccountStats),
        (status = 401, description = "Not authenticated")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn delete_account(
    State(state): State<AppState>,
    _api_key: ApiKey,
    auth: AuthUser,
) -> Result<Json<DeletedAccountStats>, (StatusCode, String)> {
    let stats = state
        .redis
        .delete_user_account(auth.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(stats))
}

// ============================================================================
// User Comments
// ============================================================================

/// Get current user's comments on this site
#[utoipa::path(
    get,
    path = "/users/me/comments",
    tag = "users",
    params(PaginationQuery),
    responses(
        (status = 200, description = "User's comments", body = UserCommentsResponse),
        (status = 401, description = "Not authenticated")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_my_comments(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUser,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<UserCommentsResponse>, (StatusCode, String)> {
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(100);

    // Get user's comments on this site
    let comment_refs = state
        .redis
        .get_user_site_comments(auth.user_id, api_key.0.site_id, offset, limit + 1)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let has_more = comment_refs.len() > limit;
    let comment_refs: Vec<_> = comment_refs.into_iter().take(limit).collect();

    // Fetch all page trees in parallel
    let tree_futures: Vec<_> = comment_refs
        .iter()
        .map(|(page_id, _)| state.redis.get_page_tree(*page_id))
        .collect();

    let tree_results = futures::future::join_all(tree_futures).await;

    // Find each comment in its tree
    let comments: Vec<CommentItem> = comment_refs
        .iter()
        .zip(tree_results)
        .filter_map(|((page_id, comment_id), tree_result)| {
            if let Ok(Some(tree)) = tree_result {
                if let Some(comment) = find_comment_in_tree(&tree.comments, *comment_id) {
                    return Some(CommentItem {
                        page_id: *page_id,
                        comment: comment.clone(),
                    });
                }
            }
            None
        })
        .collect();

    Ok(Json(UserCommentsResponse { comments, has_more }))
}

/// Get a user's public comments on this site
#[utoipa::path(
    get,
    path = "/users/{id}/comments",
    tag = "users",
    params(
        ("id" = Uuid, Path, description = "User ID"),
        PaginationQuery
    ),
    responses(
        (status = 200, description = "User's comments", body = UserCommentsResponse),
        (status = 404, description = "User not found")
    ),
    security(("api_key" = []))
)]
pub async fn get_user_comments(
    State(state): State<AppState>,
    api_key: ApiKey,
    Path(user_id): Path<Uuid>,
    Query(query): Query<PaginationQuery>,
) -> Result<Json<UserCommentsResponse>, (StatusCode, String)> {
    // Verify user exists
    let _ = state
        .redis
        .get_user(user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(100);

    // Get user's comments on this site
    let comment_refs = state
        .redis
        .get_user_site_comments(user_id, api_key.0.site_id, offset, limit + 1)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let has_more = comment_refs.len() > limit;
    let comment_refs: Vec<_> = comment_refs.into_iter().take(limit).collect();

    // Fetch all page trees in parallel
    let tree_futures: Vec<_> = comment_refs
        .iter()
        .map(|(page_id, _)| state.redis.get_page_tree(*page_id))
        .collect();

    let tree_results = futures::future::join_all(tree_futures).await;

    // Find each comment in its tree (only show approved comments for other users)
    let comments: Vec<CommentItem> = comment_refs
        .iter()
        .zip(tree_results)
        .filter_map(|((page_id, comment_id), tree_result)| {
            if let Ok(Some(tree)) = tree_result {
                if let Some(comment) = find_comment_in_tree(&tree.comments, *comment_id) {
                    // Only show approved comments
                    if comment.effective_status() == threadkit_common::types::CommentStatus::Approved {
                        return Some(CommentItem {
                            page_id: *page_id,
                            comment: comment.clone(),
                        });
                    }
                }
            }
            None
        })
        .collect();

    Ok(Json(UserCommentsResponse { comments, has_more }))
}

/// Helper to find a comment by ID in a tree
pub fn find_comment_in_tree(comments: &[TreeComment], comment_id: Uuid) -> Option<&TreeComment> {
    for comment in comments {
        if comment.id == comment_id {
            return Some(comment);
        }
        if let Some(found) = find_comment_in_tree(&comment.replies, comment_id) {
            return Some(found);
        }
    }
    None
}
