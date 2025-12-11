use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    response::Json,
    routing::{delete, post},
    Router,
};
use chrono::Utc;
use serde::Serialize;
use threadkit_common::{image_processing, types::MediaInfo};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::{
    extractors::{AuthUser, AuthUserWithRole, ProjectId},
    state::AppState,
};

const MAX_AVATAR_SIZE: u64 = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
const AVATAR_SIZE_PX: u32 = 200;

#[derive(Debug, Serialize, ToSchema)]
pub struct UploadResponse {
    pub media_id: Uuid,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/upload/avatar", post(upload_avatar))
        .route("/upload/image", post(upload_image))
        .route("/media/{id}", delete(delete_media))
}

/// Upload an avatar image
///
/// Avatars are resized to 200x200px and converted to WebP format
#[utoipa::path(
    post,
    path = "/upload/avatar",
    request_body(content = String, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "Avatar uploaded successfully", body = UploadResponse),
        (status = 400, description = "Bad request"),
        (status = 413, description = "File too large"),
        (status = 501, description = "File uploads not enabled"),
    ),
    security(
        ("bearer" = [])
    )
)]
pub async fn upload_avatar(
    State(state): State<AppState>,
    project_id: ProjectId,
    auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    // Check if S3 is enabled
    let storage = state
        .storage
        .as_ref()
        .ok_or((
            StatusCode::NOT_IMPLEMENTED,
            "File uploads not enabled".to_string(),
        ))?;

    // Parse multipart form
    let field = multipart
        .next_field()
        .await
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Invalid multipart data".to_string(),
            )
        })?
        .ok_or((StatusCode::BAD_REQUEST, "No file provided".to_string()))?;

    let content_type = field
        .content_type()
        .ok_or((StatusCode::BAD_REQUEST, "Missing content type".to_string()))?
        .to_string();

    // Validate MIME type
    if !content_type.starts_with("image/") {
        return Err((StatusCode::BAD_REQUEST, "Only images allowed".to_string()));
    }

    // Read file data
    let data = field
        .bytes()
        .await
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Failed to read file data".to_string(),
            )
        })?;

    // Check size limit
    if data.len() > MAX_AVATAR_SIZE as usize {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "Avatar exceeds 10MB limit".to_string(),
        ));
    }

    // Validate and resize image
    let (original_width, original_height, _) = image_processing::validate_image(&data)
        .map_err(|_| (StatusCode::BAD_REQUEST, "Invalid image format".to_string()))?;

    tracing::info!(
        "Resizing avatar from {}x{} to {}x{}",
        original_width,
        original_height,
        AVATAR_SIZE_PX,
        AVATAR_SIZE_PX
    );

    let (resized, compression_stats) = image_processing::resize_avatar(
        &data,
        AVATAR_SIZE_PX,
        image_processing::DEFAULT_WEBP_QUALITY,
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to process image: {}", e),
        )
    })?;

    tracing::info!(
        "Avatar compressed: {}KB → {}KB ({:.1}% reduction)",
        compression_stats.original_size / 1024,
        compression_stats.compressed_size / 1024,
        compression_stats.compression_ratio
    );

    // Generate media ID and upload
    let media_id = Uuid::now_v7();
    let url = storage
        .upload_file(media_id, "image/webp", resized.clone(), "avatars")
        .await
        .map_err(|e| {
            tracing::error!("Failed to upload avatar to S3: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Upload failed: {}", e),
            )
        })?;

    // Store metadata
    let info = MediaInfo {
        id: media_id,
        url: url.clone(),
        uploader_user_id: auth.user_id,
        site_id: project_id.0.site_id,
        upload_date: Utc::now(),
        size_bytes: resized.len() as u64,
        mime_type: "image/webp".to_string(),
        width: Some(AVATAR_SIZE_PX),
        height: Some(AVATAR_SIZE_PX),
    };

    state
        .redis
        .set_media_info(&info)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to save metadata".to_string(),
            )
        })?;

    state
        .redis
        .add_user_media(auth.user_id, media_id)
        .await
        .ok();

    // Update user avatar_url
    let mut user = state
        .redis
        .get_user(auth.user_id)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get user".to_string(),
            )
        })?
        .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    user.avatar_url = Some(url.clone());
    state
        .redis
        .set_user(&user)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to update user".to_string(),
            )
        })?;

    tracing::info!(
        "Avatar uploaded: media_id={} user_id={} size={}",
        media_id,
        auth.user_id,
        resized.len()
    );

    Ok(Json(UploadResponse {
        media_id,
        url,
        width: Some(AVATAR_SIZE_PX),
        height: Some(AVATAR_SIZE_PX),
    }))
}

/// Upload an image
///
/// Images are converted to WebP format. SVG blocked for security.
#[utoipa::path(
    post,
    path = "/upload/image",
    request_body(content = String, content_type = "multipart/form-data"),
    responses(
        (status = 200, description = "Image uploaded successfully", body = UploadResponse),
        (status = 400, description = "Bad request - invalid image or unsupported format"),
        (status = 413, description = "File too large"),
        (status = 501, description = "File uploads not enabled"),
    ),
    security(
        ("bearer" = [])
    )
)]
pub async fn upload_image(
    State(state): State<AppState>,
    project_id: ProjectId,
    auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<UploadResponse>, (StatusCode, String)> {
    let storage = state
        .storage
        .as_ref()
        .ok_or((
            StatusCode::NOT_IMPLEMENTED,
            "File uploads not enabled".to_string(),
        ))?;

    let field = multipart
        .next_field()
        .await
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Invalid multipart data".to_string(),
            )
        })?
        .ok_or((StatusCode::BAD_REQUEST, "No file provided".to_string()))?;

    let content_type = field
        .content_type()
        .ok_or((StatusCode::BAD_REQUEST, "Missing content type".to_string()))?
        .to_string();

    // Validate MIME type - only safe image formats, no SVG (security risk)
    if !image_processing::is_safe_image_mime(&content_type) {
        return Err((
            StatusCode::BAD_REQUEST,
            "Unsupported image format (JPEG, PNG, WebP, GIF allowed - SVG not allowed)".to_string(),
        ));
    }

    let data = field
        .bytes()
        .await
        .map_err(|_| {
            (
                StatusCode::BAD_REQUEST,
                "Failed to read file data".to_string(),
            )
        })?;

    if data.len() > MAX_IMAGE_SIZE as usize {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "Image exceeds 10MB limit".to_string(),
        ));
    }

    // Get original dimensions before conversion
    let (width, height, _) = image_processing::validate_image(&data).map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            "Invalid or corrupted image file".to_string(),
        )
    })?;

    // Convert to WebP
    let (webp_data, compression_stats) = image_processing::convert_to_webp(
        &data,
        image_processing::DEFAULT_WEBP_QUALITY,
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to convert image: {}", e),
        )
    })?;

    tracing::info!(
        "Image compressed: {}KB → {}KB ({:.1}% reduction)",
        compression_stats.original_size / 1024,
        compression_stats.compressed_size / 1024,
        compression_stats.compression_ratio
    );

    let media_id = Uuid::now_v7();
    let url = storage
        .upload_file(media_id, "image/webp", webp_data.clone(), "images")
        .await
        .map_err(|e| {
            tracing::error!("Failed to upload image to S3: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Upload failed: {}", e),
            )
        })?;

    let info = MediaInfo {
        id: media_id,
        url: url.clone(),
        uploader_user_id: auth.user_id,
        site_id: project_id.0.site_id,
        upload_date: Utc::now(),
        size_bytes: webp_data.len() as u64,
        mime_type: "image/webp".to_string(),
        width: Some(width),
        height: Some(height),
    };

    state
        .redis
        .set_media_info(&info)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to save metadata".to_string(),
            )
        })?;

    state
        .redis
        .add_user_media(auth.user_id, media_id)
        .await
        .ok();

    tracing::info!(
        "Image uploaded: media_id={} user_id={} size={} dimensions={}x{}",
        media_id,
        auth.user_id,
        webp_data.len(),
        width,
        height
    );

    Ok(Json(UploadResponse {
        media_id,
        url,
        width: Some(width),
        height: Some(height),
    }))
}

/// Delete a media file
///
/// Requires: User must be the uploader, or have moderator/admin role
#[utoipa::path(
    delete,
    path = "/media/{id}",
    params(
        ("id" = Uuid, Path, description = "Media ID"),
    ),
    responses(
        (status = 204, description = "Media deleted successfully"),
        (status = 403, description = "Not authorized to delete this media"),
        (status = 404, description = "Media not found"),
        (status = 501, description = "File uploads not enabled"),
    ),
    security(
        ("bearer" = [])
    )
)]
pub async fn delete_media(
    State(state): State<AppState>,
    _project_id: ProjectId,
    auth_role: AuthUserWithRole,
    Path(media_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let storage = state
        .storage
        .as_ref()
        .ok_or((
            StatusCode::NOT_IMPLEMENTED,
            "File uploads not enabled".to_string(),
        ))?;

    // Get media info
    let info = state
        .redis
        .get_media_info(media_id)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to get media info".to_string(),
            )
        })?
        .ok_or((StatusCode::NOT_FOUND, "Media not found".to_string()))?;

    // Check permissions: uploader can delete own, mods/admins can delete any
    let can_delete = info.uploader_user_id == auth_role.user_id
        || auth_role.role >= threadkit_common::types::Role::Moderator;

    if !can_delete {
        return Err((
            StatusCode::FORBIDDEN,
            "Not authorized to delete this media".to_string(),
        ));
    }

    // Delete from S3
    storage.delete_file(&info.url).await.map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Failed to delete file: {}", e),
        )
    })?;

    // Delete metadata
    state
        .redis
        .delete_media_info(media_id)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to delete metadata".to_string(),
            )
        })?;

    state
        .redis
        .remove_user_media(info.uploader_user_id, media_id)
        .await
        .ok();

    tracing::info!(
        "Media deleted: media_id={} by_user={}",
        media_id,
        auth_role.user_id
    );

    Ok(StatusCode::NO_CONTENT)
}

