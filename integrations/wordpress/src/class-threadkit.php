<?php
/**
 * Main ThreadKit class
 */

class ThreadKit {
    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->includes();
        $this->init_hooks();
    }

    private function includes() {
        require_once THREADKIT_PLUGIN_DIR . 'src/Admin/class-threadkit-admin.php';
        require_once THREADKIT_PLUGIN_DIR . 'src/Admin/class-threadkit-settings.php';
        require_once THREADKIT_PLUGIN_DIR . 'src/Frontend/class-threadkit-frontend.php';
    }

    private function init_hooks() {
        add_action('plugins_loaded', array($this, 'load_textdomain'));

        if (is_admin()) {
            new ThreadKit_Admin();
        } else {
            new ThreadKit_Frontend();
        }

        new ThreadKit_Settings();
    }

    public function load_textdomain() {
        load_plugin_textdomain('threadkit', false, dirname(plugin_basename(THREADKIT_PLUGIN_FILE)) . '/languages');
    }

    public static function get_option($key, $default = '') {
        $options = get_option('threadkit_settings', array());
        return isset($options[$key]) ? $options[$key] : $default;
    }
}
