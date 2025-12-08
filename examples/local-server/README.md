# ThreadKit Local Server Example

A minimal React example that connects to a local ThreadKit server for development and testing.

## Quick Start

### 1. Start Redis

```bash
redis-server
```

### 2. Create the site (first time only)

```bash
cd server
cargo run --release --bin threadkit-http -- \
  --create-site "Local Dev" localhost none \
  tk_pub_local_example_key tk_sec_local_example_key \
  00000000-0000-0000-0000-000000000001
```

This creates a site with:
- **Name**: Local Dev
- **Domain**: localhost
- **Moderation**: none (posts appear immediately)
- **Public Key**: `tk_pub_local_example_key`
- **Secret Key**: `tk_sec_local_example_key`
- **Site ID**: `00000000-0000-0000-0000-000000000001`

You only need to run this once. The site config is stored in Redis.

### 3. Start the HTTP server

```bash
cd server
cargo run --release --bin threadkit-http
```

The server runs at `http://localhost:8080`.

### 4. Start the example

```bash
cd examples/local-server
pnpm install
pnpm dev
```

Open `http://localhost:5173` in your browser.

## Optional: WebSocket Server

For real-time updates (typing indicators, presence, live comments):

```bash
cd server
cargo run --release --bin threadkit-websocket
```

The WebSocket server runs at `ws://localhost:8081`.

## Configuration

The example uses these hardcoded values that match the `--create-site` command above:

```ts
const LOCAL_API_KEY = 'tk_pub_local_example_key';
const SITE_ID = '00000000-0000-0000-0000-000000000001';
const API_URL = 'http://localhost:8080/v1';
```

## API Documentation

Once the server is running, view the interactive API docs at:
- **Scalar UI**: http://localhost:8080/docs
- **OpenAPI JSON**: http://localhost:8080/docs/openapi.json

## Troubleshooting

### "Invalid API key" error

Make sure you've run the `--create-site` command to create the site in Redis.

### Redis connection error

Make sure Redis is running: `redis-server` or `redis-cli ping` should return `PONG`.

### Port already in use

The default ports are:
- HTTP API: 8080
- WebSocket: 8081
- Redis: 6379

Use `--port` flag to change: `cargo run --bin threadkit-http -- --port 3000`
