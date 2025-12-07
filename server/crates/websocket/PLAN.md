# ThreadKit WebSocket Server - Implementation Plan

## Overview

High-performance WebSocket server for real-time comment updates, typing indicators, and presence. Designed for 50k concurrent connections and 100k events/second.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│                  (JSON-RPC 2.0 notifications)               │
└──────────────────────────┬──────────────────────────────────┘
                           │ WebSocket (wss://)
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                      WS Server                              │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Handlers   │───►│ RedisBatcher│───►│   Redis     │     │
│  │             │    │  (20ms flush)│    │  Pipeline   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────┐    ┌─────────────┐                        │
│  │  Broadcast  │◄───│ Redis PubSub│◄─── HTTP Server        │
│  │  Channels   │    │  Subscriber │     (after mutations)  │
│  └─────────────┘    └─────────────┘                        │
│         │                                                   │
│         ▼                                                   │
│     Clients                                                 │
└─────────────────────────────────────────────────────────────┘
```

## Protocol: JSON-RPC 2.0 Notifications

All messages use JSON-RPC 2.0 notification format (no `id` field, no response expected).

### Client → Server

```jsonc
// Subscribe to a page (join room)
{ "jsonrpc": "2.0", "method": "subscribe", "params": { "page_id": "uuid" } }

// Unsubscribe from a page (leave room)
{ "jsonrpc": "2.0", "method": "unsubscribe", "params": { "page_id": "uuid" } }

// Typing indicator (send every ~1s while typing, expires after 3s)
{ "jsonrpc": "2.0", "method": "typing", "params": { "page_id": "uuid", "reply_to": "uuid | null" } }

// Heartbeat
{ "jsonrpc": "2.0", "method": "ping" }
```

### Server → Client

```jsonc
// Connection established
{ "jsonrpc": "2.0", "method": "connected", "params": { "user_id": "uuid | null" } }

// Error
{ "jsonrpc": "2.0", "method": "error", "params": { "code": "string", "message": "string" } }

// Heartbeat response
{ "jsonrpc": "2.0", "method": "pong" }

// Presence snapshot (sent on subscribe)
{ "jsonrpc": "2.0", "method": "presence", "params": { "page_id": "uuid", "users": [UserPublic] } }

// User joined page
{ "jsonrpc": "2.0", "method": "user_joined", "params": { "page_id": "uuid", "user": UserPublic } }

// User left page
{ "jsonrpc": "2.0", "method": "user_left", "params": { "page_id": "uuid", "user_id": "uuid" } }

// Someone is typing (expires after 3s of no refresh)
{ "jsonrpc": "2.0", "method": "typing", "params": { "page_id": "uuid", "user": UserPublic, "reply_to": "uuid | null" } }

// New comment posted
{ "jsonrpc": "2.0", "method": "new_comment", "params": { "page_id": "uuid", "comment": TreeComment } }

// Comment edited
{ "jsonrpc": "2.0", "method": "edit_comment", "params": { "page_id": "uuid", "comment_id": "uuid", "content": "string", "content_html": "string" } }

// Comment deleted
{ "jsonrpc": "2.0", "method": "delete_comment", "params": { "page_id": "uuid", "comment_id": "uuid" } }

// Vote counts changed
{ "jsonrpc": "2.0", "method": "vote_update", "params": { "page_id": "uuid", "comment_id": "uuid", "upvotes": 0, "downvotes": 0 } }

// Notification (reply, mention, upvote)
{ "jsonrpc": "2.0", "method": "notification", "params": { "type": "reply | mention | upvote", "comment_id": "uuid", "from_user": UserPublic } }
```

## Implementation Tasks

### Phase 1: Core Infrastructure

#### 1.1 Redis Batcher (`src/batcher.rs`) - NEW FILE

Batches all Redis operations and flushes every 20ms using pipelines.

```rust
pub struct RedisBatcher {
    redis: Arc<RedisClient>,

    // === WRITES (fire and forget) ===
    presence_add: DashMap<Uuid, HashSet<Uuid>>,      // page_id -> user_ids
    presence_remove: DashMap<Uuid, HashSet<Uuid>>,   // page_id -> user_ids
    typing_set: DashMap<Uuid, Vec<(Uuid, Option<Uuid>, i64)>>, // page_id -> [(user_id, reply_to, timestamp)]
    publish_queue: SegQueue<(String, String)>,       // (channel, message)

    // === READS (with response channels) ===
    api_key_lookups: DashMap<String, Vec<oneshot::Sender<Option<ApiKeyInfo>>>>,
    presence_lookups: DashMap<Uuid, Vec<oneshot::Sender<HashSet<Uuid>>>>,
    user_lookups: DashMap<Uuid, Vec<oneshot::Sender<Option<User>>>>,
}

impl RedisBatcher {
    pub fn new(redis: Arc<RedisClient>) -> Arc<Self>;

    // Starts background flush loop (call once on startup)
    pub fn start(self: &Arc<Self>) -> JoinHandle<()>;

    // === Write methods (non-blocking, returns immediately) ===
    pub fn queue_presence_add(&self, page_id: Uuid, user_id: Uuid);
    pub fn queue_presence_remove(&self, page_id: Uuid, user_id: Uuid);
    pub fn queue_typing(&self, page_id: Uuid, user_id: Uuid, reply_to: Option<Uuid>);
    pub fn queue_publish(&self, channel: &str, message: String);

    // === Read methods (async, waits up to 20ms for batch) ===
    pub async fn get_cached_api_key(&self, key: &str) -> Option<ApiKeyInfo>;
    pub async fn get_presence(&self, page_id: Uuid) -> HashSet<Uuid>;
    pub async fn get_user(&self, user_id: Uuid) -> Option<User>;
    pub async fn get_users_batch(&self, user_ids: Vec<Uuid>) -> Vec<Option<User>>;

    // Internal flush (called every 20ms)
    async fn flush(&self);
}
```

**Flush logic:**
1. Collect all pending writes into a pipeline
2. Collect all pending reads into the same pipeline (MGET, SMEMBERS, etc.)
3. Execute pipeline (single round-trip)
4. Distribute read results to waiting oneshot channels
5. Deduplicate: if 100 requests for same API key arrive in 20ms window, only 1 Redis call

#### 1.2 Redis Pub/Sub Subscriber (`src/pubsub.rs`) - NEW FILE

Subscribes to Redis pub/sub and relays events to in-memory broadcast channels.

```rust
pub struct PubSubSubscriber {
    redis: Arc<RedisClient>,
    broadcast_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
}

impl PubSubSubscriber {
    pub fn new(
        redis: Arc<RedisClient>,
        broadcast_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,
    ) -> Self;

    // Starts background subscriber loop
    pub async fn start(self) -> JoinHandle<()>;
}
```

**Channel pattern:** `PSUBSCRIBE threadkit:page:*:events`

**Message format (from HTTP server):**
```json
{
  "type": "new_comment",
  "page_id": "uuid",
  "data": { ... }
}
```

#### 1.3 Update Messages (`src/messages.rs`)

Convert to JSON-RPC 2.0 format:

```rust
// Client → Server
#[derive(Debug, Deserialize)]
pub struct ClientMessage {
    pub jsonrpc: String,  // Must be "2.0"
    pub method: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

// Server → Client (helper to construct)
#[derive(Debug, Serialize)]
pub struct ServerMessage {
    pub jsonrpc: &'static str,  // Always "2.0"
    pub method: &'static str,
    pub params: serde_json::Value,
}

impl ServerMessage {
    pub fn connected(user_id: Option<Uuid>) -> Self;
    pub fn error(code: &str, message: &str) -> Self;
    pub fn pong() -> Self;
    pub fn presence(page_id: Uuid, users: Vec<UserPublic>) -> Self;
    pub fn user_joined(page_id: Uuid, user: UserPublic) -> Self;
    pub fn user_left(page_id: Uuid, user_id: Uuid) -> Self;
    pub fn typing(page_id: Uuid, user: UserPublic, reply_to: Option<Uuid>) -> Self;
    pub fn new_comment(page_id: Uuid, comment: TreeComment) -> Self;
    pub fn edit_comment(page_id: Uuid, comment_id: Uuid, content: String, content_html: String) -> Self;
    pub fn delete_comment(page_id: Uuid, comment_id: Uuid) -> Self;
    pub fn vote_update(page_id: Uuid, comment_id: Uuid, upvotes: i64, downvotes: i64) -> Self;
    pub fn notification(notification_type: &str, comment_id: Uuid, from_user: UserPublic) -> Self;
}
```

#### 1.4 Update State (`src/state.rs`)

Add batcher and connection tracking:

```rust
pub struct WsState {
    pub config: Arc<Config>,
    pub redis: Arc<RedisClient>,
    pub batcher: Arc<RedisBatcher>,
    pub page_channels: Arc<DashMap<Uuid, broadcast::Sender<ServerMessage>>>,

    // Metrics
    pub active_connections: AtomicU64,
    pub total_messages_received: AtomicU64,
    pub total_messages_sent: AtomicU64,
}
```

### Phase 2: Handler Refactor

#### 2.1 Update Handler (`src/handler.rs`)

**Changes:**
1. Use batcher for all Redis operations
2. Add rate limiting (10 messages/sec per connection)
3. Add idle timeout (5 min)
4. Add typing deduplication (ignore if < 500ms since last)
5. JSON-RPC 2.0 message parsing

```rust
pub async fn handle_socket(
    socket: WebSocket,
    state: WsState,
    api_key: String,
    token: Option<String>,
) {
    // 1. Validate API key via batcher (batched read)
    let site_info = match state.batcher.get_cached_api_key(&api_key).await {
        Some(info) => info,
        None => {
            // Validate against config, cache result
            // ...
        }
    };

    // 2. Validate JWT if provided
    let user_id = validate_jwt(&state, &token, site_info.site_id);

    // 3. Get user info via batcher if authenticated
    let user_public = if let Some(uid) = user_id {
        state.batcher.get_user(uid).await.map(UserPublic::from)
    } else {
        None
    };

    // 4. Connection state
    let mut subscribed_pages: HashSet<Uuid> = HashSet::new();
    let mut page_receivers: Vec<(Uuid, broadcast::Receiver<ServerMessage>)> = Vec::new();
    let mut last_activity = Instant::now();
    let mut last_typing: HashMap<Uuid, Instant> = HashMap::new();
    let mut messages_this_second = 0u32;
    let mut second_start = Instant::now();

    // 5. Send connected message
    send(&mut sender, ServerMessage::connected(user_id)).await;

    // 6. Main loop
    loop {
        tokio::select! {
            // Incoming messages
            msg = receiver.next() => {
                // Rate limit check
                if second_start.elapsed() >= Duration::from_secs(1) {
                    messages_this_second = 0;
                    second_start = Instant::now();
                }
                messages_this_second += 1;
                if messages_this_second > 10 {
                    send(&mut sender, ServerMessage::error("rate_limit", "Too many messages")).await;
                    continue;
                }

                last_activity = Instant::now();
                handle_message(...).await;
            }

            // Broadcast relay (check every 10ms)
            _ = tokio::time::sleep(Duration::from_millis(10)) => {
                for (page_id, rx) in &mut page_receivers {
                    while let Ok(msg) = rx.try_recv() {
                        send(&mut sender, msg).await;
                    }
                }
            }

            // Idle timeout (5 min)
            _ = tokio::time::sleep(Duration::from_secs(300)) => {
                if last_activity.elapsed() > Duration::from_secs(300) {
                    break;
                }
            }
        }
    }

    // 7. Cleanup
    cleanup_presence(&state, user_id, &subscribed_pages);
}
```

#### 2.2 Typing Deduplication

```rust
fn handle_typing(
    state: &WsState,
    page_id: Uuid,
    reply_to: Option<Uuid>,
    user_id: Uuid,
    user: &UserPublic,
    last_typing: &mut HashMap<Uuid, Instant>,
) {
    // Ignore if sent less than 500ms ago for this page
    if let Some(last) = last_typing.get(&page_id) {
        if last.elapsed() < Duration::from_millis(500) {
            return;
        }
    }
    last_typing.insert(page_id, Instant::now());

    // Queue to batcher (will be flushed in next 20ms)
    state.batcher.queue_typing(page_id, user_id, reply_to);

    // Broadcast to local subscribers immediately
    state.broadcast(page_id, ServerMessage::typing(page_id, user.clone(), reply_to));
}
```

### Phase 3: HTTP Server Integration

#### 3.1 Add Publisher to HTTP Server

In `http/src/state.rs`, add Redis publisher:

```rust
impl AppState {
    pub async fn publish_event(&self, page_id: Uuid, event: &str, data: serde_json::Value) {
        let channel = format!("threadkit:page:{}:events", page_id);
        let message = serde_json::json!({
            "type": event,
            "page_id": page_id,
            "data": data
        });
        let _ = self.redis.publish(&channel, &message.to_string()).await;
    }
}
```

#### 3.2 Publish After Mutations

In `http/src/routes/comments.rs`:

```rust
// After creating comment
state.publish_event(page_id, "new_comment", json!({
    "comment": tree_comment
})).await;

// After editing comment
state.publish_event(page_id, "edit_comment", json!({
    "comment_id": comment_id,
    "content": content,
    "content_html": content_html
})).await;

// After deleting comment
state.publish_event(page_id, "delete_comment", json!({
    "comment_id": comment_id
})).await;

// After voting
state.publish_event(page_id, "vote_update", json!({
    "comment_id": comment_id,
    "upvotes": upvotes,
    "downvotes": downvotes
})).await;
```

### Phase 4: System Optimizations

#### 4.1 Raise File Descriptor Limit

In `src/main.rs`:

```rust
fn raise_fd_limit() {
    #[cfg(unix)]
    {
        use rlimit::{Resource, setrlimit, getrlimit};
        let (soft, hard) = getrlimit(Resource::NOFILE).unwrap();
        if soft < 65536 {
            let new_soft = hard.min(65536);
            setrlimit(Resource::NOFILE, new_soft, hard).ok();
            tracing::info!("Raised file descriptor limit from {} to {}", soft, new_soft);
        }
    }
}
```

#### 4.2 Graceful Shutdown

```rust
// In main.rs
let shutdown = async {
    tokio::signal::ctrl_c().await.ok();
    tracing::info!("Shutdown signal received, draining connections...");
    tokio::time::sleep(Duration::from_secs(10)).await;
    tracing::info!("Shutdown complete");
};

axum::serve(listener, app)
    .with_graceful_shutdown(shutdown)
    .await?;
```

#### 4.3 Metrics (Optional, Phase 4+)

```rust
// Prometheus metrics
pub static ACTIVE_CONNECTIONS: Lazy<IntGauge> = ...;
pub static MESSAGES_RECEIVED: Lazy<IntCounter> = ...;
pub static MESSAGES_SENT: Lazy<IntCounter> = ...;
pub static BATCHER_FLUSH_DURATION: Lazy<Histogram> = ...;
```

### Phase 5: Testing

#### 5.1 Unit Tests

- `batcher.rs`: Test batching logic, deduplication, timeout behavior
- `messages.rs`: Test JSON-RPC serialization/deserialization
- `handler.rs`: Test rate limiting, idle timeout

#### 5.2 Integration Tests

- Connect, subscribe, receive events
- Multiple clients on same page
- Typing indicators
- Presence updates

#### 5.3 Load Tests

Extend existing `loadtest` crate:
- 50k concurrent connections
- 100k messages/second throughput
- Measure p50/p95/p99 latency

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/batcher.rs` | CREATE | Redis batcher with 20ms flush |
| `src/pubsub.rs` | CREATE | Redis pub/sub subscriber |
| `src/messages.rs` | REWRITE | JSON-RPC 2.0 format |
| `src/state.rs` | UPDATE | Add batcher, metrics |
| `src/handler.rs` | UPDATE | Use batcher, add rate limiting, idle timeout |
| `src/main.rs` | UPDATE | Start batcher, pubsub, raise fd limit |
| `../http/src/state.rs` | UPDATE | Add publish_event method |
| `../http/src/routes/comments.rs` | UPDATE | Publish after mutations |
| `../common/src/redis.rs` | UPDATE | Add pipeline support if missing |
| `Cargo.toml` | UPDATE | Add rlimit dependency |

## Analytics

Track usage metrics in Redis (approximate, for dashboards/billing):

### Keys

```
# Concurrent connections (gauge, updated every minute)
threadkit:stats:{site_id}:connections:{YYYYMMDDHH}  # Sorted set: minute -> count

# Messages per hour
threadkit:stats:{site_id}:messages:{YYYYMMDDHH}     # Integer counter

# Unique users per hour (approximate via HyperLogLog)
threadkit:stats:{site_id}:users:{YYYYMMDDHH}        # HyperLogLog
```

### Implementation

In batcher, add analytics queue:

```rust
pub struct AnalyticsBatch {
    // Increment counters
    message_counts: DashMap<(Uuid, String), u64>,  // (site_id, hour_key) -> count

    // Connection snapshots (sampled every minute)
    connection_snapshots: DashMap<Uuid, u64>,      // site_id -> current_count

    // Unique users (add to HyperLogLog)
    unique_users: DashMap<(Uuid, String), HashSet<Uuid>>,  // (site_id, hour_key) -> user_ids
}
```

**Flush logic (every 20ms with other batches):**

```rust
// Increment message counters: INCRBY threadkit:stats:{site_id}:messages:{hour} {count}
for ((site_id, hour), count) in analytics.message_counts.drain() {
    pipe.incrby(format!("threadkit:stats:{}:messages:{}", site_id, hour), count);
}

// Add unique users: PFADD threadkit:stats:{site_id}:users:{hour} user1 user2 ...
for ((site_id, hour), users) in analytics.unique_users.drain() {
    if !users.is_empty() {
        pipe.pfadd(format!("threadkit:stats:{}:users:{}", site_id, hour), users);
    }
}
```

**Connection snapshots (separate task, every 60s):**

```rust
// Run every 60 seconds
async fn snapshot_connections(state: &WsState) {
    let hour_key = Utc::now().format("%Y%m%d%H").to_string();
    let minute = Utc::now().minute();

    for (site_id, count) in state.connections_per_site.iter() {
        let key = format!("threadkit:stats:{}:connections:{}", site_id, hour_key);
        // ZADD key minute count
        state.redis.zadd(&key, minute as f64, *count).await.ok();
        // Expire after 7 days
        state.redis.expire(&key, 7 * 24 * 3600).await.ok();
    }
}
```

### Querying

```bash
# Get message count for hour
GET threadkit:stats:{site_id}:messages:2024120718

# Get unique users for hour (approximate)
PFCOUNT threadkit:stats:{site_id}:users:2024120718

# Get peak connections for hour
ZRANGE threadkit:stats:{site_id}:connections:2024120718 0 -1 WITHSCORES
# Returns: [(minute, count), ...] - pick max for peak
```

### Retention

- Set TTL of 7 days on all stats keys (configurable)
- Aggregate to daily/monthly if needed for long-term storage

## Configuration

New environment variables:

```bash
# Batcher
WS_BATCHER_FLUSH_MS=20          # Flush interval (default: 20ms)

# Rate limiting
WS_RATE_LIMIT_PER_SEC=10        # Max messages per second per connection

# Timeouts
WS_IDLE_TIMEOUT_SECS=300        # Disconnect after 5 min idle

# Typing
WS_TYPING_DEBOUNCE_MS=500       # Ignore typing if sent within 500ms
WS_TYPING_EXPIRE_SECS=3         # Typing expires after 3s of no refresh
```

## Success Criteria

1. **Connections**: Handle 50k concurrent WebSocket connections
2. **Throughput**: Process 100k events/second
3. **Latency**: p95 < 50ms for message delivery
4. **Memory**: < 50KB per connection (2.5GB for 50k)
5. **Redis**: < 100 Redis operations/second (via batching)
