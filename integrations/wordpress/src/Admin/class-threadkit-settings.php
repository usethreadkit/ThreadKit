<?php
/**
 * ThreadKit Settings
 */

class ThreadKit_Settings {
    public function __construct() {
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
    }

    public function add_settings_page() {
        add_options_page(
            __('ThreadKit Settings', 'threadkit'),
            __('ThreadKit', 'threadkit'),
            'manage_options',
            'threadkit-settings',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('threadkit_settings', 'threadkit_settings', array($this, 'sanitize_settings'));

        add_settings_section(
            'threadkit_general_section',
            __('General Settings', 'threadkit'),
            array($this, 'render_general_section'),
            'threadkit-settings'
        );

        add_settings_field(
            'site_id',
            __('Site ID', 'threadkit'),
            array($this, 'render_site_id_field'),
            'threadkit-settings',
            'threadkit_general_section'
        );

        add_settings_field(
            'api_key',
            __('API Key', 'threadkit'),
            array($this, 'render_api_key_field'),
            'threadkit-settings',
            'threadkit_general_section'
        );

        add_settings_field(
            'enable_on_posts',
            __('Enable on Posts', 'threadkit'),
            array($this, 'render_enable_on_posts_field'),
            'threadkit-settings',
            'threadkit_general_section'
        );

        add_settings_field(
            'enable_on_pages',
            __('Enable on Pages', 'threadkit'),
            array($this, 'render_enable_on_pages_field'),
            'threadkit-settings',
            'threadkit_general_section'
        );

        add_settings_field(
            'replace_comments',
            __('Replace WordPress Comments', 'threadkit'),
            array($this, 'render_replace_comments_field'),
            'threadkit-settings',
            'threadkit_general_section'
        );
    }

    public function sanitize_settings($input) {
        $sanitized = array();

        if (isset($input['site_id'])) {
            $sanitized['site_id'] = sanitize_text_field($input['site_id']);
        }

        if (isset($input['api_key'])) {
            $sanitized['api_key'] = sanitize_text_field($input['api_key']);
        }

        $sanitized['enable_on_posts'] = isset($input['enable_on_posts']) ? 1 : 0;
        $sanitized['enable_on_pages'] = isset($input['enable_on_pages']) ? 1 : 0;
        $sanitized['replace_comments'] = isset($input['replace_comments']) ? 1 : 0;

        return $sanitized;
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('threadkit_settings');
                do_settings_sections('threadkit-settings');
                submit_button(__('Save Settings', 'threadkit'));
                ?>
            </form>

            <div class="threadkit-help" style="margin-top: 40px; padding: 20px; background: #f0f0f1; border-left: 4px solid #2271b1;">
                <h2><?php _e('Getting Started', 'threadkit'); ?></h2>
                <ol>
                    <li><?php _e('Sign up at', 'threadkit'); ?> <a href="https://threadkit.com" target="_blank">threadkit.com</a></li>
                    <li><?php _e('Create a new site and copy your Site ID and API Key', 'threadkit'); ?></li>
                    <li><?php _e('Paste them in the fields above and save', 'threadkit'); ?></li>
                    <li><?php _e('ThreadKit will automatically appear on your posts and pages', 'threadkit'); ?></li>
                </ol>
                <p><?php _e('For manual placement, use the shortcode:', 'threadkit'); ?> <code>[threadkit]</code></p>
            </div>
        </div>
        <?php
    }

    public function render_general_section() {
        echo '<p>' . __('Configure your ThreadKit integration settings.', 'threadkit') . '</p>';
    }

    public function render_site_id_field() {
        $value = ThreadKit::get_option('site_id');
        echo '<input type="text" name="threadkit_settings[site_id]" value="' . esc_attr($value) . '" class="regular-text" required>';
        echo '<p class="description">' . __('Your ThreadKit Site ID from your dashboard', 'threadkit') . '</p>';
    }

    public function render_api_key_field() {
        $value = ThreadKit::get_option('api_key');
        echo '<input type="text" name="threadkit_settings[api_key]" value="' . esc_attr($value) . '" class="regular-text" required>';
        echo '<p class="description">' . __('Your ThreadKit API Key from your dashboard', 'threadkit') . '</p>';
    }

    public function render_enable_on_posts_field() {
        $value = ThreadKit::get_option('enable_on_posts', 1);
        echo '<label><input type="checkbox" name="threadkit_settings[enable_on_posts]" value="1" ' . checked($value, 1, false) . '>';
        echo ' ' . __('Automatically show ThreadKit on all posts', 'threadkit') . '</label>';
    }

    public function render_enable_on_pages_field() {
        $value = ThreadKit::get_option('enable_on_pages', 0);
        echo '<label><input type="checkbox" name="threadkit_settings[enable_on_pages]" value="1" ' . checked($value, 1, false) . '>';
        echo ' ' . __('Automatically show ThreadKit on all pages', 'threadkit') . '</label>';
    }

    public function render_replace_comments_field() {
        $value = ThreadKit::get_option('replace_comments', 1);
        echo '<label><input type="checkbox" name="threadkit_settings[replace_comments]" value="1" ' . checked($value, 1, false) . '>';
        echo ' ' . __('Replace default WordPress comments with ThreadKit', 'threadkit') . '</label>';
    }
}
