#!/bin/bash

# Deploy script for WordPress.org SVN repository
# This automates the deployment process to WordPress.org

set -e

PLUGIN_SLUG="threadkit"
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVN_DIR="$PLUGIN_DIR/svn-repo"

# Check if we have a version argument
if [ -z "$1" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 0.1.0"
    exit 1
fi

VERSION=$1

echo "Deploying ThreadKit WordPress Plugin v$VERSION"
echo "=============================================="

# Verify version matches plugin file
PLUGIN_VERSION=$(grep "Version:" "$PLUGIN_DIR/threadkit.php" | awk '{print $2}')
if [ "$PLUGIN_VERSION" != "$VERSION" ]; then
    echo "Error: Version mismatch!"
    echo "  Plugin file version: $PLUGIN_VERSION"
    echo "  Deployment version: $VERSION"
    exit 1
fi

# Build the release
echo "Building release package..."
bash "$PLUGIN_DIR/bin/build-release.sh"

# Check if SVN repo exists
if [ ! -d "$SVN_DIR" ]; then
    echo "Checking out SVN repository..."
    svn co "https://plugins.svn.wordpress.org/$PLUGIN_SLUG" "$SVN_DIR"
else
    echo "Updating SVN repository..."
    cd "$SVN_DIR"
    svn update
    cd "$PLUGIN_DIR"
fi

# Sync trunk
echo "Syncing to SVN trunk..."
rsync -av --delete \
    --exclude=".svn" \
    "$PLUGIN_DIR/build/$PLUGIN_SLUG/" "$SVN_DIR/trunk/"

# Copy assets if they exist
if [ -d "$PLUGIN_DIR/.wordpress-org" ]; then
    echo "Syncing assets..."
    rsync -av --delete \
        --exclude=".svn" \
        --exclude="README.txt" \
        "$PLUGIN_DIR/.wordpress-org/" "$SVN_DIR/assets/"
fi

# Add new files to SVN
cd "$SVN_DIR"
svn status | grep "^?" | awk '{print $2}' | xargs -I{} svn add {}@

# Remove deleted files from SVN
svn status | grep "^!" | awk '{print $2}' | xargs -I{} svn delete {}@

# Show status
echo ""
echo "SVN Status:"
svn status

# Ask for confirmation
echo ""
read -p "Ready to commit to SVN trunk? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 1
fi

# Commit to trunk
echo "Committing to trunk..."
svn commit -m "Release version $VERSION"

# Create tag
echo "Creating tag for v$VERSION..."
svn copy trunk "tags/$VERSION" -m "Tagging version $VERSION"

# Update stable tag in readme.txt
cd "$SVN_DIR/trunk"
sed -i.bak "s/Stable tag: .*/Stable tag: $VERSION/" readme.txt
rm readme.txt.bak
svn commit -m "Update stable tag to $VERSION"

cd "$PLUGIN_DIR"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Plugin v$VERSION has been deployed to WordPress.org"
echo "It may take a few minutes to appear in the directory."
echo ""
