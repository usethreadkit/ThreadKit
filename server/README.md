# ThreadKit Server

Self-hosted backend for ThreadKit comment system. Written in Rust for performance. **Redis is the only dependency.**

## Quick Start

```bash
# Copy and configure environment
cp .env.example .env

# Build and run
cargo build --release
./target/release/threadkit-http
```

The server listens on `127.0.0.1:8080` by default (localhost only).

## Binaries

| Binary | Description |
|--------|-------------|
| `threadkit-http` | HTTP API server |
| `threadkit-websocket` | WebSocket server for real-time updates |
| `threadkit-loadtest` | Load testing tool |

## Configuration

Configuration is loaded from environment variables. You can use a `.env` file or pass values directly.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODE` | `standalone` | `standalone` (self-hosted) or `saas` |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `HTTP_HOST` | `127.0.0.1` | HTTP server bind address |
| `HTTP_PORT` | `8080` | HTTP server port |
| `WS_HOST` | `127.0.0.1` | WebSocket server bind address |
| `WS_PORT` | `8081` | WebSocket server port |
| `JWT_SECRET` | (random) | Secret for signing JWTs |
| `JWT_EXPIRY_HOURS` | `168` (7 days) | JWT token expiry |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `ALLOW_LOCALHOST_ORIGIN` | `false` | Allow localhost origins (dev only) |
| `SITE_NAME` | `My Site` | Site name (standalone mode) |
| `SITE_DOMAIN` | `localhost` | Site domain (standalone mode) |
| `MODERATION_MODE` | `none` | `none`, `pre`, or `post` |

See `.env.example` for all available options including OAuth, email (Resend), SMS (Twilio), and Turnstile configuration.

## CLI Arguments

CLI arguments override environment variables.

### threadkit-http

```
Usage: threadkit-http [OPTIONS]

Options:
  -e, --env <ENV>                          Path to .env file
  -l, --log <LOG>                          Log level (e.g., "info", "debug")
      --host <HOST>                        Host to bind to (overrides HTTP_HOST)
  -p, --port <PORT>                        Port to listen on (overrides HTTP_PORT)
      --redis-url <REDIS_URL>              Redis URL (overrides REDIS_URL)
      --no-rate-limit                      Disable rate limiting
      --allow-localhost-origin             Allow localhost origins (dev only)
      --site-id <SITE_ID>                  Site ID (standalone mode)
      --site-name <SITE_NAME>              Site name (standalone mode)
      --site-domain <SITE_DOMAIN>          Site domain (standalone mode)
      --project-id-public <PROJECT_ID_PUBLIC>    Public project ID (standalone mode)
      --project-id-secret <PROJECT_ID_SECRET>    Secret project ID (standalone mode)
      --moderation-mode <MODE>             Moderation: none, pre, or post
  -h, --help                               Print help
  -V, --version                            Print version
```

### threadkit-websocket

```
Usage: threadkit-websocket [OPTIONS]

Options:
  -e, --env <ENV>              Path to .env file
  -l, --log <LOG>              Log level (e.g., "info", "debug")
      --host <HOST>            Host to bind to (overrides WS_HOST)
  -p, --port <PORT>            Port to listen on (overrides WS_PORT)
      --redis-url <REDIS_URL>  Redis URL (overrides REDIS_URL)
  -h, --help                   Print help
  -V, --version                Print version
```

### Examples

```bash
# Use a specific .env file
./threadkit-http --env .env.production

# Override port via CLI
./threadkit-http --port 3000

# Bind to all interfaces (production)
./threadkit-http --host 0.0.0.0

# Set log level
./threadkit-http --log debug
./threadkit-http --log "info,threadkit=debug,tower_http=debug"

# Disable rate limiting for testing
./threadkit-http --no-rate-limit

# Development mode with localhost origins allowed
./threadkit-http --allow-localhost-origin

# Configure standalone site via CLI
./threadkit-http --site-name "My Blog" --site-domain "example.com"

# Multiple overrides
./threadkit-http --env .env.staging --host 0.0.0.0 --port 8000
```

## Security

By default, the server binds to `127.0.0.1` (localhost only). This is the safest default for development.

For production, you should:

1. **Use a reverse proxy** (nginx, Caddy) that handles TLS
2. Bind to `0.0.0.0` only if behind a reverse proxy
3. Set a strong `JWT_SECRET`
4. Enable rate limiting
5. Configure `SITE_DOMAIN` for origin validation

## API Documentation

The HTTP server exposes OpenAPI documentation:

- `/docs` - Interactive Scalar UI
- `/openapi.json` - OpenAPI spec

## Endpoints

- `/health` - Health check
- `/metrics` - Prometheus metrics
- `/v1/*` - API routes (see `/docs`)

## Docker

```bash
docker build -t threadkit-server .
docker run -p 8080:8080 -e HTTP_HOST=0.0.0.0 threadkit-server
```

## Development

```bash
# Run HTTP server
cargo run -p threadkit-http --bin threadkit-http

# Run WebSocket server
cargo run -p threadkit-websocket

# Run with specific env file
cargo run -p threadkit-http --bin threadkit-http -- --env .env.loadtest

# Run tests
cargo test

# Load test
cargo run -p threadkit-loadtest -- setup --url http://localhost:8080
cargo run -p threadkit-loadtest -- read --url http://localhost:8080
```
