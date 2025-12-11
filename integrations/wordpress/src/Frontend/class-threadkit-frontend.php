<?php
/**
 * ThreadKit Frontend functionality
 */

class ThreadKit_Frontend {
    public function __construct() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_filter('the_content', array($this, 'append_threadkit'), 100);
        add_shortcode('threadkit', array($this, 'render_shortcode'));

        // Replace comments if enabled
        if (ThreadKit::get_option('replace_comments', 1)) {
            add_filter('comments_template', array($this, 'replace_comments_template'), 100);
        }
    }

    public function enqueue_assets() {
        if (!$this->should_load()) {
            return;
        }

        // Enqueue ThreadKit React library from CDN or local
        wp_enqueue_script(
            'threadkit',
            'https://unpkg.com/@threadkit/react@latest/dist/index.js',
            array(),
            THREADKIT_VERSION,
            true
        );

        wp_enqueue_style(
            'threadkit',
            'https://unpkg.com/@threadkit/core@latest/dist/threadkit.css',
            array(),
            THREADKIT_VERSION
        );

        // Pass config to frontend
        wp_localize_script('threadkit', 'threadkitConfig', array(
            'siteId' => ThreadKit::get_option('site_id'),
            'apiKey' => ThreadKit::get_option('api_key'),
            'pageUrl' => get_permalink(),
            'pageTitle' => get_the_title(),
        ));
    }

    public function should_load() {
        $site_id = ThreadKit::get_option('site_id');
        $api_key = ThreadKit::get_option('api_key');

        if (empty($site_id) || empty($api_key)) {
            return false;
        }

        if (is_singular('post') && ThreadKit::get_option('enable_on_posts', 1)) {
            return true;
        }

        if (is_page() && ThreadKit::get_option('enable_on_pages', 0)) {
            return true;
        }

        return false;
    }

    public function append_threadkit($content) {
        if (!is_singular() || !$this->should_load()) {
            return $content;
        }

        // Only append if not replacing comments (to avoid duplication)
        if (ThreadKit::get_option('replace_comments', 1)) {
            return $content;
        }

        return $content . $this->render_threadkit();
    }

    public function replace_comments_template($template) {
        if (!$this->should_load()) {
            return $template;
        }

        return THREADKIT_PLUGIN_DIR . 'templates/comments.php';
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'page_url' => get_permalink(),
            'page_title' => get_the_title(),
        ), $atts);

        return $this->render_threadkit($atts['page_url'], $atts['page_title']);
    }

    private function render_threadkit($page_url = null, $page_title = null) {
        if (!$page_url) {
            $page_url = get_permalink();
        }
        if (!$page_title) {
            $page_title = get_the_title();
        }

        $site_id = ThreadKit::get_option('site_id');
        $api_key = ThreadKit::get_option('api_key');

        ob_start();
        ?>
        <div id="threadkit-container"></div>
        <script>
        (function() {
            if (typeof ThreadKit !== 'undefined') {
                ThreadKit.init({
                    siteId: <?php echo json_encode($site_id); ?>,
                    apiKey: <?php echo json_encode($api_key); ?>,
                    pageUrl: <?php echo json_encode($page_url); ?>,
                    pageTitle: <?php echo json_encode($page_title); ?>,
                    container: '#threadkit-container'
                });
            }
        })();
        </script>
        <?php
        return ob_get_clean();
    }
}
