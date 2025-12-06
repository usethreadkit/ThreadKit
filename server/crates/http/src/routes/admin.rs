use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{delete, get},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

use threadkit_common::types::{Role, UserPublic};

use crate::{
    extractors::{ApiKey, AuthUserWithRole, OwnerAccess},
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        // Admin management (owner only via secret key)
        .route("/sites/{id}/admins", get(get_admins).post(add_admin))
        .route("/sites/{id}/admins/{user_id}", delete(remove_admin))
        // Moderator management (admin+)
        .route("/sites/{id}/moderators", get(get_moderators).post(add_moderator))
        .route("/sites/{id}/moderators/{user_id}", delete(remove_moderator))
        // Posting controls (admin+)
        .route("/sites/{id}/posting", get(get_posting_status).put(set_site_posting))
        .route("/pages/{page_id}/posting", get(get_page_posting_status).put(set_page_posting))
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Serialize, ToSchema)]
pub struct RoleListResponse {
    /// List of users with this role
    pub users: Vec<UserPublic>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct AddUserRequest {
    /// User ID to add to role
    pub user_id: Uuid,
}

// ============================================================================
// Admin Handlers (Owner only - requires secret API key)
// ============================================================================

/// Get site admins (owner only - requires secret API key)
#[utoipa::path(
    get,
    path = "/sites/{id}/admins",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID")
    ),
    responses(
        (status = 200, description = "List of admins", body = RoleListResponse),
        (status = 403, description = "Not the owner")
    ),
    security(("secret_key" = []))
)]
pub async fn get_admins(
    State(state): State<AppState>,
    owner: OwnerAccess,
    Path(site_id): Path<Uuid>,
) -> Result<Json<RoleListResponse>, (StatusCode, String)> {
    // Verify site_id matches
    if site_id != owner.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    let admin_ids = state
        .redis
        .get_admins(site_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut users = Vec::with_capacity(admin_ids.len());
    for user_id in admin_ids {
        if let Ok(Some(user)) = state.redis.get_user(user_id).await {
            users.push(UserPublic::from(user));
        }
    }

    Ok(Json(RoleListResponse { users }))
}

/// Add a site admin (owner only - requires secret API key)
#[utoipa::path(
    post,
    path = "/sites/{id}/admins",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID")
    ),
    request_body = AddUserRequest,
    responses(
        (status = 200, description = "Admin added"),
        (status = 403, description = "Not the owner"),
        (status = 404, description = "User not found")
    ),
    security(("secret_key" = []))
)]
pub async fn add_admin(
    State(state): State<AppState>,
    owner: OwnerAccess,
    Path(site_id): Path<Uuid>,
    Json(req): Json<AddUserRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    if site_id != owner.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    // Verify user exists
    let _ = state
        .redis
        .get_user(req.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    state
        .redis
        .add_admin(site_id, req.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Remove from moderators if they were one (promotion)
    let _ = state.redis.remove_moderator(site_id, req.user_id).await;

    Ok(StatusCode::OK)
}

/// Remove a site admin (owner only - requires secret API key)
#[utoipa::path(
    delete,
    path = "/sites/{id}/admins/{user_id}",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID"),
        ("user_id" = Uuid, Path, description = "User ID to remove")
    ),
    responses(
        (status = 200, description = "Admin removed"),
        (status = 403, description = "Not the owner")
    ),
    security(("secret_key" = []))
)]
pub async fn remove_admin(
    State(state): State<AppState>,
    owner: OwnerAccess,
    Path((site_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    if site_id != owner.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    state
        .redis
        .remove_admin(site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// ============================================================================
// Moderator Handlers (Admin+ - requires JWT with admin role)
// ============================================================================

/// Get site moderators (admin+)
#[utoipa::path(
    get,
    path = "/sites/{id}/moderators",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID")
    ),
    responses(
        (status = 200, description = "List of moderators", body = RoleListResponse),
        (status = 403, description = "Not an admin")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_moderators(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(site_id): Path<Uuid>,
) -> Result<Json<RoleListResponse>, (StatusCode, String)> {
    auth.require_admin()?;

    if site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    let mod_ids = state
        .redis
        .get_moderators(site_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut users = Vec::with_capacity(mod_ids.len());
    for user_id in mod_ids {
        if let Ok(Some(user)) = state.redis.get_user(user_id).await {
            users.push(UserPublic::from(user));
        }
    }

    Ok(Json(RoleListResponse { users }))
}

/// Add a site moderator (admin+)
#[utoipa::path(
    post,
    path = "/sites/{id}/moderators",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID")
    ),
    request_body = AddUserRequest,
    responses(
        (status = 200, description = "Moderator added"),
        (status = 400, description = "User is already an admin"),
        (status = 403, description = "Not an admin"),
        (status = 404, description = "User not found")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn add_moderator(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(site_id): Path<Uuid>,
    Json(req): Json<AddUserRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_admin()?;

    if site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    // Verify user exists
    let _ = state
        .redis
        .get_user(req.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "User not found".into()))?;

    // Check they're not already an admin
    let role = state
        .redis
        .get_user_role(site_id, req.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if role >= Role::Admin {
        return Err((StatusCode::BAD_REQUEST, "User is already an admin".into()));
    }

    state
        .redis
        .add_moderator(site_id, req.user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

/// Remove a site moderator (admin+)
#[utoipa::path(
    delete,
    path = "/sites/{id}/moderators/{user_id}",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID"),
        ("user_id" = Uuid, Path, description = "User ID to remove")
    ),
    responses(
        (status = 200, description = "Moderator removed"),
        (status = 403, description = "Not an admin")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn remove_moderator(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path((site_id, user_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    auth.require_admin()?;

    if site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    state
        .redis
        .remove_moderator(site_id, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

// ============================================================================
// Posting Control Types
// ============================================================================

#[derive(Debug, Serialize, ToSchema)]
pub struct PostingStatusResponse {
    /// Whether posting is disabled
    pub disabled: bool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SetPostingRequest {
    /// Set to true to disable posting, false to enable
    pub disabled: bool,
}

// ============================================================================
// Site Posting Control Handlers (Admin+)
// ============================================================================

/// Get site-wide posting status (admin+)
#[utoipa::path(
    get,
    path = "/sites/{id}/posting",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID")
    ),
    responses(
        (status = 200, description = "Posting status", body = PostingStatusResponse),
        (status = 403, description = "Not an admin")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_posting_status(
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(site_id): Path<Uuid>,
) -> Result<Json<PostingStatusResponse>, (StatusCode, String)> {
    auth.require_admin()?;

    if site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    Ok(Json(PostingStatusResponse {
        disabled: api_key.0.settings.posting_disabled,
    }))
}

/// Enable or disable site-wide posting (admin+)
#[utoipa::path(
    put,
    path = "/sites/{id}/posting",
    tag = "admin",
    params(
        ("id" = Uuid, Path, description = "Site ID")
    ),
    request_body = SetPostingRequest,
    responses(
        (status = 200, description = "Posting status updated", body = PostingStatusResponse),
        (status = 403, description = "Not an admin")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn set_site_posting(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(site_id): Path<Uuid>,
    Json(req): Json<SetPostingRequest>,
) -> Result<Json<PostingStatusResponse>, (StatusCode, String)> {
    auth.require_admin()?;

    if site_id != api_key.0.site_id {
        return Err((StatusCode::FORBIDDEN, "Site ID mismatch".into()));
    }

    // Update settings
    let mut settings = api_key.0.settings.clone();
    settings.posting_disabled = req.disabled;

    state
        .redis
        .update_site_settings(site_id, &settings)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Invalidate cached API key so changes take effect immediately
    // (The cache will be refreshed on next request)

    Ok(Json(PostingStatusResponse {
        disabled: req.disabled,
    }))
}

// ============================================================================
// Page Posting Control Handlers (Admin+)
// ============================================================================

/// Get page posting status (admin+)
#[utoipa::path(
    get,
    path = "/pages/{page_id}/posting",
    tag = "admin",
    params(
        ("page_id" = Uuid, Path, description = "Page ID")
    ),
    responses(
        (status = 200, description = "Page posting status", body = PostingStatusResponse),
        (status = 403, description = "Not an admin")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn get_page_posting_status(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(page_id): Path<Uuid>,
) -> Result<Json<PostingStatusResponse>, (StatusCode, String)> {
    auth.require_admin()?;

    let is_locked = state
        .redis
        .is_page_locked(api_key.0.site_id, page_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(PostingStatusResponse { disabled: is_locked }))
}

/// Enable or disable posting on a specific page (admin+)
#[utoipa::path(
    put,
    path = "/pages/{page_id}/posting",
    tag = "admin",
    params(
        ("page_id" = Uuid, Path, description = "Page ID")
    ),
    request_body = SetPostingRequest,
    responses(
        (status = 200, description = "Page posting status updated", body = PostingStatusResponse),
        (status = 403, description = "Not an admin")
    ),
    security(("api_key" = []), ("bearer" = []))
)]
pub async fn set_page_posting(
    State(state): State<AppState>,
    api_key: ApiKey,
    auth: AuthUserWithRole,
    Path(page_id): Path<Uuid>,
    Json(req): Json<SetPostingRequest>,
) -> Result<Json<PostingStatusResponse>, (StatusCode, String)> {
    auth.require_admin()?;

    if req.disabled {
        state
            .redis
            .lock_page(api_key.0.site_id, page_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        state
            .redis
            .unlock_page(api_key.0.site_id, page_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(PostingStatusResponse {
        disabled: req.disabled,
    }))
}
