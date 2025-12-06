use utoipa::OpenApi;

use crate::routes::{admin, auth, comments, moderation, users};

const API_DESCRIPTION: &str = r#"
ThreadKit is an open-source, self-hostable comment system for websites and applications.

## Quick Start

1. Get an API key from your dashboard (or generate one if self-hosting)
2. Include the API key in all requests via the `X-API-Key` header
3. Authenticate users via OAuth, email/password, or enable anonymous posting
4. Load comments: `GET /comments?page_url=your-page-url`
5. Post comments: `POST /comments` (requires auth or anonymous enabled)

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
    "v": ["uid1"],
    "w": ["uid2"],
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
| `u` | upvotes |
| `d` | downvotes |
| `x` | created_at |
| `m` | modified_at |
| `v` | upvoters (array) |
| `w` | downvoters (array) |
| `r` | replies (nested comments) |

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
        (name = "users", description = "User profile and settings"),
        (name = "notifications", description = "User notifications"),
        (name = "moderation", description = "Content moderation (moderator+)"),
        (name = "admin", description = "Site administration (admin+)")
    ),
    paths(
        // Auth
        auth::auth_methods,
        auth::send_otp,
        auth::verify_otp,
        auth::register,
        auth::login,
        auth::verify,
        auth::forgot_password,
        auth::reset_password,
        auth::refresh_token,
        auth::logout,
        auth::oauth_start,
        auth::oauth_callback,
        // Comments
        comments::get_comments,
        comments::create_comment,
        comments::update_comment,
        comments::delete_comment,
        comments::vote_comment,
        comments::report_comment,
        // Users
        users::get_me,
        users::update_me,
        users::delete_account,
        users::get_user,
        users::check_username,
        users::get_blocked_users,
        users::block_user,
        users::unblock_user,
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
        admin::get_posting_status,
        admin::set_site_posting,
        admin::get_page_posting_status,
        admin::set_page_posting,
    ),
    components(
        schemas(
            // Common types
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
            auth::RegisterRequest,
            auth::LoginRequest,
            auth::AuthResponse,
            auth::UserResponse,
            auth::VerifyRequest,
            auth::ForgotPasswordRequest,
            auth::ResetPasswordRequest,
            auth::RefreshRequest,
            // Comment types
            comments::GetCommentsResponse,
            comments::CreateCommentRequest,
            comments::CreateCommentResponse,
            comments::UpdateCommentRequest,
            comments::DeleteRequest,
            comments::VoteRequest,
            comments::VoteResponse,
            comments::ReportRequest,
            // User types
            users::MeResponse,
            users::UpdateMeRequest,
            users::CheckUsernameRequest,
            users::CheckUsernameResponse,
            users::NotificationsResponse,
            users::NotificationWithDetails,
            users::BlockedUsersResponse,
            // Moderation types
            moderation::QueueResponse,
            moderation::QueueItem,
            moderation::ReportsResponse,
            moderation::ReportItem,
            moderation::ModerateCommentRequest,
            moderation::BanUserRequest,
            moderation::BanUserResponse,
            // Admin types
            admin::RoleListResponse,
            admin::AddUserRequest,
            admin::PostingStatusResponse,
            admin::SetPostingRequest,
        )
    ),
    security(
        ("api_key" = []),
        ("secret_key" = []),
        ("bearer" = [])
    )
)]
pub struct ApiDoc;
