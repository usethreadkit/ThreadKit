# Self-Hosting ThreadKit

This guide covers running ThreadKit on your own infrastructure.

---

## DigitalOcean Deployment

This is the recommended way to self-host ThreadKit. Total cost: **$12/month** (or use our [hosted service](https://usethreadkit.com) for $5/mo).

### Droplet Sizing

| Size | RAM | vCPU | Price | Recommendation |
|------|-----|------|-------|----------------|
| Basic | 1GB | 1 | $6/mo | Minimum viable |
| **Regular** | 2GB | 1 | $12/mo | Recommended |
| Premium | 4GB | 2 | $24/mo | High traffic sites |

### Step 1: Create Droplet

1. Go to DigitalOcean → Create → Droplets
2. Choose **Ubuntu 24.04 LTS**
3. Select **Regular $12/mo** (2GB RAM, 1 vCPU)
4. Choose a datacenter close to your users
5. Add your SSH key
6. Create droplet

### Step 2: Initial Server Setup

```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y
```

### Step 3: Create App Directory

```bash
mkdir -p /opt/threadkit
cd /opt/threadkit
```

### Step 4: Create docker-compose.yml

```bash
cat > docker-compose.yml << 'EOF'
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    restart: unless-stopped

  threadkit-http:
    image: ghcr.io/usethreadkit/threadkit:latest
    command: threadkit-http
    ports:
      - "8080:8080"
    environment:
      - MODE=standalone
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SITE_NAME=${SITE_NAME}
      - SITE_DOMAIN=${SITE_DOMAIN}
    depends_on:
      - redis
    restart: unless-stopped

  threadkit-ws:
    image: ghcr.io/usethreadkit/threadkit:latest
    command: threadkit-websocket
    ports:
      - "8081:8081"
    environment:
      - MODE=standalone
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis-data:
EOF
```

### Step 5: Create .env File

```bash
cat > .env << 'EOF'
JWT_SECRET=your-random-secret-at-least-32-characters-long
SITE_NAME=My Blog
SITE_DOMAIN=myblog.com
EOF

# Generate a secure JWT secret
sed -i "s/your-random-secret-at-least-32-characters-long/$(openssl rand -base64 32)/" .env
```

### Step 6: Start Services

```bash
docker compose up -d

# Check logs
docker compose logs -f
```

### Step 7: Setup Caddy (Automatic HTTPS)

Caddy is the easiest way to get HTTPS. It handles certificates automatically.

```bash
# Install Caddy
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy -y
```

Create Caddyfile:

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
api.yourdomain.com {
    # HTTP API
    handle /v1/* {
        reverse_proxy localhost:8080
    }

    handle /health {
        reverse_proxy localhost:8080
    }

    handle /docs* {
        reverse_proxy localhost:8080
    }

    # WebSocket
    handle /ws {
        reverse_proxy localhost:8081
    }
}
EOF

# Reload Caddy
systemctl reload caddy
```

### Step 8: Configure DNS

Point your domain to the droplet IP:
- `api.yourdomain.com` → `A` record → `your-droplet-ip`

### Step 9: Verify Installation

```bash
# Check health
curl https://api.yourdomain.com/health

# View API docs
open https://api.yourdomain.com/docs
```

### Step 10: Get Your API Keys

Check the logs for auto-generated API keys:

```bash
docker compose logs threadkit-http | grep "API Key"
```

Or set them explicitly in `.env`:

```bash
API_KEY_PUBLIC=tk_pub_yourkey
API_KEY_SECRET=tk_sec_yourkey
```

---

## Using Pre-built Binaries

If you prefer not to use Docker, download pre-built binaries from the [releases page](https://github.com/usethreadkit/threadkit/releases):

```bash
# Download and extract
wget https://github.com/usethreadkit/threadkit/releases/latest/download/threadkit-x86_64-unknown-linux-gnu.tar.gz
tar -xzf threadkit-x86_64-unknown-linux-gnu.tar.gz

# Move to /usr/local/bin
sudo mv threadkit-http threadkit-websocket /usr/local/bin/

# Create systemd services (see below)
```

### Systemd Service Files

Create `/etc/systemd/system/threadkit-http.service`:

```ini
[Unit]
Description=ThreadKit HTTP Server
After=network.target redis.service

[Service]
Type=simple
EnvironmentFile=/opt/threadkit/.env
ExecStart=/usr/local/bin/threadkit-http
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/threadkit-ws.service`:

```ini
[Unit]
Description=ThreadKit WebSocket Server
After=network.target redis.service

[Service]
Type=simple
EnvironmentFile=/opt/threadkit/.env
ExecStart=/usr/local/bin/threadkit-websocket
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now threadkit-http threadkit-ws
```

---

## Requirements

- **Redis** 6.0+ (for data storage)
- **Rust** 1.75+ (to build the server)

Optional:
- **SMTP server** (for email verification)
- **SMS provider** (for phone verification, e.g., Twilio)
- **OAuth credentials** (for social login)

---

## Quick Start

### 1. Start Redis

```bash
# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Or install locally
brew install redis && redis-server
```

### 2. Build the Server

```bash
cd server
cargo build --release
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Required
MODE=standalone
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-random-secret-at-least-32-chars

# Site config
SITE_NAME=My Blog
SITE_DOMAIN=myblog.com

# API keys (auto-generated if not set)
API_KEY_PUBLIC=tk_pub_your_key
API_KEY_SECRET=tk_sec_your_key

# Ports
HTTP_PORT=8080
WS_PORT=8081

# Optional: OAuth
OAUTH_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=xxx
OAUTH_GOOGLE_REDIRECT_URL=https://api.myblog.com/v1/auth/google/callback
```

### 4. Run the Server

```bash
# HTTP server
./target/release/threadkit-http

# WebSocket server (separate process)
./target/release/threadkit-websocket
```

### 5. Embed in Your Site

```html
<script src="https://api.myblog.com/embed.js" data-project-id="tk_pub_xxx"></script>
<div id="threadkit-comments"></div>
```

---

## Production Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  threadkit-http:
    image: threadkit/server:latest
    command: threadkit-http
    ports:
      - "8080:8080"
    environment:
      - MODE=standalone
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - SITE_NAME=${SITE_NAME}
      - SITE_DOMAIN=${SITE_DOMAIN}
    depends_on:
      - redis
    restart: unless-stopped

  threadkit-ws:
    image: threadkit/server:latest
    command: threadkit-websocket
    ports:
      - "8081:8081"
    environment:
      - MODE=standalone
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis
    restart: unless-stopped

volumes:
  redis-data:
```

### Nginx Reverse Proxy

```nginx
upstream threadkit_http {
    server 127.0.0.1:8080;
}

upstream threadkit_ws {
    server 127.0.0.1:8081;
}

server {
    listen 443 ssl http2;
    server_name api.myblog.com;

    ssl_certificate /etc/letsencrypt/live/api.myblog.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.myblog.com/privkey.pem;

    # HTTP API
    location /v1/ {
        proxy_pass http://threadkit_http;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://threadkit_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # Health check
    location /health {
        proxy_pass http://threadkit_http;
    }
}
```

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MODE` | No | `standalone` | `standalone` or `saas` |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `HTTP_PORT` | No | `8080` | HTTP server port |
| `WS_PORT` | No | `8081` | WebSocket server port |
| `JWT_SECRET` | Yes | (random) | Secret for JWT signing |
| `JWT_EXPIRY_HOURS` | No | `168` (7 days) | Token expiry time |
| `SITE_ID` | No | (auto) | UUID for the site |
| `SITE_NAME` | No | `My Site` | Display name |
| `SITE_DOMAIN` | No | `localhost` | Your domain |
| `API_KEY_PUBLIC` | No | (auto) | Public API key |
| `API_KEY_SECRET` | No | (auto) | Secret API key |
| `MODERATION_MODE` | No | `none` | `none`, `pre`, or `post` |

### OAuth Configuration

**Google:**
```bash
OAUTH_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=xxx
OAUTH_GOOGLE_REDIRECT_URL=https://api.example.com/v1/auth/google/callback
```

**GitHub:**
```bash
OAUTH_GITHUB_CLIENT_ID=xxx
OAUTH_GITHUB_CLIENT_SECRET=xxx
OAUTH_GITHUB_REDIRECT_URL=https://api.example.com/v1/auth/github/callback
```

---

## Bootstrapping Admin Access

After starting the server, you need to set up admin access:

### Option 1: Use Secret API Key

The secret API key (`tk_sec_xxx`) gives owner-level access. Use it to:
- View all comments
- Manage admins via API
- Access moderation endpoints

### Option 2: Promote a User via Redis

1. Register as a user through the comment widget
2. Find your user ID in the server logs or Redis
3. Add yourself as admin:

```bash
redis-cli SADD site:{site_id}:admins {your_user_id}
```

### Option 3: Use CLI Tool

```bash
# Create site and get keys
threadkit-admin create-site --name "My Blog" --domain myblog.com

# Promote user to admin
threadkit-admin add-admin --site {site_id} --user {user_id}

# Generate new API keys
threadkit-admin rotate-keys --site {site_id}
```

---

## Backup & Restore

### Redis Backup

```bash
# Create RDB snapshot
redis-cli BGSAVE

# Copy the dump file
cp /var/lib/redis/dump.rdb /backups/threadkit-$(date +%Y%m%d).rdb
```

### Restore

```bash
# Stop Redis
sudo systemctl stop redis

# Replace dump file
cp /backups/threadkit-20240115.rdb /var/lib/redis/dump.rdb

# Start Redis
sudo systemctl start redis
```

### Automated Backups

```bash
# Cron job (daily at 3am)
0 3 * * * redis-cli BGSAVE && cp /var/lib/redis/dump.rdb /backups/threadkit-$(date +\%Y\%m\%d).rdb
```

---

## Scaling

### Horizontal Scaling

ThreadKit servers are stateless. Scale by running multiple instances:

```yaml
services:
  threadkit-http:
    deploy:
      replicas: 3
```

Use a load balancer (nginx, HAProxy, etc.) to distribute traffic.

### Redis Scaling

For high traffic:
1. Enable Redis persistence (AOF + RDB)
2. Consider Redis Cluster for sharding
3. Use Redis Sentinel for high availability

---

## Monitoring

### Health Checks

```bash
# HTTP server
curl http://localhost:8080/health

# WebSocket server
curl http://localhost:8081/health
```

### Prometheus Metrics

Metrics available at `/metrics`:

```
threadkit_comments_total
threadkit_comments_pending
threadkit_active_websockets
threadkit_request_duration_seconds
threadkit_redis_connections
```

### Logging

Set log level via `RUST_LOG`:

```bash
RUST_LOG=info                    # Production
RUST_LOG=debug                   # Development
RUST_LOG=threadkit=debug,info    # Debug ThreadKit only
```

---

## Troubleshooting

### Common Issues

**"Connection refused" to Redis:**
- Check Redis is running: `redis-cli ping`
- Verify `REDIS_URL` is correct

**"Invalid API key":**
- Check you're using the correct key (public vs secret)
- Keys are auto-generated on first run - check server logs

**WebSocket won't connect:**
- Ensure nginx is configured for WebSocket upgrade
- Check `proxy_read_timeout` is high enough

**Comments not appearing:**
- Check moderation mode (`MODERATION_MODE=none` for auto-approve)
- Verify user is not blocked

### Debug Mode

```bash
RUST_LOG=threadkit=debug cargo run --bin threadkit-http
```

This logs all requests, Redis operations, and errors.
