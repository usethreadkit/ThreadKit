use serde::Deserialize;
use std::env;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct Config {
    pub mode: Mode,
    pub redis_url: String,
    pub http_host: String,
    pub http_port: u16,
    pub ws_host: String,
    pub ws_port: u16,
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub oauth: OAuthConfig,
    pub rate_limit: RateLimitConfig,
    pub content_moderation: ContentModerationConfig,
    pub email: EmailConfig,
    pub sms: SmsConfig,
    pub turnstile: TurnstileConfig,
    /// Maximum comment length in characters
    pub max_comment_length: usize,
    /// Allow localhost/127.0.0.1/::1 origins for API requests (development only)
    pub allow_localhost_origin: bool,
}

/// Configuration for Cloudflare Turnstile bot protection
#[derive(Debug, Clone, Default)]
pub struct TurnstileConfig {
    /// Turnstile secret key (from Cloudflare dashboard)
    pub secret_key: Option<String>,
}

/// Configuration for email sending
#[derive(Debug, Clone, Default)]
pub struct EmailConfig {
    /// Email provider (currently only "resend" is supported)
    pub provider: Option<EmailProvider>,
}

#[derive(Debug, Clone)]
pub enum EmailProvider {
    Resend(ResendConfig),
}

#[derive(Debug, Clone)]
pub struct ResendConfig {
    pub api_key: String,
    pub from_email: String,
}

/// Configuration for SMS sending
#[derive(Debug, Clone, Default)]
pub struct SmsConfig {
    /// SMS provider (currently only "twilio" is supported)
    pub provider: Option<SmsProvider>,
}

#[derive(Debug, Clone)]
pub enum SmsProvider {
    Twilio(TwilioConfig),
}

#[derive(Debug, Clone)]
pub struct TwilioConfig {
    pub account_sid: String,
    pub auth_token: String,
    pub from_number: String,
}

/// Configuration for AI-powered content moderation (OpenAI-compatible API)
#[derive(Debug, Clone, Default)]
pub struct ContentModerationConfig {
    /// Enable content moderation globally
    pub enabled: bool,
    /// OpenAI-compatible API URL (e.g., https://api.groq.com/openai/v1)
    pub api_url: Option<String>,
    /// API key for the moderation service
    pub api_key: Option<String>,
    /// Model to use for moderation (e.g., gpt-oss-safeguard-20b)
    pub model: Option<String>,
    /// Request timeout in seconds
    pub timeout_seconds: u64,
}

#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Enable rate limiting globally
    pub enabled: bool,
    /// Requests per minute per IP for write operations
    pub ip_writes_per_minute: u32,
    /// Requests per minute per IP for read operations
    pub ip_reads_per_minute: u32,
    /// Requests per minute per API key for write operations
    pub api_key_writes_per_minute: u32,
    /// Requests per minute per API key for read operations
    pub api_key_reads_per_minute: u32,
    /// Requests per minute per user for write operations
    pub user_writes_per_minute: u32,
    /// Requests per minute per user for read operations
    pub user_reads_per_minute: u32,
    /// Auth attempts (login/register) per IP per hour
    pub auth_attempts_per_hour: u32,
    /// OTP sends per email/phone per hour (to prevent abuse of paid services)
    pub otp_per_target_per_hour: u32,
    /// OTP sends per IP per hour (to prevent mass enumeration)
    pub otp_per_ip_per_hour: u32,
    /// Trusted proxy IPs for X-Forwarded-For
    pub trusted_proxies: Vec<String>,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            ip_writes_per_minute: 5,
            ip_reads_per_minute: 30,
            api_key_writes_per_minute: 100,
            api_key_reads_per_minute: 500,
            user_writes_per_minute: 5,
            user_reads_per_minute: 30,
            auth_attempts_per_hour: 10,
            otp_per_target_per_hour: 3,  // Max 3 OTPs per email/phone per hour
            otp_per_ip_per_hour: 10,     // Max 10 OTPs per IP per hour
            trusted_proxies: vec!["127.0.0.1".to_string(), "::1".to_string()],
        }
    }
}

#[derive(Debug, Clone)]
pub enum Mode {
    Standalone(StandaloneConfig),
    Saas,
}

#[derive(Debug, Clone)]
pub struct StandaloneConfig {
    pub site_id: Uuid,
    pub api_key_public: String,
    pub api_key_secret: String,
    pub site_name: String,
    pub site_domain: String,
    pub moderation_mode: ModerationMode,
    /// Additional allowed origins beyond the primary domain
    /// Supports wildcards like "*.example.com" for subdomains
    pub allowed_origins: Vec<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModerationMode {
    #[default]
    None,
    Pre,
    Post,
}

#[derive(Debug, Clone, Default)]
pub struct OAuthConfig {
    pub google: Option<OAuthProvider>,
    pub github: Option<OAuthProvider>,
}

#[derive(Debug, Clone)]
pub struct OAuthProvider {
    pub client_id: String,
    pub client_secret: String,
    pub redirect_url: String,
}

impl Config {
    /// Load configuration from default .env file
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok();
        Self::load_from_env()
    }

    /// Load configuration from a specific .env file
    pub fn from_env_file(path: &str) -> anyhow::Result<Self> {
        dotenvy::from_filename(path)?;
        Self::load_from_env()
    }

    fn load_from_env() -> anyhow::Result<Self> {

        let mode = match env::var("MODE").unwrap_or_else(|_| "standalone".to_string()).as_str() {
            "saas" => Mode::Saas,
            _ => Mode::Standalone(StandaloneConfig {
                site_id: env::var("SITE_ID")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or_else(Uuid::now_v7),
                api_key_public: env::var("API_KEY_PUBLIC")
                    .unwrap_or_else(|_| format!("tk_pub_{}", generate_key())),
                api_key_secret: env::var("API_KEY_SECRET")
                    .unwrap_or_else(|_| format!("tk_sec_{}", generate_key())),
                site_name: env::var("SITE_NAME").unwrap_or_else(|_| "My Site".to_string()),
                site_domain: env::var("SITE_DOMAIN").unwrap_or_else(|_| "localhost".to_string()),
                moderation_mode: match env::var("MODERATION_MODE")
                    .unwrap_or_default()
                    .as_str()
                {
                    "pre" => ModerationMode::Pre,
                    "post" => ModerationMode::Post,
                    _ => ModerationMode::None,
                },
                allowed_origins: env::var("ALLOWED_ORIGINS")
                    .map(|s| s.split(',').map(|o| o.trim().to_string()).filter(|o| !o.is_empty()).collect())
                    .unwrap_or_default(),
            }),
        };

        let oauth = OAuthConfig {
            google: Self::load_oauth_provider("GOOGLE"),
            github: Self::load_oauth_provider("GITHUB"),
        };

        let rate_limit = RateLimitConfig {
            enabled: env::var("RATE_LIMIT_ENABLED")
                .map(|v| v != "false" && v != "0")
                .unwrap_or(true),
            ip_writes_per_minute: env::var("RATE_LIMIT_IP_WRITES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5),
            ip_reads_per_minute: env::var("RATE_LIMIT_IP_READS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
            api_key_writes_per_minute: env::var("RATE_LIMIT_APIKEY_WRITES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(100),
            api_key_reads_per_minute: env::var("RATE_LIMIT_APIKEY_READS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(500),
            user_writes_per_minute: env::var("RATE_LIMIT_USER_WRITES")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(5),
            user_reads_per_minute: env::var("RATE_LIMIT_USER_READS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
            auth_attempts_per_hour: env::var("RATE_LIMIT_AUTH_ATTEMPTS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            otp_per_target_per_hour: env::var("RATE_LIMIT_OTP_PER_TARGET")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(3),
            otp_per_ip_per_hour: env::var("RATE_LIMIT_OTP_PER_IP")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            trusted_proxies: env::var("TRUSTED_PROXIES")
                .map(|s| s.split(',').map(|p| p.trim().to_string()).collect())
                .unwrap_or_else(|_| vec!["127.0.0.1".to_string(), "::1".to_string()]),
        };

        let content_moderation = ContentModerationConfig {
            enabled: env::var("MODERATION_ENABLED")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false),
            api_url: env::var("MODERATION_API_URL").ok(),
            api_key: env::var("MODERATION_API_KEY").ok(),
            model: env::var("MODERATION_MODEL").ok(),
            timeout_seconds: env::var("MODERATION_TIMEOUT_SECONDS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
        };

        let email = EmailConfig {
            provider: Self::load_email_provider(),
        };

        let sms = SmsConfig {
            provider: Self::load_sms_provider(),
        };

        let turnstile = TurnstileConfig {
            secret_key: env::var("TURNSTILE_SECRET_KEY").ok().filter(|s| !s.is_empty()),
        };

        Ok(Config {
            mode,
            redis_url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            http_host: env::var("HTTP_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            http_port: env::var("HTTP_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8080),
            ws_host: env::var("WS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            ws_port: env::var("WS_PORT")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(8081),
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| {
                tracing::warn!("JWT_SECRET not set, using random secret (tokens won't persist across restarts)");
                generate_key()
            }),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(24 * 7), // 1 week default
            oauth,
            rate_limit,
            content_moderation,
            email,
            sms,
            turnstile,
            max_comment_length: env::var("MAX_COMMENT_LENGTH")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10_000),
            allow_localhost_origin: env::var("ALLOW_LOCALHOST_ORIGIN")
                .map(|v| v == "true" || v == "1")
                .unwrap_or(false),
        })
    }

    fn load_oauth_provider(prefix: &str) -> Option<OAuthProvider> {
        let client_id = env::var(format!("OAUTH_{}_CLIENT_ID", prefix)).ok()?;
        let client_secret = env::var(format!("OAUTH_{}_CLIENT_SECRET", prefix)).ok()?;
        let redirect_url = env::var(format!("OAUTH_{}_REDIRECT_URL", prefix)).ok()?;

        Some(OAuthProvider {
            client_id,
            client_secret,
            redirect_url,
        })
    }

    fn load_email_provider() -> Option<EmailProvider> {
        let provider = env::var("EMAIL_PROVIDER").unwrap_or_default();

        match provider.to_lowercase().as_str() {
            "resend" => {
                let api_key = env::var("RESEND_API_KEY").ok()?;
                let from_email = env::var("RESEND_FROM_EMAIL")
                    .unwrap_or_else(|_| "noreply@usethreadkit.com".to_string());

                Some(EmailProvider::Resend(ResendConfig {
                    api_key,
                    from_email,
                }))
            }
            _ => None,
        }
    }

    fn load_sms_provider() -> Option<SmsProvider> {
        let provider = env::var("SMS_PROVIDER").unwrap_or_default();

        match provider.to_lowercase().as_str() {
            "twilio" => {
                let account_sid = env::var("TWILIO_ACCOUNT_SID").ok()?;
                let auth_token = env::var("TWILIO_AUTH_TOKEN").ok()?;
                let from_number = env::var("TWILIO_FROM_NUMBER").ok()?;

                Some(SmsProvider::Twilio(TwilioConfig {
                    account_sid,
                    auth_token,
                    from_number,
                }))
            }
            _ => None,
        }
    }

    pub fn is_standalone(&self) -> bool {
        matches!(self.mode, Mode::Standalone(_))
    }

    pub fn standalone(&self) -> Option<&StandaloneConfig> {
        match &self.mode {
            Mode::Standalone(c) => Some(c),
            _ => None,
        }
    }
}

fn generate_key() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    (0..32)
        .map(|_| {
            let idx = rng.gen_range(0..36);
            if idx < 10 {
                (b'0' + idx) as char
            } else {
                (b'a' + idx - 10) as char
            }
        })
        .collect()
}
