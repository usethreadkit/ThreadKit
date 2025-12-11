=== ThreadKit ===
Contributors: threadkit
Tags: comments, chat, real-time, engagement, moderation
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Add real-time comments and chat to your WordPress site with ThreadKit.

== Description ==

ThreadKit brings modern, real-time comments and chat to your WordPress site. Perfect for blogs, news sites, and community platforms that want to increase engagement with their audience.

= Features =

* **Real-time Comments** - See new comments appear instantly without page refresh
* **Markdown Support** - Rich text formatting with markdown syntax
* **User Authentication** - Email and OAuth (Google, GitHub) sign-in
* **Moderation Tools** - Approve, reject, ban, and shadowban users
* **Threaded Discussions** - Nested replies for organized conversations
* **Voting System** - Upvote/downvote comments
* **Notifications** - Real-time notifications for replies and mentions
* **Custom Styling** - Match your site's design
* **Responsive Design** - Works perfectly on mobile devices
* **SEO Friendly** - Comments are crawlable by search engines

= Easy Setup =

1. Sign up at [threadkit.com](https://threadkit.com)
2. Create a site and get your API credentials
3. Install and activate this plugin
4. Enter your credentials in Settings > ThreadKit
5. Done! ThreadKit will appear on your posts automatically

= Use Cases =

* Replace default WordPress comments with a modern alternative
* Add real-time chat to blog posts
* Build community discussions
* Enable live reactions during events
* Moderate user-generated content

== Installation ==

= Automatic Installation =

1. Log in to your WordPress admin panel
2. Go to Plugins > Add New
3. Search for "ThreadKit"
4. Click "Install Now" then "Activate"

= Manual Installation =

1. Download the plugin ZIP file
2. Go to Plugins > Add New > Upload Plugin
3. Choose the ZIP file and click "Install Now"
4. Activate the plugin

= Configuration =

1. Go to Settings > ThreadKit
2. Enter your Site ID and API Key from [threadkit.com](https://threadkit.com)
3. Choose where to display ThreadKit (posts, pages, or both)
4. Optionally enable "Replace WordPress Comments"
5. Save settings

== Frequently Asked Questions ==

= Is ThreadKit free? =

ThreadKit offers both free and paid plans. Visit [threadkit.com/pricing](https://threadkit.com/pricing) for details.

= Can I use my own authentication? =

Yes, ThreadKit supports WordPress user integration. You can also enable OAuth providers like Google and GitHub.

= Will this replace my existing comments? =

You can choose to replace WordPress comments or use ThreadKit alongside them. The choice is yours.

= Is it mobile-friendly? =

Yes, ThreadKit is fully responsive and works great on all devices.

= Can I customize the appearance? =

Yes, ThreadKit provides theming options and CSS customization to match your site's design.

= Where is comment data stored? =

Comments are stored in ThreadKit's cloud infrastructure with redundant backups. You can export your data at any time.

= Is it compatible with caching plugins? =

Yes, ThreadKit works with popular caching plugins like WP Super Cache, W3 Total Cache, and WP Rocket.

== Screenshots ==

1. ThreadKit comments on a blog post
2. Settings page in WordPress admin
3. Real-time comment updates
4. Moderation interface

== Changelog ==

= 0.1.0 =
* Initial release
* Real-time comments and chat
* Markdown support
* User authentication (email, Google, GitHub)
* Moderation tools
* Shortcode support
* WordPress comments replacement option

== Upgrade Notice ==

= 0.1.0 =
Initial release of ThreadKit for WordPress.

== Developer Documentation ==

= Shortcode =

Use `[threadkit]` to manually place ThreadKit anywhere:

`[threadkit page_url="https://example.com/page" page_title="Page Title"]`

= Programmatic Usage =

```php
// Check if ThreadKit is active
if (class_exists('ThreadKit')) {
    // Get ThreadKit settings
    $site_id = ThreadKit::get_option('site_id');
    $api_key = ThreadKit::get_option('api_key');
}
```

= Filters =

```php
// Modify ThreadKit settings before rendering
add_filter('threadkit_settings', function($settings) {
    $settings['theme'] = 'dark';
    return $settings;
});
```

== Support ==

For documentation, visit [threadkit.com/docs](https://threadkit.com/docs)
For support, contact us at [threadkit.com/support](https://threadkit.com/support)
