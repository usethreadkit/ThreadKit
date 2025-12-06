# ThreadKit - Project Notes & Architecture

## Overview

**ThreadKit** is a modern, open-source commenting system designed for static sites (Next.js, React, etc.) as a lightweight, privacy-focused alternative to Disqus.

**Core Value Proposition:**
- Lightweight and fast (vs Disqus bloat)
- Privacy-focused (no tracking, no ads)
- Real-time updates via WebSockets
- AI-powered moderation
- SaaS + Open Source hybrid model
- **Two modes**: Threaded comments OR live chat (same backend, different UI)

### Two Modes, One System

**Comments Mode (Traditional):**
- Nested replies (Reddit-style threading)
- Upvote/downvote
- Sorted by votes, time, etc.
- Perfect for: Blog posts, articles, documentation

**Chat Mode (Live):**
- Flat message stream (Discord/Twitch-style)
- Chronological only
- Real-time conversation
- Perfect for: Live events, community pages, documentation help, product launches

**Key insight:** Both modes use the **exact same backend**. Chat is just comments with no `parent_id` and different rendering. Same API, same Redis, same WebSocket, same moderation tools.

```typescript
// Same component, different mode
<ThreadKit mode="comments" url="/blog/post" />
<ThreadKit mode="chat" url="/livestream" />
```

---

## Business Model

### Pricing Strategy
- **Free tier**: Full OSS functionality, self-hosted
- **$5/month**: Hosted SaaS + remove branding
- **$20/month** (future): LLM moderation, advanced analytics, priority support

**Tiered pricing (recommended):**
```
Free (Self-hosted):
- Full open source
- Unlimited comments/chat
- Both modes available
- Community support

Hobby ($5/mo):
- Hosted infrastructure
- Remove branding
- Both modes (comments + chat)
- Up to 10k messages/month

Pro ($29/mo):
- Everything in Hobby
- LLM moderation (1000 checks/mo)
- Advanced analytics
- Priority support
- Chat enhancements (presence, typing, reactions)
- Up to 100k messages/month
- Custom CSS

Business ($149/mo):
- Everything in Pro
- White-label
- SSO
- Multiple sites (up to 10)
- 99.9% SLA
- Unlimited messages
```

### Open Source Philosophy
**What's OSS:**
- React component (npm package, MIT license)
- Rust backend (full source code)
- Database schema & Redis structure
- Moderation dashboard (React app)
- API client library

**What's SaaS-exclusive:**
- Hosted infrastructure (Redis, servers, scaling)
- LLM-powered spam/toxicity detection (expensive API calls)
- Advanced analytics & insights
- Priority support

**Why This Works:**
- Builds trust (no lock-in, inspect the code)
- Community contributions
- Self-hosters become evangelists
- Most people will pay $5/mo to avoid ops complexity
- Examples: Ghost, Plausible, Supabase

---

## Chat Mode vs Comments Mode

### Same Backend, Different Rendering

**The genius of this design:** Chat mode is just comments with `parent_id = None` and different UI. Zero backend changes needed.

### Data Model (Identical)

```rust
struct Comment {
    id: String,
    user_id: String,
    text: String,
    timestamp: i64,
    upvotes: Vec<String>,
    downvotes: Vec<String>,
    parent_id: Option<String>,  // None in chat, Some(id) in threaded
    children: Vec<Comment>,     // Empty in chat, populated in threaded
}
```

### UI Differences

**Comments Mode:**
```typescript
// Nested, sorted by votes, with reply tree
<CommentTree 
  comments={comments}
  sortBy="votes"
  maxDepth={5}
  allowReplies={true}
  showVoting={true}
/>
```

**Chat Mode:**
```typescript
// Flat, chronological, auto-scroll
<ChatStream 
  messages={comments.slice(-100)}  // Last 100 only
  autoScroll={true}
  showReactions={true}
/>
```

### Component API

```typescript
<ThreadKit 
  siteId="abc123"
  url={pageUrl}
  
  // Mode selection (just changes rendering)
  mode="comments" | "chat"
  
  // Comments-specific (ignored in chat)
  maxDepth={5}
  sortBy="votes" | "newest" | "oldest"
  allowVoting={true}
  
  // Chat-specific (ignored in comments)
  showLastN={100}
  autoScroll={true}
  reactions={['👍', '❤️', '🔥', '😂']}
  showPresence={true}
  showTyping={true}
/>
```

### Use Cases

**Comments Mode (Async Discussion):**
- Blog posts
- Documentation
- News articles
- Product pages
- Anywhere you want persistent, structured discussion

**Chat Mode (Sync Conversation):**
- Live streams (Twitch-style chat)
- Live events (sports, product launches, keynotes)
- Community pages (Discord-style embedded chat)
- Documentation help ("currently 5 people reading this")
- E-commerce drops (hype chat during sales)
- Small communities (more intimate than forums)

### Implementation Details

**Backend doesn't know about modes:**
```rust
// Same endpoint handles both
async fn post_comment(payload: NewComment) -> Result<Comment> {
    let comment = Comment {
        id: Uuid::new_v4().to_string(),
        text: payload.text,
        parent_id: payload.parent_id,  // None for chat, Some(id) for replies
        // ... rest
    };
    
    save_to_redis(&comment).await?;
    broadcast_via_websocket(&comment).await?;
    
    Ok(comment)
}

// Chat mode client just never sends parent_id
// Comments mode client sends parent_id for replies
```

**Frontend rendering:**
```typescript
const ThreadKit = ({ mode, ...props }) => {
  const [comments, setComments] = useState([]);
  
  // Same data fetching and WebSocket for both
  useComments(siteId, url, setComments);
  
  // Different rendering
  return mode === 'chat' 
    ? <ChatView comments={comments} />
    : <CommentsView comments={comments} />;
};
```

### Chat-Specific Features (UI Only)

**Reactions instead of votes:**
```typescript
// Still uses upvotes array, just renders as emoji reactions
upvotes: ['user1:👍', 'user2:❤️', 'user3:👍']

// UI shows: 👍 2  ❤️ 1
```

**@Mentions (client-side parsing):**
```typescript
// Backend stores raw text: "hey @alice check this out"
// Frontend renders: "hey <span class="mention">@alice</span> check this out"
```

**Typing indicators (WebSocket only, not stored):**
```typescript
ws.send({ type: 'typing', user_id: currentUser });
// Broadcast to others, don't save to database
```

**Presence ("12 online") (WebSocket only):**
```typescript
// Track connected WebSocket clients
// Broadcast count updates
// Not stored in database
```

### Business Model Impact

**Same infrastructure = can offer both:**

```
Starter ($5/mo):
- Choose comments OR chat mode
- Unlimited messages

Pro ($29/mo):
- BOTH modes on same site
- Mix per page (blog = comments, events = chat)
- Advanced chat features (reactions, presence, typing)

Business ($149/mo):
- Everything
- White-label
- Multiple sites
```

### Why This Is Powerful

1. **Expands market** - Live event hosts, streamers, community sites
2. **Low effort** - ~8 hours to build chat UI, backend already done
3. **Competitive advantage** - Discord is overkill, existing chat widgets suck
4. **Sticky** - Chat users are highly engaged
5. **Differentiation** - No other comment system offers both modes

### Market Demand

**Existing chat widget services:**
- Chatroll ($5-20/mo)
- Cbox (free/paid)
- Chatwing ($5/mo)

**They all have problems:**
- Old tech (no WebSockets)
- Ugly UIs
- No privacy focus
- No open source
- Poor moderation

**ThreadKit advantages:**
- Modern WebSocket-based
- Beautiful UI
- Privacy-first
- Open source
- Inline moderation
- Can switch between modes

---

## Tech Stack

### Backend
- **Language**: Rust (for performance, memory safety, WebSocket scalability)
- **Framework**: Axum (ergonomic, from Tokio team)
- **Database**: Redis (fast key-value store)
- **WebSocket**: tokio-tungstenite
- **Middleware**: Tower (auth, CORS, rate limiting)
- **Auth**: JWT + OAuth (Google, GitHub, etc.)
- **Serialization**: MessagePack (not JSON - see below)

### Frontend
- **Component**: React (TypeScript)
- **Distribution**: npm package
- **Bundle size target**: <20kb gzipped (without React/ReactDOM)
- **Real-time**: WebSocket client (with polling fallback)
- **Dependencies**: React and ReactDOM as **peer dependencies** (user provides, not bundled)
- **Styling**: Scoped CSS with class prefix + reset (`.threadkit-root`)

### Why Peer Dependencies (Not Bundled)

**Problem avoided**: Don't want to be like Disqus (150+ network requests, megabytes of JS)

**Solution**: 
```json
{
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

**Benefits:**
- User's app already has React/ReactDOM
- Your bundle: ~15-20kb (just your code)
- No duplication
- Standard practice (all modern React libraries do this)

**For non-React sites:**
```html
<!-- Load React from CDN (one-time cost: ~130kb gzipped) -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/threadkit@1/dist/threadkit.umd.js"></script>
```

### CSS Reset Strategy

**Problem**: Component will be embedded in any website with any existing CSS. Need isolation.

**Solution: Class Prefix + CSS Reset**

```css
/* All styles scoped under .threadkit-root */
.threadkit-root {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  color: #1a1a1a;
}

.threadkit-root *,
.threadkit-root *::before,
.threadkit-root *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Reset all elements to prevent host page interference */
.threadkit-root button {
  background: none;
  border: none;
  font: inherit;
  cursor: pointer;
  -webkit-appearance: none;
}

.threadkit-root input,
.threadkit-root textarea {
  font: inherit;
  background: transparent;
  border: none;
  outline: none;
}
```

**File Structure:**
```
component/
├── src/
│   ├── styles/
│   │   ├── reset.css       # CSS reset
│   │   ├── base.css        # Base variables and tokens
│   │   ├── comment.css     # Comment styles
│   │   ├── form.css        # Form styles
│   │   └── moderation.css  # Mod UI styles
│   ├── ThreadKit.tsx
│   └── index.ts
```

**CSS Variables for Theming:**
```css
.threadkit-root {
  --threadkit-primary: #0066cc;
  --threadkit-danger: #dc3545;
  --threadkit-bg: #ffffff;
  --threadkit-border: #e1e4e8;
  --threadkit-text: #1a1a1a;
  --threadkit-radius: 6px;
}

.threadkit-root[data-theme="dark"] {
  --threadkit-bg: #1a1a1a;
  --threadkit-text: #e6e6e6;
}
```

**Usage:**
```typescript
<ThreadKit siteId="abc" url="/" theme="light" />
```

**Why not Shadow DOM?**
- More complex setup
- Some React libraries don't work in Shadow DOM
- Can't inherit fonts from host page
- Good enough isolation with class prefix for 99% of sites
- Can upgrade later if needed

**Testing:**
- Create test pages with hostile CSS
- Verify component looks correct despite interference
- Test with various frameworks (Next.js, Gatsby, plain HTML)

### Infrastructure
- **Deployment**: Single Rust binary (~10MB)
- **Hosting options**: Fly.io, Railway, bare metal
- **Scaling**: Horizontal with Redis pub/sub for WebSocket synchronization

---

## Data Architecture

### Redis Key Structure
```
Key: [site_id]_[sha256(url)]
Value: MessagePack-encoded CommentThread

CommentThread {
  comments: [
    {
      id: string,
      user_id: string,
      text: string,
      timestamp: i64,
      upvotes: [user_ids],
      downvotes: [user_ids],
      parent_id: optional<string>,  // None = top-level or chat message
      children: [Comment],          // Empty in chat mode
    }
  ]
}
```

**This structure supports both modes:**
- **Comments mode**: Uses `parent_id` and `children` for threading
- **Chat mode**: `parent_id` is always None, `children` always empty
- Same backend, same storage, just different rendering on frontend

### Why MessagePack over JSON?

**JSON Problems:**
- Verbose (2.5 KB for typical thread)
- Slow parsing
- Large memory footprint in Redis

**MessagePack Benefits:**
- 40% smaller (1.5 KB typical)
- 3-5x faster encoding/decoding
- Language-agnostic (Rust + JavaScript support)
- Still relatively debuggable
- **Saves $20-40/month on Redis hosting at scale**

**Other Options Considered:**
- Protocol Buffers: Too complex, requires .proto schemas
- Bincode: Fastest but Rust-only (JS can't decode)
- CBOR: Similar to MessagePack but less popular

**Migration Strategy:**
1. Start with JSON (ship fast)
2. Add MessagePack with dual-read support
3. Background job to convert old data
4. Remove JSON support

---

## Authentication Flow

### OAuth Popup Pattern (Hybrid Approach)

**Problem with third-party cookies:**
- Safari blocks them
- Chrome phasing them out
- Can't set cookies on your domain from embedded component

**Solution: Popup + JWT**
```javascript
// User clicks "Sign in with Google"
const popup = window.open('https://api.threadkit.com/auth/google?siteId=xxx', 'auth', 'width=500,height=600');

// After OAuth completes, popup sends message to parent
window.addEventListener('message', (event) => {
  if (event.origin === 'https://api.threadkit.com') {
    const { token } = event.data;
    localStorage.setItem('threadkit_token', token);
    // Now make API calls with this JWT
  }
});
```

**Why this works:**
- No third-party cookies needed
- Works on all browsers
- No navigation disruption (stays on page)
- JWT stored in localStorage, sent with API requests

**Backend considerations:**
- CORS: Allow requests from any domain (validate siteId)
- Rate limiting: By IP + siteId
- Site verification: Meta tag or DNS record to prove domain ownership

---

## Real-Time Architecture

### WebSocket Strategy: Progressive Enhancement

**DON'T require WebSockets on every page** - use hybrid approach:

**Tier 1: Basic HTTP (always works)**
- Initial load: REST API fetch
- Post comment: HTTP POST
- Simple, reliable, works everywhere

**Tier 2: Polling (simple real-time)**
- Check for updates every 30 seconds
- Low overhead, works behind firewalls
- Good enough for most blogs

**Tier 3: WebSocket (optimal real-time)**
- Instant updates for active discussions
- Only connect if user is actively viewing
- Close after 5 min inactivity

**Why not WebSocket-only?**
- Connection overhead (100-500ms on mobile)
- Battery drain (persistent connection)
- Server memory (10k connections = significant RAM)
- Corporate firewalls block WebSockets
- Scaling complexity (need sticky sessions or Redis pub/sub)
- Connection drops on mobile network switches

**Implementation:**
```rust
// Backend supports both
async fn get_comments() -> Json<Comments> { /* HTTP endpoint */ }
async fn ws_handler() -> Response { /* Optional WebSocket */ }
async fn post_comment() -> Json<Comment> {
    let comment = save_to_redis().await?;
    
    // Try to broadcast via WebSocket (best effort)
    if let Some(tx) = state.ws_channels.get(&key) {
        tx.send(comment.clone()).ok();
    }
    
    // Always return via HTTP
    Ok(Json(comment))
}
```

**Smart defaults:**
```javascript
{
  realTime: 'auto', // 'always' | 'auto' | 'never'
  fallbackToPolling: true,
  pollingInterval: 30000,
  wsTimeout: 5000,
  closeInactiveWs: 300000, // 5 min
}
```

**Auto mode logic:**
- High-traffic page (>10 comments/hour) → WebSocket
- Low-traffic page → Polling
- Mobile/slow connection → Polling
- WebSocket fails → Graceful fallback

### Real-time Moderation Updates

**Key feature**: When a moderator takes action, it updates for everyone in real-time:

```typescript
// WebSocket receives moderation events
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  switch (update.type) {
    case 'comment_deleted':
      // Remove comment from all viewers
      setComments(prev => 
        prev.filter(c => c.id !== update.comment_id)
      );
      break;
      
    case 'comment_pinned':
      // Move comment to top for all viewers
      setComments(prev => 
        prev.map(c => c.id === update.comment_id 
          ? { ...c, pinned: true } 
          : c
        )
      );
      break;
      
    case 'user_banned':
      // Hide all comments from banned user
      setComments(prev => 
        prev.filter(c => c.user_id !== update.user_id)
      );
      break;
      
    case 'comment_edited':
      // Update edited comment
      setComments(prev =>
        prev.map(c => c.id === update.comment_id
          ? { ...c, text: update.text, edited: true }
          : c
        )
      );
      break;
  }
};
```

**Backend broadcasts moderation actions:**
```rust
async fn delete_comment(
    Path((comment_id,)): Path<(String,)>,
    State(state): State<AppState>,
    claims: Claims,
) -> Result<StatusCode> {
    let comment: Comment = state.redis.get(&format!("comment_{}", comment_id))?;
    
    // Verify permissions
    if !check_moderator_permission(&comment.site_id, &claims.user_id, &state.redis).await? {
        return Err(StatusCode::FORBIDDEN);
    }
    
    // Delete from Redis
    state.redis.del(&format!("comment_{}", comment_id))?;
    
    // Broadcast to all WebSocket clients on this page
    if let Some(tx) = state.ws_channels.get(&comment.page_key) {
        tx.send(CommentUpdate::Deleted { 
            comment_id: comment_id.clone() 
        }).ok();
    }
    
    // Log moderation action
    log_mod_action(&state.redis, ModAction {
        site_id: comment.site_id,
        mod_user_id: claims.user_id,
        action_type: "delete",
        target_id: comment_id,
        timestamp: now(),
    }).await?;
    
    Ok(StatusCode::NO_CONTENT)
}
```

**Audit Logging:**
```rust
// Log all moderation actions for review
let log_key = format!("site_{}_mod_log", site_id);
redis.zadd(log_key, timestamp, json!({
    "mod_id": mod_user_id,
    "action": "delete_comment",
    "comment_id": comment_id,
    "reason": reason,
    "timestamp": timestamp,
}))?;

// View in dashboard: last 100 mod actions
let recent_actions = redis.zrevrange(log_key, 0, 100)?;
```

---

## Moderation System

### Two-Tier Moderation Approach

**Tier 1: Inline Moderation (In-Component)**
- Quick, contextual actions while reading comments
- Moderators see extra controls directly in the comment component
- Real-time: actions broadcast to all users via WebSocket

**Tier 2: Dashboard (Centralized)**
- Bulk operations and analytics
- Site-wide management
- User administration

### Inline Moderation (Core Feature)

**Concept**: If you're logged in as admin/moderator, you see additional controls:

```
Regular user sees:
┌─────────────────────────────────────┐
│ John Doe · 2 hours ago              │
│ This is a great article!            │
│ [Reply] [Upvote 5]                  │
└─────────────────────────────────────┘

Moderator sees:
┌─────────────────────────────────────┐
│ John Doe · 2 hours ago              │
│ This is a great article!            │
│ [Reply] [Upvote 5]                  │
│ [🗑️ Delete] [🚫 Ban] [📌 Pin] [✏️ Edit]│
└─────────────────────────────────────┘
```

**Implementation:**
```typescript
// Component checks if current user is moderator
const [isModerator, setIsModerator] = useState(false);

useEffect(() => {
  const checkModStatus = async () => {
    const token = localStorage.getItem('threadkit_token');
    const response = await fetch(`/api/sites/${siteId}/check-mod`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setIsModerator(data.isModerator || data.isAdmin);
  };
  checkModStatus();
}, [siteId]);

// Show mod controls if user is moderator
<Comment 
  comment={comment}
  showModControls={isModerator}
/>
```

**Inline Actions:**
- 🗑️ Delete comment (instant removal, broadcasts to all users)
- 🚫 Ban user (removes all their comments)
- 📌 Pin comment (sticky at top)
- ✏️ Edit comment (with "edited by moderator" flag)
- 👁️ Hide comment (soft delete, only mods see it)

**Benefits:**
- No context switching to dashboard
- Faster moderation (one-click delete)
- See discussion context around bad comment
- Lower friction for busy moderators

### Role System

```rust
pub enum Role {
    User,
    Moderator,
    Admin,
}

pub struct SiteModerator {
    pub site_id: String,
    pub user_id: String,
    pub role: Role,
    pub permissions: ModeratorPermissions,
    pub added_by: String,
    pub added_at: i64,
}

pub struct ModeratorPermissions {
    pub can_delete: bool,
    pub can_ban: bool,
    pub can_edit: bool,
    pub can_pin: bool,
    pub can_manage_mods: bool, // Admin only
}

// Redis keys:
// "site_{site_id}_moderators" -> Set<user_id>
// "site_{site_id}_mod_{user_id}" -> SiteModerator details
```

**Permission Checks:**
```rust
async fn check_moderator_permission(
    site_id: &str,
    user_id: &str,
    redis: &Connection,
) -> Result<bool> {
    // Check if user is site owner (admin)
    let site: Site = redis.get(&format!("site_{}", site_id))?;
    if site.owner_id == user_id {
        return Ok(true);
    }
    
    // Check if user is a moderator
    let is_mod: bool = redis.sismember(
        &format!("site_{}_moderators", site_id), 
        user_id
    )?;
    Ok(is_mod)
}
```

**Security:**
- Always verify permissions server-side
- Rate limit mod actions (prevent abuse)
- Audit log all moderation actions
- Double-check before destructive operations

### Dashboard (Complementary to Inline Moderation)

**Dashboard Purpose:**

**1. Overview/Analytics**
- Latest comments across ALL pages (not just one)
- Flagged/reported comments queue
- Spam filter catches
- Site-wide statistics
- User activity trends

**2. Bulk Actions**
- Ban multiple users at once
- Delete spam waves
- Approve queued comments in batch
- Export data

**3. Site Management**
- Add/remove moderators
- Configure settings (profanity list, rate limits)
- Manage API keys
- Billing/subscription

**4. User Management**
- View all banned users
- Unban users
- See user comment history across site
- User behavior patterns

**Dashboard Structure:**
```
┌─────────────────────────────────────┐
│ ThreadKit Dashboard                 │
├─────────────────────────────────────┤
│ Sidebar:                            │
│  - Overview                         │
│  - Latest Comments (all pages)      │
│  - Moderation Queue                 │
│  - Banned Users                     │
│  - Moderators (manage)              │
│  - Settings                         │
│  - Analytics                        │
│  - Audit Log                        │
└─────────────────────────────────────┘
```

**Use Cases:**
- **Inline**: "I'm reading my article, see spam, delete it instantly"
- **Dashboard**: "Daily moderation review session of flagged comments"

### Automated Moderation (Rust Backend)

**Basic Filters:**
- Profanity filter (customizable keyword list per site)
- Spam detection (rate limiting, duplicate content)
- Link spam detection
- ALL CAPS detection

**LLM Moderation (Optional, SaaS-only):**
- Toxicity scoring
- Off-topic detection
- Bot detection
- Quality scoring
- Context-aware moderation

**Auto-Actions:**
- Auto-hide (based on threshold)
- Flag for review
- Auto-delete (obvious spam)
- Shadow ban (serial offenders)

**User-Level Moderation:**
- Report button (users flag comments)
- Upvote/downvote
- Threshold-based hiding (e.g., hide at -5 votes)
- "Subscribe to thread" notifications

### Moderation Queue

- Review flagged comments
- Approve/reject pending comments (if pre-moderation enabled)
- Batch actions
- Filter by page, user, date, reason
- Quick actions (approve/delete/ban)

**Config Example:**
```yaml
moderation:
  auto_moderate: true
  profanity_filter: true
  custom_blocked_words: ["spam", "buy now"]
  
  llm_moderation:
    enabled: true  # SaaS-only feature
    toxicity_threshold: 0.8
    auto_hide_threshold: 0.9
    
  rate_limits:
    comments_per_minute: 5
    comments_per_hour: 50
```

**Why OSS Moderation is Critical:**
- **Trust**: Site owners need to see how it works
- **Customization**: Different sites need different rules
- **Compliance**: Some orgs need to audit for legal reasons
- **Community**: People will contribute better algorithms

**SaaS Value:**
- Running expensive LLM models
- Managed infrastructure
- Analytics & insights
- Priority support

---

## Competition Analysis

### Open Source Competitors

**1. Giscus / Utterances** (GitHub-based)
- Uses GitHub Discussions/Issues for storage
- **Pros**: Free, zero config
- **Cons**: Requires GitHub account, no real moderation, not truly self-hostable
- **ThreadKit advantage**: Actual database, flexible OAuth, works for general public

**2. Remark42** (Go)
- Feature-rich, multi-site support, flat files
- **Pros**: No database needed, social login
- **Cons**: No real-time updates, complex setup
- **ThreadKit advantage**: WebSockets, simpler Redis setup, better DX

**3. Isso** (Python)
- Lightweight (12kb JS), anonymous comments, SQLite
- **Pros**: Simple, privacy-focused
- **Cons**: Development slowed, no real-time, basic moderation
- **ThreadKit advantage**: Modern stack, real-time, LLM moderation

**4. Cusdis** (Node.js)
- 5kb bundle, privacy-focused, has SaaS option
- **Pros**: Very lightweight
- **Cons**: Basic features, no real-time
- **ThreadKit advantage**: More features, better tech stack

**5. Commento / Comentario** (Go)
- Privacy-focused, nice admin UI, PostgreSQL
- **Pros**: Good moderation tools
- **Cons**: No real-time, original abandoned
- **ThreadKit advantage**: Real-time, active development

**6. Coral Talk** (Node.js - Vox Media)
- Enterprise-grade, used by WSJ/WaPo
- **Pros**: Rich moderation for newsrooms
- **Cons**: Heavy, complex, MongoDB, overkill for small sites
- **ThreadKit advantage**: Lightweight, easier setup, better for static sites

**7. Others**: Schnack (abandoned), HashOver (PHP, outdated)

### Where ThreadKit Wins

1. **Modern tech stack**: Rust + Redis + WebSockets (unique combo)
2. **Real-time updates**: Only option with WebSocket + polling fallback
3. **Inline moderation**: Delete/ban directly in component (like Reddit/Discord)
4. **Best DX for Next.js/React**: Purpose-built for modern static sites
5. **LLM-powered moderation**: Future-proof approach
6. **SaaS + OSS hybrid**: Best of both worlds
7. **Performance**: Rust = lowest resource usage, small bundle size
8. **Simple deployment**: Single binary
9. **Not bloated**: Peer dependencies, no tracking, <20kb bundle

### Target Market

**Primary**: Next.js/React developers who want:
- Lightweight alternative to Disqus
- Privacy-focused solution
- Modern tech stack
- Real-time capability
- Easy integration

**Secondary (Disqus Refugees)**: The HUGE market of site owners who:
- Got burned by Disqus's tracking and affiliate hijacking
- Are actively searching for alternatives
- Read blog posts like "Why I left Disqus"
- Want privacy-respecting comments
- Care about their users' experience

**Not competing with**: Enterprise newsroom solutions (Coral Talk), GitHub-only solutions (Giscus for technical docs)

**Positioning**: 
1. **Technical angle**: "ThreadKit: The modern commenting system for the WebSocket era. Built in Rust for performance, designed for Next.js and static sites, with real-time updates and AI-powered moderation. Use our SaaS or self-host - your choice."

2. **Anti-Disqus angle**: "Everything Disqus did wrong, we do right. No tracking, no ads, no affiliate hijacking. Just fast, private, open-source comments."

**Key differentiator**: The "Disqus refugees" market is HUGE and actively looking for alternatives. Every blog post about "why I left Disqus" is free marketing for ThreadKit. These users are already convinced they need to switch - they just need a good alternative.

---

## Why Disqus is Hated - The Complete Story

### The Full List of Disqus Grievances

**1. Affiliate Link Hijacking (The Worst Offense)**
- Automatically injected affiliate links into users' content WITHOUT permission
- Partnered with VigLink (now Sovrn) to replace ANY product links with Disqus's affiliate links
- **Opt-out by default** - enabled automatically, publishers had to manually disable
- Even when opted out, it kept happening (Disqus called it a "bug")
- Publishers got ZERO revenue from affiliate conversions
- Example: Site owner linked to their own product → Disqus replaced it → Disqus got the commission
- **This is economic fraud** - stealing revenue from site owners

**2. Invasive Cross-Site Tracking**
- Tracks users across EVERY site using Disqus, even when not logged in
- Acts as a **web bug** - tracks IP, browser, add-ons, referring pages, exit links
- Builds advertising profiles across millions of sites
- Can de-anonymize "non-PII" data when aggregated
- **Norway fined them €2.5M ($3M) in 2021** for GDPR violations
- Tracked users without consent for programmatic ad targeting
- "Hidden tracking and profiling is very invasive" - Norwegian DPA

**3. Data Sharing With Third Parties**
- Shares user data with third parties for "marketing and advertising"
- No transparency about who these third parties are
- Cookie data, location data, device identifiers all shared
- **Exposed 17.5M user accounts in 2012 data breach** (discovered in 2017)
- Passwords stored with weak SHA-1 hashing
- Email addresses, login names, sign-up dates all leaked

**4. Performance Destruction**
Real test results from independent bloggers:
- **Without Disqus**: 1.8s load, 11 requests, 277KB
- **With Disqus**: 5.7s load, 102 requests (91 third-party!), 707KB
- **3x slower, 9x more requests, 2.5x more bandwidth**
- Continuous background requests while page is open (1000+ requests per minute)
- Loads megabytes of tracking data and ad scripts
- Brave browser blocks 7-10 third-party trackers from Disqus alone

**5. SEO Damage**
- Comments loaded in iframe or via JS → search engines can't index properly
- Slow page speed = Google ranking penalty
- Third-party content affects site quality score
- Lost organic traffic due to poor Core Web Vitals

**6. Forced Advertising (Even When "Disabled")**
- Free tier shows "Promoted Discovery" ads
- Even after disabling ads in settings, tracking continued
- Low-quality, often inappropriate ads
- "Related content" spam at bottom of comments
- No control over what ads appear on YOUR site
- Revenue-sharing only for "qualified publishers" (unclear criteria)

**7. Sponsored Comments**
- Injected sponsored/paid comments into discussions
- **Enabled by default** without asking permission
- No way to opt-out without contacting support
- Ads disguised as legitimate comments
- Undermines trust in comment section

**8. Harassment & Privacy Issues**
- Anyone could follow anyone (no blocking until 2014)
- Full comment history publicly visible on user profiles
- List of all sites where user commented publicly visible
- Led to stalking and harassment
- No privacy controls

**9. Broken Delete Functionality**
- Deleting comment didn't actually delete it until 2015
- Just changed author to "Guest" - content remained public
- Had to manually edit comment body BEFORE deleting to remove content
- "Anonymization" that wasn't anonymous
- Only fixed after years of complaints

**10. Data Lock-in & Vendor Risk**
- Comments stored exclusively on THEIR servers
- Export possible but complex (XML format)
- If Disqus shuts down, millions of comments disappear
- Moving to another platform = broken URLs, lost discussion threads
- Switching cost intentionally high

**11. Rogue Advertisers & Malware**
- Malicious ads redirecting to scam sites
- Suspicious domains belonging to shady ad networks
- Disqus claimed "rogue advertiser" when caught
- Injecting "untrusted and potentially dangerous third party advertising code"
- Site owners liable for malicious content they didn't approve

**12. Lack of Transparency**
- Privacy policy changes without adequate notice
- Features enabled by default without consent
- Called serious violations "bugs" when caught
- No revenue sharing with publishers despite monetizing their traffic
- Unclear about data retention and deletion

**13. Business Model Transformation**
- **Acquired by Zeta Global (ad-tech/marketing company) in 2017**
- Completely shifted from product company to surveillance company
- Originally for publishers, now serves advertisers
- Made it crystal clear: users and publishers are the product
- "Disqus is basically a marketing company" - privacy advocates

**14. GDPR Violations**
- Processed data unlawfully (Norwegian DPA ruling)
- No legitimate interest basis for cross-site tracking
- Required consent but didn't obtain it
- "Serious issues regarding transparency and accountability"
- Affected hundreds of thousands, including minors
- Tracking may reveal political opinions, health data
- Profiling for ad targeting without consent

**15. Can't Actually Disable It**
- Tracking continues even with DNT (Do Not Track) enabled
- Affiliate links can't be disabled for comments
- Many "opt-out" features were hidden or required contacting support
- Even paid users still got tracked (unclear if tracking stops with premium)

### Real-World Impact - Why Publishers Left

**Chris Lema** (popular WordPress blogger):
> "My visitors – without knowing and without me warning them – were getting tracked while on my site for something Disqus planned to do. And I hadn't realized it. No amount of performance gain is worth it."

**WP Beginner**: Removed Disqus and saw **304% increase in comments** by switching to WordPress native comments.

**Common pattern**: Bloggers discover the tracking/hijacking, feel betrayed, remove Disqus immediately, warn others.

### The ThreadKit Promise - Everything Disqus Did Wrong, Done Right

**Anti-Disqus positioning is our competitive advantage:**

| Disqus Problem | ThreadKit Solution |
|----------------|-------------------|
| Tracks users across sites | ✅ No tracking - Privacy-first design |
| Sells user data to advertisers | ✅ Never - Business model is subscriptions |
| Hijacks affiliate links | ✅ Your links stay your links - We never touch them |
| 707KB + 102 requests | ✅ <20kb bundle, minimal requests |
| Opaque closed source | ✅ Fully open source - See exactly what it does |
| Data on their servers | ✅ Self-host option + easy export |
| Forced ads | ✅ Never - Ad-free by design |
| Sponsored comments | ✅ No disguised ads - Clean discussions |
| Slow (5.7s load) | ✅ Fast (<100ms API, WebSocket real-time) |
| SEO problems | ✅ Server-rendered, indexable comments |
| Delete doesn't delete | ✅ Delete means delete - Full GDPR compliance |
| GDPR violations | ✅ Built GDPR-compliant from day one |
| Acquired by ad company | ✅ Independent, user-focused |

**Marketing Tagline Ideas:**
- "We're the anti-Disqus. Everything they did wrong, we do right."
- "Comments without surveillance"
- "The commenting system that respects you"
- "No tracking. No ads. No bullshit."
- "Disqus broke your trust. We'll earn it back."

**Landing Page Hero:**
> "Disqus sold you out. We won't.
> 
> ThreadKit is the privacy-first, open-source commenting system built for the modern web. No tracking. No ads. No affiliate hijacking. Just fast, clean comments that respect your users.
> 
> $5/month or self-host for free."

**Trust Signals:**
- Open source badge (link to GitHub)
- "No tracking" certification
- GDPR compliant badge
- Performance metrics (load time comparison)
- "Your data, your control" messaging

This positioning writes itself - we're the moral alternative to Disqus.

### What Disqus Does (Feature Parity)

**Core features to implement:**
- Email notifications (reply alerts)
- Social login (Google, Facebook, Twitter, etc.)
- Moderation dashboard (approve/delete, ban, shadowban)
- Spam filtering
- Sorting (newest, oldest, best, controversial)
- Comment voting
- Threading/nested replies
- User profiles
- "Subscribe to thread"
- Guest commenting (optional no-login mode)
- Edit/delete own comments
- Rich media embeds (images, videos, GIFs)
- Real-time updates

**Phase 1 (MVP)**: Auth, post, reply, vote, basic moderation, **both UI modes**
**Phase 2**: Notifications, guest comments, edit/delete, **chat enhancements (reactions, presence)**
**Phase 3**: Rich media, user profiles, advanced moderation

---

## Domain Strategy

**Recommended domains to check:**
- threadkit.com (ideal)
- threadkit.co
- threadkit.io (good for dev tools)
- getthreadkit.com (SaaS pattern)
- usethreadkit.com (SaaS pattern)
- threadkit.dev (perfect for developer tool)

**Priority**: .com > .io > .dev > .co

---

## Project Structure

```
threadkit/
├── backend/                    # Rust backend (OSS)
│   ├── src/
│   │   ├── main.rs
│   │   ├── routes/
│   │   │   ├── comments.rs    # CRUD endpoints
│   │   │   ├── auth.rs        # OAuth, JWT
│   │   │   └── ws.rs          # WebSocket handler
│   │   ├── models/
│   │   │   └── comment.rs
│   │   ├── db/
│   │   │   └── redis.rs       # Redis + MessagePack
│   │   ├── moderation/
│   │   │   ├── filters/
│   │   │   │   ├── profanity.rs
│   │   │   │   ├── spam.rs
│   │   │   │   └── rate_limit.rs
│   │   │   ├── llm/
│   │   │   │   └── toxicity.rs
│   │   │   └── actions.rs
│   │   └── middleware/
│   │       ├── auth.rs
│   │       └── rate_limit.rs
│   └── Cargo.toml
│
├── component/                  # React component (OSS)
│   ├── src/
│   │   ├── ThreadKit.tsx      # Main component
│   │   ├── Comment.tsx
│   │   ├── CommentForm.tsx
│   │   └── hooks/
│   │       ├── useWebSocket.ts
│   │       └── useComments.ts
│   └── package.json
│
├── dashboard/                  # Moderation dashboard (OSS)
│   ├── pages/
│   │   ├── comments.tsx
│   │   ├── moderation-queue.tsx
│   │   ├── banned-users.tsx
│   │   └── settings.tsx
│   └── package.json
│
└── docs/                       # Documentation
    ├── getting-started.md
    ├── self-hosting.md
    └── api-reference.md
```

---

## Implementation Roadmap

### Weekend 1: Core MVP
- [ ] Rust backend with Axum + Redis
- [ ] Basic React component (post, reply, upvote/downvote)
- [ ] **Comments mode UI** (threaded, nested)
- [ ] **CSS reset with `.threadkit-root` prefix**
- [ ] OAuth popup flow (Google auth)
- [ ] **Inline moderation UI** (delete, ban buttons for mods)
- [ ] **Role system** (admin, moderator permissions)
- [ ] WebSocket support (with polling fallback)
- [ ] Basic spam filter (rate limiting)

### Weekend 2: Make it Sellable
- [ ] Stripe integration ($5/mo tier)
- [ ] "Powered by ThreadKit" branding (removable for paid)
- [ ] **Basic moderation dashboard** (view all comments, manage mods)
- [ ] **Audit log** (track all mod actions)
- [ ] Site registration + siteId generation
- [ ] Simple landing page
- [ ] **Test with hostile CSS** (ensure isolation works)

### Phase 2: Scale & Features (Month 2-3)
- [ ] **Chat mode UI** (~8 hours work, same backend)
- [ ] MessagePack migration (from JSON)
- [ ] LLM moderation (toxicity detection)
- [ ] Email notifications
- [ ] Guest commenting
- [ ] **Chat enhancements** (reactions, typing indicators, presence)
- [ ] Rich media embeds
- [ ] Analytics dashboard

### Phase 3: Enterprise
- [ ] Multi-site management
- [ ] Advanced analytics
- [ ] Webhooks
- [ ] Custom integrations
- [ ] SSO support

---

## Key Design Decisions

### ✅ Decisions Made

1. **Rust backend**: For performance, WebSocket scalability, single binary deployment
2. **Redis**: Fast, simple key-value store; perfect for comment threads
3. **MessagePack**: Better than JSON for size/speed, language-agnostic
4. **OAuth popup + JWT**: Avoids third-party cookie issues
5. **Progressive enhancement**: WebSocket when possible, polling fallback
6. **Open source everything**: Build trust, enable self-hosting
7. **SaaS for convenience**: Most people will pay to avoid ops
8. **LLM moderation as premium**: Expensive API calls = upsell opportunity
9. **Inline moderation**: Mod controls directly in component (faster, better UX)
10. **Class prefix CSS reset**: Isolation without Shadow DOM complexity
11. **Peer dependencies**: Don't bundle React/ReactDOM (avoid Disqus bloat)

### ⚠️ To Consider Later

1. **Guest commenting**: Allow without login? (spam risk vs accessibility)
2. **Markdown vs rich text**: Start with Markdown, add WYSIWYG later?
3. **Nested depth limit**: How many levels of replies? (5-10 reasonable)
4. **Comment editing**: Allow edits? Show edit history?
5. **Reaction emojis**: Beyond upvote/downvote?
6. **Mobile app**: Web-first, mobile app later?

---

## Success Metrics

### Technical Goals
- API response time: <50ms (p95)
- WebSocket connection: <100ms
- Component bundle: <20kb gzipped
- Support 10k concurrent WebSocket connections per instance
- Redis memory: <2GB for 1M comment threads

### Business Goals
- Launch: 2 weekends
- First 10 paying customers: 1 month
- 100 paying customers: 3 months
- Break even (hosting costs): 50 customers ($250/mo)
- Profitability: 100+ customers ($500+/mo)

### Community Goals
- Open source GitHub stars: 1k in 6 months
- Contributors: 10+ in first year
- Production self-hosters: 100+ in first year
- Featured on: Hacker News, Reddit r/selfhosted, awesome-selfhosted lists
- **"Disqus alternative" search ranking**: Page 1 in 3 months
- **Testimonials from Disqus refugees**: 10+ "we switched" blog posts

---

## Launch Strategy

### Marketing
1. **Post on Hacker News**: "I built a lightweight Disqus alternative in Rust - everything they did wrong, done right [Show HN]"
2. **Reddit**: 
   - r/selfhosted: "ThreadKit - Privacy-first commenting, no tracking"
   - r/webdev: "Built a real-time comment system in Rust"
   - r/reactjs: "New React commenting component with inline moderation"
   - r/rust: "Built a WebSocket-based commenting system"
3. **Product Hunt**: Launch day with video demo showing inline moderation + real-time updates
4. **Dev.to / Hashnode**: 
   - "Why I Built ThreadKit After Seeing What Disqus Did to Publishers"
   - "Building a Real-Time Comment System with Rust and WebSockets"
   - "Everything Wrong with Disqus (And How We Fixed It)"
5. **Twitter/X**: Technical thread about architecture decisions + anti-surveillance positioning

### Positioning
- "Missing comments on your static site? ThreadKit brings them back."
- "Disqus without the tracking, ads, or bloat"
- "Real-time comments for the modern web"
- "Open source + SaaS: Your data, your choice"
- **"We're the anti-Disqus. Everything they did wrong, we do right."**

### Content Marketing (SEO + Inbound)
- **"Why We Left Disqus"** - Comprehensive breakdown of all Disqus problems
- **"Disqus Alternatives Compared"** - Honest comparison showing where ThreadKit wins
- Blog posts on Rust + WebSockets architecture
- Comparison posts vs Disqus, Giscus, Commento
- Self-hosting guides
- Integration tutorials (Next.js, Gatsby, Hugo, Astro)
- **"How Disqus Tracks You"** - Privacy deep-dive (drives angry Disqus users to us)
- **"The Real Cost of Free Comments"** - Disqus business model exposé

### SEO Strategy
Target keywords:
- "disqus alternative"
- "privacy-friendly commenting system"
- "self-hosted comments"
- "lightweight comment system"
- "disqus replacement"
- "nextjs comments"
- "static site comments"

These all have high search volume from people actively looking to switch.

---

## Risk Mitigation

### Technical Risks
- **Redis cost at scale**: Mitigation: MessagePack compression, tiered pricing
- **WebSocket scaling**: Mitigation: Redis pub/sub, horizontal scaling
- **Spam attacks**: Mitigation: Rate limiting, LLM detection, IP blocking
- **DDoS**: Mitigation: Cloudflare, rate limiting, API keys

### Business Risks
- **Low conversion to paid**: Mitigation: Make free tier useful but limited (branding)
- **Self-hosters don't contribute**: Mitigation: Good docs, welcoming community
- **Competitors copy features**: Mitigation: Speed of execution, community, brand

### Legal Risks
- **User data/GDPR**: Mitigation: Privacy-first design, data export tools, clear policies
- **Abuse/illegal content**: Mitigation: Moderation tools, reporting, compliance team

---

## Next Steps

1. **Validate domain availability** (check threadkit.com, .io, .dev)
2. **Set up GitHub repo** (choose license: AGPL-3.0 or MIT)
3. **Weekend 1 sprint**: Build core backend + component
4. **Deploy demo**: threadkit.dev with live example
5. **Write docs**: Getting started, self-hosting guide
6. **Launch**: HN, Reddit, Product Hunt

---

## Future: Migration to ClickHouse

**When it makes sense:** Once you hit 50-100k sites or need complex analytics

**Why ClickHouse:**
- 7-10x better compression than Redis (same data, less cost)
- Built-in analytics queries (trends, insights, reporting)
- Cheaper at TB+ scale ($340/mo vs $660/mo for 1TB)
- Perfect for append-only comment/chat data
- Both comments AND chat modes work identically

**Evolution Path:**
```
Phase 1 (MVP → 10k sites):
├─ Redis only - Simple, fast, affordable
├─ Keep all data in memory forever
└─ Both modes work perfectly

Phase 2 (10k → 100k sites):  
├─ Start dual-write to ClickHouse
├─ Redis still primary (fast reads)
└─ Backfill historical data

Phase 3 (100k+ sites):
├─ ClickHouse becomes primary storage
├─ Redis becomes cache layer (hot data, 1hr TTL)
├─ Analytics dashboard powered by ClickHouse
└─ Sub-100ms queries on billions of comments
```

**The beautiful part:** Zero downtime migration. Both modes continue working unchanged. Frontend doesn't know the difference. Just a backend swap.

**When to switch:** 
- Data > 100GB in Redis
- Need analytics for dashboard
- Multiple Redis servers needed (sharding)
- By then you have revenue to support migration

---

## Notes & Ideas

- **Inline commenting** (like Genius): Future feature for highlighting text and commenting on specific sections
- **Keyboard shortcuts for mods**: `d` to delete, `b` to ban (when mod mode active)
- **Mod mode toggle**: Button to show/hide mod controls (reduce clutter)
- **Quick ban reasons**: Dropdown with common reasons (spam, harassment, etc.)
- **Undo moderation**: 30-second window to undo delete/ban
- **Fediverse integration**: Could comments federate via ActivityPub? (ambitious)
- **AI summarization**: Generate thread summaries for long discussions
- **Sentiment analysis**: Dashboard showing community tone over time
- **Integration marketplace**: Zapier, webhooks, Slack notifications
- **White-label option**: Higher tier for removing all ThreadKit branding
- **Mobile-first moderation**: Swipe gestures for mod actions
- **Collaborative moderation**: Multiple mods see who's reviewing what in real-time

---

## Conclusion

ThreadKit fills a real gap in the market: a modern, performant, privacy-focused commenting system built for today's web. The hybrid SaaS + OSS model respects users while building a sustainable business.

**The opportunity**: Developers miss comment sections but hate Disqus. They want:
- Lightweight (performance)
- Privacy-focused (no tracking)
- Modern tech (real-time, WebSockets)
- Easy integration (npm install)
- Trust (open source)
- Convenience (SaaS option)
- Flexibility (comments for blogs, chat for events)

ThreadKit delivers all of this. **Two modes, one system. Comments when you need structure. Chat when you need conversation.** Time to build it.

---

**Generated**: 2025-12-06  
**Status**: Planning Phase  
**Next Milestone**: MVP in 2 weekends
