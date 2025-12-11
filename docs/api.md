# ThreadKit API Reference

## Authentication

### API Keys

ThreadKit uses two types of API keys:

- **Public Key** (`tk_pub_xxx`) - Embedded in client-side JavaScript, safe to expose
- **Secret Key** (`tk_sec_xxx`) - Server-side only, used for admin operations

### JWT Tokens

Authenticated users receive JWT tokens after login. Include in requests:

```
Authorization: Bearer <token>
```

---

## Public API (Client Library)

### Get Comments

```http
GET /v1/comments
```

**Headers:**
- `projectid: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (optional, for vote status)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_url` | string | required | URL of the page |
| `sort` | string | `top` | Sort order: `new`, `top`, `controversial`, `old` |

**Response:**
```json
{
  "page_id": "uuid",
  "tree": {
    "comments": [
      {
        "i": "comment-uuid",
        "a": "author-uuid",
        "n": "John Doe",
        "p": "https://avatar.url",
        "k": 42,
        "t": "Great article!",
        "h": "<p>Great article!</p>",
        "u": 10,
        "d": 2,
        "c": 1705315800,
        "m": 1705315800,
        "r": [],
        "s": "approved",
        "pid": null
      }
    ],
    "updated_at": 1705315800
  },
  "total": 42,
  "pageviews": 1234,
  "pinned": []
}
```

**Note:** The response uses a compact tree format with single-letter keys to reduce bandwidth. The entire comment tree is returned (no pagination).

---

### Create Comment

```http
POST /v1/comments
```

**Headers:**
- `projectid: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "page_url": "https://example.com/blog/post",
  "content": "This is my comment with **markdown**",
  "parent_id": "uuid-of-parent-comment"
}
```

**Response:**
```json
{
  "comment": { ... }
}
```

---

### Update Comment

```http
PUT /v1/comments/:id
```

**Headers:**
- `projectid: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (required, must be owner)

**Body:**
```json
{
  "content": "Updated comment text"
}
```

---

### Delete Comment

```http
DELETE /v1/comments/:id
```

**Headers:**
- `projectid: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (required, owner or moderator)

**Response:** `204 No Content`

---

### Vote on Comment

```http
POST /v1/comments/:id/vote
```

**Headers:**
- `projectid: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "direction": "up"
}
```

**Vote Logic:**
- No existing vote → Add vote
- Same direction → Remove vote (toggle off)
- Different direction → Switch vote

**Response:**
```json
{
  "upvotes": 11,
  "downvotes": 2,
  "user_vote": "up"
}
```

---

### Report Comment

```http
POST /v1/comments/:id/report
```

**Headers:**
- `projectid: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (required)

**Body:**
```json
{
  "reason": "spam",
  "details": "This is clearly promotional spam"
}
```

**Reason options:** `spam`, `harassment`, `hate_speech`, `misinformation`, `other`

---

## Auth API

### Register (Email/Phone)

```http
POST /v1/auth/register
```

**Headers:**
- `projectid: tk_pub_xxx` (required)

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

Or with phone:
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "email_verified": false
  }
}
```

---

### Login

```http
POST /v1/auth/login
```

**Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

---

### Verify Email/Phone

```http
POST /v1/auth/verify
```

**Body:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

---

### Forgot Password

```http
POST /v1/auth/forgot
```

**Body:**
```json
{
  "email": "john@example.com"
}
```

---

### Reset Password

```http
POST /v1/auth/reset
```

**Body:**
```json
{
  "email": "john@example.com",
  "code": "123456",
  "new_password": "newpassword123"
}
```

---

### OAuth Login

```http
GET /v1/auth/:provider
```

**Providers:** `google`, `github`

Redirects to OAuth provider. After authorization, redirects to callback.

---

### Refresh Token

```http
POST /v1/auth/refresh
```

**Body:**
```json
{
  "refresh_token": "eyJ..."
}
```

---

### Logout

```http
POST /v1/auth/logout
```

**Headers:**
- `Authorization: Bearer <token>` (required)

---

## User API

### Get Current User

```http
GET /v1/users/me
```

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "avatar_url": "https://...",
  "email_verified": true,
  "karma": 42,
  "unread_notifications": 5
}
```

---

### Update Profile

```http
PUT /v1/users/me
```

**Body:**
```json
{
  "name": "John Smith",
  "avatar_url": "https://..."
}
```

---

### Get User Profile

```http
GET /v1/users/:id
```

Returns public profile info only.

---

### Get Notifications

```http
GET /v1/notifications
```

**Query Parameters:**
- `offset` (default: 0)
- `limit` (default: 50)

**Response:**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "notification_type": "reply",
      "comment_id": "uuid",
      "from_user": { ... },
      "read": false,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "unread_count": 5
}
```

---

### Mark Notifications Read

```http
POST /v1/notifications/read
```

Marks all notifications as read.

---

## Moderation API

Requires moderator or admin role.

### Get Moderation Queue

```http
GET /v1/moderation/queue
```

Returns comments pending approval.

---

### Get Reports

```http
GET /v1/moderation/reports
```

Returns reported comments.

---

### Approve Comment

```http
POST /v1/moderation/approve/:id
```

---

### Reject Comment

```http
POST /v1/moderation/reject/:id
```

---

### Ban User

```http
POST /v1/moderation/ban/:user_id
```

---

### Unban User

```http
POST /v1/moderation/unban/:user_id
```

---

### Shadow Ban User

```http
POST /v1/moderation/shadowban/:user_id
```

User can still post, but comments are not visible to others.

---

## Admin API

### Admin Management (Owner Only)

Requires secret API key (`tk_sec_xxx`).

```http
GET /v1/sites/:id/admins
POST /v1/sites/:id/admins
DELETE /v1/sites/:id/admins/:user_id
```

**Add Admin Body:**
```json
{
  "user_id": "uuid-of-commenter"
}
```

---

### Moderator Management (Admin+)

Requires admin JWT.

```http
GET /v1/sites/:id/moderators
POST /v1/sites/:id/moderators
DELETE /v1/sites/:id/moderators/:user_id
```

---

## WebSocket API

The WebSocket API uses **JSON-RPC 2.0 notifications** (no response expected) for real-time updates.

### Connection

```
ws://server:8081/ws?project_id=tk_pub_xxx&token=<jwt>
```

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `project_id` | Yes | Your public API key |
| `token` | No | JWT token for authenticated users |

### Protocol

All messages use JSON-RPC 2.0 notification format:

```json
{
  "jsonrpc": "2.0",
  "method": "<method_name>",
  "params": { ... }
}
```

### Client → Server Messages

#### Subscribe to Page

Subscribe to receive real-time events for a page:

```json
{
  "jsonrpc": "2.0",
  "method": "subscribe",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Unsubscribe from Page

```json
{
  "jsonrpc": "2.0",
  "method": "unsubscribe",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Typing Indicator

Send while the user is typing (recommended: every 1 second while typing):

```json
{
  "jsonrpc": "2.0",
  "method": "typing",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "reply_to": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### Ping (Heartbeat)

```json
{
  "jsonrpc": "2.0",
  "method": "ping",
  "params": {}
}
```

### Server → Client Messages

#### Connection Established

Sent immediately after WebSocket connection is accepted:

```json
{
  "jsonrpc": "2.0",
  "method": "connected",
  "params": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

#### Presence List

Sent after subscribing to a page, contains current users on the page:

```json
{
  "jsonrpc": "2.0",
  "method": "presence",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "users": [
      {
        "id": "uuid",
        "name": "John Doe",
        "avatar_url": "https://..."
      }
    ]
  }
}
```

#### User Joined

```json
{
  "jsonrpc": "2.0",
  "method": "user_joined",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "avatar_url": "https://..."
    }
  }
}
```

#### User Left

```json
{
  "jsonrpc": "2.0",
  "method": "user_left",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "uuid"
  }
}
```

#### Typing Indicator

Sent when another user is typing. Auto-expires after 3 seconds of no refresh:

```json
{
  "jsonrpc": "2.0",
  "method": "typing",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "avatar_url": "https://..."
    },
    "reply_to": "660e8400-e29b-41d4-a716-446655440001"
  }
}
```

#### New Comment

```json
{
  "jsonrpc": "2.0",
  "method": "new_comment",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "comment": { ... }
  }
}
```

#### Edit Comment

```json
{
  "jsonrpc": "2.0",
  "method": "edit_comment",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "comment_id": "uuid",
    "content": "Updated text",
    "content_html": "<p>Updated text</p>"
  }
}
```

#### Delete Comment

```json
{
  "jsonrpc": "2.0",
  "method": "delete_comment",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "comment_id": "uuid"
  }
}
```

#### Vote Update

```json
{
  "jsonrpc": "2.0",
  "method": "vote_update",
  "params": {
    "page_id": "550e8400-e29b-41d4-a716-446655440000",
    "comment_id": "uuid",
    "upvotes": 10,
    "downvotes": 2
  }
}
```

#### Notification

```json
{
  "jsonrpc": "2.0",
  "method": "notification",
  "params": {
    "type": "reply",
    "comment_id": "uuid",
    "from_user": {
      "id": "uuid",
      "name": "John Doe",
      "avatar_url": "https://..."
    }
  }
}
```

**Notification types:** `reply`, `mention`, `upvote`

#### Pong (Heartbeat Response)

```json
{
  "jsonrpc": "2.0",
  "method": "pong",
  "params": {}
}
```

#### Error

```json
{
  "jsonrpc": "2.0",
  "method": "error",
  "params": {
    "code": "rate_limit",
    "message": "Too many messages"
  }
}
```

**Error codes:**
| Code | Description |
|------|-------------|
| `rate_limit` | Too many messages per second |
| `subscription_limit` | Too many subscribed pages (max 10) |
| `invalid_json` | Invalid JSON-RPC message |
| `invalid_method` | Unknown method |

### Connection Limits

| Limit | Value |
|-------|-------|
| Messages per second | 10 |
| Idle timeout | 5 minutes |
| Max subscriptions per connection | 10 |

### Metrics Endpoint

The WebSocket server exposes metrics at `/metrics`:

```http
GET /metrics
```

**Response:**
```json
{
  "active_connections": 1234,
  "total_connections": 50000,
  "messages_received": 1000000,
  "messages_sent": 2000000,
  "batcher_flushes": 10000,
  "batcher_writes_batched": 50000,
  "batcher_reads_batched": 100000,
  "page_channels": 500
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
| Code | Meaning |
|------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| GET requests | 100/min per IP |
| POST/PUT/DELETE | 30/min per user |
| Auth endpoints | 10/min per IP |

Rate limited responses include `Retry-After` header.
