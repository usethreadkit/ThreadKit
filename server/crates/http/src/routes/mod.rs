use axum::Router;

use crate::state::AppState;

pub mod admin;
pub mod auth;
pub mod comments;
pub mod moderation;
pub mod turnstile;
pub mod users;

pub fn router() -> Router<AppState> {
    Router::new()
        .merge(auth::router())
        .merge(comments::router())
        .merge(moderation::router())
        .merge(users::router())
        .merge(admin::router())
        .merge(turnstile::router())
}
