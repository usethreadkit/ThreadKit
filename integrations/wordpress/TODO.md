# ThreadKit WordPress Plugin - TODO

## High Priority

### Core Functionality
- [ ] Implement proper error handling for API failures
- [ ] Add connection status indicator in admin
- [ ] Handle rate limiting gracefully
- [ ] Add loading states and skeleton screens
- [ ] Implement comment count sync with WordPress
- [ ] Add support for custom post types
- [ ] Support WordPress multisite

### Settings & Configuration
- [ ] Add visual theme selector (light/dark)
- [ ] Add position selector (above/below content)
- [ ] Add custom CSS field
- [ ] Add enable/disable per post type
- [ ] Add role-based permissions (who can see ThreadKit)
- [ ] Add import/export settings

### User Experience
- [ ] Add setup wizard for first-time users
- [ ] Better onboarding with helpful hints
- [ ] Add preview mode in settings
- [ ] Show comment count in post list
- [ ] Add admin notice when not configured
- [ ] Better error messages for users

### Integration
- [ ] WordPress user sync (optional)
- [ ] Support for WordPress avatars
- [ ] Integration with user profile pages
- [ ] Support for WordPress notification system
- [ ] WooCommerce product reviews integration
- [ ] bbPress/BuddyPress compatibility

## Medium Priority

### Performance
- [ ] Implement proper caching strategy
- [ ] Lazy load ThreadKit on scroll
- [ ] Add CDN support for assets
- [ ] Minimize JavaScript bundle size
- [ ] Add option to self-host assets

### Admin Features
- [ ] Dashboard widget showing recent comments
- [ ] Quick moderation from WordPress admin
- [ ] Analytics and statistics page
- [ ] Comment export functionality
- [ ] Bulk actions for posts (enable/disable ThreadKit)

### Developer Features
- [ ] Add WordPress hooks/filters for customization
- [ ] Document all available filters
- [ ] Add REST API endpoints
- [ ] Add block editor (Gutenberg) block
- [ ] Add Elementor widget
- [ ] Add WPBakery Page Builder support

### Testing
- [ ] Add more unit tests (target 80% coverage)
- [ ] Add integration tests
- [ ] Add E2E tests with real WordPress
- [ ] Test with popular themes
- [ ] Test with popular plugins
- [ ] Test on WordPress.com
- [ ] Performance testing

## Low Priority

### Nice to Have
- [ ] Dark mode admin UI
- [ ] A/B testing support
- [ ] Custom fields for comments
- [ ] Webhooks support
- [ ] Comment templates
- [ ] Email digest of comments
- [ ] Social sharing integration
- [ ] Comment reactions/emojis

### Localization
- [ ] Complete translation strings
- [ ] Add pot file generation
- [ ] Translate to major languages
- [ ] RTL language support

### Documentation
- [ ] Video tutorials
- [ ] Developer documentation
- [ ] API reference
- [ ] Migration guide from other comment systems
- [ ] Troubleshooting guide
- [ ] FAQ page

## Before v1.0 Release

### Critical
- [ ] Security audit
- [ ] Performance audit
- [ ] WordPress.org plugin review preparation
- [ ] Create demo site
- [ ] Write comprehensive documentation
- [ ] Create screenshots for plugin directory
- [ ] Record video demo
- [ ] Set up support channels
- [ ] Legal review of terms/privacy

### WordPress.org Submission
- [ ] Prepare plugin assets (banner, icon, screenshots)
- [ ] Write comprehensive readme.txt
- [ ] Test with WordPress Plugin Check tool
- [ ] Set up SVN repository
- [ ] Submit for review
- [ ] Address review feedback

## Completed
- [x] Basic plugin structure
- [x] Settings page
- [x] Frontend rendering
- [x] Shortcode support
- [x] PHPUnit test suite
- [x] GitHub Actions CI/CD
- [x] Coveralls integration
- [x] Docker test environment
- [x] Build and deployment scripts

---

## How to Contribute

1. Pick an item from the TODO list
2. Create an issue on GitHub
3. Submit a pull request
4. Add tests for new features

## Priority Definitions

- **High Priority**: Must have for v1.0 release
- **Medium Priority**: Important but can wait for v1.1
- **Low Priority**: Nice to have, future releases

---

Last updated: 2024-12-11
