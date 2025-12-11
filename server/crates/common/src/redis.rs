use chrono::Utc;
use fred::prelude::*;
use fred::types::{CustomCommand, ClusterHash, Resp3Frame};
use serde::{de::DeserializeOwned, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;

use crate::types::*;
use crate::{Error, Result};

// Re-export PageTree for convenience
pub use crate::types::PageTree;

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

const VERIFICATION_TTL: i64 = 600; // 10 minutes
const PROJECT_ID_CACHE_TTL: i64 = 300; // 5 minutes
const TYPING_TTL: i64 = 5; // 5 seconds
const WEB3_NONCE_TTL: i64 = 600; // 10 minutes

pub struct RedisClient {
    client: Client,
    script_shas: HashMap<String, String>,
}

impl RedisClient {
    pub async fn new(url: &str) -> Result<Self> {
        let config = Config::from_url(url)?;
        let client = Client::new(config, None, None, None);
        client.init().await?;

        // Load Lua scripts and get their SHA1 hashes
        let script_shas = Self::load_lua_scripts(&client).await?;

        Ok(RedisClient { client, script_shas })
    }

    /// Load Lua scripts from the lua/ directory and return their SHA1 hashes
    async fn load_lua_scripts(client: &Client) -> Result<HashMap<String, String>> {
        let mut shas = HashMap::new();

        let lua_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .and_then(|p| p.parent())
            .ok_or_else(|| Error::Internal("Could not find project root".to_string()))?
            .join("lua");

        if !lua_dir.exists() {
            return Err(Error::Internal(format!("Lua scripts directory not found: {:?}", lua_dir)));
        }

        // Load each .lua file
        for entry in fs::read_dir(&lua_dir).map_err(|e| Error::Internal(format!("Failed to read lua directory: {}", e)))? {
            let entry = entry.map_err(|e| Error::Internal(format!("Failed to read directory entry: {}", e)))?;
            let path = entry.path();

            if path.extension().and_then(|s| s.to_str()) == Some("lua") {
                let script_name = path.file_stem()
                    .and_then(|s| s.to_str())
                    .ok_or_else(|| Error::Internal("Invalid script filename".to_string()))?;

                let script_content = fs::read_to_string(&path)
                    .map_err(|e| Error::Internal(format!("Failed to read {}: {}", path.display(), e)))?;

                // Use SCRIPT LOAD to load the script and get its SHA1
                let cmd = CustomCommand::new("SCRIPT", ClusterHash::FirstKey, false);
                let frame = client.custom_raw::<Value>(
                    cmd,
                    vec![Value::from("LOAD"), Value::from(script_content)]
                ).await?;

                // Extract SHA1 from Resp3Frame
                let sha: String = match frame {
                    Resp3Frame::BlobString { data, .. } | Resp3Frame::SimpleString { data, .. } => {
                        String::from_utf8(data.to_vec())
                            .map_err(|e| Error::Internal(format!("Invalid UTF-8 in SHA1: {}", e)))?
                    }
                    _ => return Err(Error::Internal("Unexpected response type from SCRIPT LOAD".to_string())),
                };

                println!("Loaded Lua script '{}' with SHA1: {}", script_name, sha);
                shas.insert(script_name.to_string(), sha);
            }
        }

        Ok(shas)
    }

    /// Ping Redis to check connectivity
    pub async fn ping(&self) -> Result<()> {
        self.client.ping::<()>(None).await?;
        Ok(())
    }

    /// Check if a key exists
    pub async fn exists(&self, key: &str) -> Result<bool> {
        let count: i64 = self.client.exists(key).await?;
        Ok(count > 0)
    }

    /// Set a key with expiry (in seconds)
    pub async fn set_with_expiry(&self, key: &str, value: &str, seconds: u64) -> Result<()> {
        self.client
            .set::<(), _, _>(
                key,
                value,
                Some(Expiration::EX(seconds as i64)),
                None,
                false,
            )
            .await?;
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
    // Page Tree Operations (new denormalized schema)
    // ========================================================================

    /// Generate deterministic page_id from site_id and page_url
    pub fn generate_page_id(site_id: Uuid, page_url: &str) -> Uuid {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        site_id.hash(&mut hasher);
        page_url.hash(&mut hasher);
        let hash = hasher.finish();
        // Create UUID v8 from hash (deterministic)
        Uuid::from_u64_pair(hash, hash.rotate_left(32))
    }

    /// Get the entire page tree (single Redis GET)
    pub async fn get_page_tree(&self, page_id: Uuid) -> Result<Option<PageTree>> {
        let value: Option<String> = self.client.get(format!("page:{}:tree", page_id)).await?;
        Ok(value.and_then(|v| serde_json::from_str(&v).ok()))
    }

    /// Set the entire page tree (single Redis SET)
    pub async fn set_page_tree(&self, page_id: Uuid, tree: &PageTree) -> Result<()> {
        let json = serde_json::to_string(tree)?;
        self.client
            .set::<(), _, _>(format!("page:{}:tree", page_id), json, None, None, false)
            .await?;
        Ok(())
    }

    /// Get or create a page tree
    pub async fn get_or_create_page_tree(&self, page_id: Uuid) -> Result<PageTree> {
        match self.get_page_tree(page_id).await? {
            Some(tree) => Ok(tree),
            None => Ok(PageTree::new()),
        }
    }

    /// Add a comment to user's comment index (for profile/history)
    pub async fn add_user_comment_index(&self, user_id: Uuid, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        let score = Utc::now().timestamp_millis() as f64;
        let value = format!("{}:{}", page_id, comment_id);
        self.client
            .zadd::<(), _, _>(
                format!("user:{}:comments", user_id),
                None,
                None,
                false,
                false,
                (score, value),
            )
            .await?;
        Ok(())
    }

    /// Add a comment to user's site-specific comment index (for admin bulk delete)
    pub async fn add_user_site_comment_index(&self, user_id: Uuid, site_id: Uuid, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        let score = Utc::now().timestamp_millis() as f64;
        let value = format!("{}:{}", page_id, comment_id);
        self.client
            .zadd::<(), _, _>(
                format!("user:{}:{}:comments", user_id, site_id),
                None,
                None,
                false,
                false,
                (score, value),
            )
            .await?;
        Ok(())
    }

    /// Add a comment to site's comment index (for admin view)
    pub async fn add_site_comment_index(&self, site_id: Uuid, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        let score = Utc::now().timestamp_millis() as f64;
        let value = format!("{}:{}", page_id, comment_id);
        self.client
            .zadd::<(), _, _>(
                format!("site:{}:comments", site_id),
                None,
                None,
                false,
                false,
                (score, value),
            )
            .await?;
        Ok(())
    }

    /// Get user's comments across all sites (for profile)
    /// Returns Vec<(page_id, comment_id)>
    pub async fn get_user_comment_index(&self, user_id: Uuid, offset: usize, limit: usize) -> Result<Vec<(Uuid, Uuid)>> {
        let items: Vec<String> = self
            .client
            .zrevrange(
                format!("user:{}:comments", user_id),
                offset as i64,
                (offset + limit - 1) as i64,
                false,
            )
            .await?;

        Ok(items
            .into_iter()
            .filter_map(|s| {
                let parts: Vec<&str> = s.split(':').collect();
                if parts.len() == 2 {
                    Some((parts[0].parse().ok()?, parts[1].parse().ok()?))
                } else {
                    None
                }
            })
            .collect())
    }

    /// Get site's recent comments (for admin)
    /// Returns Vec<(page_id, comment_id)>
    pub async fn get_site_comment_index(&self, site_id: Uuid, offset: usize, limit: usize) -> Result<Vec<(Uuid, Uuid)>> {
        let items: Vec<String> = self
            .client
            .zrevrange(
                format!("site:{}:comments", site_id),
                offset as i64,
                (offset + limit - 1) as i64,
                false,
            )
            .await?;

        Ok(items
            .into_iter()
            .filter_map(|s| {
                let parts: Vec<&str> = s.split(':').collect();
                if parts.len() == 2 {
                    Some((parts[0].parse().ok()?, parts[1].parse().ok()?))
                } else {
                    None
                }
            })
            .collect())
    }

    /// Get user's comments on a specific site (for admin bulk delete)
    /// Returns Vec<(page_id, comment_id)>
    pub async fn get_user_site_comments(&self, user_id: Uuid, site_id: Uuid, offset: usize, limit: usize) -> Result<Vec<(Uuid, Uuid)>> {
        let items: Vec<String> = self
            .client
            .zrevrange(
                format!("user:{}:{}:comments", user_id, site_id),
                offset as i64,
                (offset + limit - 1) as i64,
                false,
            )
            .await?;

        Ok(items
            .into_iter()
            .filter_map(|s| {
                let parts: Vec<&str> = s.split(':').collect();
                if parts.len() == 2 {
                    Some((parts[0].parse().ok()?, parts[1].parse().ok()?))
                } else {
                    None
                }
            })
            .collect())
    }


    /// Add to moderation queue (uses page_id:comment_id format)
    pub async fn add_to_modqueue(&self, site_id: Uuid, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        let score = Utc::now().timestamp_millis() as f64;
        let value = format!("{}:{}", page_id, comment_id);
        self.client
            .zadd::<(), _, _>(
                format!("site:{}:modqueue", site_id),
                None,
                None,
                false,
                false,
                (score, value),
            )
            .await?;
        Ok(())
    }

    /// Remove from moderation queue
    pub async fn remove_from_modqueue_v2(&self, site_id: Uuid, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        let value = format!("{}:{}", page_id, comment_id);
        self.client
            .zrem::<(), _, _>(format!("site:{}:modqueue", site_id), value)
            .await?;
        Ok(())
    }

    /// Get moderation queue
    /// Returns Vec<(page_id, comment_id)>
    pub async fn get_modqueue_v2(&self, site_id: Uuid, offset: usize, limit: usize) -> Result<Vec<(Uuid, Uuid)>> {
        let items: Vec<String> = self
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

        Ok(items
            .into_iter()
            .filter_map(|s| {
                let parts: Vec<&str> = s.split(':').collect();
                if parts.len() == 2 {
                    Some((parts[0].parse().ok()?, parts[1].parse().ok()?))
                } else {
                    None
                }
            })
            .collect())
    }

    /// Add report (uses page_id:comment_id format as value, report JSON as score member)
    pub async fn add_report_v2(&self, site_id: Uuid, page_id: Uuid, report: &Report) -> Result<()> {
        let score = report.created_at.timestamp_millis() as f64;
        let value = format!("{}:{}", page_id, report.comment_id);
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

    /// Get reports
    /// Returns Vec<(page_id, comment_id)>
    pub async fn get_reports_v2(&self, site_id: Uuid, offset: usize, limit: usize) -> Result<Vec<(Uuid, Uuid)>> {
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
            .filter_map(|s| {
                let parts: Vec<&str> = s.split(':').collect();
                if parts.len() == 2 {
                    Some((parts[0].parse().ok()?, parts[1].parse().ok()?))
                } else {
                    None
                }
            })
            .collect())
    }

    // ========================================================================
    // Comment Operations (legacy - kept for migration/compatibility)
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
            SortOrder::Controversial => format!("page:{}:comments:controversial", page_id),
            SortOrder::Old => format!("page:{}:comments:old", page_id),
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

    /// Batch fetch multiple comments concurrently
    pub async fn get_comments_batch(&self, comment_ids: &[Uuid]) -> Result<Vec<Comment>> {
        if comment_ids.is_empty() {
            return Ok(vec![]);
        }

        let futures: Vec<_> = comment_ids
            .iter()
            .map(|id| self.get_comment(*id))
            .collect();

        let results = futures_util::future::join_all(futures).await;
        Ok(results.into_iter().filter_map(|r| r.ok().flatten()).collect())
    }

    /// Batch fetch multiple users concurrently
    pub async fn get_users_batch(&self, user_ids: &[Uuid]) -> Result<std::collections::HashMap<Uuid, User>> {
        if user_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        // Deduplicate user IDs
        let unique_ids: Vec<_> = user_ids.iter().copied().collect::<std::collections::HashSet<_>>().into_iter().collect();

        let futures: Vec<_> = unique_ids
            .iter()
            .map(|id| async move { (*id, self.get_user(*id).await) })
            .collect();

        let results = futures_util::future::join_all(futures).await;
        Ok(results
            .into_iter()
            .filter_map(|(id, r)| r.ok().flatten().map(|u| (id, u)))
            .collect())
    }

    /// Batch fetch multiple votes concurrently
    pub async fn get_votes_batch(&self, user_id: Uuid, comment_ids: &[Uuid]) -> Result<std::collections::HashMap<Uuid, VoteDirection>> {
        if comment_ids.is_empty() {
            return Ok(std::collections::HashMap::new());
        }

        let futures: Vec<_> = comment_ids
            .iter()
            .map(|id| async move { (*id, self.get_vote(user_id, *id).await) })
            .collect();

        let results = futures_util::future::join_all(futures).await;
        Ok(results
            .into_iter()
            .filter_map(|(id, r)| r.ok().flatten().map(|v| (id, v)))
            .collect())
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
    // Per-Page Vote Operations (for efficient loading)
    // Key: votes:{user_id}:{page_id} -> hash of comment_id -> direction (1 or -1)
    // ========================================================================

    /// Set a user's vote for a comment on a page
    pub async fn set_page_vote(&self, user_id: Uuid, page_id: Uuid, comment_id: Uuid, direction: VoteDirection) -> Result<()> {
        let value = match direction {
            VoteDirection::Up => "1",
            VoteDirection::Down => "-1",
        };
        self.client
            .hset::<(), _, _>(
                format!("votes:{}:{}", user_id, page_id),
                (comment_id.to_string(), value),
            )
            .await?;
        Ok(())
    }

    /// Remove a user's vote for a comment on a page
    pub async fn delete_page_vote(&self, user_id: Uuid, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .hdel::<(), _, _>(
                format!("votes:{}:{}", user_id, page_id),
                comment_id.to_string(),
            )
            .await?;
        Ok(())
    }

    /// Get all of a user's votes for a page
    /// Returns a map of comment_id -> direction
    pub async fn get_page_votes(&self, user_id: Uuid, page_id: Uuid) -> Result<std::collections::HashMap<Uuid, VoteDirection>> {
        let raw: std::collections::HashMap<String, String> = self
            .client
            .hgetall(format!("votes:{}:{}", user_id, page_id))
            .await?;

        let mut result = std::collections::HashMap::new();
        for (comment_id_str, direction_str) in raw {
            if let Ok(comment_id) = comment_id_str.parse::<Uuid>() {
                let direction = match direction_str.as_str() {
                    "1" => Some(VoteDirection::Up),
                    "-1" => Some(VoteDirection::Down),
                    _ => None,
                };
                if let Some(dir) = direction {
                    result.insert(comment_id, dir);
                }
            }
        }
        Ok(result)
    }

    /// Atomically process a vote using a Lua script to prevent race conditions
    /// Returns (new_vote, upvotes, downvotes, upvote_delta, downvote_delta)
    pub async fn atomic_vote(
        &self,
        user_id: Uuid,
        page_id: Uuid,
        comment_id: Uuid,
        path: &[Uuid],
        direction: VoteDirection,
    ) -> Result<(Option<VoteDirection>, i64, i64, i64, i64)> {
        let vote_key = format!("votes:{}:{}", user_id, page_id);
        let tree_key = format!("page:{}:tree", page_id);
        let direction_str = match direction {
            VoteDirection::Up => "1",
            VoteDirection::Down => "-1",
        };
        let path_json = serde_json::to_string(path)
            .map_err(|e| Error::Internal(format!("Failed to serialize path: {}", e)))?;

        let sha = self.script_shas.get("atomic_vote")
            .ok_or_else(|| Error::Internal("atomic_vote script not loaded".to_string()))?;

        // Use EVALSHA with custom_raw
        let mut args: Vec<Value> = vec![sha.clone().into(), "2".into()]; // 2 keys
        args.push(vote_key.into());
        args.push(tree_key.into());
        args.push(comment_id.to_string().into());
        args.push(direction_str.to_string().into());
        args.push(path_json.into());

        let cmd = CustomCommand::new("EVALSHA", ClusterHash::FirstKey, false);
        let frame = self
            .client
            .custom_raw::<Value>(cmd, args)
            .await?;

        // Extract array result from Resp3Frame
        tracing::debug!("atomic_vote response frame: {:?}", frame);
        let result: Vec<Value> = match frame {
            Resp3Frame::Array { data, .. } => {
                data.into_iter()
                    .map(|f| f.try_into())
                    .collect::<std::result::Result<Vec<Value>, _>>()
                    .map_err(|e: fred::error::Error| Error::Redis(e))?
            }
            Resp3Frame::SimpleError { data, .. } => {
                return Err(Error::Internal(format!("Lua script error: {}", data)));
            }
            Resp3Frame::BlobError { data, .. } => {
                let err_msg = String::from_utf8_lossy(&data);
                return Err(Error::Internal(format!("Lua script error: {}", err_msg)));
            }
            other => {
                return Err(Error::Internal(format!("Unexpected response type from EVALSHA: {:?}", other)));
            }
        };

        // Parse results
        let final_vote = match result.get(0) {
            Some(Value::String(s)) if !s.is_empty() => {
                match s.to_string().as_str() {
                    "1" => Some(VoteDirection::Up),
                    "-1" => Some(VoteDirection::Down),
                    _ => None,
                }
            }
            _ => None,
        };

        let upvotes: i64 = result.get(1).and_then(|v| v.as_i64()).unwrap_or(0);
        let downvotes: i64 = result.get(2).and_then(|v| v.as_i64()).unwrap_or(0);
        let upvote_delta: i64 = result.get(3).and_then(|v| v.as_i64()).unwrap_or(0);
        let downvote_delta: i64 = result.get(4).and_then(|v| v.as_i64()).unwrap_or(0);

        Ok((final_vote, upvotes, downvotes, upvote_delta, downvote_delta))
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

    /// Increment user's total comment count
    pub async fn increment_user_comment_count(&self, user_id: Uuid) -> Result<i64> {
        let new_count: i64 = self
            .client
            .hincrby(format!("user:{}", user_id), "total_comments", 1)
            .await?;
        Ok(new_count)
    }

    /// Decrement user's total comment count
    pub async fn decrement_user_comment_count(&self, user_id: Uuid) -> Result<i64> {
        let new_count: i64 = self
            .client
            .hincrby(format!("user:{}", user_id), "total_comments", -1)
            .await?;
        Ok(new_count)
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
    // Media Operations
    // ========================================================================

    /// Store media metadata
    pub async fn set_media_info(&self, info: &crate::types::MediaInfo) -> Result<()> {
        self.hsetall_json(&format!("media:{}", info.id), info).await
    }

    /// Get media metadata
    pub async fn get_media_info(&self, media_id: Uuid) -> Result<Option<crate::types::MediaInfo>> {
        self.hgetall_json(&format!("media:{}", media_id)).await
    }

    /// Delete media metadata
    pub async fn delete_media_info(&self, media_id: Uuid) -> Result<()> {
        let _: () = self.client.del(format!("media:{}", media_id)).await?;
        Ok(())
    }

    /// Add media to user's media set
    pub async fn add_user_media(&self, user_id: Uuid, media_id: Uuid) -> Result<()> {
        let key = format!("user:{}:media", user_id);
        let _: () = self.client.sadd(key, media_id.to_string()).await?;
        Ok(())
    }

    /// Remove media from user's media set
    pub async fn remove_user_media(&self, user_id: Uuid, media_id: Uuid) -> Result<()> {
        let key = format!("user:{}:media", user_id);
        let _: () = self.client.srem(key, media_id.to_string()).await?;
        Ok(())
    }

    /// Get all media uploaded by a user (across all sites)
    pub async fn get_user_media(&self, user_id: Uuid) -> Result<Vec<Uuid>> {
        let key = format!("user:{}:media", user_id);
        let ids: Vec<String> = self.client.smembers(key).await?;
        Ok(ids.into_iter().filter_map(|s| s.parse().ok()).collect())
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
        // Sessions are persistent (no TTL) for better UX
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

    /// Increment both pageview and usage counters in a single pipeline (one round trip)
    pub async fn increment_pageview_with_usage(&self, page_id: Uuid, site_id: Uuid) -> Result<()> {
        let month = Utc::now().format("%Y-%m").to_string();
        let pipeline = self.client.pipeline();

        // Queue both commands to the pipeline
        pipeline.incr::<i64, _>(format!("page:{}:views", page_id)).await?;
        pipeline.hincrby::<i64, _, _>(format!("site:{}:usage:{}", site_id, month), "pageviews", 1).await?;

        // Execute both commands in a single round trip
        let _: Vec<i64> = pipeline.all().await?;
        Ok(())
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

    pub async fn cache_project_id(&self, project_id: &str, info: &ProjectIdInfo) -> Result<()> {
        let value = serde_json::to_string(info)?;
        self.client
            .set::<(), _, _>(
                format!("apikey:{}", project_id),
                value,
                Some(Expiration::EX(PROJECT_ID_CACHE_TTL)),
                None,
                false,
            )
            .await?;
        Ok(())
    }

    pub async fn get_cached_project_id(&self, project_id: &str) -> Result<Option<ProjectIdInfo>> {
        let value: Option<String> = self.client.get(format!("apikey:{}", project_id)).await?;
        Ok(value.and_then(|v| serde_json::from_str(&v).ok()))
    }

    /// Invalidate the cached project ID (for testing/development)
    pub async fn invalidate_project_id_cache(&self, project_id: &str) -> Result<()> {
        self.client.del::<(), _>(format!("apikey:{}", project_id)).await?;
        Ok(())
    }

    // ========================================================================
    // Site Config (for standalone mode)
    // ========================================================================

    pub async fn get_site_config(&self, site_id: Uuid) -> Result<Option<SiteConfig>> {
        let value: Option<String> = self.client.get(format!("site:{}:config", site_id)).await?;
        Ok(value.and_then(|v| serde_json::from_str(&v).ok()))
    }

    /// Look up site config by API key (public or secret)
    pub async fn get_site_config_by_api_key(&self, api_key: &str) -> Result<Option<SiteConfig>> {
        // First, look up the site_id from the API key index
        let site_id_str: Option<String> = self.client.get(format!("apikey:{}:site", api_key)).await?;

        if let Some(site_id_str) = site_id_str {
            if let Ok(site_id) = site_id_str.parse::<Uuid>() {
                return self.get_site_config(site_id).await;
            }
        }

        Ok(None)
    }

    /// Count how many site configs exist in Redis
    /// Note: Uses custom to execute KEYS - only use for admin operations
    pub async fn count_sites(&self) -> Result<usize> {
        let result: Vec<String> = self.client
            .custom(fred::cmd!("KEYS"), vec!["site:*:config"])
            .await?;
        Ok(result.len())
    }

    pub async fn set_site_config(&self, config: &SiteConfig) -> Result<()> {
        let json = serde_json::to_string(config)?;
        self.client
            .set::<(), _, _>(format!("site:{}:config", config.id), json, None, None, false)
            .await?;

        // Create API key -> site_id indexes for lookup
        self.client
            .set::<(), _, _>(
                format!("apikey:{}:site", config.project_id_public),
                config.id.to_string(),
                None,
                None,
                false,
            )
            .await?;
        self.client
            .set::<(), _, _>(
                format!("apikey:{}:site", config.project_id_secret),
                config.id.to_string(),
                None,
                None,
                false,
            )
            .await?;

        Ok(())
    }

    /// Look up site by API key (for SaaS mode)
    pub async fn get_site_by_project_id(&self, project_id: &str) -> Result<Option<(Uuid, SiteConfig)>> {
        // Get site_id from API key index
        let site_id: Option<String> = self.client.get(format!("apikey:{}:site", project_id)).await?;
        let Some(site_id_str) = site_id else {
            return Ok(None);
        };

        let site_id: Uuid = site_id_str.parse().map_err(|_| Error::Internal("Invalid site_id".into()))?;

        // Get site config
        let config = self.get_site_config(site_id).await?;
        Ok(config.map(|c| (site_id, c)))
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

        // Delete email/username/provider indexes
        if let Some(ref user) = user {
            if let Some(ref email) = user.email {
                self.client.del::<(), _>(format!("email:{}", email.to_lowercase())).await?;
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
    // Pinned Messages
    // ========================================================================

    /// Pin a comment on a page
    pub async fn pin_comment(&self, page_id: Uuid, comment_id: Uuid, timestamp: i64) -> Result<()> {
        self.client
            .zadd::<(), _, _>(
                format!("page:{}:pinned", page_id),
                None,
                None,
                false,
                false,
                (timestamp as f64, comment_id.to_string()),
            )
            .await?;
        Ok(())
    }

    /// Unpin a comment from a page
    pub async fn unpin_comment(&self, page_id: Uuid, comment_id: Uuid) -> Result<()> {
        self.client
            .zrem::<(), _, _>(format!("page:{}:pinned", page_id), comment_id.to_string())
            .await?;
        Ok(())
    }

    /// Get all pinned comment IDs for a page (sorted by pinned timestamp, newest first)
    /// Returns Vec<(comment_id, pinned_at)>
    pub async fn get_pinned_comments(&self, page_id: Uuid) -> Result<Vec<(Uuid, i64)>> {
        // ZREVRANGEBYSCORE with WITHSCORES - get all entries sorted newest first
        let entries: Vec<(f64, String)> = self
            .client
            .zrevrangebyscore(
                format!("page:{}:pinned", page_id),
                f64::INFINITY,
                f64::NEG_INFINITY,
                true,
                None
            )
            .await?;

        Ok(entries
            .into_iter()
            .filter_map(|(score, id_str)| {
                id_str.parse::<Uuid>().ok().map(|id| (id, score as i64))
            })
            .collect())
    }

    /// Check if a comment is pinned
    pub async fn is_comment_pinned(&self, page_id: Uuid, comment_id: Uuid) -> Result<bool> {
        let score: Option<f64> = self
            .client
            .zscore(format!("page:{}:pinned", page_id), comment_id.to_string())
            .await?;
        Ok(score.is_some())
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

        // Fields that should always remain as strings even if they look like numbers
        // (e.g., OAuth provider IDs can be very large numeric strings)
        let string_fields = ["provider_id", "phone"];

        // Convert HashMap<String, String> to JSON object, parsing values appropriately
        let mut json_map = serde_json::Map::new();
        for (k, v) in data {
            // For certain fields, always keep as string to avoid numeric parsing issues
            let json_val = if string_fields.contains(&k.as_str()) {
                serde_json::Value::String(v)
            } else {
                // Try to parse as JSON value (handles booleans, numbers, null, objects, arrays)
                serde_json::from_str(&v).unwrap_or_else(|_| serde_json::Value::String(v))
            };
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
