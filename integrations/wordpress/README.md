# ThreadKit WordPress Plugin

> ⚠️ **DEVELOPMENT STATUS**: This plugin is currently in active development and is **NOT ready for production use**. See [STATUS.md](STATUS.md) for details.

Add real-time comments and chat to your WordPress site with ThreadKit.

## Project Structure

```
wordpress/
├── threadkit.php              # Main plugin file
├── composer.json              # PHP dependencies
├── phpunit.xml.dist          # PHPUnit configuration
├── .phpcs.xml.dist           # WordPress coding standards config
├── src/                      # Plugin source code
│   ├── class-threadkit.php   # Main plugin class
│   ├── Admin/                # Admin functionality
│   │   ├── class-threadkit-admin.php
│   │   └── class-threadkit-settings.php
│   └── Frontend/             # Frontend functionality
│       └── class-threadkit-frontend.php
├── tests/                    # PHPUnit tests
│   ├── bootstrap.php
│   ├── test-threadkit.php
│   ├── test-settings.php
│   └── test-frontend.php
├── templates/                # Template files
│   └── comments.php
├── assets/                   # CSS and JS assets
│   └── admin.css
└── bin/                      # Utility scripts
    └── install-wp-tests.sh
```

## Development Roadmap

See [TODO.md](TODO.md) for the complete development roadmap and task list.

## Installation

> ⚠️ For development/testing purposes only. Not recommended for production sites.

1. Download the plugin ZIP file or clone this directory
2. Upload to `/wp-content/plugins/threadkit/` directory
3. Activate the plugin through the 'Plugins' menu in WordPress
4. Go to Settings > ThreadKit to configure

## Configuration

1. Sign up at [threadkit.com](https://threadkit.com)
2. Create a new site and copy your Site ID and API Key
3. In WordPress admin, go to Settings > ThreadKit
4. Paste your Site ID and API Key
5. Choose where to display ThreadKit (posts, pages, or both)
6. Save settings

## Usage

### Automatic Display

ThreadKit will automatically appear on posts and/or pages based on your settings.

### Manual Placement

Use the shortcode `[threadkit]` to manually place ThreadKit anywhere in your content.

You can also customize the page URL and title:
```
[threadkit page_url="https://example.com/custom" page_title="Custom Title"]
```

### Replace WordPress Comments

Enable "Replace WordPress Comments" in settings to replace the default WordPress comment system with ThreadKit.

## Features

- Real-time comments and chat
- Markdown support
- User authentication
- Moderation tools
- Custom styling
- Responsive design
- SEO friendly

## Requirements

- WordPress 5.0 or higher
- PHP 7.4 or higher

## Development

### Setup

1. Install Composer dependencies:
```bash
composer install
```

2. Install WordPress test suite:
```bash
bin/install-wp-tests.sh wordpress_test root '' localhost latest
```

### Running Tests

Run all tests:
```bash
composer test
# or directly
vendor/bin/phpunit
```

### Code Standards

Check coding standards:
```bash
composer phpcs
```

Auto-fix coding standards:
```bash
composer phpcbf
```

### Test Coverage

The plugin includes PHPUnit tests for:
- Main plugin class and singleton pattern
- Settings sanitization and validation
- Frontend rendering and shortcode functionality
- WordPress hooks integration

Coverage reports are automatically sent to Coveralls via GitHub Actions.

## Testing the Plugin Locally

### Using Docker (Recommended)

The easiest way to test the plugin is using the included Docker setup:

```bash
# Start the test site
./test-site/setup.sh

# Or manually
docker compose up -d
```

Then visit:
- WordPress: http://localhost:8080
- Admin: http://localhost:8080/wp-admin
- PHPMyAdmin: http://localhost:8081

See [test-site/README.md](test-site/README.md) for detailed instructions.

### Manual Testing

If you have a local WordPress installation:

```bash
# Create symlink in WordPress plugins directory
cd /path/to/wordpress/wp-content/plugins
ln -s /path/to/threadkit/integrations/wordpress threadkit

# Activate via wp-cli
wp plugin activate threadkit

# Or activate via WordPress admin
```

## Support

Visit [threadkit.com/docs](https://threadkit.com/docs) for documentation and support.

## License

MIT License
