<?php
/**
 * Class ThreadKit_Frontend_Test
 *
 * @package ThreadKit
 */

/**
 * Test the ThreadKit_Frontend class
 */
class ThreadKit_Frontend_Test extends WP_UnitTestCase {

    private $frontend;
    private $post_id;

    public function setUp(): void {
        parent::setUp();
        $this->frontend = new ThreadKit_Frontend();

        // Create a test post
        $this->post_id = $this->factory->post->create(array(
            'post_title' => 'Test Post',
            'post_content' => 'Test content',
            'post_status' => 'publish',
        ));

        // Set up test settings
        update_option('threadkit_settings', array(
            'site_id' => 'test-site-id',
            'api_key' => 'test-api-key',
            'enable_on_posts' => 1,
            'enable_on_pages' => 0,
        ));
    }

    public function tearDown(): void {
        parent::tearDown();
        delete_option('threadkit_settings');
        wp_delete_post($this->post_id, true);
    }

    public function test_should_load_returns_false_without_config() {
        delete_option('threadkit_settings');

        $this->go_to(get_permalink($this->post_id));
        $result = $this->frontend->should_load();

        $this->assertFalse($result);
    }

    public function test_should_load_returns_true_on_post() {
        $this->go_to(get_permalink($this->post_id));
        $result = $this->frontend->should_load();

        $this->assertTrue($result);
    }

    public function test_shortcode_renders_container() {
        $output = do_shortcode('[threadkit]');

        $this->assertStringContainsString('id="threadkit-container"', $output);
        $this->assertStringContainsString('ThreadKit.init', $output);
        $this->assertStringContainsString('test-site-id', $output);
    }

    public function test_shortcode_accepts_custom_attributes() {
        $output = do_shortcode('[threadkit page_url="https://example.com" page_title="Custom Title"]');

        $this->assertStringContainsString('https://example.com', $output);
        $this->assertStringContainsString('Custom Title', $output);
    }
}
