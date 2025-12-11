<?php
/**
 * Class ThreadKit_Test
 *
 * @package ThreadKit
 */

/**
 * Test the main ThreadKit class
 */
class ThreadKit_Test extends WP_UnitTestCase {

    public function setUp(): void {
        parent::setUp();
    }

    public function tearDown(): void {
        parent::tearDown();
    }

    public function test_plugin_activated() {
        $this->assertTrue(class_exists('ThreadKit'));
    }

    public function test_singleton_instance() {
        $instance1 = ThreadKit::get_instance();
        $instance2 = ThreadKit::get_instance();

        $this->assertSame($instance1, $instance2);
        $this->assertInstanceOf('ThreadKit', $instance1);
    }

    public function test_get_option_returns_default() {
        $result = ThreadKit::get_option('nonexistent_key', 'default_value');
        $this->assertEquals('default_value', $result);
    }

    public function test_get_option_returns_saved_value() {
        update_option('threadkit_settings', array('test_key' => 'test_value'));

        $result = ThreadKit::get_option('test_key');
        $this->assertEquals('test_value', $result);

        delete_option('threadkit_settings');
    }
}
