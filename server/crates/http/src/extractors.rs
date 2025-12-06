use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
};
use threadkit_common::{
    auth,
    types::{ApiKeyInfo, ApiKeyType, Role},
};
use uuid::Uuid;

use crate::state::AppState;

/// Extracts and validates API key from X-API-Key header
pub struct ApiKey(pub ApiKeyInfo);

impl<S> FromRequestParts<S> for ApiKey
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        let api_key = parts
            .headers
            .get("X-API-Key")
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing X-API-Key header".to_string()))?;

        // Check cache first
        if let Ok(Some(info)) = state.redis.get_cached_api_key(api_key).await {
            return Ok(ApiKey(info));
        }

        // In standalone mode, validate against config
        if let Some(standalone) = state.config.standalone() {
            let key_type = if api_key == standalone.api_key_public {
                ApiKeyType::Public
            } else if api_key == standalone.api_key_secret {
                ApiKeyType::Secret
            } else {
                return Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()));
            };

            let site_config = state
                .redis
                .get_site_config(standalone.site_id)
                .await
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get site config".to_string()))?
                .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "Site config not found".to_string()))?;

            let info = ApiKeyInfo {
                site_id: standalone.site_id,
                key_type,
                settings: site_config.settings,
            };

            // Cache for future requests
            let _ = state.redis.cache_api_key(api_key, &info).await;

            return Ok(ApiKey(info));
        }

        // In SaaS mode, would call internal API here
        // TODO: Implement SaaS mode API key validation
        Err((StatusCode::UNAUTHORIZED, "Invalid API key".to_string()))
    }
}

/// Extracts authenticated user from JWT in Authorization header
pub struct AuthUser {
    pub user_id: Uuid,
    pub site_id: Uuid,
    pub session_id: Uuid,
}

impl<S> FromRequestParts<S> for AuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = AppState::from_ref(state);

        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing Authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or((StatusCode::UNAUTHORIZED, "Invalid Authorization header format".to_string()))?;

        let claims = auth::verify_token(token, &state.config.jwt_secret)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

        // Verify session still exists
        let session_user = state
            .redis
            .get_session_user(claims.session_id)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to verify session".to_string()))?;

        if session_user != Some(claims.sub) {
            return Err((StatusCode::UNAUTHORIZED, "Session expired".to_string()));
        }

        Ok(AuthUser {
            user_id: claims.sub,
            site_id: claims.site_id,
            session_id: claims.session_id,
        })
    }
}

/// Optional auth - doesn't fail if no token provided
pub struct MaybeAuthUser(pub Option<AuthUser>);

impl<S> FromRequestParts<S> for MaybeAuthUser
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(user) => Ok(MaybeAuthUser(Some(user))),
            Err(_) => Ok(MaybeAuthUser(None)),
        }
    }
}

/// Extracts user with role check
pub struct AuthUserWithRole {
    pub user_id: Uuid,
    pub site_id: Uuid,
    pub role: Role,
}

impl AuthUserWithRole {
    pub fn require_moderator(&self) -> Result<(), (StatusCode, String)> {
        if self.role >= Role::Moderator {
            Ok(())
        } else {
            Err((StatusCode::FORBIDDEN, "Moderator access required".to_string()))
        }
    }

    pub fn require_admin(&self) -> Result<(), (StatusCode, String)> {
        if self.role >= Role::Admin {
            Ok(())
        } else {
            Err((StatusCode::FORBIDDEN, "Admin access required".to_string()))
        }
    }
}

impl<S> FromRequestParts<S> for AuthUserWithRole
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = AppState::from_ref(state);
        let auth_user = AuthUser::from_request_parts(parts, state).await?;

        let role = app_state
            .redis
            .get_user_role(auth_user.site_id, auth_user.user_id)
            .await
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Failed to get user role".to_string()))?;

        if role == Role::Blocked {
            return Err((StatusCode::FORBIDDEN, "User is blocked".to_string()));
        }

        Ok(AuthUserWithRole {
            user_id: auth_user.user_id,
            site_id: auth_user.site_id,
            role,
        })
    }
}

/// Owner access via secret API key
pub struct OwnerAccess {
    pub site_id: Uuid,
}

impl<S> FromRequestParts<S> for OwnerAccess
where
    AppState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let api_key = ApiKey::from_request_parts(parts, state).await?;

        if api_key.0.key_type != ApiKeyType::Secret {
            return Err((StatusCode::FORBIDDEN, "Secret API key required".to_string()));
        }

        Ok(OwnerAccess {
            site_id: api_key.0.site_id,
        })
    }
}
