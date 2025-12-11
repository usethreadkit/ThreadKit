#!/bin/bash
set -e

echo "Setting up MinIO for local development..."

# MinIO configuration
MINIO_ENDPOINT="http://localhost:9000"
MINIO_ACCESS_KEY="${MINIO_ROOT_USER:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_ROOT_PASSWORD:-minioadmin123}"

# Wait for MinIO to be ready
echo "Waiting for MinIO to be ready..."
until curl -sf "${MINIO_ENDPOINT}/minio/health/live" > /dev/null 2>&1; do
  echo "MinIO is unavailable - sleeping"
  sleep 2
done

echo "MinIO is ready!"

# Configure mc (MinIO Client)
mc alias set local "${MINIO_ENDPOINT}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"

# Create buckets with threadkit- prefix
echo "Creating buckets..."
mc mb --ignore-existing local/threadkit-avatars
mc mb --ignore-existing local/threadkit-media

# Set public read access (download only)
echo "Setting bucket policies..."
mc anonymous set download local/threadkit-avatars
mc anonymous set download local/threadkit-media

echo "✅ MinIO setup complete!"
echo ""
echo "Bucket endpoints:"
echo "  - Avatars: ${MINIO_ENDPOINT}/threadkit-avatars"
echo "  - Media:   ${MINIO_ENDPOINT}/threadkit-media"
echo ""
echo "Console UI: http://localhost:9001"
echo "  Username: ${MINIO_ACCESS_KEY}"
echo "  Password: ${MINIO_SECRET_KEY}"
