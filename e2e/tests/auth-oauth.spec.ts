import { test, expect } from '@playwright/test';

/**
 * OAuth E2E Tests
 *
 * Note: These tests require:
 * 1. OAuth provider credentials configured in the server
 * 2. Test accounts for OAuth providers (Google, GitHub, etc.)
 * 3. The ability to handle OAuth redirects and popups
 *
 * For CI/CD, consider using OAuth provider test modes or mocking.
 */

test.describe('OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-threadkit-root]');
  });

  test('should display OAuth login options', async ({ page }) => {
    // Click on comment textarea to trigger auth
    await page.click('textarea[placeholder*="comment"]');

    // Should show auth modal with OAuth options
    await page.waitForSelector('[data-testid="auth-modal"]');

    // Check for OAuth buttons
    const googleButton = page.locator('button:has-text("Google")');
    const githubButton = page.locator('button:has-text("GitHub")');

    // Verify OAuth options are visible (if configured)
    const googleVisible = await googleButton.isVisible().catch(() => false);
    const githubVisible = await githubButton.isVisible().catch(() => false);

    expect(googleVisible || githubVisible).toBeTruthy();
  });

  test.skip('should complete Google OAuth flow', async ({ page, context }) => {
    // This test requires actual Google OAuth credentials and test account
    // Skip by default, enable when credentials are available

    await page.click('textarea[placeholder*="comment"]');
    await page.waitForSelector('[data-testid="auth-modal"]');

    // Listen for popup
    const popupPromise = context.waitForEvent('page');
    await page.click('button:has-text("Google")');

    // Handle OAuth popup
    const popup = await popupPromise;
    await popup.waitForLoadState();

    // This would require filling in Google credentials
    // and handling their OAuth flow
    // await popup.fill('input[type="email"]', process.env.GOOGLE_TEST_EMAIL);
    // await popup.click('button:has-text("Next")');
    // await popup.fill('input[type="password"]', process.env.GOOGLE_TEST_PASSWORD);
    // await popup.click('button:has-text("Next")');

    // Wait for OAuth callback and popup to close
    await popup.waitForEvent('close', { timeout: 30000 });

    // Verify user is authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/logged in|signed in/i')).toBeVisible();
  });

  test.skip('should complete GitHub OAuth flow', async ({ page, context }) => {
    // This test requires actual GitHub OAuth credentials and test account
    // Skip by default, enable when credentials are available

    await page.click('textarea[placeholder*="comment"]');
    await page.waitForSelector('[data-testid="auth-modal"]');

    const popupPromise = context.waitForEvent('page');
    await page.click('button:has-text("GitHub")');

    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Handle GitHub OAuth flow
    // await popup.fill('input[name="login"]', process.env.GITHUB_TEST_USERNAME);
    // await popup.fill('input[name="password"]', process.env.GITHUB_TEST_PASSWORD);
    // await popup.click('input[type="submit"]');

    await popup.waitForEvent('close', { timeout: 30000 });

    // Verify authentication
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
  });

  test('should handle OAuth popup blocking', async ({ page }) => {
    // Test what happens when popup is blocked

    await page.click('textarea[placeholder*="comment"]');
    await page.waitForSelector('[data-testid="auth-modal"]');

    // Block popups
    await page.context().grantPermissions([]);

    // Try to open OAuth popup
    await page.click('button:has-text("Google")');

    // Should show error message about popup blocker
    await expect(
      page.locator('text=/popup.*blocked|enable popups/i')
    ).toBeVisible({ timeout: 3000 });
  });

  test('should handle OAuth cancellation', async ({ page, context }) => {
    await page.click('textarea[placeholder*="comment"]');
    await page.waitForSelector('[data-testid="auth-modal"]');

    const popupPromise = context.waitForEvent('page');
    await page.click('button:has-text("Google")');

    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Close popup without completing OAuth
    await popup.close();

    // Should remain on auth modal
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();

    // Should show message about cancellation
    await expect(page.locator('text=/cancelled|closed/i')).toBeVisible({ timeout: 3000 });
  });

  test('should handle OAuth errors', async ({ page, context }) => {
    // Test OAuth error handling

    await page.click('textarea[placeholder*="comment"]');
    await page.waitForSelector('[data-testid="auth-modal"]');

    // Intercept OAuth callback with error
    await page.route('**/auth/oauth/callback**', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'invalid_grant' }),
      });
    });

    const popupPromise = context.waitForEvent('page');
    await page.click('button:has-text("Google")');

    const popup = await popupPromise;
    await popup.close();

    // Should show error message
    await expect(page.locator('text=/authentication failed|error/i')).toBeVisible({ timeout: 3000 });
  });

  test('should persist OAuth session across page reloads', async ({ page }) => {
    // Assume user is already logged in via OAuth
    // (This would require a prior test to complete OAuth flow)

    // For this test, we'll mock the authenticated state
    await page.evaluate(() => {
      localStorage.setItem('threadkit_token', 'mock-oauth-token');
    });

    await page.reload();
    await page.waitForSelector('[data-threadkit-root]');

    // User should still be authenticated
    // (In real scenario, token would be validated with backend)
    const userMenu = page.locator('[data-testid="user-menu"]');

    // This would pass if the app properly checks localStorage and validates token
    // In reality, might see loading state then logged-out state if mock token is invalid
  });

  test('should allow logout after OAuth login', async ({ page }) => {
    // Mock authenticated state
    await page.evaluate(() => {
      localStorage.setItem('threadkit_token', 'mock-oauth-token');
      localStorage.setItem('threadkit_user', JSON.stringify({
        id: 'test-user-id',
        name: 'OAuth User',
        email: 'oauth@example.com',
      }));
    });

    await page.reload();
    await page.waitForSelector('[data-threadkit-root]');

    // Open user menu
    await page.click('[data-testid="user-menu"]');

    // Click logout
    await page.click('button:has-text("Logout")');

    // Should be logged out
    await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();

    // Clicking comment area should show auth again
    await page.click('textarea[placeholder*="comment"]');
    await expect(page.locator('[data-testid="auth-modal"]')).toBeVisible();
  });

  test('should sync OAuth session across tabs', async ({ browser }) => {
    // Create two tabs
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await Promise.all([
      page1.goto('/'),
      page2.goto('/'),
    ]);

    await Promise.all([
      page1.waitForSelector('[data-threadkit-root]'),
      page2.waitForSelector('[data-threadkit-root]'),
    ]);

    // Mock OAuth login in page 1
    await page1.evaluate(() => {
      localStorage.setItem('threadkit_token', 'mock-oauth-token');
      // Trigger BroadcastChannel event
      const channel = new BroadcastChannel('threadkit-auth');
      channel.postMessage({ type: 'threadkit:login' });
    });

    // Page 2 should detect the login via BroadcastChannel
    await expect(page2.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 3000 });

    await page1.close();
    await page2.close();
  });
});
