use utoipa::OpenApi;

use crate::routes::{admin, auth, comments, media, moderation, turnstile, users};

const API_DESCRIPTION: &str = r#"
ThreadKit is an open-source, self-hostable comment system for websites and applications.

## Quick Start

1. Get an API key from your dashboard (or generate one if self-hosting)
2. Include the API key in all requests via the `projectid` header
3. Authenticate users via OAuth, email/password, or enable anonymous posting
4. Load comments: `GET /comments?page_url=your-page-url`
5. Post comments: `POST /comments` (requires auth or anonymous enabled)

## WebSocket API

For real-time updates (new comments, typing indicators, presence), connect to the WebSocket server.

### Connection

```
ws://server:8081/ws?project_id=tk_pub_xxx&token=<jwt>
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `project_id` | Yes | Your public API key |
| `token` | No | JWT token for authenticated users |

### Protocol

All messages use JSON-RPC 2.0 notification format:

```json
{"jsonrpc": "2.0", "method": "<method>", "params": {...}}
```

### Client → Server

| Method | Params | Description |
|--------|--------|-------------|
| `subscribe` | `page_id: UUID` | Subscribe to page events |
| `unsubscribe` | `page_id: UUID` | Unsubscribe from page |
| `typing` | `page_id: UUID, reply_to?: UUID` | Send typing indicator |
| `ping` | `{}` | Heartbeat |

### Server → Client

| Method | Params | Description |
|--------|--------|-------------|
| `connected` | `user_id?: UUID` | Connection established |
| `presence` | `page_id, users[]` | Current users on page |
| `user_joined` | `page_id, user` | User joined page |
| `user_left` | `page_id, user_id` | User left page |
| `typing` | `page_id, user, reply_to?` | User is typing |
| `new_comment` | `page_id, comment` | New comment posted |
| `edit_comment` | `page_id, comment_id, content, content_html` | Comment edited |
| `delete_comment` | `page_id, comment_id` | Comment deleted |
| `vote_update` | `page_id, comment_id, upvotes, downvotes` | Votes changed |
| `notification` | `type, comment_id, from_user` | User notification |
| `pong` | `{}` | Heartbeat response |
| `error` | `code, message` | Error occurred |

### Limits

| Limit | Value |
|-------|-------|
| Messages/second | 10 |
| Idle timeout | 5 minutes |
| Max subscriptions | 10 |

## Authentication

- **OAuth**: Google and GitHub sign-in
- **Email/Password**: Registration with email verification
- **Anonymous**: Guest posting
- **Wallet**: Ethereum and Solana signature verification

All auth methods can be enabled/disabled in site configuration.

Authenticated endpoints require `Authorization: Bearer <token>` header.

## Comment Tree

Comments are returned as a compact tree with single-letter keys:

```json
{"tree": {"c": [...], "u": 1234567}, "total": 42}
```

- `c` = comments array, `u` = updated_at timestamp
- Each comment has `r` (replies) for nested threading
- See `TreeComment` schema for full structure

## Caching

The `/comments` endpoint supports ETag caching:

- Response includes `ETag` header
- Send `If-None-Match: "<etag>"` to get `304 Not Modified`
- Works with Cloudflare and CDNs for instant responses

## Rate Limits

- Read: 100/second per API key
- Write: 10/second per API key

---

## Redis Schema

### Users

| Key | Type | Description |
|-----|------|-------------|
| `user:{user_id}` | Hash | User data (id, name, email, avatar_url, karma, created_at, etc.) |
| `user:{user_id}:password` | String | Argon2 password hash |
| `user:{user_id}:comments` | ZSet | User's comments across all sites. Values: `page_id:comment_id` |
| `user:{user_id}:votes` | ZSet | Comments user has voted on. Values: `page_id:comment_id` |
| `user:{user_id}:notifications` | ZSet | User notifications (score = timestamp) |
| `user:{user_id}:unread` | String | Count of unread notifications |
| `user:{user_id}:blocked` | Set | User IDs this user has blocked |
| `user:{user_id}:blocked_by` | Set | User IDs who have blocked this user |
| `email:{email}` | String | Maps email to user_id |
| `phone:{phone}` | String | Maps phone to user_id |
| `username:{username}` | String | Maps username to user_id |
| `provider:{provider}:{id}` | String | Maps OAuth provider ID to user_id |
| `wallet:{chain}:{address}` | String | Maps wallet address to user_id |

### Sessions & Auth

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `session:{session_id}` | Hash | - | Session data (user_id, created_at, user_agent, ip) |
| `verify:{key}` | String | 10m | Email/phone verification code |
| `web3nonce:{chain}:{address}` | String | 10m | Web3 signature nonce |

### Pages

`page_id` is deterministic: `UUID(hash(site_id + page_url))`

| Key | Type | Description |
|-----|------|-------------|
| `page:{page_id}:tree` | JSON | Full page tree (comments, votes, authors) |
| `page:{page_id}:views` | String | Pageview counter |

### Page Tree Structure

Single-letter keys for efficiency:

```json
{
  "c": [{
    "i": "uuid",
    "a": "author_uuid",
    "n": "username",
    "p": "avatar_url",
    "k": 100,
    "t": "comment text",
    "h": "<p>html</p>",
    "u": 5,
    "d": 1,
    "x": 1704067200,
    "m": 1704067200,
    "r": [...]
  }],
  "u": 1704067200
}
```

**Tree root:**
| Key | Description |
|-----|-------------|
| `c` | comments array |
| `u` | updated_at (timestamp) |

**Comment object:**
| Key | Description |
|-----|-------------|
| `i` | id (UUID) |
| `a` | author_id |
| `n` | author name |
| `p` | avatar (picture) |
| `k` | author karma |
| `t` | text content |
| `h` | html content |
| `u` | upvotes (count) |
| `d` | downvotes (count) |
| `x` | created_at |
| `m` | modified_at |
| `r` | replies (nested comments) |

**User votes:** Fetch via `GET /pages/my_votes?page_url=...` - returns `{comment_id: "up"|"down"}` map

**Deleted comments**: `a` = `d0000000-0000-0000-0000-000000000000`, `n` = `[deleted]`, content cleared, replies preserved.

**Anonymous comments**: `a` = `a0000000-0000-0000-0000-000000000000`

### Sites

| Key | Type | Description |
|-----|------|-------------|
| `site:{site_id}:config` | JSON | Site configuration |
| `site:{site_id}:admins` | Set | Admin user IDs |
| `site:{site_id}:moderators` | Set | Moderator user IDs |
| `site:{site_id}:blocked` | Set | Blocked user IDs |
| `site:{site_id}:shadowbanned` | Set | Shadowbanned user IDs |
| `site:{site_id}:modqueue` | ZSet | Pending comments (`page_id:comment_id`) |
| `site:{site_id}:reports` | ZSet | Reported comments |
| `site:{site_id}:locked_pages` | Set | Pages where posting is disabled |
| `site:{site_id}:usage:{YYYY-MM}` | Hash | Monthly usage stats |

### API Keys

| Key | Type | Description |
|-----|------|-------------|
| `apikey:{key}:site` | String | Maps API key to site_id |

### Design

**Read path**: Single `GET page:{id}:tree` returns all comments. Server filters, sorts, strips vote arrays.

**Write path**: Update page tree JSON + user/site indexes.

**Performance**: O(1) page load (~1-5ms for 1000 comments) instead of N+1 queries.
"#;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "ThreadKit API",
        version = "0.0.1",
        description = API_DESCRIPTION,
        license(name = "MIT")
    ),
    servers(
        (url = "https://api.usethreadkit.com/v1", description = "Production API")
    ),
    tags(
        (name = "auth", description = "Authentication endpoints"),
        (name = "comments", description = "Comment CRUD and voting"),
        (name = "media", description = "Media upload and management"),
        (name = "users", description = "User profile and settings"),
        (name = "notifications", description = "User notifications"),
        (name = "moderation", description = "Content moderation (moderator+)"),
        (name = "admin", description = "Site administration (admin+)"),
        (name = "turnstile", description = "Cloudflare Turnstile CAPTCHA")
    ),
    paths(
        // Auth
        auth::auth_methods,
        auth::send_otp,
        auth::verify_otp,
        auth::anonymous_login,
        auth::refresh_token,
        auth::logout,
        auth::oauth_start,
        auth::oauth_callback,
        auth::ethereum_nonce,
        auth::ethereum_verify,
        auth::solana_nonce,
        auth::solana_verify,
        // Turnstile
        turnstile::get_config,
        turnstile::challenge_page,
        turnstile::verify_token,
        // Comments
        comments::get_comments,
        comments::create_comment,
        comments::update_comment,
        comments::delete_comment,
        comments::vote_comment,
        comments::report_comment,
        comments::get_my_votes,
        // Media
        media::upload_avatar,
        media::upload_image,
        media::delete_media,
        // Users
        users::get_me,
        users::update_me,
        users::delete_account,
        users::get_user,
        users::check_username,
        users::get_blocked_users,
        users::block_user,
        users::unblock_user,
        users::get_my_comments,
        users::get_user_comments,
        // Notifications
        users::get_notifications,
        users::mark_read,
        // Moderation
        moderation::get_queue,
        moderation::get_reports,
        moderation::approve_comment,
        moderation::reject_comment,
        moderation::ban_user,
        moderation::unban_user,
        moderation::shadowban_user,
        // Admin
        admin::get_admins,
        admin::add_admin,
        admin::remove_admin,
        admin::get_moderators,
        admin::add_moderator,
        admin::remove_moderator,
        admin::get_site_comments,
        admin::get_posting_status,
        admin::set_site_posting,
        admin::get_page_posting_status,
        admin::set_page_posting,
    ),
    components(
        schemas(
            // Common types
            threadkit_common::types::SocialLinks,
            threadkit_common::types::UserPublic,
            threadkit_common::types::Comment,
            threadkit_common::types::CommentStatus,
            threadkit_common::types::CommentWithAuthor,
            threadkit_common::types::VoteDirection,
            threadkit_common::types::SortOrder,
            threadkit_common::types::Notification,
            threadkit_common::types::NotificationType,
            threadkit_common::types::Report,
            threadkit_common::types::ReportReason,
            threadkit_common::types::DeletedAccountStats,
            threadkit_common::types::PageTree,
            threadkit_common::types::TreeComment,
            // Auth types
            auth::AuthMethodsResponse,
            auth::AuthMethod,
            auth::SendOtpRequest,
            auth::VerifyOtpRequest,
            auth::AnonymousLoginRequest,
            auth::AuthResponse,
            auth::UserResponse,
            auth::RefreshRequest,
            auth::NonceResponse,
            auth::Web3VerifyRequest,
            // Comment types
            comments::GetCommentsResponse,
            comments::CreateCommentRequest,
            comments::CreateCommentResponse,
            comments::UpdateCommentRequest,
            comments::DeleteRequest,
            comments::VoteRequest,
            comments::VoteResponse,
            comments::ReportRequest,
            comments::GetVotesResponse,
            // Media types
            media::UploadResponse,
            // User types
            users::MeResponse,
            users::UpdateMeRequest,
            users::CheckUsernameRequest,
            users::CheckUsernameResponse,
            users::NotificationsResponse,
            users::NotificationWithDetails,
            users::BlockedUsersResponse,
            users::UserCommentsResponse,
            users::CommentItem,
            // Moderation types
            moderation::QueueResponse,
            moderation::QueueItem,
            moderation::ReportsResponse,
            moderation::ReportItem,
            moderation::ModerateCommentRequest,
            moderation::BanUserRequest,
            moderation::BanUserResponse,
            // Turnstile types
            turnstile::VerifyRequest,
            turnstile::VerifyResponse,
            turnstile::TurnstileConfigResponse,
            // Admin types
            admin::RoleListResponse,
            admin::AddUserRequest,
            admin::SiteCommentsResponse,
            admin::SiteCommentItem,
            admin::PostingStatusResponse,
            admin::SetPostingRequest,
        )
    ),
    security(
        ("project_id" = []),
        ("secret_key" = []),
        ("bearer" = [])
    )
)]
pub struct ApiDoc;
