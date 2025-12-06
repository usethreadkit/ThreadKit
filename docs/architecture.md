# ThreadKit Architecture

## Overview

ThreadKit is a comment system SaaS with two deployment modes:
1. **Self-hosted (OSS)** - Rust server + Redis only
2. **SaaS** - Full stack with Next.js dashboard, Postgres, and Stripe

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ThreadKit System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Client Side                                     │ │
│  │                                                                         │ │
│  │  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐  │ │
│  │  │  Embed Script   │     │  Comment Widget │     │   Dashboard UI   │  │ │
│  │  │   (client/)     │────▶│    (React)      │     │  (Next.js app)   │  │ │
│  │  └─────────────────┘     └─────────────────┘     └──────────────────┘  │ │
│  │           │                       │                        │            │ │
│  └───────────┼───────────────────────┼────────────────────────┼────────────┘ │
│              │                       │                        │              │
│              ▼                       ▼                        ▼              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         Server Side                                     │ │
│  │                                                                         │ │
│  │  ┌─────────────────────────────────┐     ┌──────────────────────────┐  │ │
│  │  │        Rust Server (OSS)        │     │   Next.js API (SaaS)     │  │ │
│  │  │                                 │     │                          │  │ │
│  │  │  ┌───────────┐  ┌────────────┐  │     │  • Dashboard auth        │  │ │
│  │  │  │   HTTP    │  │ WebSocket  │  │     │  • Site management       │  │ │
│  │  │  │   :8080   │  │   :8081    │  │◀───▶│  • Billing/Stripe        │  │ │
│  │  │  └─────┬─────┘  └─────┬──────┘  │     │  • API key validation    │  │ │
│  │  │        │              │         │     └────────────┬─────────────┘  │ │
│  │  │        └──────┬───────┘         │                  │                │ │
│  │  │               │                 │                  │                │ │
│  │  │               ▼                 │                  ▼                │ │
│  │  │        ┌─────────────┐          │           ┌─────────────┐         │ │
│  │  │        │    Redis    │          │           │  Postgres   │         │ │
│  │  │        │  (comments) │          │           │  (billing)  │         │ │
│  │  │        └─────────────┘          │           └─────────────┘         │ │
│  │  │                                 │                                    │ │
│  │  └─────────────────────────────────┘                                    │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Rust Server (OSS)

**Location:** `server/`

**Crates:**
- `threadkit-common` - Shared types, config, Redis client, auth utilities
- `threadkit-http` - HTTP API server (comments, auth, moderation)
- `threadkit-websocket` - WebSocket server (real-time updates)
- `threadkit-loadtest` - Load testing tool

**Responsibilities:**
- Comment CRUD
- User authentication (OAuth, email, phone)
- Real-time updates (WebSocket)
- Voting, notifications, moderation
- Rate limiting
- Usage metering

**Depends on:** Redis only

### Next.js Dashboard (SaaS only)

**Location:** `usethreadkit.com/`

**Responsibilities:**
- Site owner authentication (separate user pool)
- Site creation and management
- API key generation
- Billing (Stripe integration)
- Analytics views
- Subscription/plan management

**Depends on:** Postgres, Redis (read-only for analytics)

### Client Library

**Location:** `client/`

**Responsibilities:**
- Embed script for static sites
- Comment widget UI
- WebSocket connection for live updates
- Typing indicators, presence

---

## Data Flow

### Comment Submission

```
1. User types comment in widget
2. Client sends POST /v1/comments with JWT
3. Rust server validates JWT
4. Checks user role (blocked? shadow banned?)
5. Determines status based on moderation mode
6. Stores comment in Redis
7. Updates indexes (page, replies, modqueue)
8. Publishes to Redis pub/sub
9. WebSocket broadcasts to subscribers
10. Returns comment to client
```

### Authentication Flow

```
Email/Phone:
1. POST /v1/auth/register → Create user, send verification code
2. POST /v1/auth/verify → Verify email/phone
3. POST /v1/auth/login → Validate credentials, return JWT

OAuth:
1. GET /v1/auth/google → Redirect to Google
2. User authorizes
3. GET /v1/auth/google/callback → Exchange code for token
4. Fetch user info from Google
5. Create/update user in Redis
6. Return JWT
```

### Voting Flow

```
1. POST /v1/comments/:id/vote { direction: "up" }
2. Check existing vote: vote:{user_id}:{comment_id}
3. Calculate delta:
   - No vote → +1 to direction
   - Same → -1 (toggle off)
   - Different → -1 old, +1 new
4. Update vote key
5. Update comment upvotes/downvotes
6. Update top index score
7. Publish vote_update event
8. Return new counts
```

---

## Role Hierarchy

```
Owner (Site Creator)
  └── Can: Everything, billing, add/remove admins
  └── Auth: Secret API key or Dashboard JWT

Admin (Promoted Commenter)
  └── Can: All moderation, add/remove moderators
  └── Auth: Commenter JWT with admin role

Moderator (Promoted Commenter)
  └── Can: Approve/reject, ban users
  └── Auth: Commenter JWT with moderator role

User (Registered Commenter)
  └── Can: Comment, vote, report
  └── Auth: Commenter JWT

Anonymous
  └── Can: Read comments (if allowed)
  └── Auth: None (public API key only)
```

---

## Two Deployment Modes

### Standalone Mode (Self-Hosted)

```bash
MODE=standalone
```

- Single site configured via environment variables
- API keys from env or auto-generated
- No Postgres required
- No billing/limits
- Admin bootstrapped via Redis CLI

**Flow:**
```
Request → Rust Server → Redis
```

### SaaS Mode

```bash
MODE=saas
INTERNAL_API_URL=http://localhost:3000/api/internal
```

- Multi-tenant
- API key validation calls Next.js
- Plan limits enforced
- Usage metered

**Flow:**
```
Request → Rust Server → validate key → Next.js → Postgres
                     → Redis for data
```

---

## Redis Key Design

### Namespacing

All keys are namespaced to prevent collisions:

```
user:{uuid}           - User data
comment:{uuid}        - Comment data
page:{uuid}:...       - Page-scoped data
site:{uuid}:...       - Site-scoped data
vote:{user}:{comment} - Vote records
```

### Index Strategy

Comments are indexed multiple ways for different access patterns:

```
page:{id}:comments:new    - ZSET sorted by time (newest first)
page:{id}:comments:top    - ZSET sorted by score (most upvoted)
page:{id}:comments:hot    - ZSET sorted by hot score
comment:{id}:replies      - ZSET of child comments
```

### Denormalization

Some data is denormalized for performance:
- `comment.reply_count` - Avoids counting replies on each request
- `user.karma` - Accumulated upvotes across all comments
- `user:{id}:unread` - Counter for notification badge

---

## Security Considerations

### API Keys

- Public keys (`tk_pub_`) - Safe to embed, limited operations
- Secret keys (`tk_sec_`) - Server-side only, owner access

### JWT Tokens

- Signed with HS256
- Contains: user_id, site_id, session_id, expiry
- Session stored in Redis for revocation

### Rate Limiting

- Per IP for unauthenticated requests
- Per user for authenticated requests
- Redis-based sliding window

### XSS Prevention

- Markdown content sanitized before storing HTML
- Content-Security-Policy headers recommended

### Shadow Banning

- User doesn't know they're banned
- Their comments appear to them but not others
- Check `site:{id}:shadowbanned` set

---

## Scaling Considerations

### Stateless Servers

Both HTTP and WebSocket servers are stateless:
- No in-memory state between requests
- All state in Redis
- Can scale horizontally

### WebSocket Fan-Out

Each WebSocket server subscribes to Redis pub/sub:
- Comment events published to `page:{id}` channels
- Each server broadcasts to its connected clients
- No server-to-server communication needed

### Redis Performance

Expected performance for typical usage:
- 10K concurrent WebSocket connections: ~50MB RAM
- 1M comments: ~1GB Redis memory
- 99th percentile latency: <5ms

### High Availability

For production:
- Redis Sentinel or Cluster
- Multiple server instances behind load balancer
- Health checks on `/health` endpoint

---

## Future Considerations

### Potential Enhancements

1. **Image uploads** - Store in S3/R2, reference in comments
2. **Mentions** - Parse @username, create notifications
3. **Rich embeds** - Preview links (oEmbed)
4. **Spam detection** - Integrate Akismet or ML model
5. **Import/Export** - Disqus migration tool
6. **Webhooks** - Notify external systems of events
7. **SSO** - SAML/OIDC for enterprise
8. **Multi-language** - i18n support in widget

### Breaking Changes to Avoid

- Redis key format changes (migration required)
- API response structure changes
- JWT claims changes (invalidates tokens)
