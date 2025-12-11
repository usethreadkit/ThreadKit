# ThreadKit Server Test Coverage Plan

## Current State
- **Total tests**: ~104 tests
- **Coverage**: Primarily integration tests in `http/tests/` covering auth, comments, media, moderation, rate limiting, and Turnstile
- **Test infrastructure**: Good foundation with testcontainers (Redis, MinIO) and common test utilities

## Critical Gaps Summary

### Files with Zero Coverage
- `websocket/src/handler.rs` (400+ lines)
- `websocket/src/batcher.rs` (600+ lines)
- `websocket/src/pubsub.rs`
- `websocket/src/messages.rs`
- `common/src/storage.rs` (125 lines)
- `http/src/extractors.rs` (600+ lines)
- `common/src/config.rs` (500+ lines)
- `lua/atomic_vote.lua` (119 lines)

### Files with Partial Coverage
- `common/src/redis.rs` (2030 lines) - Has 28 unit tests, missing critical operations
- `common/src/web3.rs` (254 lines) - Basic validation only, no crypto verification
- `http/src/routes/admin.rs` (700+ lines) - Zero tests
- `http/src/routes/users.rs` (700+ lines) - Partial coverage
- `http/src/middleware.rs` (400+ lines) - Only 2 rate limit tests
- `http/src/routes/media.rs` (400+ lines) - Only 3 basic tests
- `common/src/moderation.rs` (314 lines) - Only 3 category tests
- `common/src/image_processing.rs` (254 lines) - Has 16 tests, missing resize operations

---

## TIER 1 - Critical Priority

### 1. WebSocket System Tests
**Status**: Zero tests for entire crate
**Risk**: High - Core real-time functionality with complex batching logic
**Files**: `websocket/src/handler.rs`, `websocket/src/batcher.rs`, `websocket/src/pubsub.rs`, `websocket/src/messages.rs`

**Test Coverage Needed** (~40-50 tests):
- Connection lifecycle (connect, authenticate, disconnect)
- Subscription management (subscribe, unsubscribe, max 10 pages)
- Message broadcasting via Redis pub/sub
- Redis batching system (20ms flush interval, pipeline operations)
- Rate limiting (10 msgs/sec default)
- Typing indicators and presence tracking
- Error handling for invalid JSON-RPC messages
- Idle timeout and connection cleanup
- Concurrent connection handling
- Authentication over WebSocket
- Cross-page message delivery
- Batch flush optimization

**Edge Cases**:
- Max subscriptions exceeded
- Invalid page URLs
- Expired JWT tokens
- Duplicate subscriptions
- Connection drops during batch flush
- Rate limit boundary conditions

**Test Infrastructure Needed**:
- WebSocket test client (tokio-tungstenite)
- Redis pub/sub verification helpers
- Concurrency testing utilities

---

### 2. Redis Atomic Vote Operations
**Status**: Lua script and atomic operations untested
**Risk**: Critical - Race conditions in voting could corrupt karma/vote counts
**Files**: `lua/atomic_vote.lua`, `common/src/redis.rs::atomic_vote()`

**Test Coverage Needed** (~20-30 tests):
- Vote transitions (none → upvote, upvote → downvote, etc.)
- Karma calculation for each transition
- Concurrent vote attempts on same comment
- Upvote/downvote counter accuracy
- Vote state consistency
- Error handling for invalid comment IDs
- Performance under high concurrency

**Specific Scenarios**:
- Upvote → Downvote: karma -2, upvotes -1, downvotes +1
- Downvote → Upvote: karma +2, upvotes +1, downvotes -1
- Upvote → None: karma -1, upvotes -1
- Downvote → None: karma +1, downvotes -1
- None → Upvote: karma +1, upvotes +1
- None → Downvote: karma -1, downvotes +1

**Concurrent Tests**:
- 100 simultaneous votes on same comment
- Mixed vote transitions
- Verify final counts match expected

---

### 3. HTTP Extractors (Authentication/Authorization)
**Status**: Zero tests
**Risk**: Critical - Security foundation for all authenticated requests
**File**: `http/src/extractors.rs`

**Test Coverage Needed** (~30-40 tests):

**`ProjectId` Extractor**:
- Valid API key extraction from X-API-Key header
- Invalid API key rejection
- Missing API key handling
- API key caching behavior
- Site config loading

**Origin Validation**:
- Exact domain matching
- Wildcard subdomain matching (*.example.com)
- Localhost development mode
- Origin header missing
- Cross-origin rejection
- Multiple allowed origins

**`AuthUser` Extractor**:
- Valid JWT token extraction
- Expired token rejection
- Invalid signature rejection
- Missing token handling
- Session validation
- Site ID mismatch detection

**`MaybeAuthUser` Extractor**:
- Optional authentication (valid token)
- Optional authentication (no token)
- Optional authentication (invalid token)

**`AuthUserWithRole` Extractor**:
- Role hierarchy enforcement (Owner > Admin > Moderator > User)
- Moderator access requirement
- Admin access requirement
- Owner access requirement
- Role mismatch rejection

**`OwnerAccess` Extractor**:
- Secret key validation (X-API-Secret header)
- Invalid secret key rejection
- Site ID verification

---

### 4. Account Deletion (GDPR Compliance)
**Status**: Untested
**Risk**: Critical - Legal compliance, data cascade correctness
**File**: `common/src/redis.rs::delete_user_account()`

**Test Coverage Needed** (~15-20 tests):
- Complete account deletion flow
- Cascade deletion verification:
  - User profile data
  - All comments by user
  - All votes by user
  - All notifications to/from user
  - All sessions
  - User blocks (bidirectional)
  - Media uploads
  - API keys
  - OAuth connections
- Orphaned data verification (none should remain)
- Comment tree integrity after deletion
- Vote count recalculation
- Karma updates for affected comments
- Error handling during cascade
- Partial deletion recovery

**Verification**:
- Redis key scanning for user ID references
- Comment parent_id integrity
- Vote count consistency
- Notification cleanup

---

### 5. Web3 Signature Verification
**Status**: Only basic validation tests, no crypto verification
**Risk**: High - Authentication security for blockchain wallets
**File**: `common/src/web3.rs`

**Test Coverage Needed** (~20-25 tests):

**Ethereum (EIP-191)**:
- Valid ECDSA signature verification
- Invalid signature rejection
- Recovery ID handling (v = 0, 1, 27, 28)
- Message hash construction
- Address recovery from signature
- Nonce validation (10 minute expiry)
- SIWE message format

**Solana**:
- Valid Ed25519 signature verification
- Invalid signature rejection
- Base58 public key handling
- Message construction
- Nonce validation

**Edge Cases**:
- Expired nonce
- Reused nonce
- Malformed signatures
- Invalid public key formats
- Wrong signature length
- Message tampering detection

**Test Vectors**:
- Use known test vectors from EIP-191 and Ed25519 specs
- Real wallet signatures (MetaMask, Phantom)

---

## TIER 2 - High Priority

### 6. Admin Routes
**Status**: Zero tests
**File**: `http/src/routes/admin.rs`

**Test Coverage Needed** (~25-30 tests):
- `POST /admin/create-user` - Programmatic user creation (owner only)
- `GET /admin/sites/{id}/admins` - List admins
- `POST /admin/sites/{id}/admins` - Add admin
- `DELETE /admin/sites/{id}/admins/{user_id}` - Remove admin
- `GET /admin/sites/{id}/moderators` - List moderators
- `POST /admin/sites/{id}/moderators` - Add moderator
- `DELETE /admin/sites/{id}/moderators/{user_id}` - Remove moderator
- `GET /admin/sites/{id}/comments` - Site-wide comment feed (moderator+)
- `GET /admin/sites/{id}/owner/comments` - Owner comment feed
- `GET /admin/sites/{id}/posting` - Get site posting status
- `PUT /admin/sites/{id}/posting` - Toggle site-wide posting
- `GET /admin/pages/{page_id}/posting` - Get page posting status
- `PUT /admin/pages/{page_id}/posting` - Lock/unlock specific page

**Edge Cases**:
- Promoting moderator to admin (removes from moderators set)
- Site ID mismatch validation
- Role hierarchy enforcement
- Owner-only operations with secret key
- Non-existent user ID
- Duplicate role assignments

---

### 7. User Routes
**Status**: Partial coverage
**File**: `http/src/routes/users.rs`

**Test Coverage Needed** (~20-25 tests):
- `PUT /users/me` - Profile updates (username, avatar, social links)
- `DELETE /users/me` - Account deletion (GDPR)
- `GET /users/me/blocked` - List blocked users
- `POST /users/{id}/block` - Block user
- `DELETE /users/{id}/unblock` - Unblock user
- `GET /users/me/comments` - User's own comment history
- `GET /users/{id}/comments` - Another user's comments
- `GET /notifications` - Notification feed
- `POST /notifications/read` - Mark notifications as read
- `POST /users/check-username` - Username availability check

**Edge Cases**:
- Username conflicts on profile update
- Bidirectional block relationships
- Comment history pagination
- Cross-site comment aggregation
- Block/unblock idempotency
- Notification pagination
- Username normalization edge cases

---

### 8. Middleware Rate Limiting
**Status**: Only 2 basic tests
**File**: `http/src/middleware.rs`

**Test Coverage Needed** (~15-20 tests):
- IP extraction from X-Forwarded-For
- X-Real-IP fallback
- Trusted proxy validation
- Rate limit key generation (IP, project ID, user ID)
- Different rate limits per route type:
  - Auth routes: 1 hour window
  - Write routes: 1 minute window
  - Read routes: 1 minute window
- Rate limit header propagation (X-RateLimit-*)
- Multiple rate limit layers (IP + user + project ID)
- Rate limit reset behavior
- Concurrent request handling
- Sliding window algorithm verification

**Edge Cases**:
- Multiple proxies in X-Forwarded-For
- IPv6 address handling
- Missing IP headers
- Rate limit boundary (exactly at limit)
- Clock skew handling

---

### 9. S3 Storage Operations
**Status**: Zero tests
**File**: `common/src/storage.rs`

**Test Coverage Needed** (~10-15 tests):
- File upload to S3
- File deletion from S3
- MIME type to extension mapping
- Path construction
- Error handling for AWS SDK failures
- Bucket configuration (path-style vs virtual-hosted)
- Large file handling
- Concurrent upload/delete
- Pre-signed URL generation (if implemented)

**Edge Cases**:
- Upload timeout
- Bucket doesn't exist
- Permission denied
- Network errors during upload
- Partial upload cleanup

---

### 10. Content Moderation API Integration
**Status**: Only 3 category tests
**File**: `common/src/moderation.rs`

**Test Coverage Needed** (~10-15 tests):
- Actual API calls to OpenAI-compatible endpoints
- Timeout handling (default 10s)
- Error response handling from moderation API
- Category mapping (OpenAI categories → ThreadKit categories)
- Confidence threshold enforcement
- Disabled moderation bypass
- Content flagged for multiple categories
- HTTP client retry logic
- Network error handling

**Mock Infrastructure**:
- Mock OpenAI moderation API server
- Various response scenarios (clean, flagged, error)

---

## TIER 3 - Medium Priority

### 11. Redis Operations (Additional Coverage)
**File**: `common/src/redis.rs`

**Test Coverage Needed** (~60-80 tests):

**Page Tree Operations**:
- Get page tree with sorting (newest, oldest, top)
- Create page tree
- Update page tree stats
- Recursive tree building
- Max depth handling

**User Indexes**:
- User comment feed (all sites)
- User comment feed (specific site)
- Pagination and sorting

**Moderation Queue**:
- Add to queue with priority
- Remove from queue
- Approve/reject flow
- Queue sorting

**Notification Management**:
- Create notifications (reply, mention, vote)
- Mark as read
- Pagination
- Notification cleanup on account deletion

**Blocking**:
- Block user (bidirectional index)
- Unblock user
- Check if blocked
- Block list retrieval

**Session Management**:
- Create session with TTL
- Validate session
- Delete session
- Session expiration

**Pin/Unpin Comments**:
- Pin comment to page
- Unpin comment
- Get pinned comments
- Max pinned comments per page

**Karma Tracking**:
- Update user karma
- Get user karma
- Karma calculation accuracy

**Usage Metering**:
- Track unique visitors (HyperLogLog)
- Track page views
- Track comment counts
- Analytics aggregation

---

### 12. Image Processing (Additional Coverage)
**File**: `common/src/image_processing.rs`

**Test Coverage Needed** (~10-15 tests):
- Actual resize operations with quality settings
- Compression ratio verification
- WebP encoding errors
- Multiple format support (JPEG, PNG, WebP)
- Quality degradation testing
- Large image handling
- Corrupted image graceful failure

---

### 13. Media Routes (Full Coverage)
**File**: `http/src/routes/media.rs`

**Test Coverage Needed** (~15-20 tests):
- `POST /media/upload` - File upload with multipart form
- `POST /media/upload-avatar` - Avatar upload with resizing
- `GET /media/{id}` - Media metadata retrieval
- `DELETE /media/{id}` - Media deletion
- File size validation (max 10MB)
- MIME type validation
- Quota enforcement
- Orphaned media cleanup
- Concurrent uploads
- Upload progress tracking

---

### 14. Configuration Loading
**File**: `common/src/config.rs`

**Test Coverage Needed** (~15-20 tests):
- Environment variable parsing
- Mode detection (Standalone vs SaaS)
- OAuth provider configuration (Google, GitHub, etc.)
- S3 configuration validation
- Rate limit defaults
- Email provider setup (Resend)
- Turnstile configuration
- Content moderation config
- Required vs optional fields
- Invalid configuration rejection
- Default value assignment

---

### 15. Additional Edge Cases

**Concurrency Tests** (~20-30 tests):
- Simultaneous votes on same comment
- Concurrent username updates
- Parallel comment creation
- Race conditions in karma updates
- Concurrent session creation/deletion
- Parallel admin role assignments

**Boundary Tests** (~15-20 tests):
- Maximum comment length (10,000 chars default)
- Maximum username length (24 chars)
- Rate limit boundary values
- Pagination edge cases (offset > total)
- Empty result sets
- Zero values in calculations

**Error Scenarios** (~20-25 tests):
- Redis connection failures
- S3 upload failures
- Moderation API timeouts
- Invalid JWT signatures
- Malformed JSON input
- Lua script execution errors
- Network timeouts
- Database constraint violations

**Data Consistency** (~15-20 tests):
- Orphaned votes after account deletion
- Broken comment trees after deletion
- Invalid parent_id references
- Mismatched upvote/downvote counts
- Incorrect karma calculations
- Stale cache scenarios

---

## Test Infrastructure Requirements

### Tools Needed
1. **WebSocket test client** - tokio-tungstenite for WS connection testing
2. **Mock servers** - wiremock or similar for external API mocking (OpenAI, OAuth)
3. **Concurrency testing** - tokio::spawn with barrier synchronization
4. **Redis verification helpers** - Custom assertions for key existence, counts
5. **Test fixtures** - Pre-populated test data for common scenarios
6. **Performance benchmarks** - Criterion.rs for performance regression testing

### Test Organization
```
server/crates/
├── common/
│   └── tests/               # NEW: Unit tests for common crate
│       ├── redis_tests.rs
│       ├── web3_tests.rs
│       ├── storage_tests.rs
│       ├── moderation_tests.rs
│       ├── config_tests.rs
│       └── common/mod.rs    # Shared test utilities
├── http/
│   └── tests/               # EXISTING: Integration tests
│       ├── auth_tests.rs
│       ├── comment_tests.rs
│       ├── media_tests.rs
│       ├── moderation_tests.rs
│       ├── rate_limit_tests.rs
│       ├── turnstile_tests.rs
│       ├── admin_tests.rs   # NEW
│       ├── user_tests.rs    # NEW
│       ├── extractor_tests.rs # NEW
│       └── common/mod.rs
└── websocket/
    └── tests/               # NEW: WebSocket integration tests
        ├── connection_tests.rs
        ├── batcher_tests.rs
        ├── pubsub_tests.rs
        └── common/mod.rs
```

---

## Estimated Effort

### Test Count Breakdown
- **Current**: ~104 tests
- **Tier 1**: ~155-180 additional tests
- **Tier 2**: ~115-140 additional tests
- **Tier 3**: ~150-180 additional tests
- **Total estimated**: 450-500 tests for comprehensive coverage

### Priorities
1. **WebSocket tests** - Foundational for real-time features
2. **Redis atomic operations** - Prevents data corruption
3. **Extractors** - Security foundation
4. **Account deletion** - Legal compliance
5. **Web3 verification** - Authentication security

---

## Success Metrics

### Coverage Targets
- **Line coverage**: 80%+ for critical paths
- **Branch coverage**: 70%+ for business logic
- **Integration tests**: All HTTP/WebSocket endpoints
- **Concurrency tests**: All shared state operations
- **Error scenarios**: All error handling paths

### Quality Gates
- All tests pass before merge
- No test warnings or ignored tests
- Test execution time < 60 seconds (parallel execution)
- Memory usage reasonable (no leaks in long-running tests)
- Deterministic tests (no flakiness)

---

## Implementation Plan

### Phase 1: Critical Foundation (Tier 1)
1. WebSocket test infrastructure + basic tests (1-2 days)
2. Redis atomic_vote tests (1 day)
3. Extractor tests (1-2 days)
4. Account deletion tests (1 day)
5. Web3 signature tests (1 day)

**Estimated**: 5-7 days for Tier 1

### Phase 2: High Priority (Tier 2)
6. Admin routes (1 day)
7. User routes (1 day)
8. Middleware rate limiting (1 day)
9. S3 storage (1 day)
10. Content moderation (1 day)

**Estimated**: 5 days for Tier 2

### Phase 3: Medium Priority (Tier 3)
11. Redis operations (2-3 days)
12. Image processing (1 day)
13. Media routes (1 day)
14. Configuration (1 day)
15. Edge cases (2-3 days)

**Estimated**: 7-10 days for Tier 3

**Total estimated effort**: 17-22 days for full coverage

---

## Notes
- Estimates assume one developer working full-time
- Parallel work possible on independent test suites
- May discover additional edge cases during implementation
- Infrastructure setup (test clients, mocks) frontloaded in Phase 1
