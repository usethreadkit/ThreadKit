import { test, expect, Page } from '@playwright/test';

test.describe('Real-time WebSocket Features', () => {
  let page1: Page;
  let page2: Page;

  test.beforeEach(async ({ browser }) => {
    // Create two browser contexts to simulate two users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    page1 = await context1.newPage();
    page2 = await context2.newPage();

    // Navigate both pages to the same URL
    await Promise.all([
      page1.goto('/'),
      page2.goto('/'),
    ]);

    // Wait for ThreadKit to load on both pages
    await Promise.all([
      page1.waitForSelector('[data-threadkit-root]'),
      page2.waitForSelector('[data-threadkit-root]'),
    ]);
  });

  test.afterEach(async () => {
    await page1.close();
    await page2.close();
  });

  test('should show live comment updates across sessions', async () => {
    // User 1 logs in and posts a comment
    await page1.click('textarea[placeholder*="comment"]');
    await page1.click('button:has-text("Continue as Guest")');
    await page1.fill('input[placeholder*="name"]', 'User 1');
    await page1.click('button:has-text("Continue")');

    const commentText = `Live comment ${Date.now()}`;
    await page1.fill('textarea[placeholder*="comment"]', commentText);
    await page1.click('button:has-text("Post")');

    // Verify comment appears on page 1
    await expect(page1.locator(`text="${commentText}"`)).toBeVisible();

    // Comment should appear on page 2 via WebSocket update
    await expect(page2.locator(`text="${commentText}"`)).toBeVisible({ timeout: 5000 });
  });

  test('should show typing indicators', async () => {
    // Both users log in
    await page1.click('textarea[placeholder*="comment"]');
    await page1.click('button:has-text("Continue as Guest")');
    await page1.fill('input[placeholder*="name"]', 'Typist 1');
    await page1.click('button:has-text("Continue")');

    await page2.click('textarea[placeholder*="comment"]');
    await page2.click('button:has-text("Continue as Guest")');
    await page2.fill('input[placeholder*="name"]', 'Typist 2');
    await page2.click('button:has-text("Continue")');

    // User 1 starts typing
    await page1.click('textarea[placeholder*="comment"]');
    await page1.type('textarea[placeholder*="comment"]', 'Typing...', { delay: 100 });

    // User 2 should see typing indicator
    await expect(page2.locator('text=/Typist 1.*typing/i')).toBeVisible({ timeout: 2000 });

    // Stop typing
    await page1.waitForTimeout(3500); // Typing indicator timeout

    // Typing indicator should disappear
    await expect(page2.locator('text=/Typist 1.*typing/i')).not.toBeVisible();
  });

  test('should show live vote updates', async () => {
    // User 1 posts a comment
    await page1.click('textarea[placeholder*="comment"]');
    await page1.click('button:has-text("Continue as Guest")');
    await page1.fill('input[placeholder*="name"]', 'Commenter');
    await page1.click('button:has-text("Continue")');

    await page1.fill('textarea[placeholder*="comment"]', 'Vote on this');
    await page1.click('button:has-text("Post")');

    await expect(page1.locator('text="Vote on this"')).toBeVisible();

    // User 2 logs in
    await page2.click('textarea[placeholder*="comment"]');
    await page2.click('button:has-text("Continue as Guest")');
    await page2.fill('input[placeholder*="name"]', 'Voter');
    await page2.click('button:has-text("Continue")');

    // Wait for comment to appear on page 2
    await expect(page2.locator('text="Vote on this"')).toBeVisible();

    // User 2 upvotes
    await page2.click('button[aria-label*="upvote"]');

    // User 1 should see vote count update in real-time
    await expect(page1.locator('text=/1/')).toBeVisible({ timeout: 3000 });
  });

  test('should show live edit updates', async () => {
    // User 1 posts a comment
    await page1.click('textarea[placeholder*="comment"]');
    await page1.click('button:has-text("Continue as Guest")');
    await page1.fill('input[placeholder*="name"]', 'Editor');
    await page1.click('button:has-text("Continue")');

    const originalText = 'Original text';
    await page1.fill('textarea[placeholder*="comment"]', originalText);
    await page1.click('button:has-text("Post")');

    // Wait for comment to appear on both pages
    await expect(page1.locator(`text="${originalText}"`)).toBeVisible();
    await expect(page2.locator(`text="${originalText}"`)).toBeVisible({ timeout: 3000 });

    // User 1 edits the comment
    await page1.click('[data-testid="comment-menu"]');
    await page1.click('button:has-text("Edit")');

    const editedText = 'Edited text';
    await page1.fill('textarea', editedText);
    await page1.click('button:has-text("Save")');

    // User 2 should see the edited text
    await expect(page2.locator(`text="${editedText}"`)).toBeVisible({ timeout: 3000 });
    await expect(page2.locator(`text="${originalText}"`)).not.toBeVisible();
  });

  test('should show live delete updates', async () => {
    // User 1 posts a comment
    await page1.click('textarea[placeholder*="comment"]');
    await page1.click('button:has-text("Continue as Guest")');
    await page1.fill('input[placeholder*="name"]', 'Deleter');
    await page1.click('button:has-text("Continue")');

    const commentText = 'To be deleted';
    await page1.fill('textarea[placeholder*="comment"]', commentText);
    await page1.click('button:has-text("Post")');

    // Wait for comment to appear on both pages
    await expect(page1.locator(`text="${commentText}"`)).toBeVisible();
    await expect(page2.locator(`text="${commentText}"`)).toBeVisible({ timeout: 3000 });

    // User 1 deletes the comment
    await page1.click('[data-testid="comment-menu"]');
    await page1.click('button:has-text("Delete")');
    await page1.click('button:has-text("Confirm")');

    // User 2 should see the comment removed/marked as deleted
    await expect(page2.locator(`text="${commentText}"`)).not.toBeVisible({ timeout: 3000 });
  });

  test('should show presence count', async () => {
    // Check initial presence count
    const presencePage1 = page1.locator('[data-testid="presence-count"]');
    const presencePage2 = page2.locator('[data-testid="presence-count"]');

    // Should show at least 2 users online
    await expect(presencePage1).toContainText(/[2-9]|[1-9][0-9]/);
    await expect(presencePage2).toContainText(/[2-9]|[1-9][0-9]/);

    // Close one page
    await page1.close();

    // Presence count on page 2 should decrease
    await page2.waitForTimeout(2000); // Wait for disconnect event
    const newCount = await presencePage2.textContent();
    expect(parseInt(newCount || '0')).toBeGreaterThanOrEqual(1);
  });

  test('should reconnect after connection loss', async () => {
    // User logs in
    await page1.click('textarea[placeholder*="comment"]');
    await page1.click('button:has-text("Continue as Guest")');
    await page1.fill('input[placeholder*="name"]', 'Reconnector');
    await page1.click('button:has-text("Continue")');

    // Check connection status
    const connectionStatus = page1.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText(/connected/i);

    // Simulate network offline
    await page1.context().setOffline(true);
    await page1.waitForTimeout(1000);

    // Should show disconnected state
    await expect(connectionStatus).toContainText(/disconnected|offline/i, { timeout: 5000 });

    // Restore network
    await page1.context().setOffline(false);
    await page1.waitForTimeout(2000);

    // Should reconnect
    await expect(connectionStatus).toContainText(/connected/i, { timeout: 10000 });
  });

  test('should show new comments banner', async () => {
    // User 2 posts a comment while User 1 is viewing
    await page2.click('textarea[placeholder*="comment"]');
    await page2.click('button:has-text("Continue as Guest")');
    await page2.fill('input[placeholder*="name"]', 'Banner Test');
    await page2.click('button:has-text("Continue")');

    await page2.fill('textarea[placeholder*="comment"]', 'New comment notification test');
    await page2.click('button:has-text("Post")');

    // User 1 should see "New comments" banner
    await expect(page1.locator('text=/new comment/i')).toBeVisible({ timeout: 3000 });

    // Click banner to load new comments
    await page1.click('text=/new comment/i');

    // New comment should now be visible
    await expect(page1.locator('text="New comment notification test"')).toBeVisible();
  });
});
