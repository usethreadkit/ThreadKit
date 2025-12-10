#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/deploy/.env.production"

# Load Redis URL from env file
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file not found at $ENV_FILE"
    exit 1
fi

source "$ENV_FILE"

if [ -z "$REDIS_URL" ]; then
    echo "Error: REDIS_URL not found in $ENV_FILE"
    exit 1
fi

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   ⚠️  ⚠️  ⚠️     DANGER: FLUSH REDIS DATABASE     ⚠️  ⚠️  ⚠️      ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "This will DELETE ALL DATA from the Redis database:"
echo "  Database: $(echo $REDIS_URL | sed 's/:\/\/.*@/:\/\/***@/')"
echo ""
echo "The following will be PERMANENTLY DELETED:"
echo "  • All user accounts and sessions"
echo "  • All comments and votes"
echo "  • All site configurations"
echo "  • All cached data"
echo "  • Everything else in Redis"
echo ""
echo "This action CANNOT be undone!"
echo ""
read -p "Type 'FLUSH DATABASE NOW' to confirm: " confirmation

if [ "$confirmation" != "FLUSH DATABASE NOW" ]; then
    echo ""
    echo "❌ Aborted. No data was deleted."
    exit 1
fi

echo ""
echo "Flushing database..."
redis-cli -u "$REDIS_URL" --tls FLUSHDB

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Redis database has been flushed."
    echo "All data has been deleted."
else
    echo ""
    echo "❌ Failed to flush database."
    exit 1
fi
