use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

// ============================================================================
// User Types
// ============================================================================

/// Social media links for a user's profile
#[derive(Debug, Clone, Default, Serialize, Deserialize, ToSchema)]
pub struct SocialLinks {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub twitter: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub github: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub facebook: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub whatsapp: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub telegram: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instagram: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tiktok: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub snapchat: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub discord: Option<String>,
}

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
    /// Whether the user has explicitly chosen their username.
    /// False for OAuth users who were assigned a name from their provider.
    #[serde(default = "default_username_set")]
    pub username_set: bool,
    /// Social media links
    #[serde(default)]
    pub social_links: SocialLinks,
}

fn default_username_set() -> bool {
    true // Default to true for backwards compatibility with existing users
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub social_links: Option<SocialLinks>,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        // Only include social_links if at least one field is set
        let has_social_links = user.social_links.twitter.is_some()
            || user.social_links.github.is_some()
            || user.social_links.facebook.is_some()
            || user.social_links.whatsapp.is_some()
            || user.social_links.telegram.is_some()
            || user.social_links.instagram.is_some()
            || user.social_links.tiktok.is_some()
            || user.social_links.snapchat.is_some()
            || user.social_links.discord.is_some();

        UserPublic {
            id: user.id,
            name: user.name,
            avatar_url: user.avatar_url,
            karma: user.karma,
            created_at: user.created_at,
            social_links: if has_social_links { Some(user.social_links) } else { None },
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
// Compact Page Tree Types (single-letter keys for bandwidth savings)
// ============================================================================

/// Special UUID for deleted users: d0000000-0000-0000-0000-000000000000
pub const DELETED_USER_ID: Uuid = Uuid::from_u128(0xd0000000_0000_0000_0000_000000000000);

/// Special UUID for anonymous users: a0000000-0000-0000-0000-000000000000
pub const ANONYMOUS_USER_ID: Uuid = Uuid::from_u128(0xa0000000_0000_0000_0000_000000000000);

/// Compact comment stored in page tree (single-letter keys)
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(no_recursion)]
pub struct TreeComment {
    /// id - comment UUID
    #[serde(rename = "i")]
    pub id: Uuid,
    /// author_id
    #[serde(rename = "a")]
    pub author_id: Uuid,
    /// author name
    #[serde(rename = "n")]
    pub name: String,
    /// author avatar (picture)
    #[serde(rename = "p")]
    pub avatar: Option<String>,
    /// author karma
    #[serde(rename = "k")]
    pub karma: i64,
    /// text content (markdown)
    #[serde(rename = "t")]
    pub text: String,
    /// html content (rendered)
    #[serde(rename = "h")]
    pub html: String,
    /// upvotes count
    #[serde(rename = "u")]
    pub upvotes: i64,
    /// downvotes count
    #[serde(rename = "d")]
    pub downvotes: i64,
    /// created_at (unix timestamp)
    #[serde(rename = "x")]
    pub created_at: i64,
    /// modified_at (unix timestamp)
    #[serde(rename = "m")]
    pub modified_at: i64,
    /// replies (nested array of child comments)
    #[serde(rename = "r", default, skip_serializing_if = "Vec::is_empty")]
    pub replies: Vec<TreeComment>,
    /// status (only stored if not approved)
    #[serde(rename = "s", default, skip_serializing_if = "Option::is_none")]
    pub status: Option<CommentStatus>,
}

impl TreeComment {
    /// Check if this comment is deleted
    pub fn is_deleted(&self) -> bool {
        self.author_id == DELETED_USER_ID
    }

    /// Mark this comment as deleted (preserves replies)
    pub fn mark_deleted(&mut self) {
        self.author_id = DELETED_USER_ID;
        self.name = "[deleted]".to_string();
        self.avatar = None;
        self.karma = 0;
        self.text = "[deleted]".to_string();
        self.html = "[deleted]".to_string();
        self.status = Some(CommentStatus::Deleted);
    }

    /// Find a comment in this tree by path of IDs
    pub fn find_by_path(&self, path: &[Uuid]) -> Option<&TreeComment> {
        if path.is_empty() {
            return Some(self);
        }
        if path[0] != self.id {
            return None;
        }
        if path.len() == 1 {
            return Some(self);
        }
        // Search in replies
        for reply in &self.replies {
            if reply.id == path[1] {
                return reply.find_by_path(&path[1..]);
            }
        }
        None
    }

    /// Find a mutable comment in this tree by path of IDs
    pub fn find_by_path_mut(&mut self, path: &[Uuid]) -> Option<&mut TreeComment> {
        if path.is_empty() {
            return Some(self);
        }
        if path[0] != self.id {
            return None;
        }
        if path.len() == 1 {
            return Some(self);
        }
        // Search in replies
        for reply in &mut self.replies {
            if reply.id == path[1] {
                return reply.find_by_path_mut(&path[1..]);
            }
        }
        None
    }

    /// Count total replies (including nested)
    pub fn reply_count(&self) -> i64 {
        let mut count = self.replies.len() as i64;
        for reply in &self.replies {
            count += reply.reply_count();
        }
        count
    }

    /// Get the effective status (defaults to Approved if not set)
    pub fn effective_status(&self) -> CommentStatus {
        self.status.clone().unwrap_or(CommentStatus::Approved)
    }
}

/// Page tree - all comments for a page in one JSON blob
#[derive(Debug, Clone, Serialize, Deserialize, Default, ToSchema)]
pub struct PageTree {
    /// comments (array of root comments)
    #[serde(rename = "c", default)]
    pub comments: Vec<TreeComment>,
    /// updated_at (unix timestamp)
    #[serde(rename = "u")]
    pub updated_at: i64,
}

impl PageTree {
    /// Create a new empty page tree
    pub fn new() -> Self {
        Self {
            comments: Vec::new(),
            updated_at: chrono::Utc::now().timestamp(),
        }
    }

    /// Find a root comment by ID
    pub fn find_root(&self, id: Uuid) -> Option<&TreeComment> {
        self.comments.iter().find(|c| c.id == id)
    }

    /// Find a root comment by ID (mutable)
    pub fn find_root_mut(&mut self, id: Uuid) -> Option<&mut TreeComment> {
        self.comments.iter_mut().find(|c| c.id == id)
    }

    /// Find a comment by path of IDs (first ID is root, subsequent are nested)
    pub fn find_by_path(&self, path: &[Uuid]) -> Option<&TreeComment> {
        if path.is_empty() {
            return None;
        }
        for root in &self.comments {
            if root.id == path[0] {
                return root.find_by_path(path);
            }
        }
        None
    }

    /// Find a comment by path of IDs (mutable)
    pub fn find_by_path_mut(&mut self, path: &[Uuid]) -> Option<&mut TreeComment> {
        if path.is_empty() {
            return None;
        }
        for root in &mut self.comments {
            if root.id == path[0] {
                return root.find_by_path_mut(path);
            }
        }
        None
    }

    /// Add a new root comment
    pub fn add_root(&mut self, comment: TreeComment) {
        self.comments.push(comment);
        self.updated_at = chrono::Utc::now().timestamp();
    }

    /// Add a reply to a comment at the given path
    pub fn add_reply(&mut self, parent_path: &[Uuid], reply: TreeComment) -> bool {
        if let Some(parent) = self.find_by_path_mut(parent_path) {
            parent.replies.push(reply);
            self.updated_at = chrono::Utc::now().timestamp();
            true
        } else {
            false
        }
    }

    /// Total comment count (including nested)
    pub fn total_count(&self) -> i64 {
        let mut count = self.comments.len() as i64;
        for comment in &self.comments {
            count += comment.reply_count();
        }
        count
    }

    /// Flatten the tree into a list of comments with parent_id info
    /// Useful for API responses that need flat list format
    pub fn flatten(&self) -> Vec<FlatComment> {
        let mut result = Vec::new();
        for comment in &self.comments {
            self.flatten_recursive(comment, None, 0, &mut result);
        }
        result
    }

    fn flatten_recursive(
        &self,
        comment: &TreeComment,
        parent_id: Option<Uuid>,
        depth: u32,
        result: &mut Vec<FlatComment>,
    ) {
        result.push(FlatComment {
            comment: comment.clone(),
            parent_id,
            depth,
        });
        for reply in &comment.replies {
            self.flatten_recursive(reply, Some(comment.id), depth + 1, result);
        }
    }
}

/// Flattened comment for API responses
#[derive(Debug, Clone)]
pub struct FlatComment {
    pub comment: TreeComment,
    pub parent_id: Option<Uuid>,
    pub depth: u32,
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

// ============================================================================
// API Request/Response Types (shared between server and clients)
// ============================================================================

/// Request to register a new user with email/password
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

/// Response containing auth token and user info
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuthResponse {
    pub token: String,
    pub user: AuthUserResponse,
}

/// User info returned in auth responses
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AuthUserResponse {
    pub id: Uuid,
    pub name: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
}

/// Request to create a new comment
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateCommentRequest {
    /// URL of the page
    pub page_url: String,
    /// Comment content (markdown)
    pub content: String,
    /// Path to parent comment (array of UUIDs from root to parent)
    /// Empty array or omitted for root-level comments
    #[serde(default)]
    pub parent_path: Vec<Uuid>,
    /// Display name for anonymous comments (required if not authenticated)
    pub author_name: Option<String>,
}

/// Response when a comment is created
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateCommentResponse {
    /// The created comment in compact tree format
    pub comment: TreeComment,
}

/// Response for GET /comments - uses compact tree format
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetCommentsResponse {
    /// Page ID for WebSocket subscription
    pub page_id: Uuid,
    /// Comments in compact tree format (single-letter keys)
    pub tree: PageTree,
    /// Total comment count
    pub total: i64,
    /// Pageview count (if enabled)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pageviews: Option<i64>,
}
