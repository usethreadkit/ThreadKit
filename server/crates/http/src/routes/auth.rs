use axum::{
    extract::{Path, Query, State},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use threadkit_common::{
    auth::{self, generate_verification_code},
    types::{AuthProvider, SocialLinks, User, VerificationCode, VerificationType},
    web3,
};

use crate::{extractors::ProjectId, state::AppState};

/// API routes for auth (goes under /v1)
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/auth/methods", get(auth_methods))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/verify", post(verify))
        .route("/auth/send-otp", post(send_otp))
        .route("/auth/verify-otp", post(verify_otp))
        .route("/auth/forgot", post(forgot_password))
        .route("/auth/reset", post(reset_password))
        .route("/auth/refresh", post(refresh_token))
        .route("/auth/logout", post(logout))
        // Web3 authentication
        .route("/auth/ethereum/nonce", get(ethereum_nonce))
        .route("/auth/ethereum/verify", post(ethereum_verify))
        .route("/auth/solana/nonce", get(solana_nonce))
        .route("/auth/solana/verify", post(solana_verify))
}

/// Browser-facing OAuth routes (goes at root level, not under /v1)
pub fn oauth_router() -> Router<AppState> {
    Router::new()
        .route("/auth/{provider}", get(oauth_start))
        .route("/auth/{provider}/callback", get(oauth_callback))
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize, ToSchema)]
pub struct RegisterRequest {
    /// Username (must be unique)
    pub name: String,
    /// Email address (required if no phone)
    pub email: Option<String>,
    /// Phone number (required if no email)
    pub phone: Option<String>,
    /// Password
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    /// Email address
    pub email: Option<String>,
    /// Phone number
    pub phone: Option<String>,
    /// Password
    pub password: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthResponse {
    /// JWT access token
    pub token: String,
    /// JWT refresh token (longer lived)
    pub refresh_token: String,
    /// User details
    pub user: UserResponse,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct UserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub email_verified: bool,
    pub phone_verified: bool,
    /// Whether the user has explicitly chosen their username.
    /// If false, the user should be prompted to set their username.
    pub username_set: bool,
    /// Social media links
    pub social_links: SocialLinks,
}

impl From<User> for UserResponse {
    fn from(u: User) -> Self {
        UserResponse {
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            avatar_url: u.avatar_url,
            email_verified: u.email_verified,
            phone_verified: u.phone_verified,
            username_set: u.username_set,
            social_links: u.social_links,
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyRequest {
    /// Email to verify
    pub email: Option<String>,
    /// Phone to verify
    pub phone: Option<String>,
    /// Verification code
    pub code: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ForgotPasswordRequest {
    /// Email address
    pub email: Option<String>,
    /// Phone number
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ResetPasswordRequest {
    /// Email address
    pub email: Option<String>,
    /// Phone number
    pub phone: Option<String>,
    /// Reset code from email/SMS
    pub code: String,
    /// New password
    pub new_password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct RefreshRequest {
    /// Refresh token from login/register
    pub refresh_token: String,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct OAuthCallbackQuery {
    /// OAuth authorization code
    pub code: String,
    /// State parameter (site_id)
    pub state: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct OAuthStartQuery {
    /// API key (required since OAuth is initiated via navigation, not fetch)
    pub project_id: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthMethodsResponse {
    /// Available authentication methods for this site
    pub methods: Vec<AuthMethod>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthMethod {
    /// Method identifier (email, phone, google, github, ethereum, solana)
    pub id: String,
    /// Human-readable name
    pub name: String,
    /// Method type: "oauth", "otp", "web3"
    #[serde(rename = "type")]
    pub method_type: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct SendOtpRequest {
    /// Email address (required if no phone)
    pub email: Option<String>,
    /// Phone number (required if no email)
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyOtpRequest {
    /// Email address (required if no phone)
    pub email: Option<String>,
    /// Phone number (required if no email)
    pub phone: Option<String>,
    /// OTP code
    pub code: String,
    /// Username (required for new accounts)
    pub name: Option<String>,
}

// ============================================================================
// Web3 Auth Types
// ============================================================================

#[derive(Debug, Deserialize, IntoParams)]
pub struct Web3NonceQuery {
    /// Wallet address (0x... for Ethereum, base58 for Solana)
    pub address: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct NonceResponse {
    /// Nonce for this authentication request
    pub nonce: String,
    /// The message to sign
    pub message: String,
    /// When the nonce was issued
    pub issued_at: String,
    /// When the nonce expires
    pub expiration_time: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct Web3VerifyRequest {
    /// Wallet address
    pub address: String,
    /// Signed message (the message field from NonceResponse)
    pub message: String,
    /// Signature from wallet (hex for Ethereum, base58 for Solana)
    pub signature: String,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get available authentication methods for this site
#[utoipa::path(
    get,
    path = "/auth/methods",
    tag = "auth",
    responses(
        (status = 200, description = "Available auth methods", body = AuthMethodsResponse)
    ),
    security(("project_id" = []))
)]
pub async fn auth_methods(
    State(state): State<AppState>,
    project_id: ProjectId,
) -> Json<AuthMethodsResponse> {
    let settings = &project_id.0.settings.auth;
    let mut methods = Vec::new();

    if settings.email {
        methods.push(AuthMethod {
            id: "email".to_string(),
            name: "Email".to_string(),
            method_type: "otp".to_string(),
        });
    }

    if settings.phone {
        methods.push(AuthMethod {
            id: "phone".to_string(),
            name: "Phone".to_string(),
            method_type: "otp".to_string(),
        });
    }

    if settings.google && state.config.oauth.google.is_some() {
        methods.push(AuthMethod {
            id: "google".to_string(),
            name: "Google".to_string(),
            method_type: "oauth".to_string(),
        });
    }

    if settings.github && state.config.oauth.github.is_some() {
        methods.push(AuthMethod {
            id: "github".to_string(),
            name: "GitHub".to_string(),
            method_type: "oauth".to_string(),
        });
    }

    if settings.ethereum {
        methods.push(AuthMethod {
            id: "ethereum".to_string(),
            name: "Ethereum".to_string(),
            method_type: "web3".to_string(),
        });
    }

    if settings.solana {
        methods.push(AuthMethod {
            id: "solana".to_string(),
            name: "Solana".to_string(),
            method_type: "web3".to_string(),
        });
    }

    Json(AuthMethodsResponse { methods })
}

/// Send OTP code to email or phone (passwordless login)
#[utoipa::path(
    post,
    path = "/auth/send-otp",
    tag = "auth",
    request_body = SendOtpRequest,
    responses(
        (status = 200, description = "OTP sent"),
        (status = 400, description = "Invalid request"),
        (status = 429, description = "Rate limited")
    ),
    security(("project_id" = []))
)]
pub async fn send_otp(
    State(state): State<AppState>,
    _project_id: ProjectId,
    headers: axum::http::HeaderMap,
    Json(req): Json<SendOtpRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let target = req.email.as_ref().or(req.phone.as_ref())
        .ok_or((StatusCode::BAD_REQUEST, "Email or phone required".into()))?;

    // OTP-specific rate limiting (more strict since it costs money)
    // 1. Rate limit per target (email/phone)
    let target_key = format!("ratelimit:otp:target:{}", target);
    let target_result = state.redis
        .check_rate_limit(&target_key, state.config.rate_limit.otp_per_target_per_hour, 3600)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !target_result.allowed {
        return Err((StatusCode::TOO_MANY_REQUESTS, format!(
            "Too many OTP requests for this {}. Try again in {} seconds.",
            if req.email.is_some() { "email" } else { "phone" },
            target_result.reset_at - chrono::Utc::now().timestamp()
        )));
    }

    // 2. Rate limit per IP (prevent enumeration attacks)
    let client_ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .unwrap_or("unknown")
        .trim();
    let ip_key = format!("ratelimit:otp:ip:{}", client_ip);
    let ip_result = state.redis
        .check_rate_limit(&ip_key, state.config.rate_limit.otp_per_ip_per_hour, 3600)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !ip_result.allowed {
        return Err((StatusCode::TOO_MANY_REQUESTS, format!(
            "Too many OTP requests. Try again in {} seconds.",
            ip_result.reset_at - chrono::Utc::now().timestamp()
        )));
    }

    let verification_type = if req.email.is_some() {
        VerificationType::Email
    } else {
        VerificationType::Phone
    };

    let code = generate_verification_code();
    let verification = VerificationCode {
        code: code.clone(),
        user_id: None, // Will be set on verify if user exists
        verification_type,
        created_at: Utc::now(),
    };

    state.redis.set_verification_code(target, &verification).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Send OTP via email or SMS
    if let Some(ref email) = req.email {
        if let Some(ref provider) = state.config.email.provider {
            match provider {
                threadkit_common::config::EmailProvider::Resend(resend) => {
                    send_otp_email_resend(resend, email, &code).await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
                }
            }
        } else {
            tracing::info!("OTP for {}: {} (email provider not configured)", email, code);
        }
    } else if let Some(ref phone) = req.phone {
        if let Some(ref provider) = state.config.sms.provider {
            match provider {
                threadkit_common::config::SmsProvider::Twilio(twilio) => {
                    send_otp_sms_twilio(twilio, phone, &code).await
                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
                }
            }
        } else {
            tracing::info!("OTP for {}: {} (SMS provider not configured)", phone, code);
        }
    }

    Ok(StatusCode::OK)
}

/// Verify OTP code and sign in (creates account if doesn't exist)
#[utoipa::path(
    post,
    path = "/auth/verify-otp",
    tag = "auth",
    request_body = VerifyOtpRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 400, description = "Invalid or expired code")
    ),
    security(("project_id" = []))
)]
pub async fn verify_otp(
    State(state): State<AppState>,
    project_id: ProjectId,
    Json(req): Json<VerifyOtpRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let key = req.email.as_ref().or(req.phone.as_ref())
        .ok_or((StatusCode::BAD_REQUEST, "Email or phone required".into()))?;

    let verification = state.redis.get_verification_code(key).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::BAD_REQUEST, "No verification code found".into()))?;

    if verification.code != req.code {
        return Err((StatusCode::BAD_REQUEST, "Invalid verification code".into()));
    }

    // Find or create user
    let existing_user_id = if req.email.is_some() {
        state.redis.get_user_by_email(key).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        state.redis.get_user_by_phone(key).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    };

    let user = if let Some(user_id) = existing_user_id {
        let mut user = state.redis.get_user(user_id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "User not found".into()))?;

        // Mark as verified
        if req.email.is_some() {
            user.email_verified = true;
        } else {
            user.phone_verified = true;
        }
        let _ = state.redis.set_user(&user).await;
        user
    } else {
        // Create new user - require name for new accounts
        let name = req.name.ok_or((StatusCode::BAD_REQUEST, "Name required for new accounts".into()))?;

        // Validate username format
        threadkit_common::validate_username(&name)
            .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

        if !state.redis.is_username_available(&name, None).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
            return Err((StatusCode::CONFLICT, "Username already taken".into()));
        }

        let user_id = Uuid::now_v7();
        let now = Utc::now();

        let provider = if req.email.is_some() {
            AuthProvider::Email
        } else {
            AuthProvider::Phone
        };

        let user = User {
            id: user_id,
            name: name.clone(),
            email: req.email.clone(),
            phone: req.phone.clone(),
            avatar_url: None,
            provider,
            provider_id: None,
            email_verified: req.email.is_some(),
            phone_verified: req.phone.is_some(),
            karma: 0,
            global_banned: false,
            shadow_banned: false,
            created_at: now,
            username_set: true, // User explicitly chose this username
            social_links: SocialLinks::default(),
        };

        state.redis.set_user(&user).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        state.redis.set_user_username_index(&name, user_id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if let Some(ref email) = req.email {
            state.redis.set_user_email_index(email, user_id).await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }

        if let Some(ref phone) = req.phone {
            state.redis.set_user_phone_index(phone, user_id).await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
        }

        user
    };

    // Create session and tokens
    let session_id = Uuid::now_v7();
    state.redis.create_session(session_id, user.id, "", "").await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = auth::create_token(
        user.id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = auth::create_token(
        user.id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        24 * 365 * 100, // ~100 years
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Delete used OTP code only after successful authentication
    let _ = state.redis.delete_verification_code(key).await;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse::from(user),
    }))
}

/// Helper to send OTP via Resend
async fn send_otp_email_resend(config: &threadkit_common::config::ResendConfig, email: &str, code: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let from_email = format!("ThreadKit <noreply@{}>", config.from_domain);

    let html = format!(r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; margin: 0; padding: 0;">
  <div style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; margin: 40px auto; padding: 40px; max-width: 480px;">
    <div style="text-align: center; margin: 0 0 32px;">
      <img src="https://usethreadkit.com/email-logo.png" width="48" height="48" alt="ThreadKit" style="margin: 0 auto;">
      <p style="color: #18181b; font-size: 20px; font-weight: 700; text-align: center; margin: 12px 0 0;">ThreadKit</p>
    </div>

    <p style="color: #3f3f46; font-size: 15px; line-height: 24px; text-align: center; margin: 0 0 16px;">
      Your sign in code:
    </p>

    <p style="background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; color: #18181b; font-size: 32px; font-weight: 700; letter-spacing: 4px; padding: 20px; text-align: center; font-family: monospace; margin: 24px 0;">
      {code}
    </p>

    <p style="color: #71717a; font-size: 14px; text-align: center; margin: 0;">
      This code expires in 10 minutes.
    </p>

    <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">

    <p style="color: #a1a1aa; font-size: 13px; text-align: center; margin: 0;">
      <a href="https://usethreadkit.com" style="color: #71717a; text-decoration: underline;">ThreadKit</a>
    </p>
  </div>
</body>
</html>"#, code = code);

    let body = serde_json::json!({
        "from": from_email,
        "to": [email],
        "subject": format!("{} - Sign in to ThreadKit", code),
        "html": html
    });

    let response = client
        .post("https://api.resend.com/emails")
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let error = response.text().await.unwrap_or_default();
        tracing::error!("Resend API error: {}", error);
        return Err(error);
    }

    Ok(())
}

/// Helper to send OTP via Twilio
async fn send_otp_sms_twilio(config: &threadkit_common::config::TwilioConfig, phone: &str, code: &str) -> Result<(), String> {
    let client = reqwest::Client::new();

    let url = format!(
        "https://api.twilio.com/2010-04-01/Accounts/{}/Messages.json",
        config.account_sid
    );

    let body = format!("Your login code is: {}", code);

    let response = client
        .post(&url)
        .basic_auth(&config.account_sid, Some(&config.auth_token))
        .form(&[
            ("To", phone),
            ("From", &config.from_number),
            ("Body", &body),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        let error = response.text().await.unwrap_or_default();
        tracing::error!("Twilio API error: {}", error);
        return Err(error);
    }

    Ok(())
}

/// Register a new user
#[utoipa::path(
    post,
    path = "/auth/register",
    tag = "auth",
    request_body = RegisterRequest,
    responses(
        (status = 200, description = "Registration successful", body = AuthResponse),
        (status = 400, description = "Invalid request"),
        (status = 409, description = "Email/phone/username already taken")
    ),
    security(("project_id" = []))
)]
pub async fn register(
    State(state): State<AppState>,
    project_id: ProjectId,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    if req.email.is_none() && req.phone.is_none() {
        return Err((StatusCode::BAD_REQUEST, "Email or phone required".into()));
    }

    // Validate username format
    threadkit_common::validate_username(&req.name)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if !state.redis.is_username_available(&req.name, None).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        return Err((StatusCode::CONFLICT, "Username already taken".into()));
    }

    if let Some(ref email) = req.email {
        if state.redis.get_user_by_email(email).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?.is_some() {
            return Err((StatusCode::CONFLICT, "Email already registered".into()));
        }
    }

    if let Some(ref phone) = req.phone {
        if state.redis.get_user_by_phone(phone).await.map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?.is_some() {
            return Err((StatusCode::CONFLICT, "Phone already registered".into()));
        }
    }

    let password_hash = auth::hash_password(&req.password)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let user_id = Uuid::now_v7();
    let now = Utc::now();

    let provider = if req.email.is_some() {
        AuthProvider::Email
    } else {
        AuthProvider::Phone
    };

    let user = User {
        id: user_id,
        name: req.name,
        email: req.email.clone(),
        phone: req.phone.clone(),
        avatar_url: None,
        provider,
        provider_id: None,
        email_verified: false,
        phone_verified: false,
        karma: 0,
        global_banned: false,
        shadow_banned: false,
        created_at: now,
        username_set: true, // User explicitly chose this username in registration
        social_links: SocialLinks::default(),
    };

    state.redis.set_user(&user).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    state.redis.set_user_username_index(&user.name, user_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    state.redis.set_user_password(user_id, &password_hash).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if let Some(ref email) = req.email {
        state.redis.set_user_email_index(email, user_id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let code = generate_verification_code();
        let verification = VerificationCode {
            code: code.clone(),
            user_id: Some(user_id),
            verification_type: VerificationType::Email,
            created_at: now,
        };
        state.redis.set_verification_code(email, &verification).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        tracing::info!("Verification code for {}: {}", email, code);
    }

    if let Some(ref phone) = req.phone {
        state.redis.set_user_phone_index(phone, user_id).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let code = generate_verification_code();
        let verification = VerificationCode {
            code: code.clone(),
            user_id: Some(user_id),
            verification_type: VerificationType::Phone,
            created_at: now,
        };
        state.redis.set_verification_code(phone, &verification).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        tracing::info!("Verification code for {}: {}", phone, code);
    }

    let session_id = Uuid::now_v7();
    state.redis.create_session(session_id, user_id, "", "").await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = auth::create_token(
        user_id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = auth::create_token(
        user_id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        24 * 365 * 100, // ~100 years - refresh tokens never expire
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse::from(user),
    }))
}

/// Login with email/phone and password
#[utoipa::path(
    post,
    path = "/auth/login",
    tag = "auth",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "Login successful", body = AuthResponse),
        (status = 401, description = "Invalid credentials"),
        (status = 403, description = "Account banned")
    ),
    security(("project_id" = []))
)]
pub async fn login(
    State(state): State<AppState>,
    project_id: ProjectId,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let user_id = if let Some(ref email) = req.email {
        state.redis.get_user_by_email(email).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else if let Some(ref phone) = req.phone {
        state.redis.get_user_by_phone(phone).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    } else {
        None
    };

    let user_id = user_id.ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".into()))?;

    let user = state.redis.get_user(user_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".into()))?;

    // Verify password
    let password_hash = state.redis.get_user_password(user_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".into()))?;

    if !auth::verify_password(&req.password, &password_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))? {
        return Err((StatusCode::UNAUTHORIZED, "Invalid credentials".into()));
    }

    if user.global_banned {
        return Err((StatusCode::FORBIDDEN, "Account banned".into()));
    }

    let session_id = Uuid::now_v7();
    state.redis.create_session(session_id, user_id, "", "").await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = auth::create_token(
        user_id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = auth::create_token(
        user_id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        24 * 365 * 100, // ~100 years - refresh tokens never expire
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse::from(user),
    }))
}

/// Verify email or phone with code
#[utoipa::path(
    post,
    path = "/auth/verify",
    tag = "auth",
    request_body = VerifyRequest,
    responses(
        (status = 200, description = "Verification successful"),
        (status = 400, description = "Invalid or expired code")
    ),
    security(("project_id" = []))
)]
pub async fn verify(
    State(state): State<AppState>,
    _project_id: ProjectId,
    Json(req): Json<VerifyRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let key = req.email.as_ref().or(req.phone.as_ref())
        .ok_or((StatusCode::BAD_REQUEST, "Email or phone required".into()))?;

    let verification = state.redis.get_verification_code(key).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::BAD_REQUEST, "No verification code found".into()))?;

    if verification.code != req.code {
        return Err((StatusCode::BAD_REQUEST, "Invalid verification code".into()));
    }

    if let Some(user_id) = verification.user_id {
        if let Ok(Some(mut user)) = state.redis.get_user(user_id).await {
            if req.email.is_some() {
                user.email_verified = true;
            }
            if req.phone.is_some() {
                user.phone_verified = true;
            }
            let _ = state.redis.set_user(&user).await;
        }
    }

    let _ = state.redis.delete_verification_code(key).await;

    Ok(StatusCode::OK)
}

/// Request password reset code
#[utoipa::path(
    post,
    path = "/auth/forgot",
    tag = "auth",
    request_body = ForgotPasswordRequest,
    responses(
        (status = 200, description = "Reset code sent (if account exists)")
    ),
    security(("project_id" = []))
)]
pub async fn forgot_password(
    State(state): State<AppState>,
    _project_id: ProjectId,
    Json(req): Json<ForgotPasswordRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let key = req.email.as_ref().or(req.phone.as_ref())
        .ok_or((StatusCode::BAD_REQUEST, "Email or phone required".into()))?;

    let user_id = if req.email.is_some() {
        state.redis.get_user_by_email(key).await.ok().flatten()
    } else {
        state.redis.get_user_by_phone(key).await.ok().flatten()
    };

    if let Some(user_id) = user_id {
        let code = generate_verification_code();
        let verification = VerificationCode {
            code: code.clone(),
            user_id: Some(user_id),
            verification_type: VerificationType::PasswordReset,
            created_at: Utc::now(),
        };
        let _ = state.redis.set_verification_code(key, &verification).await;

        tracing::info!("Password reset code for {}: {}", key, code);
    }

    Ok(StatusCode::OK)
}

/// Reset password with code
#[utoipa::path(
    post,
    path = "/auth/reset",
    tag = "auth",
    request_body = ResetPasswordRequest,
    responses(
        (status = 200, description = "Password reset successful"),
        (status = 400, description = "Invalid or expired code")
    ),
    security(("project_id" = []))
)]
pub async fn reset_password(
    State(state): State<AppState>,
    _project_id: ProjectId,
    Json(req): Json<ResetPasswordRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let key = req.email.as_ref().or(req.phone.as_ref())
        .ok_or((StatusCode::BAD_REQUEST, "Email or phone required".into()))?;

    let verification = state.redis.get_verification_code(key).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::BAD_REQUEST, "No reset code found".into()))?;

    if verification.code != req.code {
        return Err((StatusCode::BAD_REQUEST, "Invalid reset code".into()));
    }

    if !matches!(verification.verification_type, VerificationType::PasswordReset) {
        return Err((StatusCode::BAD_REQUEST, "Invalid reset code".into()));
    }

    let password_hash = auth::hash_password(&req.new_password)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Store the new password
    if let Some(user_id) = verification.user_id {
        state.redis.set_user_password(user_id, &password_hash).await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    let _ = state.redis.delete_verification_code(key).await;

    Ok(StatusCode::OK)
}

/// Refresh access token
#[utoipa::path(
    post,
    path = "/auth/refresh",
    tag = "auth",
    request_body = RefreshRequest,
    responses(
        (status = 200, description = "New tokens issued", body = AuthResponse),
        (status = 401, description = "Invalid or expired refresh token")
    ),
    security(("project_id" = []))
)]
pub async fn refresh_token(
    State(state): State<AppState>,
    project_id: ProjectId,
    Json(req): Json<RefreshRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let claims = auth::verify_token(&req.refresh_token, &state.config.jwt_secret)
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid refresh token".into()))?;

    let session_user = state.redis.get_session_user(claims.session_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if session_user != Some(claims.sub) {
        return Err((StatusCode::UNAUTHORIZED, "Session expired".into()));
    }

    let user = state.redis.get_user(claims.sub).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::UNAUTHORIZED, "User not found".into()))?;

    let token = auth::create_token(
        claims.sub,
        project_id.0.site_id,
        claims.session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = auth::create_token(
        claims.sub,
        project_id.0.site_id,
        claims.session_id,
        &state.config.jwt_secret,
        24 * 365 * 100, // ~100 years - refresh tokens never expire
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse::from(user),
    }))
}

/// Logout and invalidate session
#[utoipa::path(
    post,
    path = "/auth/logout",
    tag = "auth",
    responses(
        (status = 200, description = "Logged out successfully"),
        (status = 401, description = "Not authenticated")
    ),
    security(("project_id" = []), ("bearer" = []))
)]
pub async fn logout(
    State(state): State<AppState>,
    _project_id: ProjectId,
    crate::extractors::AuthUser { session_id, .. }: crate::extractors::AuthUser,
) -> Result<StatusCode, (StatusCode, String)> {
    state.redis.delete_session(session_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::OK)
}

/// Start OAuth flow (redirects to provider)
#[utoipa::path(
    get,
    path = "/auth/{provider}",
    tag = "auth",
    params(
        ("provider" = String, Path, description = "OAuth provider (google, github)"),
        OAuthStartQuery
    ),
    responses(
        (status = 302, description = "Redirect to OAuth provider"),
        (status = 400, description = "Invalid API key"),
        (status = 404, description = "Provider not configured")
    )
)]
pub async fn oauth_start(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(query): Query<OAuthStartQuery>,
) -> Result<axum::response::Redirect, (StatusCode, String)> {
    // Look up site by API key (passed as query param since this is a navigation, not fetch)
    let (site_id, _site_config) = state.redis.get_site_by_project_id(&query.project_id).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::BAD_REQUEST, "Invalid API key".into()))?;

    let oauth_config = match provider.as_str() {
        "google" => state.config.oauth.google.as_ref(),
        "github" => state.config.oauth.github.as_ref(),
        _ => None,
    };

    let oauth = oauth_config.ok_or((StatusCode::NOT_FOUND, "Provider not configured".into()))?;

    let auth_url = match provider.as_str() {
        "google" => format!(
            "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile&state={}",
            oauth.client_id,
            urlencoding::encode(&oauth.redirect_url),
            site_id
        ),
        "github" => format!(
            "https://github.com/login/oauth/authorize?client_id={}&redirect_uri={}&scope=read:user%20user:email&state={}",
            oauth.client_id,
            urlencoding::encode(&oauth.redirect_url),
            site_id
        ),
        _ => return Err((StatusCode::NOT_FOUND, "Provider not supported".into())),
    };

    Ok(axum::response::Redirect::temporary(&auth_url))
}

/// Helper to generate error HTML page for OAuth
/// Uses BroadcastChannel for cross-window communication to avoid COOP issues
fn oauth_error_response(error: &str) -> Response {
    let html = format!(
        r#"<!DOCTYPE html>
<html>
<head><title>Authentication Error</title></head>
<body>
<script>
  // Use BroadcastChannel for reliable cross-window communication
  const channel = new BroadcastChannel('threadkit-auth');
  channel.postMessage({{ type: 'threadkit:oauth:error', error: {} }});
  channel.close();

  // Also try postMessage as fallback
  if (window.opener) {{
    try {{
      window.opener.postMessage({{ type: 'threadkit:oauth:error', error: {} }}, '*');
    }} catch (e) {{}}
  }}

  setTimeout(function() {{ window.close(); }}, 100);
</script>
<p>Authentication failed: {}</p>
<p>This window will close automatically...</p>
</body>
</html>"#,
        serde_json::to_string(error).unwrap_or_else(|_| "\"Unknown error\"".to_string()),
        serde_json::to_string(error).unwrap_or_else(|_| "\"Unknown error\"".to_string()),
        error
    );

    (
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        html,
    ).into_response()
}

/// Helper to generate success HTML page for OAuth
/// Uses BroadcastChannel for cross-window communication to avoid COOP issues
fn oauth_success_response(token: &str, refresh_token: &str, user_json: &str) -> Response {
    let html = format!(
        r#"<!DOCTYPE html>
<html>
<head><title>Authentication Successful</title></head>
<body>
<script>
  console.log('[ThreadKit OAuth] Success callback loaded');
  console.log('[ThreadKit OAuth] Token:', {});
  console.log('[ThreadKit OAuth] User:', {});

  // Use BroadcastChannel for reliable cross-window communication (avoids COOP issues)
  try {{
    const channel = new BroadcastChannel('threadkit-auth');
    const message = {{
      type: 'threadkit:oauth:success',
      token: {},
      refresh_token: {},
      user: {}
    }};
    console.log('[ThreadKit OAuth] Sending via BroadcastChannel:', message);
    channel.postMessage(message);
    channel.close();
    console.log('[ThreadKit OAuth] BroadcastChannel message sent');
  }} catch (e) {{
    console.error('[ThreadKit OAuth] BroadcastChannel error:', e);
  }}

  // Also try postMessage as fallback for older browsers
  if (window.opener) {{
    try {{
      console.log('[ThreadKit OAuth] Trying postMessage fallback');
      window.opener.postMessage({{
        type: 'threadkit:oauth:success',
        token: {},
        refresh_token: {},
        user: {}
      }}, '*');
      console.log('[ThreadKit OAuth] postMessage sent');
    }} catch (e) {{
      console.error('[ThreadKit OAuth] postMessage error:', e);
    }}
  }} else {{
    console.log('[ThreadKit OAuth] No window.opener available');
  }}

  // Close immediately
  window.close();
</script>
<p>Authentication successful! This window should close automatically.</p>
</body>
</html>"#,
        serde_json::to_string(token).unwrap(),
        user_json,
        serde_json::to_string(token).unwrap(),
        serde_json::to_string(refresh_token).unwrap(),
        user_json,
        serde_json::to_string(token).unwrap(),
        serde_json::to_string(refresh_token).unwrap(),
        user_json
    );

    (
        [(header::CONTENT_TYPE, "text/html; charset=utf-8")],
        html,
    ).into_response()
}

/// OAuth callback (exchanges code for tokens)
/// Returns an HTML page that posts credentials to the parent window
#[utoipa::path(
    get,
    path = "/auth/{provider}/callback",
    tag = "auth",
    params(
        ("provider" = String, Path, description = "OAuth provider"),
        OAuthCallbackQuery
    ),
    responses(
        (status = 200, description = "OAuth successful - returns HTML that posts to parent window"),
        (status = 400, description = "Invalid OAuth response"),
        (status = 404, description = "Provider not supported")
    )
)]
pub async fn oauth_callback(
    State(state): State<AppState>,
    Path(provider): Path<String>,
    Query(query): Query<OAuthCallbackQuery>,
) -> Response {
    match oauth_callback_inner(state, provider, query).await {
        Ok(response) => response,
        Err(error) => oauth_error_response(&error),
    }
}

async fn oauth_callback_inner(
    state: AppState,
    provider: String,
    query: OAuthCallbackQuery,
) -> Result<Response, String> {
    let oauth_config = match provider.as_str() {
        "google" => state.config.oauth.google.as_ref(),
        "github" => state.config.oauth.github.as_ref(),
        _ => None,
    };

    let oauth = oauth_config.ok_or("Provider not configured")?;

    let client = reqwest::Client::new();

    let (token_url, user_url, auth_provider) = match provider.as_str() {
        "google" => (
            "https://oauth2.googleapis.com/token",
            "https://www.googleapis.com/oauth2/v2/userinfo",
            AuthProvider::Google,
        ),
        "github" => (
            "https://github.com/login/oauth/access_token",
            "https://api.github.com/user",
            AuthProvider::Github,
        ),
        _ => return Err("Provider not supported".into()),
    };

    let token_response = client
        .post(token_url)
        .header("Accept", "application/json")
        .form(&[
            ("client_id", oauth.client_id.as_str()),
            ("client_secret", oauth.client_secret.as_str()),
            ("code", query.code.as_str()),
            ("redirect_uri", oauth.redirect_url.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let token_data: serde_json::Value = token_response.json().await
        .map_err(|e| e.to_string())?;

    let access_token = token_data["access_token"]
        .as_str()
        .ok_or("No access token in response")?;

    let user_response = client
        .get(user_url)
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "ThreadKit")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let user_data: serde_json::Value = user_response.json().await
        .map_err(|e| e.to_string())?;

    // Helper to extract ID whether it's a string or number
    fn extract_id(value: &serde_json::Value) -> String {
        if let Some(s) = value.as_str() {
            s.to_string()
        } else if let Some(n) = value.as_u64() {
            n.to_string()
        } else if let Some(n) = value.as_i64() {
            n.to_string()
        } else if let Some(n) = value.as_f64() {
            // Handle large numbers that may be represented as floats
            format!("{:.0}", n)
        } else {
            String::new()
        }
    }

    let (provider_id, name, email, avatar_url) = match provider.as_str() {
        "google" => (
            extract_id(&user_data["id"]),
            user_data["name"].as_str().unwrap_or("User").to_string(),
            user_data["email"].as_str().map(|s| s.to_string()),
            user_data["picture"].as_str().map(|s| s.to_string()),
        ),
        "github" => (
            extract_id(&user_data["id"]),
            user_data["name"].as_str().or(user_data["login"].as_str()).unwrap_or("User").to_string(),
            user_data["email"].as_str().map(|s| s.to_string()),
            user_data["avatar_url"].as_str().map(|s| s.to_string()),
        ),
        _ => return Err("Provider not supported".into()),
    };

    let existing_user_id = state.redis.get_user_by_provider(&provider, &provider_id).await
        .map_err(|e| e.to_string())?;

    let site_id: Uuid = query.state
        .as_ref()
        .and_then(|s| s.parse().ok())
        .or_else(|| state.config.standalone().map(|s| s.site_id))
        .ok_or("Invalid state")?;

    let user = if let Some(user_id) = existing_user_id {
        state.redis.get_user(user_id).await
            .map_err(|e| e.to_string())?
            .ok_or("User not found")?
    } else {
        let user_id = Uuid::now_v7();
        let now = Utc::now();

        // Normalize the name from OAuth provider for initial username suggestion
        let normalized_name = threadkit_common::normalize_username(&name);
        let display_name = if normalized_name.is_empty() {
            format!("user-{}", &user_id.to_string()[..8])
        } else {
            normalized_name
        };

        let user = User {
            id: user_id,
            name: display_name.clone(),
            email: email.clone(),
            phone: None,
            avatar_url,
            provider: auth_provider,
            provider_id: Some(provider_id.clone()),
            email_verified: email.is_some(),
            phone_verified: false,
            karma: 0,
            global_banned: false,
            shadow_banned: false,
            created_at: now,
            username_set: false, // New users must confirm their username
            social_links: SocialLinks::default(),
        };

        state.redis.set_user(&user).await
            .map_err(|e| e.to_string())?;

        let final_name = if state.redis.is_username_available(&user.name, None).await.unwrap_or(false) {
            user.name.clone()
        } else {
            format!("{}-{}", user.name, &user_id.to_string()[..8])
        };
        state.redis.set_user_username_index(&final_name, user_id).await
            .map_err(|e| e.to_string())?;

        state.redis.set_user_provider_index(&provider, &provider_id, user_id).await
            .map_err(|e| e.to_string())?;

        if let Some(ref email) = email {
            let _ = state.redis.set_user_email_index(email, user_id).await;
        }

        // Update user with final name if it changed
        if final_name != user.name {
            let mut updated_user = user.clone();
            updated_user.name = final_name;
            state.redis.set_user(&updated_user).await
                .map_err(|e| e.to_string())?;
            updated_user
        } else {
            user
        }
    };

    let session_id = Uuid::now_v7();
    state.redis.create_session(session_id, user.id, "", "").await
        .map_err(|e| e.to_string())?;

    let token = auth::create_token(
        user.id,
        site_id,
        session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| e.to_string())?;

    let refresh_token = auth::create_token(
        user.id,
        site_id,
        session_id,
        &state.config.jwt_secret,
        24 * 365 * 100, // ~100 years - refresh tokens never expire
    )
    .map_err(|e| e.to_string())?;

    // Build user JSON for postMessage
    let user_response = UserResponse::from(user);
    let user_json = serde_json::to_string(&user_response).map_err(|e| e.to_string())?;

    // Return HTML that posts credentials to parent window with COOP headers
    Ok(oauth_success_response(&token, &refresh_token, &user_json))
}

// ============================================================================
// Web3 Ethereum Handlers
// ============================================================================

/// Get a nonce for Ethereum wallet authentication
#[utoipa::path(
    get,
    path = "/auth/ethereum/nonce",
    tag = "auth",
    params(Web3NonceQuery),
    responses(
        (status = 200, description = "Nonce generated", body = NonceResponse),
        (status = 400, description = "Invalid address format")
    ),
    security(("project_id" = []))
)]
pub async fn ethereum_nonce(
    State(state): State<AppState>,
    _project_id: ProjectId,
    Query(query): Query<Web3NonceQuery>,
) -> Result<Json<NonceResponse>, (StatusCode, String)> {
    let nonce_data = web3::generate_ethereum_nonce(&query.address)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Store nonce in Redis
    state
        .redis
        .set_web3_nonce("ethereum", &query.address, &nonce_data.nonce)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(NonceResponse {
        nonce: nonce_data.nonce,
        message: nonce_data.message,
        issued_at: nonce_data.issued_at.to_rfc3339(),
        expiration_time: nonce_data.expiration.to_rfc3339(),
    }))
}

/// Verify Ethereum wallet signature and authenticate
#[utoipa::path(
    post,
    path = "/auth/ethereum/verify",
    tag = "auth",
    request_body = Web3VerifyRequest,
    responses(
        (status = 200, description = "Authentication successful", body = AuthResponse),
        (status = 400, description = "Invalid signature or expired nonce"),
        (status = 401, description = "Signature verification failed")
    ),
    security(("project_id" = []))
)]
pub async fn ethereum_verify(
    State(state): State<AppState>,
    project_id: ProjectId,
    Json(req): Json<Web3VerifyRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    // Validate address format
    let address = web3::validate_ethereum_address(&req.address)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Get stored nonce
    let stored_nonce = state
        .redis
        .get_web3_nonce("ethereum", &address)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::BAD_REQUEST, "Nonce not found or expired".into()))?;

    // Verify nonce is in the message
    if !req.message.contains(&stored_nonce) {
        return Err((StatusCode::BAD_REQUEST, "Invalid nonce in message".into()));
    }

    // Verify signature
    let is_valid = web3::verify_ethereum_signature(&address, &req.message, &req.signature)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if !is_valid {
        return Err((StatusCode::UNAUTHORIZED, "Invalid signature".into()));
    }

    // Delete used nonce
    let _ = state.redis.delete_web3_nonce("ethereum", &address).await;

    // Get or create user
    let user = get_or_create_web3_user(&state, "ethereum", &address, AuthProvider::Ethereum).await?;

    // Create session and tokens
    let session_id = Uuid::now_v7();
    state
        .redis
        .create_session(session_id, user.id, "", "")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = auth::create_token(
        user.id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = auth::create_token(
        user.id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        24 * 365 * 100,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse::from(user),
    }))
}

// ============================================================================
// Web3 Solana Handlers
// ============================================================================

/// Get a nonce for Solana wallet authentication
#[utoipa::path(
    get,
    path = "/auth/solana/nonce",
    tag = "auth",
    params(Web3NonceQuery),
    responses(
        (status = 200, description = "Nonce generated", body = NonceResponse),
        (status = 400, description = "Invalid address format")
    ),
    security(("project_id" = []))
)]
pub async fn solana_nonce(
    State(state): State<AppState>,
    _project_id: ProjectId,
    Query(query): Query<Web3NonceQuery>,
) -> Result<Json<NonceResponse>, (StatusCode, String)> {
    let nonce_data = web3::generate_solana_nonce(&query.address)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Store nonce in Redis
    state
        .redis
        .set_web3_nonce("solana", &query.address, &nonce_data.nonce)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(NonceResponse {
        nonce: nonce_data.nonce,
        message: nonce_data.message,
        issued_at: nonce_data.issued_at.to_rfc3339(),
        expiration_time: nonce_data.expiration.to_rfc3339(),
    }))
}

/// Verify Solana wallet signature and authenticate
#[utoipa::path(
    post,
    path = "/auth/solana/verify",
    tag = "auth",
    request_body = Web3VerifyRequest,
    responses(
        (status = 200, description = "Authentication successful", body = AuthResponse),
        (status = 400, description = "Invalid signature or expired nonce"),
        (status = 401, description = "Signature verification failed")
    ),
    security(("project_id" = []))
)]
pub async fn solana_verify(
    State(state): State<AppState>,
    project_id: ProjectId,
    Json(req): Json<Web3VerifyRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    // Validate address format
    let address = web3::validate_solana_address(&req.address)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    // Get stored nonce
    let stored_nonce = state
        .redis
        .get_web3_nonce("solana", &address)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::BAD_REQUEST, "Nonce not found or expired".into()))?;

    // Verify nonce is in the message
    if !req.message.contains(&stored_nonce) {
        return Err((StatusCode::BAD_REQUEST, "Invalid nonce in message".into()));
    }

    // Verify signature
    let is_valid = web3::verify_solana_signature(&address, &req.message, &req.signature)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    if !is_valid {
        return Err((StatusCode::UNAUTHORIZED, "Invalid signature".into()));
    }

    // Delete used nonce
    let _ = state.redis.delete_web3_nonce("solana", &address).await;

    // Get or create user
    let user = get_or_create_web3_user(&state, "solana", &address, AuthProvider::Solana).await?;

    // Create session and tokens
    let session_id = Uuid::now_v7();
    state
        .redis
        .create_session(session_id, user.id, "", "")
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = auth::create_token(
        user.id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let refresh_token = auth::create_token(
        user.id,
        project_id.0.site_id,
        session_id,
        &state.config.jwt_secret,
        24 * 365 * 100,
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        refresh_token,
        user: UserResponse::from(user),
    }))
}

// ============================================================================
// Web3 Helpers
// ============================================================================

/// Get existing user by wallet or create a new one
async fn get_or_create_web3_user(
    state: &AppState,
    chain: &str,
    address: &str,
    provider: AuthProvider,
) -> Result<User, (StatusCode, String)> {
    // Check if user exists
    if let Some(user_id) = state
        .redis
        .get_user_by_wallet(chain, address)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    {
        return state
            .redis
            .get_user(user_id)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::INTERNAL_SERVER_ERROR, "User not found".into()));
    }

    // Create new user
    let user_id = Uuid::now_v7();
    let now = Utc::now();

    // Generate display name from address (e.g. "0x1234...5678")
    let display_name = web3::truncate_address(address, 6, 4);

    let user = User {
        id: user_id,
        name: display_name.clone(),
        email: None,
        phone: None,
        avatar_url: None,
        provider,
        provider_id: Some(address.to_lowercase()),
        email_verified: false,
        phone_verified: false,
        karma: 0,
        global_banned: false,
        shadow_banned: false,
        created_at: now,
        username_set: false, // Web3 users need to choose a proper username
        social_links: SocialLinks::default(),
    };

    state
        .redis
        .set_user(&user)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Index by wallet address
    state
        .redis
        .set_user_wallet_index(chain, address, user_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // Try to set username index (may fail if not unique, but that's ok for web3 users)
    let _ = state
        .redis
        .set_user_username_index(&display_name, user_id)
        .await;

    Ok(user)
}
