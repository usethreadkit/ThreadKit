#!/bin/bash
set -e

SERVER="root@66.42.85.20"
DEPLOY_DIR="/opt/threadkit"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== ThreadKit Deploy Script ==="

# Build binaries in Docker (x86_64 Linux)
echo "Building binaries..."
docker run --platform linux/amd64 --rm -v "$PROJECT_DIR":/app -w /app rustlang/rust:nightly cargo build --release

# Copy binaries to deploy directory
echo "Preparing binaries..."
mkdir -p "$SCRIPT_DIR/bin"
cp "$PROJECT_DIR/target/release/threadkit-http" "$SCRIPT_DIR/bin/"
cp "$PROJECT_DIR/target/release/threadkit-websocket" "$SCRIPT_DIR/bin/"

# rsync to server
echo "Deploying to server..."
rsync -avz --progress \
    "$SCRIPT_DIR/bin/" \
    "$SERVER:$DEPLOY_DIR/bin/"

# Restart services
echo "Restarting services..."
ssh "$SERVER" "systemctl restart threadkit-http threadkit-ws"

echo "=== Deploy complete ==="
echo "Check status: ssh $SERVER 'systemctl status threadkit-http threadkit-ws'"
