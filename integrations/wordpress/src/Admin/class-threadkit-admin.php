<?php
/**
 * ThreadKit Admin functionality
 */

class ThreadKit_Admin {
    public function __construct() {
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_filter('plugin_action_links_' . plugin_basename(THREADKIT_PLUGIN_FILE), array($this, 'add_action_links'));
    }

    public function enqueue_admin_assets() {
        wp_enqueue_style(
            'threadkit-admin',
            THREADKIT_PLUGIN_URL . 'assets/admin.css',
            array(),
            THREADKIT_VERSION
        );
    }

    public function add_action_links($links) {
        $settings_link = '<a href="' . admin_url('options-general.php?page=threadkit-settings') . '">' . __('Settings', 'threadkit') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
}
