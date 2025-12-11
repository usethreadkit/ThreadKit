<?php
/**
 * ThreadKit comments template
 * Replaces the default WordPress comments
 */

if (!defined('ABSPATH')) {
    exit;
}

$site_id = ThreadKit::get_option('site_id');
$api_key = ThreadKit::get_option('api_key');

if (empty($site_id) || empty($api_key)) {
    echo '<p>' . __('ThreadKit is not configured. Please configure it in Settings > ThreadKit.', 'threadkit') . '</p>';
    return;
}
?>

<div id="comments" class="comments-area">
    <div id="threadkit-comments"></div>
    <script>
    (function() {
        if (typeof ThreadKit !== 'undefined') {
            ThreadKit.init({
                siteId: <?php echo json_encode($site_id); ?>,
                apiKey: <?php echo json_encode($api_key); ?>,
                pageUrl: <?php echo json_encode(get_permalink()); ?>,
                pageTitle: <?php echo json_encode(get_the_title()); ?>,
                container: '#threadkit-comments'
            });
        }
    })();
    </script>
</div>
