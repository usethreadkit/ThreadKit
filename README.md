# ThreadKit

A self-hostable, embeddable comment system for static sites. Like Disqus, but open source and privacy-focused.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ThreadKit                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐ │
│  │   Client    │    │ Rust Server  │    │   Next.js Dashboard │ │
│  │   (embed)   │───▶│  (HTTP/WS)   │    │   (SaaS only)       │ │
│  └─────────────┘    └──────────────┘    └─────────────────────┘ │
│                            │                      │              │
│                            ▼                      ▼              │
│                     ┌──────────┐          ┌───────────┐         │
│                     │  Redis   │          │ Postgres  │         │
│                     │(comments)│          │(billing)  │         │
│                     └──────────┘          └───────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Description | License |
|-----------|-------------|---------|
| `server/` | Rust HTTP + WebSocket server | MIT (OSS) |
| `client/` | JavaScript embed library | MIT (OSS) |
| `usethreadkit.com/` | Next.js dashboard & billing | Proprietary |

## Quick Start (Self-Hosted)

```bash
# 1. Start Redis
docker run -d -p 6379:6379 redis

# 2. Run ThreadKit server
cd server
cp .env.example .env
# Edit .env with your settings
cargo run --bin threadkit-http

# 3. Embed in your site
<script src="https://your-server/embed.js" data-api-key="tk_pub_xxx"></script>
<div id="threadkit-comments"></div>
```

## Documentation

- [API Reference](docs/api.md)
- [Redis Data Structures](docs/redis.md)
- [Self-Hosting Guide](docs/self-hosting.md)
- [Dashboard Setup](docs/dashboard.md)

## License

- Server & Client: MIT
- Dashboard (usethreadkit.com): Proprietary
