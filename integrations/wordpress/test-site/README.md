# ThreadKit WordPress Test Site

Local WordPress installation for testing the ThreadKit plugin.

## Quick Start

### Using Docker Compose (Recommended)

1. Start the test site from the WordPress plugin directory:
```bash
cd integrations/wordpress
docker compose up -d
```

2. Wait for WordPress to initialize (about 30 seconds)

3. Access WordPress:
   - **WordPress Site**: http://localhost:8080
   - **WordPress Admin**: http://localhost:8080/wp-admin
   - **PHPMyAdmin**: http://localhost:8081

4. Complete WordPress setup:
   - Choose your language
   - Site Title: "ThreadKit Test Site"
   - Username: admin
   - Password: (create a strong password)
   - Email: your email

5. Activate the ThreadKit plugin:
   - Go to Plugins > Installed Plugins
   - Find "ThreadKit" and click Activate

6. Configure ThreadKit:
   - Go to Settings > ThreadKit
   - Add your Site ID and API Key
   - Enable on posts/pages
   - Save settings

7. Test the plugin:
   - Create a new post
   - View the post on the frontend
   - ThreadKit should appear automatically

## Stopping the Test Site

```bash
docker compose down
```

To remove all data and start fresh:
```bash
docker compose down -v
```

## Local Development Workflow

The plugin directory is mounted into the WordPress container, so any changes you make to the plugin files will be immediately reflected in the WordPress site.

### Making Changes

1. Edit plugin files in `integrations/wordpress/`
2. Refresh your browser to see changes
3. Check logs: `docker compose logs -f wordpress`

### Debugging

Enable WordPress debug mode (already enabled in docker-compose.yml):
- Check: `wp-content/debug.log`
- View logs: `docker compose logs -f wordpress`

## Manual Setup (Without Docker)

If you prefer a manual setup:

1. **Requirements:**
   - PHP 7.4+
   - MySQL 5.7+ or MariaDB
   - WordPress 5.0+

2. **Install WordPress:**
   - Download from https://wordpress.org/download/
   - Follow the installation wizard

3. **Install Plugin:**
   ```bash
   cd wp-content/plugins/
   ln -s /path/to/threadkit/integrations/wordpress threadkit
   ```

4. **Activate and configure as described above**

## Using WP-CLI (Optional)

Access the WordPress CLI inside the container:

```bash
docker compose exec wordpress wp --allow-root plugin list
docker compose exec wordpress wp --allow-root plugin activate threadkit
docker compose exec wordpress wp --allow-root post create --post_type=post --post_title='Test Post' --post_status=publish
```

## Troubleshooting

### Plugin not showing up
- Check that the plugin directory is correctly mounted
- Look for PHP errors: `docker compose logs wordpress`

### Database connection issues
- Wait for MySQL to fully start: `docker compose logs db`
- Verify health: `docker compose ps`

### Port conflicts
If port 8080 or 8081 is already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "8888:80"  # Change 8080 to 8888
```

## Clean Slate

To completely reset the test site:
```bash
docker compose down -v
docker compose up -d
```

This removes all data including WordPress installation, database, and uploaded media.
