# ThreadKit Redis Data Structures

This document describes all Redis keys used by ThreadKit.

---

## User Data

### User Profile
```
Key:    user:{user_id}
Type:   Hash
TTL:    None (persistent)

Fields:
  id              UUID
  name            String
  email           String (nullable)
  phone           String (nullable)
  avatar_url      String (nullable)
  provider        "email" | "phone" | "google" | "github"
  provider_id     String (nullable, for OAuth)
  email_verified  "true" | "false"
  phone_verified  "true" | "false"
  karma           Integer (accumulated upvotes)
  global_banned   "true" | "false"
  shadow_banned   "true" | "false"
  created_at      ISO 8601 timestamp
```

### User Indexes (for lookup)
```
Key:    email:{email}
Type:   String
Value:  user_id

Key:    phone:{phone}
Type:   String
Value:  user_id

Key:    provider:{provider}:{provider_id}
Type:   String
Value:  user_id
```

### Verification Codes
```
Key:    verify:{email_or_phone}
Type:   String (JSON)
TTL:    10 minutes

Value: {
  "code": "123456",
  "user_id": "uuid",
  "verification_type": "email" | "phone" | "password_reset",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### User Sessions
```
Key:    session:{session_id}
Type:   Hash
TTL:    30 days

Fields:
  user_id         UUID
  created_at      ISO 8601 timestamp
  last_used       ISO 8601 timestamp
  user_agent      String
  ip              String
```

---

## Comment Data

### Comment
```
Key:    comment:{comment_id}
Type:   Hash
TTL:    None (persistent)

Fields:
  id              UUID
  site_id         UUID
  page_id         UUID
  page_url        String (original URL)
  author_id       UUID
  parent_id       UUID | null (for threading)
  content         String (markdown)
  content_html    String (sanitized HTML)
  upvotes         Integer
  downvotes       Integer
  reply_count     Integer
  depth           Integer (nesting level, 0 = root)
  status          "pending" | "approved" | "rejected" | "deleted"
  edited          "true" | "false"
  created_at      ISO 8601 timestamp
  updated_at      ISO 8601 timestamp
```

### Page Comments Index (by date - newest first)
```
Key:    page:{page_id}:comments:new
Type:   Sorted Set
TTL:    None

Score:  created_at timestamp (milliseconds)
Value:  comment_id
```

### Page Comments Index (by score)
```
Key:    page:{page_id}:comments:top
Type:   Sorted Set
TTL:    None

Score:  upvotes - downvotes
Value:  comment_id
```

### Page Comments Index (by hot score)
```
Key:    page:{page_id}:comments:hot
Type:   Sorted Set
TTL:    None

Score:  Calculated hot score (votes + time decay)
Value:  comment_id

Hot score formula (similar to Reddit):
  score = sign(upvotes - downvotes) * log10(max(|upvotes - downvotes|, 1))
  order = log10(max(seconds_since_epoch, 1))
  hot = score + order / 45000
```

### Comment Replies Index
```
Key:    comment:{comment_id}:replies
Type:   Sorted Set
TTL:    None

Score:  created_at timestamp
Value:  comment_id (child comment)
```

---

## Voting

### User Vote Tracking
```
Key:    vote:{user_id}:{comment_id}
Type:   String
TTL:    None

Value:  "up" | "down"
```

**Vote Logic:**
1. Check if key exists
2. If not exists → set key, increment vote count
3. If exists with same value → delete key, decrement vote count
4. If exists with different value → update key, adjust both counts

---

## Site Roles

### Site Admins
```
Key:    site:{site_id}:admins
Type:   Set
TTL:    None

Values: user_id (one per admin)
```

### Site Moderators
```
Key:    site:{site_id}:moderators
Type:   Set
TTL:    None

Values: user_id (one per moderator)
```

### Blocked Users
```
Key:    site:{site_id}:blocked
Type:   Set
TTL:    None

Values: user_id
```

### Shadow Banned Users
```
Key:    site:{site_id}:shadowbanned
Type:   Set
TTL:    None

Values: user_id
```

---

## Notifications

### User Notifications
```
Key:    user:{user_id}:notifications
Type:   Sorted Set
TTL:    None

Score:  created_at timestamp (milliseconds)
Value:  JSON {
  "id": "uuid",
  "notification_type": "reply" | "mention" | "upvote" | "mod_action",
  "comment_id": "uuid",
  "from_user_id": "uuid",
  "read": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Unread Count
```
Key:    user:{user_id}:unread
Type:   String (counter)
TTL:    None

Value:  Integer count of unread notifications
```

---

## Real-Time Features

### Typing Indicator
```
Key:    page:{page_id}:typing
Type:   Sorted Set
TTL:    None (self-cleaning via score)

Score:  timestamp when started typing
Value:  user_id

Notes:
  - Entries older than 5 seconds are pruned on read
  - Client should send "typing" every 2-3 seconds while typing
  - Client sends "stop_typing" when done
```

### Presence (who's viewing)
```
Key:    page:{page_id}:presence
Type:   Set
TTL:    None (managed by WebSocket connect/disconnect)

Values: user_id (one per connected user)
```

---

## Pageviews

### Page View Counter
```
Key:    page:{page_id}:views
Type:   String (counter)
TTL:    None

Value:  Integer total pageviews
```

### Daily Breakdown
```
Key:    page:{page_id}:views:{YYYY-MM-DD}
Type:   String (counter)
TTL:    90 days

Value:  Integer pageviews for that day
```

---

## Usage Metering

### Site Monthly Usage
```
Key:    site:{site_id}:usage:{YYYY-MM}
Type:   Hash
TTL:    90 days

Fields:
  comments              Integer
  pageviews             Integer
  api_requests          Integer
  websocket_connections Integer
```

### Unique Visitors
```
Key:    site:{site_id}:visitors:{YYYY-MM}
Type:   Set (or HyperLogLog in production)
TTL:    90 days

Values: visitor fingerprints
```

---

## Moderation

### Moderation Queue
```
Key:    site:{site_id}:modqueue
Type:   Sorted Set
TTL:    None

Score:  created_at timestamp
Value:  comment_id

Notes:
  - Comments with status "pending" are added here
  - Removed when approved or rejected
```

### Reports Queue
```
Key:    site:{site_id}:reports
Type:   Sorted Set
TTL:    None

Score:  created_at timestamp
Value:  JSON {
  "comment_id": "uuid",
  "reporter_id": "uuid",
  "reason": "spam" | "harassment" | "hate_speech" | "misinformation" | "other",
  "details": "Optional details",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Caching

### API Key Cache
```
Key:    apikey:{api_key}
Type:   String (JSON)
TTL:    5 minutes

Value: {
  "site_id": "uuid",
  "key_type": "public" | "secret",
  "settings": { ... site settings ... }
}
```

### Site Config (Standalone Mode)
```
Key:    site:{site_id}:config
Type:   Hash
TTL:    None

Fields:
  id                UUID
  name              String
  domain            String
  api_key_public    String
  api_key_secret    String
  settings          JSON (serialized SiteSettings)
```

---

## Rate Limiting

### Request Rate Limit
```
Key:    ratelimit:{type}:{id}:{time_bucket}
Type:   String (counter)
TTL:    Auto-expires with bucket

Types:
  - key:{api_key}     Per API key
  - ip:{ip_address}   Per IP address
  - user:{user_id}    Per authenticated user

Time bucket: Unix timestamp / 60 (minute buckets)

Example:
  ratelimit:ip:192.168.1.1:1705319400 = "42"
```

---

## Pub/Sub Channels

### Page Updates
```
Channel: page:{page_id}

Messages:
  { "type": "new_comment", "comment_id": "uuid" }
  { "type": "edit_comment", "comment_id": "uuid" }
  { "type": "delete_comment", "comment_id": "uuid" }
  { "type": "vote_update", "comment_id": "uuid", "upvotes": 10, "downvotes": 2 }
```

---

## Memory Estimation

| Data Type | Approx Size | Notes |
|-----------|-------------|-------|
| User | 500 bytes | ~2MB per 4000 users |
| Comment | 1 KB | ~1MB per 1000 comments |
| Vote | 50 bytes | ~50KB per 1000 votes |
| Session | 200 bytes | TTL cleans up |
| Notification | 300 bytes | Consider pruning old ones |

**For 10,000 comments with 50,000 users:**
- Users: ~25 MB
- Comments: ~10 MB
- Indexes: ~5 MB
- Votes: ~25 MB (assuming avg 5 votes per comment)
- **Total: ~65 MB**

Redis can handle millions of comments comfortably.
