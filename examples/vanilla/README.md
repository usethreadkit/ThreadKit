# ThreadKit - Vanilla JavaScript Example

This example demonstrates how to use ThreadKit with vanilla JavaScript (no framework) using the low-level `@threadkit/core` package.

## What You'll See

- Thread mode comments with voting, sorting, and replies
- Chat mode with real-time messaging
- Theme switcher (light/dark)
- Direct use of CommentStore and WebSocketClient

## Setup

### 1. Start Redis
```bash
redis-server
```

### 2. Create Site (first time only)
```bash
cargo run --release --bin threadkit-http -- \
  --create-site "My Site" example.com \
  --enable-auth email,google,github,anonymous,ethereum,solana
```

### 3. Start the Server
```bash
cd server && cargo run --release --bin threadkit-http
```

### 4. Run the Example
```bash
cd examples/vanilla
pnpm dev
```

Then open http://localhost:5173

## Features

- **No framework required** - Pure JavaScript using @threadkit/core
- **Custom UI** - Build your own interface from scratch
- **Full control** - Direct access to CommentStore and WebSocketClient APIs
- **Real-time updates** - WebSocket integration for live updates

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/core Package](../../packages/core)
