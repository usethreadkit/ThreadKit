use axum::Router;

use crate::state::AppState;

pub mod auth;
pub mod comments;
pub mod moderation;
pub mod users;
pub mod admin;

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(auth::router())
        .merge(comments::router())
        .merge(moderation::router())
        .merge(users::router())
        .merge(admin::router())
}
