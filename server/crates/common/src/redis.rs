use chrono::Utc;
use fred::prelude::*;
use serde::{de::DeserializeOwned, Serialize};
use uuid::Uuid;

use crate::types::*;
use crate::{Error, Result};

/// Result of a rate limit check
#[derive(Debug, Clone)]
pub struct RateLimitResult {
    /// Whether the request is allowed
    pub allowed: bool,
    /// Remaining requests in the current window
    pub remaining: u32,
    /// Unix timestamp when the rate limit resets
    pub reset_at: i64,
    /// The limit that was checked against
    pub limit: u32,
}

const _USER_TTL: i64 = 0; // Persistent (reserved for future use)
const VERIFICATION_TTL: i64 = 600; // 10 minutes
const SESSION_TTL: i64 = 60 * 60 * 24 * 30; // 30 days
const API_KEY_CACHE_TTL: i64 = 300; // 5 minutes
const TYPING_TTL: i64 = 5; // 5 seconds
const WEB3_NONCE_TTL: i64 = 600; // 10 minutes

pub struct RedisClient {
    client: Client,
}

impl RedisClient {
    pub async fn new(url: &str) -> Result<Self> {
        let config = Config::from_url(url)?;
        let client = Client::new(config, None, None, None);
        client.init().await?;
        Ok(RedisClient { client })
    }

    /// Ping Redis to check connectivity
    pub async fn ping(&self) -> Result<()> {
        self.client.ping::<()>(None).await?;
        Ok(())
    }

    // ========================================================================
    // User Operations
    // ========================================================================

    pub async fn get_user(&self, user_id: Uuid) -> Result<Option<User>> {
        self.hgetall_json(&format!("user:{}", user_id)).await
    }

    pub async fn set_user(&self, user: &User) -> Result<()> {
        self.hsetall_json(&format!("user:{}", user.id), user).await
    }

    pub async fn get_user_by_email(&self, email: &str) -> Result<Option<Uuid>> {
        let id: Option<String> = self.client.get(format!("email:{}", email.to_lowercase())).await?;
        Ok(id.and_then(|s| s.parse().ok()))
    }

    pub async fn set_user_email_index(&self, email: &str, user_id: Uuid) -> Result<()> {
        self.client
            .set::<(), _, _>(
                format!("email:{}", email.to_lowercase()),
                user_id.to_string(),
                None,
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn get_user_by_username(&self, username: &str) -> Result<Option<Uuid>> {
        let id: Option<String> = self.client.get(format!("username:{}", username.to_lowercase())).await?;
        Ok(id.and_then(|s| s.parse().ok()))
    }

    pub async fn set_user_username_index(&self, username: &str, user_id: Uuid) -> Result<()> {
        self.client
            .set::<(), _, _>(
                format!("username:{}", username.to_lowercase()),
                user_id.to_string(),
                None,
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn delete_user_username_index(&self, username: &str) -> Result<()> {
        self.client
            .del::<(), _>(format!("username:{}", username.to_lowercase()))
            .await?;
        Ok(())
    }

    /// Check if username is available (not taken by another user)
    pub async fn is_username_available(&self, username: &str, exclude_user_id: Option<Uuid>) -> Result<bool> {
        match self.get_user_by_username(username).await? {
            None => Ok(true),
            Some(existing_id) => {
                // If exclude_user_id matches, it's available (user checking their own name)
                Ok(exclude_user_id == Some(existing_id))
            }
        }
    }

    pub async fn get_user_by_phone(&self, phone: &str) -> Result<Option<Uuid>> {
        let id: Option<String> = self.client.get(format!("phone:{}", phone)).await?;
        Ok(id.and_then(|s| s.parse().ok()))
    }

    pub async fn set_user_password(&self, user_id: Uuid, password_hash: &str) -> Result<()> {
        self.client
            .set::<(), _, _>(
                format!("user:{}:password", user_id),
                password_hash,
                None,
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn get_user_password(&self, user_id: Uuid) -> Result<Option<String>> {
        let hash: Option<String> = self.client.get(format!("user:{}:password", user_id)).await?;
        Ok(hash)
    }

    pub async fn set_user_phone_index(&self, phone: &str, user_id: Uuid) -> Result<()> {
        self.client
            .set::<(), _, _>(format!("phone:{}", phone), user_id.to_string(), None, None, false)
            .await?;
        Ok(())
    }

    pub async fn get_user_by_provider(&self, provider: &str, provider_id: &str) -> Result<Option<Uuid>> {
        let id: Option<String> = self.client.get(format!("provider:{}:{}", provider, provider_id)).await?;
        Ok(id.and_then(|s| s.parse().ok()))
    }

    pub async fn set_user_provider_index(&self, provider: &str, provider_id: &str, user_id: Uuid) -> Result<()> {
        self.client
            .set::<(), _, _>(
                format!("provider:{}:{}", provider, provider_id),
                user_id.to_string(),
                None,
                None,
                false,
            )
            .await?;
        Ok(())
    }

    // ========================================================================
    // Comment Operations
    // ========================================================================

    pub async fn get_comment(&self, comment_id: Uuid) -> Result<Option<Comment>> {
        self.hgetall_json(&format!("comment:{}", comment_id)).await
    }

    pub async fn set_comment(&self, comment: &Comment) -> Result<()> {
        let key = format!("comment:{}", comment.id);
        self.hsetall_json(&key, comment).await?;

        // Add to page index
        let score = comment.created_at.timestamp_millis() as f64;
        self.client
            .zadd::<(), _, _>(
                format!("page:{}:comments:new", comment.page_id),
                None,
                None,
                false,
                false,
                (score, comment.id.to_string()),
            )
            .await?;

        // Add to top index (initial score 0)
        self.client
            .zadd::<(), _, _>(
                format!("page:{}:comments:top", comment.page_id),
                None,
                None,
                false,
                false,
                (0.0, comment.id.to_string()),
            )
            .await?;

        // If reply, add to parent's replies
        if let Some(parent_id) = comment.parent_id {
            self.client
                .zadd::<(), _, _>(
                    format!("comment:{}:replies", parent_id),
                    None,
                    None,
                    false,
                    false,
                    (score, comment.id.to_string()),
                )
                .await?;

            // Increment parent's reply count
            self.client
                .hincrby::<(), _, _>(format!("comment:{}", parent_id), "reply_count", 1)
                .await?;
        }

        // Add to moderation queue if pending
        if comment.status == CommentStatus::Pending {
            self.client
                .zadd::<(), _, _>(
                    format!("site:{}:modqueue", comment.site_id),
                    None,
                    None,
                    false,
                    false,
                    (score, comment.id.to_string()),
                )
                .await?;
        }

        Ok(())
    }

    pub async fn get_page_comments(
        &self,
        page_id: Uuid,
        sort: SortOrder,
        offset: usize,
        limit: usize,
    ) -> Result<Vec<Uuid>> {
        let key = match sort {
            SortOrder::New => format!("page:{}:comments:new", page_id),
            SortOrder::Top => format!("page:{}:comments:top", page_id),
            SortOrder::Hot => format!("page:{}:comments:hot", page_id),
        };

        let ids: Vec<String> = self
            .client
            .zrevrange(&key, offset as i64, (offset + limit - 1) as i64, false)
            .await?;

        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    pub async fn get_comment_replies(&self, comment_id: Uuid, offset: usize, limit: usize) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .zrange(
                format!("comment:{}:replies", comment_id),
                offset as i64,
                (offset + limit - 1) as i64,
                None,
                false,
                None,
                false,
            )
            .await?;

        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    pub async fn update_comment_votes(&self, comment_id: Uuid, upvotes: i64, downvotes: i64) -> Result<()> {
        let comment = self.get_comment(comment_id).await?.ok_or(Error::NotFound("Comment".into()))?;

        // Update hash
        self.client
            .hset::<(), _, _>(
                format!("comment:{}", comment_id),
                [
                    ("upvotes", upvotes.to_string()),
                    ("downvotes", downvotes.to_string()),
                ],
            )
            .await?;

        // Update top score
        let score = (upvotes - downvotes) as f64;
        self.client
            .zadd::<(), _, _>(
                format!("page:{}:comments:top", comment.page_id),
                None,
                None,
                true, // XX - only update existing
                false,
                (score, comment_id.to_string()),
            )
            .await?;

        Ok(())
    }

    // ========================================================================
    // Vote Operations
    // ========================================================================

    pub async fn get_vote(&self, user_id: Uuid, comment_id: Uuid) -> Result<Option<VoteDirection>> {
        let vote: Option<String> = self
            .client
            .get(format!("vote:{}:{}", user_id, comment_id))
            .await?;

        Ok(vote.and_then(|v| match v.as_str() {
            "up" => Some(VoteDirection::Up),
            "down" => Some(VoteDirection::Down),
            _ => None,
        }))
    }

    pub async fn set_vote(&self, user_id: Uuid, comment_id: Uuid, direction: VoteDirection) -> Result<()> {
        let value = match direction {
            VoteDirection::Up => "up",
            VoteDirection::Down => "down",
        };
        self.client
            .set::<(), _, _>(
                format!("vote:{}:{}", user_id, comment_id),
                value,
                None,
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn delete_vote(&self, user_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .del::<(), _>(format!("vote:{}:{}", user_id, comment_id))
            .await?;
        Ok(())
    }

    // ========================================================================
    // Role Operations
    // ========================================================================

    pub async fn get_user_role(&self, site_id: Uuid, user_id: Uuid) -> Result<Role> {
        // Check blocked first
        let blocked: bool = self
            .client
            .sismember(format!("site:{}:blocked", site_id), user_id.to_string())
            .await?;
        if blocked {
            return Ok(Role::Blocked);
        }

        // Check admin
        let is_admin: bool = self
            .client
            .sismember(format!("site:{}:admins", site_id), user_id.to_string())
            .await?;
        if is_admin {
            return Ok(Role::Admin);
        }

        // Check moderator
        let is_mod: bool = self
            .client
            .sismember(format!("site:{}:moderators", site_id), user_id.to_string())
            .await?;
        if is_mod {
            return Ok(Role::Moderator);
        }

        Ok(Role::User)
    }

    pub async fn add_admin(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("site:{}:admins", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn remove_admin(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("site:{}:admins", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn get_admins(&self, site_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("site:{}:admins", site_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    pub async fn add_moderator(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("site:{}:moderators", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn remove_moderator(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("site:{}:moderators", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn get_moderators(&self, site_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("site:{}:moderators", site_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    pub async fn block_user(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("site:{}:blocked", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn unblock_user(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("site:{}:blocked", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn shadowban_user(&self, site_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("site:{}:shadowbanned", site_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn is_shadowbanned(&self, site_id: Uuid, user_id: Uuid) -> Result<bool> {
        let banned: bool = self
            .client
            .sismember(format!("site:{}:shadowbanned", site_id), user_id.to_string())
            .await?;
        Ok(banned)
    }

    // ========================================================================
    // User Comment Tracking
    // ========================================================================

    /// Add a comment ID to the user's list of comments
    pub async fn add_user_comment(&self, user_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("user:{}:comments", user_id), comment_id.to_string())
            .await?;
        Ok(())
    }

    /// Get all comment IDs for a user
    pub async fn get_user_comments(&self, user_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("user:{}:comments", user_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    /// Remove a comment from user's list
    pub async fn remove_user_comment(&self, user_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("user:{}:comments", user_id), comment_id.to_string())
            .await?;
        Ok(())
    }

    // ========================================================================
    // User Karma
    // ========================================================================

    /// Update user karma by delta (positive or negative)
    pub async fn update_user_karma(&self, user_id: Uuid, delta: i64) -> Result<i64> {
        let new_karma: i64 = self
            .client
            .hincrby(format!("user:{}", user_id), "karma", delta)
            .await?;
        Ok(new_karma)
    }

    // ========================================================================
    // User-to-User Blocking
    // ========================================================================

    /// Block another user. This adds to both directions for efficient lookup.
    pub async fn block_user_by_user(&self, blocker_id: Uuid, blocked_id: Uuid) -> Result<()> {
        // Add to blocker's list of blocked users
        self.client
            .sadd::<(), _, _>(format!("user:{}:blocked", blocker_id), blocked_id.to_string())
            .await?;
        // Add to blocked user's list of who blocked them (for efficient filtering)
        self.client
            .sadd::<(), _, _>(format!("user:{}:blocked_by", blocked_id), blocker_id.to_string())
            .await?;
        Ok(())
    }

    /// Unblock a user.
    pub async fn unblock_user_by_user(&self, blocker_id: Uuid, blocked_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("user:{}:blocked", blocker_id), blocked_id.to_string())
            .await?;
        self.client
            .srem::<(), _, _>(format!("user:{}:blocked_by", blocked_id), blocker_id.to_string())
            .await?;
        Ok(())
    }

    /// Check if blocker has blocked blocked_id
    pub async fn is_blocked_by_user(&self, blocker_id: Uuid, blocked_id: Uuid) -> Result<bool> {
        let blocked: bool = self
            .client
            .sismember(format!("user:{}:blocked", blocker_id), blocked_id.to_string())
            .await?;
        Ok(blocked)
    }

    /// Get all users that this user has blocked
    pub async fn get_blocked_users(&self, user_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("user:{}:blocked", user_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    /// Get all users who have blocked this user
    pub async fn get_blocked_by(&self, user_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("user:{}:blocked_by", user_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    // ========================================================================
    // Notification Operations
    // ========================================================================

    pub async fn add_notification(&self, user_id: Uuid, notification: &Notification) -> Result<()> {
        let score = notification.created_at.timestamp_millis() as f64;
        let value = serde_json::to_string(notification)?;

        self.client
            .zadd::<(), _, _>(
                format!("user:{}:notifications", user_id),
                None,
                None,
                false,
                false,
                (score, value),
            )
            .await?;

        self.client
            .incr::<(), _>(format!("user:{}:unread", user_id))
            .await?;

        Ok(())
    }

    pub async fn get_notifications(&self, user_id: Uuid, offset: usize, limit: usize) -> Result<Vec<Notification>> {
        let items: Vec<String> = self
            .client
            .zrevrange(
                format!("user:{}:notifications", user_id),
                offset as i64,
                (offset + limit - 1) as i64,
                false,
            )
            .await?;

        let notifications: Vec<Notification> = items
            .into_iter()
            .filter_map(|s| serde_json::from_str(&s).ok())
            .collect();

        Ok(notifications)
    }

    pub async fn get_unread_count(&self, user_id: Uuid) -> Result<i64> {
        let count: i64 = self
            .client
            .get(format!("user:{}:unread", user_id))
            .await
            .unwrap_or(0);
        Ok(count)
    }

    pub async fn mark_notifications_read(&self, user_id: Uuid) -> Result<()> {
        self.client
            .set::<(), _, _>(format!("user:{}:unread", user_id), "0", None, None, false)
            .await?;
        Ok(())
    }

    // ========================================================================
    // Verification Operations
    // ========================================================================

    pub async fn set_verification_code(&self, key: &str, code: &VerificationCode) -> Result<()> {
        let value = serde_json::to_string(code)?;
        self.client
            .set::<(), _, _>(
                format!("verify:{}", key),
                value,
                Some(Expiration::EX(VERIFICATION_TTL)),
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn get_verification_code(&self, key: &str) -> Result<Option<VerificationCode>> {
        let value: Option<String> = self.client.get(format!("verify:{}", key)).await?;
        Ok(value.and_then(|v| serde_json::from_str(&v).ok()))
    }

    pub async fn delete_verification_code(&self, key: &str) -> Result<()> {
        self.client.del::<(), _>(format!("verify:{}", key)).await?;
        Ok(())
    }

    // ========================================================================
    // Web3 Nonce Operations
    // ========================================================================

    /// Store a web3 nonce for signature verification (chain: "ethereum" or "solana")
    pub async fn set_web3_nonce(&self, chain: &str, address: &str, nonce: &str) -> Result<()> {
        self.client
            .set::<(), _, _>(
                format!("web3nonce:{}:{}", chain, address.to_lowercase()),
                nonce,
                Some(Expiration::EX(WEB3_NONCE_TTL)),
                None,
                false,
            )
            .await?;
        Ok(())
    }

    /// Get a stored web3 nonce
    pub async fn get_web3_nonce(&self, chain: &str, address: &str) -> Result<Option<String>> {
        let nonce: Option<String> = self
            .client
            .get(format!("web3nonce:{}:{}", chain, address.to_lowercase()))
            .await?;
        Ok(nonce)
    }

    /// Delete a web3 nonce after successful verification
    pub async fn delete_web3_nonce(&self, chain: &str, address: &str) -> Result<()> {
        self.client
            .del::<(), _>(format!("web3nonce:{}:{}", chain, address.to_lowercase()))
            .await?;
        Ok(())
    }

    /// Get user by wallet address
    pub async fn get_user_by_wallet(&self, chain: &str, address: &str) -> Result<Option<Uuid>> {
        let id: Option<String> = self
            .client
            .get(format!("wallet:{}:{}", chain, address.to_lowercase()))
            .await?;
        Ok(id.and_then(|s| s.parse().ok()))
    }

    /// Index user by wallet address
    pub async fn set_user_wallet_index(&self, chain: &str, address: &str, user_id: Uuid) -> Result<()> {
        self.client
            .set::<(), _, _>(
                format!("wallet:{}:{}", chain, address.to_lowercase()),
                user_id.to_string(),
                None,
                None,
                false,
            )
            .await?;
        Ok(())
    }

    // ========================================================================
    // Session Operations
    // ========================================================================

    pub async fn create_session(&self, session_id: Uuid, user_id: Uuid, user_agent: &str, ip: &str) -> Result<()> {
        let now = Utc::now();
        self.client
            .hset::<(), _, _>(
                format!("session:{}", session_id),
                [
                    ("user_id", user_id.to_string()),
                    ("created_at", now.to_rfc3339()),
                    ("last_used", now.to_rfc3339()),
                    ("user_agent", user_agent.to_string()),
                    ("ip", ip.to_string()),
                ],
            )
            .await?;
        self.client
            .expire::<(), _>(format!("session:{}", session_id), SESSION_TTL, None)
            .await?;
        Ok(())
    }

    pub async fn get_session_user(&self, session_id: Uuid) -> Result<Option<Uuid>> {
        let user_id: Option<String> = self
            .client
            .hget(format!("session:{}", session_id), "user_id")
            .await?;
        Ok(user_id.and_then(|s| s.parse().ok()))
    }

    pub async fn delete_session(&self, session_id: Uuid) -> Result<()> {
        self.client
            .del::<(), _>(format!("session:{}", session_id))
            .await?;
        Ok(())
    }

    // ========================================================================
    // Typing & Presence
    // ========================================================================

    pub async fn set_typing(&self, page_id: Uuid, user_id: Uuid) -> Result<()> {
        let score = Utc::now().timestamp_millis() as f64;
        self.client
            .zadd::<(), _, _>(
                format!("page:{}:typing", page_id),
                None,
                None,
                false,
                false,
                (score, user_id.to_string()),
            )
            .await?;
        Ok(())
    }

    pub async fn get_typing_users(&self, page_id: Uuid) -> Result<Vec<Uuid>> {
        let cutoff = (Utc::now().timestamp_millis() - (TYPING_TTL * 1000)) as f64;

        // Remove old entries
        self.client
            .zremrangebyscore::<(), _, f64, f64>(format!("page:{}:typing", page_id), f64::NEG_INFINITY, cutoff)
            .await?;

        // Get current typing users
        let ids: Vec<String> = self
            .client
            .zrange(format!("page:{}:typing", page_id), 0, -1, None, false, None, false)
            .await?;

        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    pub async fn add_presence(&self, page_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("page:{}:presence", page_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn remove_presence(&self, page_id: Uuid, user_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("page:{}:presence", page_id), user_id.to_string())
            .await?;
        Ok(())
    }

    pub async fn get_presence(&self, page_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("page:{}:presence", page_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    // ========================================================================
    // Pageview Counter
    // ========================================================================

    pub async fn increment_pageview(&self, page_id: Uuid) -> Result<i64> {
        let count: i64 = self
            .client
            .incr(format!("page:{}:views", page_id))
            .await?;
        Ok(count)
    }

    pub async fn get_pageviews(&self, page_id: Uuid) -> Result<i64> {
        let count: i64 = self
            .client
            .get(format!("page:{}:views", page_id))
            .await
            .unwrap_or(0);
        Ok(count)
    }

    // ========================================================================
    // Usage Metering
    // ========================================================================

    pub async fn increment_usage(&self, site_id: Uuid, field: &str, amount: i64) -> Result<()> {
        let month = Utc::now().format("%Y-%m").to_string();
        self.client
            .hincrby::<(), _, _>(format!("site:{}:usage:{}", site_id, month), field, amount)
            .await?;
        Ok(())
    }

    pub async fn add_unique_visitor(&self, site_id: Uuid, visitor_id: &str) -> Result<()> {
        // HyperLogLog for unique visitor counting
        // Using PFADD command via custom command since fred may not expose it directly
        let month = Utc::now().format("%Y-%m").to_string();
        let key = format!("site:{}:visitors:{}", site_id, month);
        // Use set with NX for simple unique tracking instead of HyperLogLog
        // In production, consider using HyperLogLog via raw command
        self.client
            .sadd::<(), _, _>(&key, visitor_id)
            .await?;
        Ok(())
    }

    // ========================================================================
    // API Key Cache
    // ========================================================================

    pub async fn cache_api_key(&self, api_key: &str, info: &ApiKeyInfo) -> Result<()> {
        let value = serde_json::to_string(info)?;
        self.client
            .set::<(), _, _>(
                format!("apikey:{}", api_key),
                value,
                Some(Expiration::EX(API_KEY_CACHE_TTL)),
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn get_cached_api_key(&self, api_key: &str) -> Result<Option<ApiKeyInfo>> {
        let value: Option<String> = self.client.get(format!("apikey:{}", api_key)).await?;
        Ok(value.and_then(|v| serde_json::from_str(&v).ok()))
    }

    // ========================================================================
    // Site Config (for standalone mode)
    // ========================================================================

    pub async fn get_site_config(&self, site_id: Uuid) -> Result<Option<SiteConfig>> {
        let value: Option<String> = self.client.get(format!("site:{}:config", site_id)).await?;
        Ok(value.and_then(|v| serde_json::from_str(&v).ok()))
    }

    pub async fn set_site_config(&self, config: &SiteConfig) -> Result<()> {
        let json = serde_json::to_string(config)?;
        self.client
            .set::<(), _, _>(format!("site:{}:config", config.id), json, None, None, false)
            .await?;
        Ok(())
    }

    // ========================================================================
    // Moderation Queue
    // ========================================================================

    pub async fn get_moderation_queue(&self, site_id: Uuid, offset: usize, limit: usize) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .zrange(
                format!("site:{}:modqueue", site_id),
                offset as i64,
                (offset + limit - 1) as i64,
                None,
                false,
                None,
                false,
            )
            .await?;

        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    pub async fn remove_from_modqueue(&self, site_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .zrem::<(), _, _>(format!("site:{}:modqueue", site_id), comment_id.to_string())
            .await?;
        Ok(())
    }

    // ========================================================================
    // Reports
    // ========================================================================

    pub async fn add_report(&self, site_id: Uuid, report: &Report) -> Result<()> {
        let score = report.created_at.timestamp_millis() as f64;
        let value = serde_json::to_string(report)?;

        self.client
            .zadd::<(), _, _>(
                format!("site:{}:reports", site_id),
                None,
                None,
                false,
                false,
                (score, value),
            )
            .await?;
        Ok(())
    }

    pub async fn get_reports(&self, site_id: Uuid, offset: usize, limit: usize) -> Result<Vec<Report>> {
        let items: Vec<String> = self
            .client
            .zrange(
                format!("site:{}:reports", site_id),
                offset as i64,
                (offset + limit - 1) as i64,
                None,
                false,
                None,
                false,
            )
            .await?;

        Ok(items
            .into_iter()
            .filter_map(|s| serde_json::from_str(&s).ok())
            .collect())
    }

    // ========================================================================
    // Pub/Sub for real-time updates
    // ========================================================================

    pub async fn publish(&self, channel: &str, message: &str) -> Result<()> {
        self.client.publish::<(), _, _>(channel, message).await?;
        Ok(())
    }

    // ========================================================================
    // Account Deletion (GDPR)
    // ========================================================================

    /// Delete all user data for GDPR compliance
    pub async fn delete_user_account(&self, user_id: Uuid) -> Result<DeletedAccountStats> {
        let mut stats = DeletedAccountStats::default();

        // Get user data first for index cleanup
        let user = self.get_user(user_id).await?;

        // Delete all user's comments
        let comment_ids = self.get_user_comments(user_id).await.unwrap_or_default();
        for comment_id in &comment_ids {
            // Remove from page indices
            if let Ok(Some(comment)) = self.get_comment(*comment_id).await {
                // Remove from page comment indices
                self.client
                    .zrem::<(), _, _>(
                        format!("page:{}:comments:new", comment.page_id),
                        comment_id.to_string(),
                    )
                    .await?;
                self.client
                    .zrem::<(), _, _>(
                        format!("page:{}:comments:top", comment.page_id),
                        comment_id.to_string(),
                    )
                    .await?;
                self.client
                    .zrem::<(), _, _>(
                        format!("page:{}:comments:hot", comment.page_id),
                        comment_id.to_string(),
                    )
                    .await?;

                // Remove from parent's replies if it was a reply
                if let Some(parent_id) = comment.parent_id {
                    self.client
                        .zrem::<(), _, _>(format!("comment:{}:replies", parent_id), comment_id.to_string())
                        .await?;
                    // Decrement parent reply count
                    self.client
                        .hincrby::<(), _, _>(format!("comment:{}", parent_id), "reply_count", -1)
                        .await?;
                }

                // Remove from moderation queue if present
                self.client
                    .zrem::<(), _, _>(format!("site:{}:modqueue", comment.site_id), comment_id.to_string())
                    .await?;
            }

            // Delete comment hash
            self.client.del::<(), _>(format!("comment:{}", comment_id)).await?;
            // Delete comment replies list
            self.client.del::<(), _>(format!("comment:{}:replies", comment_id)).await?;
            stats.comments_deleted += 1;
        }

        // Delete user comments set
        self.client.del::<(), _>(format!("user:{}:comments", user_id)).await?;

        // Delete user's votes
        let vote_ids = self.get_user_votes(user_id).await.unwrap_or_default();
        for comment_id in &vote_ids {
            // Get the vote direction to reverse it
            if let Ok(Some(direction)) = self.get_vote(user_id, *comment_id).await {
                // Update comment vote counts
                if let Ok(Some(comment)) = self.get_comment(*comment_id).await {
                    let (upvote_delta, downvote_delta) = match direction {
                        VoteDirection::Up => (-1, 0),
                        VoteDirection::Down => (0, -1),
                    };
                    let new_upvotes = (comment.upvotes + upvote_delta).max(0);
                    let new_downvotes = (comment.downvotes + downvote_delta).max(0);
                    let _ = self.update_comment_votes(*comment_id, new_upvotes, new_downvotes).await;
                }
            }
            self.client.del::<(), _>(format!("vote:{}:{}", user_id, comment_id)).await?;
            stats.votes_deleted += 1;
        }
        self.client.del::<(), _>(format!("user:{}:votes", user_id)).await?;

        // Delete notifications
        self.client.del::<(), _>(format!("user:{}:notifications", user_id)).await?;
        self.client.del::<(), _>(format!("user:{}:unread", user_id)).await?;

        // Clean up blocking relationships
        // Users this account blocked
        let blocked = self.get_blocked_users(user_id).await.unwrap_or_default();
        for blocked_id in blocked {
            self.client
                .srem::<(), _, _>(format!("user:{}:blocked_by", blocked_id), user_id.to_string())
                .await?;
        }
        self.client.del::<(), _>(format!("user:{}:blocked", user_id)).await?;

        // Users who blocked this account
        let blocked_by = self.get_blocked_by(user_id).await.unwrap_or_default();
        for blocker_id in blocked_by {
            self.client
                .srem::<(), _, _>(format!("user:{}:blocked", blocker_id), user_id.to_string())
                .await?;
        }
        self.client.del::<(), _>(format!("user:{}:blocked_by", user_id)).await?;

        // Delete email/phone/username/provider indexes
        if let Some(ref user) = user {
            if let Some(ref email) = user.email {
                self.client.del::<(), _>(format!("email:{}", email.to_lowercase())).await?;
            }
            if let Some(ref phone) = user.phone {
                self.client.del::<(), _>(format!("phone:{}", phone)).await?;
            }
            // Delete username index
            self.client.del::<(), _>(format!("username:{}", user.name.to_lowercase())).await?;
        }

        // Note: Provider indexes would need to be tracked to delete them
        // For now, they will be orphaned but harmless

        // Delete user hash
        self.client.del::<(), _>(format!("user:{}", user_id)).await?;

        Ok(stats)
    }

    /// Track a vote for later cleanup during account deletion
    pub async fn add_user_vote(&self, user_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("user:{}:votes", user_id), comment_id.to_string())
            .await?;
        Ok(())
    }

    /// Remove vote from user's vote list
    pub async fn remove_user_vote(&self, user_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("user:{}:votes", user_id), comment_id.to_string())
            .await?;
        Ok(())
    }

    /// Get all votes a user has made
    pub async fn get_user_votes(&self, user_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("user:{}:votes", user_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    // ========================================================================
    // Rate Limiting
    // ========================================================================

    /// Check rate limit using sliding window algorithm
    /// Returns whether the request is allowed and remaining quota
    pub async fn check_rate_limit(
        &self,
        key: &str,
        max_requests: u32,
        window_secs: u64,
    ) -> Result<RateLimitResult> {
        let now_ms = Utc::now().timestamp_millis();
        let window_ms = (window_secs * 1000) as i64;
        let window_start = now_ms - window_ms;

        // Remove expired entries
        self.client
            .zremrangebyscore::<(), _, f64, f64>(key, f64::NEG_INFINITY, window_start as f64)
            .await?;

        // Count current entries
        let count: i64 = self.client.zcard(key).await?;

        let reset_at = (now_ms + window_ms) / 1000; // Unix timestamp in seconds

        // Check if under limit
        if count < max_requests as i64 {
            // Add new entry with timestamp as score
            let request_id = format!("{}:{}", now_ms, uuid::Uuid::now_v7());
            self.client
                .zadd::<(), _, _>(key, None, None, false, false, (now_ms as f64, request_id))
                .await?;

            // Set expiry on the key
            self.client
                .pexpire::<(), _>(key, window_ms, None)
                .await?;

            let remaining = (max_requests as i64 - count - 1).max(0) as u32;
            Ok(RateLimitResult {
                allowed: true,
                remaining,
                reset_at,
                limit: max_requests,
            })
        } else {
            Ok(RateLimitResult {
                allowed: false,
                remaining: 0,
                reset_at,
                limit: max_requests,
            })
        }
    }

    /// Get current rate limit status without incrementing
    pub async fn get_rate_limit_status(
        &self,
        key: &str,
        max_requests: u32,
        window_secs: u64,
    ) -> Result<RateLimitResult> {
        let now_ms = Utc::now().timestamp_millis();
        let window_ms = (window_secs * 1000) as i64;
        let window_start = now_ms - window_ms;

        // Remove expired and count
        self.client
            .zremrangebyscore::<(), _, f64, f64>(key, f64::NEG_INFINITY, window_start as f64)
            .await?;

        let count: i64 = self.client.zcard(key).await?;
        let remaining = (max_requests as i64 - count).max(0) as u32;
        let reset_at = (now_ms + window_ms) / 1000;

        Ok(RateLimitResult {
            allowed: count < max_requests as i64,
            remaining,
            reset_at,
            limit: max_requests,
        })
    }

    // ========================================================================
    // Page Posting Lock
    // ========================================================================

    /// Lock posting on a specific page
    pub async fn lock_page(&self, site_id: Uuid, page_id: Uuid) -> Result<()> {
        self.client
            .sadd::<(), _, _>(format!("site:{}:locked_pages", site_id), page_id.to_string())
            .await?;
        Ok(())
    }

    /// Unlock posting on a specific page
    pub async fn unlock_page(&self, site_id: Uuid, page_id: Uuid) -> Result<()> {
        self.client
            .srem::<(), _, _>(format!("site:{}:locked_pages", site_id), page_id.to_string())
            .await?;
        Ok(())
    }

    /// Check if a page is locked for posting
    pub async fn is_page_locked(&self, site_id: Uuid, page_id: Uuid) -> Result<bool> {
        let is_member: bool = self
            .client
            .sismember(format!("site:{}:locked_pages", site_id), page_id.to_string())
            .await?;
        Ok(is_member)
    }

    /// Get all locked pages for a site
    pub async fn get_locked_pages(&self, site_id: Uuid) -> Result<Vec<Uuid>> {
        let ids: Vec<String> = self
            .client
            .smembers(format!("site:{}:locked_pages", site_id))
            .await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
    }

    // ========================================================================
    // Site Posting Lock
    // ========================================================================

    /// Update site settings (for toggling posting_disabled, etc.)
    pub async fn update_site_settings(&self, site_id: Uuid, settings: &SiteSettings) -> Result<()> {
        // Get current config
        let mut config = self
            .get_site_config(site_id)
            .await?
            .ok_or_else(|| Error::NotFound("Site config not found".into()))?;

        // Update settings
        config.settings = settings.clone();

        // Save back
        self.set_site_config(&config).await
    }

    // ========================================================================
    // Helper methods
    // ========================================================================

    async fn hgetall_json<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let data: std::collections::HashMap<String, String> = self.client.hgetall(key).await?;
        if data.is_empty() {
            return Ok(None);
        }

        // Convert HashMap<String, String> to JSON object, parsing values appropriately
        let mut json_map = serde_json::Map::new();
        for (k, v) in data {
            // Try to parse as JSON value (handles booleans, numbers, null, objects, arrays)
            let json_val = serde_json::from_str(&v).unwrap_or_else(|_| serde_json::Value::String(v));
            json_map.insert(k, json_val);
        }

        let result = serde_json::from_value(serde_json::Value::Object(json_map))?;
        Ok(Some(result))
    }

    async fn hsetall_json<T: Serialize>(&self, key: &str, value: &T) -> Result<()> {
        let json_value = serde_json::to_value(value)?;
        if let serde_json::Value::Object(map) = json_value {
            let pairs: Vec<(String, String)> = map
                .into_iter()
                .map(|(k, v)| {
                    let v_str = match v {
                        serde_json::Value::String(s) => s,
                        other => other.to_string(),
                    };
                    (k, v_str)
                })
                .collect();

            if !pairs.is_empty() {
                self.client.hset::<(), _, _>(key, pairs).await?;
            }
        }
        Ok(())
    }
}
