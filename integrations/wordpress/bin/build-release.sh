#!/bin/bash

# Build script for creating WordPress.org release
# This creates a clean distribution without dev files

set -e

PLUGIN_SLUG="threadkit"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$PLUGIN_DIR/build"
RELEASE_DIR="$BUILD_DIR/$PLUGIN_SLUG"

echo "Building ThreadKit WordPress Plugin Release"
echo "==========================================="

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

# Create build directory
echo "Creating build directory..."
mkdir -p "$RELEASE_DIR"

# Copy plugin files (respecting .distignore)
echo "Copying plugin files..."
rsync -av \
    --exclude-from="$PLUGIN_DIR/.distignore" \
    --exclude=".distignore" \
    --exclude="build/" \
    "$PLUGIN_DIR/" "$RELEASE_DIR/"

# Copy WordPress.org assets
if [ -d "$PLUGIN_DIR/.wordpress-org" ]; then
    echo "Copying WordPress.org README..."
    cp "$PLUGIN_DIR/.wordpress-org/README.txt" "$RELEASE_DIR/readme.txt"
fi

# Install production dependencies only
if [ -f "$RELEASE_DIR/composer.json" ]; then
    echo "Installing production dependencies..."
    cd "$RELEASE_DIR"
    composer install --no-dev --optimize-autoloader --no-interaction
    cd "$PLUGIN_DIR"
fi

# Create ZIP file
echo "Creating ZIP archive..."
cd "$BUILD_DIR"
zip -r "$PLUGIN_SLUG.zip" "$PLUGIN_SLUG" -q
cd "$PLUGIN_DIR"

echo ""
echo "✅ Build complete!"
echo ""
echo "Release package: $BUILD_DIR/$PLUGIN_SLUG.zip"
echo "Release directory: $RELEASE_DIR"
echo ""
echo "Next steps:"
echo "1. Test the plugin from: $RELEASE_DIR"
echo "2. Upload $BUILD_DIR/$PLUGIN_SLUG.zip to WordPress.org"
echo ""
