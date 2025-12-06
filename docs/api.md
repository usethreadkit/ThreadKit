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
- `X-API-Key: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (optional, for vote status)

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page_url` | string | required | URL of the page |
| `sort` | string | `new` | Sort order: `new`, `top`, `hot` |
| `offset` | number | `0` | Pagination offset |
| `limit` | number | `50` | Items per page (max 100) |
| `parent_id` | uuid | null | Get replies to specific comment |

**Response:**
```json
{
  "comments": [
    {
      "id": "uuid",
      "author": {
        "id": "uuid",
        "name": "John Doe",
        "avatar_url": "https://...",
        "karma": 42
      },
      "content": "Great article!",
      "content_html": "<p>Great article!</p>",
      "upvotes": 10,
      "downvotes": 2,
      "reply_count": 3,
      "depth": 0,
      "status": "approved",
      "edited": false,
      "created_at": "2024-01-15T10:30:00Z",
      "user_vote": "up"
    }
  ],
  "total": 42,
  "pageviews": 1234
}
```

---

### Create Comment

```http
POST /v1/comments
```

**Headers:**
- `X-API-Key: tk_pub_xxx` (required)
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
- `X-API-Key: tk_pub_xxx` (required)
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
- `X-API-Key: tk_pub_xxx` (required)
- `Authorization: Bearer <token>` (required, owner or moderator)

**Response:** `204 No Content`

---

### Vote on Comment

```http
POST /v1/comments/:id/vote
```

**Headers:**
- `X-API-Key: tk_pub_xxx` (required)
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
- `X-API-Key: tk_pub_xxx` (required)
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
- `X-API-Key: tk_pub_xxx` (required)

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

Connect to WebSocket for real-time updates:

```
ws://server:8081/ws?api_key=tk_pub_xxx&token=<jwt>
```

### Client → Server Messages

```json
{ "type": "subscribe", "page_id": "uuid" }
{ "type": "unsubscribe", "page_id": "uuid" }
{ "type": "typing", "page_id": "uuid" }
{ "type": "stop_typing", "page_id": "uuid" }
{ "type": "ping" }
```

### Server → Client Messages

```json
{ "type": "connected", "user_id": "uuid" }
{ "type": "new_comment", "comment": { ... } }
{ "type": "edit_comment", "comment_id": "uuid", "content": "...", "content_html": "..." }
{ "type": "delete_comment", "comment_id": "uuid" }
{ "type": "vote_update", "comment_id": "uuid", "upvotes": 10, "downvotes": 2 }
{ "type": "typing", "page_id": "uuid", "user": { ... } }
{ "type": "stop_typing", "page_id": "uuid", "user_id": "uuid" }
{ "type": "presence", "page_id": "uuid", "users": [ ... ] }
{ "type": "user_joined", "page_id": "uuid", "user": { ... } }
{ "type": "user_left", "page_id": "uuid", "user_id": "uuid" }
{ "type": "notification", "notification_type": "reply", "comment_id": "uuid", "from_user": { ... } }
{ "type": "pong" }
{ "type": "error", "message": "..." }
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
