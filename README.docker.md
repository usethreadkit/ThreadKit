# Docker Compose for Local Development

This setup provides Redis and MinIO (S3-compatible storage) for local development.

## Quick Start

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Services

### Redis
- **Port:** 6379
- **Connection:** `redis://localhost:6379`
- **Data:** Persisted in `redis-data` volume

### MinIO (S3)
- **API Port:** 9000
- **Console Port:** 9001
- **Console URL:** http://localhost:9001
- **Default Credentials:**
  - Username: `minioadmin`
  - Password: `minioadmin123`
- **Data:** Persisted in `minio-data` volume

### Buckets

Two buckets are created automatically with public read access:
- `threadkit-avatars` - User avatar images (resized to 200x200)
- `threadkit-media` - General media uploads

Access files at:
- `http://localhost:9000/threadkit-avatars/{filename}`
- `http://localhost:9000/threadkit-media/{filename}`

## Environment Variables for Server

Add to your `.env` file:

```bash
# S3 Configuration (MinIO)
S3_ENABLED=true
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET_NAME=threadkit-media
S3_APPLICATION_KEY_ID=minioadmin
S3_APPLICATION_KEY=minioadmin123
S3_PUBLIC_URL=http://localhost:9000/threadkit-media
```

## Testing

Run tests with MinIO integration:

```bash
# Tests will automatically start/stop MinIO containers
cargo test --test media_tests

# Run all tests
cargo test
```

## Manual Setup

If you need to manually recreate buckets:

```bash
./server/scripts/setup-minio.sh
```

## Troubleshooting

### Buckets not created
```bash
# Recreate setup container
docker-compose up minio-setup
```

### Reset everything
```bash
# Remove containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Check MinIO health
```bash
curl http://localhost:9000/minio/health/live
```
