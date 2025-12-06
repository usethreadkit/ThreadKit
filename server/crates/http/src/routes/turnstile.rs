use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Html,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::{extractors::ApiKey, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/turnstile/challenge", get(challenge_page))
        .route("/turnstile/verify", post(verify_token))
        .route("/turnstile/config", get(get_config))
}

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ChallengeQuery {
    /// Site key to use for the widget (passed from client)
    pub site_key: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct VerifyRequest {
    /// The token from Turnstile widget
    pub token: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct VerifyResponse {
    /// Whether the verification was successful
    pub success: bool,
    /// Error codes if verification failed
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub error_codes: Vec<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TurnstileConfigResponse {
    /// Whether Turnstile is enabled for this site
    pub enabled: bool,
    /// When Turnstile is required
    pub enforce_on: String,
    /// Whether the server has Turnstile configured (has secret key)
    pub server_configured: bool,
}

// ============================================================================
// Handlers
// ============================================================================

/// Get Turnstile configuration for this site
#[utoipa::path(
    get,
    path = "/turnstile/config",
    tag = "turnstile",
    responses(
        (status = 200, description = "Turnstile configuration", body = TurnstileConfigResponse)
    ),
    security(("api_key" = []))
)]
pub async fn get_config(
    State(state): State<AppState>,
    api_key: ApiKey,
) -> Json<TurnstileConfigResponse> {
    let settings = &api_key.0.settings.turnstile;

    Json(TurnstileConfigResponse {
        enabled: settings.enabled,
        enforce_on: format!("{:?}", settings.enforce_on).to_lowercase(),
        server_configured: state.config.turnstile.secret_key.is_some(),
    })
}

/// Serve the Turnstile challenge page (opened in popup)
///
/// This page loads the Cloudflare Turnstile widget and sends the token
/// back to the parent window via postMessage when complete.
#[utoipa::path(
    get,
    path = "/turnstile/challenge",
    tag = "turnstile",
    responses(
        (status = 200, description = "HTML page with Turnstile widget"),
        (status = 503, description = "Turnstile not configured")
    )
)]
pub async fn challenge_page(
    State(_state): State<AppState>,
    Query(query): Query<ChallengeQuery>,
) -> Result<Html<String>, (StatusCode, String)> {
    let site_key = query.site_key
        .ok_or((StatusCode::BAD_REQUEST, "site_key query parameter required".into()))?;

    // Return HTML page with Turnstile widget
    let html = format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification</title>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f5f5f5;
            padding: 20px;
        }}
        .container {{
            background: white;
            padding: 32px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }}
        h1 {{
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #1a1a1a;
        }}
        p {{
            color: #666;
            margin-bottom: 24px;
            font-size: 14px;
        }}
        .turnstile-container {{
            display: flex;
            justify-content: center;
            min-height: 65px;
        }}
        .status {{
            margin-top: 16px;
            font-size: 14px;
            color: #666;
        }}
        .status.success {{
            color: #22c55e;
        }}
        .status.error {{
            color: #ef4444;
        }}
        .close-hint {{
            margin-top: 12px;
            font-size: 12px;
            color: #999;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Quick verification</h1>
        <p>Please complete the check below to continue</p>

        <div class="turnstile-container">
            <div
                class="cf-turnstile"
                data-sitekey="{site_key}"
                data-callback="onSuccess"
                data-error-callback="onError"
                data-theme="light"
            ></div>
        </div>

        <div id="status" class="status"></div>
        <div id="close-hint" class="close-hint" style="display: none;">
            This window will close automatically...
        </div>
    </div>

    <script>
        function onSuccess(token) {{
            const status = document.getElementById('status');
            const closeHint = document.getElementById('close-hint');

            status.textContent = 'Verified!';
            status.className = 'status success';
            closeHint.style.display = 'block';

            // Send token to parent window
            if (window.opener) {{
                window.opener.postMessage({{
                    type: 'threadkit:turnstile:success',
                    token: token
                }}, '*');

                // Close popup after short delay
                setTimeout(() => window.close(), 500);
            }} else {{
                status.textContent = 'Verified! You can close this window.';
            }}
        }}

        function onError(error) {{
            const status = document.getElementById('status');
            status.textContent = 'Verification failed. Please try again.';
            status.className = 'status error';

            if (window.opener) {{
                window.opener.postMessage({{
                    type: 'threadkit:turnstile:error',
                    error: error || 'Unknown error'
                }}, '*');
            }}
        }}

        // Handle page close without completion
        window.addEventListener('beforeunload', () => {{
            if (window.opener) {{
                window.opener.postMessage({{
                    type: 'threadkit:turnstile:cancelled'
                }}, '*');
            }}
        }});
    </script>
</body>
</html>"#);

    Ok(Html(html))
}

/// Verify a Turnstile token server-side
///
/// This endpoint verifies the token with Cloudflare's API.
/// Used by the server when processing comment submissions.
#[utoipa::path(
    post,
    path = "/turnstile/verify",
    tag = "turnstile",
    request_body = VerifyRequest,
    responses(
        (status = 200, description = "Verification result", body = VerifyResponse),
        (status = 503, description = "Turnstile not configured")
    ),
    security(("api_key" = []))
)]
pub async fn verify_token(
    State(state): State<AppState>,
    _api_key: ApiKey,
    headers: axum::http::HeaderMap,
    Json(req): Json<VerifyRequest>,
) -> Result<Json<VerifyResponse>, (StatusCode, String)> {
    let secret_key = state.config.turnstile.secret_key.as_ref()
        .ok_or((StatusCode::SERVICE_UNAVAILABLE, "Turnstile not configured".into()))?;

    // Get client IP for additional verification
    let client_ip = headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string());

    // Verify with Cloudflare
    let result = verify_with_cloudflare(secret_key, &req.token, client_ip.as_deref()).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    Ok(Json(result))
}

/// Verify a token with Cloudflare's siteverify API
pub async fn verify_with_cloudflare(
    secret_key: &str,
    token: &str,
    remote_ip: Option<&str>,
) -> Result<VerifyResponse, String> {
    let client = reqwest::Client::new();

    let mut form = vec![
        ("secret", secret_key),
        ("response", token),
    ];

    if let Some(ip) = remote_ip {
        form.push(("remoteip", ip));
    }

    let response = client
        .post("https://challenges.cloudflare.com/turnstile/v0/siteverify")
        .form(&form)
        .send()
        .await
        .map_err(|e| format!("Failed to contact Cloudflare: {}", e))?;

    let body: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse Cloudflare response: {}", e))?;

    let success = body["success"].as_bool().unwrap_or(false);
    let error_codes = body["error-codes"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    Ok(VerifyResponse {
        success,
        error_codes,
    })
}
