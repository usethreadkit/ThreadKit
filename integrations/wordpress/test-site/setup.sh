#!/bin/bash

# ThreadKit WordPress Test Site Setup Script
# This script automates the setup of a local WordPress test environment

set -e

echo "==================================="
echo "ThreadKit WordPress Test Site Setup"
echo "==================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Navigate to WordPress plugin directory
cd "$(dirname "$0")/.."

echo "Starting WordPress and MySQL containers..."
docker compose up -d

echo ""
echo "Waiting for MySQL to be ready..."
sleep 10

# Wait for WordPress to be ready
echo "Waiting for WordPress to be ready..."
MAX_TRIES=30
COUNT=0
until curl -s http://localhost:8080 > /dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_TRIES ]; then
        echo "Error: WordPress failed to start after $MAX_TRIES attempts"
        docker compose logs
        exit 1
    fi
    echo "Attempt $COUNT/$MAX_TRIES: WordPress not ready yet..."
    sleep 2
done

echo ""
echo "✅ WordPress is ready!"
echo ""
echo "==================================="
echo "Test Site Information"
echo "==================================="
echo ""
echo "WordPress Site:    http://localhost:8080"
echo "WordPress Admin:   http://localhost:8080/wp-admin"
echo "PHPMyAdmin:        http://localhost:8081"
echo ""
echo "==================================="
echo "Next Steps"
echo "==================================="
echo ""
echo "1. Open http://localhost:8080 in your browser"
echo "2. Complete the WordPress installation wizard"
echo "3. Go to Plugins > Installed Plugins"
echo "4. Activate 'ThreadKit' plugin"
echo "5. Configure at Settings > ThreadKit"
echo ""
echo "To stop the test site:"
echo "  docker compose down"
echo ""
echo "To view logs:"
echo "  docker compose logs -f"
echo ""
echo "Happy testing! 🚀"
