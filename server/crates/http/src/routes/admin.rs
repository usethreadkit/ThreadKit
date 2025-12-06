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
