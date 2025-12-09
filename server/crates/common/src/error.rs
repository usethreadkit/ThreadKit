use thiserror::Error;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, Error)]
pub enum Error {
    #[error("Redis error: {0}")]
    Redis(#[from] fred::error::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Invalid API key")]
    InvalidProjectId,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Forbidden")]
    Forbidden,

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Rate limited")]
    RateLimited,

    #[error("User blocked")]
    UserBlocked,

    #[error("User shadow banned")]
    UserShadowBanned,

    #[error("Verification required")]
    VerificationRequired,

    #[error("Invalid verification code")]
    InvalidVerificationCode,

    #[error("Verification code expired")]
    VerificationCodeExpired,

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Error {
    pub fn status_code(&self) -> u16 {
        match self {
            Error::InvalidProjectId | Error::Unauthorized => 401,
            Error::Forbidden | Error::UserBlocked => 403,
            Error::NotFound(_) => 404,
            Error::BadRequest(_) | Error::InvalidVerificationCode => 400,
            Error::RateLimited => 429,
            Error::VerificationRequired | Error::VerificationCodeExpired => 403,
            Error::UserShadowBanned => 200, // Shadow ban returns success but doesn't actually post
            _ => 500,
        }
    }
}
