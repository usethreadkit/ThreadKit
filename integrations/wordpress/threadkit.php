<?php
/**
 * Plugin Name: ThreadKit
 * Plugin URI: https://threadkit.com
 * Description: Add real-time comments and chat to your WordPress site with ThreadKit
 * Version: 0.1.0-alpha
 * Author: ThreadKit
 * Author URI: https://threadkit.com
 * License: MIT
 * Text Domain: threadkit
 * Domain Path: /languages
 *
 * WARNING: This plugin is in active development and not ready for production use.
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('THREADKIT_VERSION', '0.1.0');
define('THREADKIT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('THREADKIT_PLUGIN_URL', plugin_dir_url(__FILE__));
define('THREADKIT_PLUGIN_FILE', __FILE__);

// Include the main plugin class
require_once THREADKIT_PLUGIN_DIR . 'src/class-threadkit.php';

// Initialize the plugin
function threadkit_init() {
    return ThreadKit::get_instance();
}

// Start the plugin
threadkit_init();
