#!/bin/bash
# Run this on the VPS to set up ThreadKit for the first time
set -e

echo "=== ThreadKit VPS Setup ==="

# Update system
apt update && apt upgrade -y

# Install nginx
apt install -y nginx

# Create threadkit user
if ! id "threadkit" &>/dev/null; then
    useradd -r -s /bin/false threadkit
fi

# Create directories
mkdir -p /opt/threadkit/bin
mkdir -p /etc/ssl/threadkit

# Set permissions
chown -R threadkit:threadkit /opt/threadkit

# Copy systemd services (assumes they've been rsync'd to /tmp)
cp /tmp/threadkit-http.service /etc/systemd/system/
cp /tmp/threadkit-ws.service /etc/systemd/system/

# Copy nginx config
cp /tmp/nginx.conf /etc/nginx/sites-available/threadkit
ln -sf /etc/nginx/sites-available/threadkit /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Enable services
systemctl daemon-reload
systemctl enable threadkit-http threadkit-ws

# Configure journald for log rotation (already default, but ensure retention)
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/threadkit.conf << 'EOF'
[Journal]
SystemMaxUse=2G
MaxRetentionSec=30day
EOF
systemctl restart systemd-journald

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Copy SSL certs to /etc/ssl/threadkit/"
echo "2. Copy .env to /opt/threadkit/.env"
echo "3. Copy binaries to /opt/threadkit/bin/"
echo "4. Run: nginx -t && systemctl reload nginx"
echo "5. Run: systemctl start threadkit-http threadkit-ws"
