use axum::{Router, routing::get, Json, response::IntoResponse, http::{StatusCode, header}};
use serde_json::json;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new().route("/version", get(version))
}

async fn version() -> impl IntoResponse {
    let body = Json(json!({
        "version": env!("CARGO_PKG_VERSION"),
        "git_commit": option_env!("GIT_COMMIT").unwrap_or("unknown"),
        "build_date": option_env!("BUILD_DATE").unwrap_or("unknown"),
    }));

    (
        StatusCode::OK,
        [(header::CACHE_CONTROL, "public, max-age=60")],
        body,
    )
}
