<?php
/**
 * Class ThreadKit_Settings_Test
 *
 * @package ThreadKit
 */

/**
 * Test the ThreadKit_Settings class
 */
class ThreadKit_Settings_Test extends WP_UnitTestCase {

    public function setUp(): void {
        parent::setUp();
        $this->settings = new ThreadKit_Settings();
    }

    public function tearDown(): void {
        parent::tearDown();
        delete_option('threadkit_settings');
    }

    public function test_sanitize_settings_sanitizes_text_fields() {
        $input = array(
            'site_id' => '<script>alert("xss")</script>test123',
            'api_key' => '<b>key123</b>',
        );

        $result = $this->settings->sanitize_settings($input);

        $this->assertEquals('test123', $result['site_id']);
        $this->assertEquals('key123', $result['api_key']);
    }

    public function test_sanitize_settings_handles_checkboxes() {
        $input = array(
            'site_id' => 'test',
            'api_key' => 'key',
            'enable_on_posts' => '1',
            'replace_comments' => '1',
        );

        $result = $this->settings->sanitize_settings($input);

        $this->assertEquals(1, $result['enable_on_posts']);
        $this->assertEquals(0, $result['enable_on_pages']); // Not set, should be 0
        $this->assertEquals(1, $result['replace_comments']);
    }

    public function test_settings_page_registered() {
        global $wp_settings_sections;

        do_action('admin_init');

        $this->assertArrayHasKey('threadkit-settings', $wp_settings_sections);
    }
}
