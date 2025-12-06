use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

// ============================================================================
// User Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub avatar_url: Option<String>,
    pub provider: AuthProvider,
    pub provider_id: Option<String>,
    pub email_verified: bool,
    pub phone_verified: bool,
    pub karma: i64,
    pub global_banned: bool,
    pub shadow_banned: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AuthProvider {
    Email,
    Phone,
    Google,
    Github,
    Anonymous,
    Ethereum,
    Solana,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UserPublic {
    pub id: Uuid,
    pub name: String,
    pub avatar_url: Option<String>,
    pub karma: i64,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        UserPublic {
            id: user.id,
            name: user.name,
            avatar_url: user.avatar_url,
            karma: user.karma,
            created_at: user.created_at,
        }
    }
}

// ============================================================================
// Comment Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Comment {
    pub id: Uuid,
    pub site_id: Uuid,
    pub page_id: Uuid,
    pub page_url: String,
    pub author_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub content: String,
    pub content_html: String,
    pub upvotes: i64,
    pub downvotes: i64,
    pub reply_count: i64,
    pub depth: u32,
    pub status: CommentStatus,
    pub edited: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum CommentStatus {
    Pending,
    Approved,
    Rejected,
    Deleted,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CommentWithAuthor {
    #[serde(flatten)]
    pub comment: Comment,
    pub author: UserPublic,
    pub user_vote: Option<VoteDirection>,
}

// ============================================================================
// Vote Types
// ============================================================================

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum VoteDirection {
    Up,
    Down,
}

// ============================================================================
// Site Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteConfig {
    pub id: Uuid,
    pub name: String,
    pub domain: String,
    pub api_key_public: String,
    pub api_key_secret: String,
    pub settings: SiteSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SiteSettings {
    pub moderation_mode: ModerationMode,
    pub auth: AuthSettings,
    pub display: DisplaySettings,
    pub require_verification: bool,
    pub auto_approve_verified: bool,
    pub rate_limits: SiteRateLimitSettings,
    pub content_moderation: ContentModerationSettings,
    pub turnstile: TurnstileSettings,
    /// Allowed origins for API key validation (checked against Referer/Origin headers)
    /// If empty, only the site's primary domain is allowed
    /// Supports wildcards like "*.example.com" for subdomains
    #[serde(default)]
    pub allowed_origins: Vec<String>,
    /// When true, new comments are disabled site-wide
    #[serde(default)]
    pub posting_disabled: bool,
}

/// Per-site Cloudflare Turnstile bot protection settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TurnstileSettings {
    /// Enable Turnstile protection for this site
    pub enabled: bool,
    /// When to require Turnstile verification
    pub enforce_on: TurnstileEnforcement,
    /// Cache successful verifications per user session (in seconds, 0 = no caching)
    #[serde(default)]
    pub cache_duration_seconds: u32,
}

impl Default for TurnstileSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            enforce_on: TurnstileEnforcement::Anonymous,
            cache_duration_seconds: 0,
        }
    }
}

/// When to require Turnstile verification
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TurnstileEnforcement {
    /// Require for all comment submissions
    All,
    /// Only require for anonymous/guest users
    #[default]
    Anonymous,
    /// Only require for users without verified email/phone
    Unverified,
    /// Never require (disabled)
    None,
}

/// Per-site AI content moderation settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentModerationSettings {
    /// Enable AI content moderation for this site
    pub enabled: bool,
    /// Minimum confidence threshold (0.0-1.0) to flag content
    pub confidence_threshold: f32,
    /// Which categories to block (if flagged above threshold)
    pub blocked_categories: BlockedCategories,
    /// Action to take when content is flagged
    pub action: ModerationAction,
}

impl Default for ContentModerationSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            confidence_threshold: 0.7,
            blocked_categories: BlockedCategories::default(),
            action: ModerationAction::Reject,
        }
    }
}

/// Categories that can be blocked by content moderation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockedCategories {
    pub hate_speech: bool,
    pub harassment: bool,
    pub sexual_content: bool,
    pub violence: bool,
    pub self_harm: bool,
    pub spam: bool,
    pub illegal_activity: bool,
}

impl Default for BlockedCategories {
    fn default() -> Self {
        Self {
            hate_speech: true,
            harassment: true,
            sexual_content: true,
            violence: true,
            self_harm: true,
            spam: true,
            illegal_activity: true,
        }
    }
}

/// Action to take when content is flagged
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ModerationAction {
    /// Reject the content outright
    #[default]
    Reject,
    /// Put in moderation queue for human review
    Queue,
    /// Allow but flag for review
    Flag,
}

/// Per-site rate limit overrides (None = use global defaults)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SiteRateLimitSettings {
    /// Override IP writes per minute
    pub ip_writes_per_minute: Option<u32>,
    /// Override IP reads per minute
    pub ip_reads_per_minute: Option<u32>,
    /// Override user writes per minute
    pub user_writes_per_minute: Option<u32>,
    /// Override user reads per minute
    pub user_reads_per_minute: Option<u32>,
    /// Override auth attempts per hour
    pub auth_attempts_per_hour: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ModerationMode {
    #[default]
    None,
    Pre,
    Post,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthSettings {
    pub google: bool,
    pub github: bool,
    pub email: bool,
    pub phone: bool,
    pub anonymous: bool,
    pub ethereum: bool,
    pub solana: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplaySettings {
    pub show_pageviews: bool,
    pub show_vote_counts: bool,
    pub default_sort: SortOrder,
}

impl Default for DisplaySettings {
    fn default() -> Self {
        DisplaySettings {
            show_pageviews: true,
            show_vote_counts: true,
            default_sort: SortOrder::New,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default, PartialEq, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum SortOrder {
    #[default]
    New,
    Top,
    Hot,
}

// ============================================================================
// Role Types
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub enum Role {
    Blocked = 0,
    User = 1,
    Moderator = 2,
    Admin = 3,
    Owner = 4,
}

// ============================================================================
// Notification Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Notification {
    pub id: Uuid,
    pub notification_type: NotificationType,
    pub comment_id: Uuid,
    pub from_user_id: Uuid,
    pub read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum NotificationType {
    Reply,
    Mention,
    Upvote,
    ModAction,
}

// ============================================================================
// Verification Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationCode {
    pub code: String,
    pub user_id: Option<Uuid>,
    pub verification_type: VerificationType,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum VerificationType {
    Email,
    Phone,
    PasswordReset,
}

// ============================================================================
// Report Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct Report {
    pub comment_id: Uuid,
    pub reporter_id: Uuid,
    pub reason: ReportReason,
    pub details: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum ReportReason {
    Spam,
    Harassment,
    HateSpeech,
    Misinformation,
    Other,
}

// ============================================================================
// API Key Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyInfo {
    pub site_id: Uuid,
    pub key_type: ApiKeyType,
    pub settings: SiteSettings,
    /// Primary domain for this site (used for origin validation)
    pub domain: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ApiKeyType {
    Public,
    Secret,
}

// ============================================================================
// Account Deletion Types
// ============================================================================

#[derive(Debug, Default, Clone, Serialize, ToSchema)]
pub struct DeletedAccountStats {
    pub comments_deleted: i64,
    pub votes_deleted: i64,
}

// ============================================================================
// Content Moderation Types
// ============================================================================

/// Result of content moderation check
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModerationResult {
    /// Whether the content was flagged
    pub flagged: bool,
    /// Categories that were flagged with their confidence scores
    pub categories: ModerationCategories,
    /// Reason for flagging (if any)
    pub reason: Option<String>,
}

/// Moderation category scores (0.0-1.0 confidence)
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ModerationCategories {
    pub hate_speech: f32,
    pub harassment: f32,
    pub sexual_content: f32,
    pub violence: f32,
    pub self_harm: f32,
    pub spam: f32,
    pub illegal_activity: f32,
}

impl ModerationCategories {
    /// Check if any category exceeds threshold based on blocked categories config
    pub fn is_blocked(&self, threshold: f32, blocked: &BlockedCategories) -> Option<String> {
        if blocked.hate_speech && self.hate_speech >= threshold {
            return Some("hate_speech".to_string());
        }
        if blocked.harassment && self.harassment >= threshold {
            return Some("harassment".to_string());
        }
        if blocked.sexual_content && self.sexual_content >= threshold {
            return Some("sexual_content".to_string());
        }
        if blocked.violence && self.violence >= threshold {
            return Some("violence".to_string());
        }
        if blocked.self_harm && self.self_harm >= threshold {
            return Some("self_harm".to_string());
        }
        if blocked.spam && self.spam >= threshold {
            return Some("spam".to_string());
        }
        if blocked.illegal_activity && self.illegal_activity >= threshold {
            return Some("illegal_activity".to_string());
        }
        None
    }
}
