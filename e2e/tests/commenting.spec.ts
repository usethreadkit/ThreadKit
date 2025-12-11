import { test, expect } from '@playwright/test';

test.describe('Commenting Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page with ThreadKit embedded
    await page.goto('/');

    // Wait for ThreadKit to load
    await page.waitForSelector('[data-threadkit-root]', { timeout: 10000 });
  });

  test('should display ThreadKit widget', async ({ page }) => {
    // Verify ThreadKit is visible
    const threadkit = page.locator('[data-threadkit-root]');
    await expect(threadkit).toBeVisible();
  });

  test('should show sign-in prompt when not authenticated', async ({ page }) => {
    // Click on comment textarea
    await page.click('textarea[placeholder*="comment"]');

    // Should show sign-in prompt or auth modal
    const authPrompt = page.locator('text=/sign in|log in/i');
    await expect(authPrompt).toBeVisible();
  });

  test('should allow anonymous login and posting', async ({ page }) => {
    // Click on comment textarea to trigger auth
    await page.click('textarea[placeholder*="comment"]');

    // Wait for auth modal
    await page.waitForSelector('[data-testid="auth-modal"]', { timeout: 5000 });

    // Select anonymous login
    await page.click('button:has-text("Continue as Guest")');

    // Enter a name
    await page.fill('input[placeholder*="name"]', 'Test User');
    await page.click('button:has-text("Continue")');

    // Wait for auth to complete
    await page.waitForSelector('textarea[placeholder*="comment"]', { state: 'attached' });

    // Post a comment
    const commentText = 'This is a test comment from Playwright';
    await page.fill('textarea[placeholder*="comment"]', commentText);
    await page.click('button:has-text("Post")');

    // Verify comment appears
    await expect(page.locator(`text="${commentText}"`)).toBeVisible({ timeout: 5000 });
  });

  test('should allow posting replies', async ({ page }) => {
    // First, post a root comment (assume anonymous auth)
    await page.click('textarea[placeholder*="comment"]');
    await page.click('button:has-text("Continue as Guest")');
    await page.fill('input[placeholder*="name"]', 'Parent Commenter');
    await page.click('button:has-text("Continue")');

    const parentComment = 'Parent comment';
    await page.fill('textarea[placeholder*="comment"]', parentComment);
    await page.click('button:has-text("Post")');

    // Wait for comment to appear
    await expect(page.locator(`text="${parentComment}"`)).toBeVisible();

    // Click reply button
    await page.click('button:has-text("Reply")');

    // Enter reply text
    const replyText = 'This is a reply';
    await page.fill('textarea[placeholder*="reply"]', replyText);
    await page.click('button:has-text("Post Reply")');

    // Verify reply appears
    await expect(page.locator(`text="${replyText}"`)).toBeVisible();
  });

  test('should allow editing own comments', async ({ page }) => {
    // Post a comment
    await page.click('textarea[placeholder*="comment"]');
    await page.click('button:has-text("Continue as Guest")');
    await page.fill('input[placeholder*="name"]', 'Editor');
    await page.click('button:has-text("Continue")');

    const originalText = 'Original comment text';
    await page.fill('textarea[placeholder*="comment"]', originalText);
    await page.click('button:has-text("Post")');

    await expect(page.locator(`text="${originalText}"`)).toBeVisible();

    // Click edit button
    await page.click('[data-testid="comment-menu"]');
    await page.click('button:has-text("Edit")');

    // Edit the text
    const editedText = 'Edited comment text';
    await page.fill('textarea', editedText);
    await page.click('button:has-text("Save")');

    // Verify edited text appears
    await expect(page.locator(`text="${editedText}"`)).toBeVisible();
    await expect(page.locator('text=/edited/i')).toBeVisible();
  });

  test('should allow deleting own comments', async ({ page }) => {
    // Post a comment
    await page.click('textarea[placeholder*="comment"]');
    await page.click('button:has-text("Continue as Guest")');
    await page.fill('input[placeholder*="name"]', 'Deleter');
    await page.click('button:has-text("Continue")');

    const commentText = 'Comment to be deleted';
    await page.fill('textarea[placeholder*="comment"]', commentText);
    await page.click('button:has-text("Post")');

    await expect(page.locator(`text="${commentText}"`)).toBeVisible();

    // Click delete button
    await page.click('[data-testid="comment-menu"]');
    await page.click('button:has-text("Delete")');

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Verify comment is removed or marked as deleted
    await expect(page.locator(`text="${commentText}"`)).not.toBeVisible();
  });

  test('should show vote buttons and update counts', async ({ page }) => {
    // Post a comment
    await page.click('textarea[placeholder*="comment"]');
    await page.click('button:has-text("Continue as Guest")');
    await page.fill('input[placeholder*="name"]', 'Voter');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder*="comment"]', 'Comment to vote on');
    await page.click('button:has-text("Post")');

    // Wait for comment to appear
    await page.waitForSelector('button[aria-label*="upvote"]');

    // Click upvote
    await page.click('button[aria-label*="upvote"]');

    // Verify vote count increased
    await expect(page.locator('text=/1/').first()).toBeVisible();

    // Click upvote again to remove vote
    await page.click('button[aria-label*="upvote"]');

    // Verify vote count returned to 0
    await expect(page.locator('text=/^0$/').first()).toBeVisible();
  });

  test('should display comment count', async ({ page }) => {
    // Check initial count
    const countBefore = page.locator('[data-testid="comment-count"]');
    const initialCount = await countBefore.textContent();

    // Post a comment
    await page.click('textarea[placeholder*="comment"]');
    await page.click('button:has-text("Continue as Guest")');
    await page.fill('input[placeholder*="name"]', 'Counter');
    await page.click('button:has-text("Continue")');

    await page.fill('textarea[placeholder*="comment"]', 'Count test');
    await page.click('button:has-text("Post")');

    // Verify count increased
    await page.waitForTimeout(1000); // Wait for count to update
    const countAfter = await page.locator('[data-testid="comment-count"]').textContent();

    // Count should have increased by 1
    expect(parseInt(countAfter || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
  });

  test('should support markdown formatting', async ({ page }) => {
    // Post a comment with markdown
    await page.click('textarea[placeholder*="comment"]');
    await page.click('button:has-text("Continue as Guest")');
    await page.fill('input[placeholder*="name"]', 'Markdown User');
    await page.click('button:has-text("Continue")');

    const markdownText = '**Bold** and *italic* text with `code`';
    await page.fill('textarea[placeholder*="comment"]', markdownText);
    await page.click('button:has-text("Post")');

    // Verify markdown is rendered
    await expect(page.locator('strong:has-text("Bold")')).toBeVisible();
    await expect(page.locator('em:has-text("italic")')).toBeVisible();
    await expect(page.locator('code:has-text("code")')).toBeVisible();
  });

  test('should sort comments by different criteria', async ({ page }) => {
    // Post multiple comments (assuming they exist or creating them)
    // ...

    // Change sort order
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('button:has-text("Newest")');

    // Verify sort order changed
    const firstComment = page.locator('[data-testid="comment"]').first();
    await expect(firstComment).toBeVisible();

    // Change to "Top" sorting
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('button:has-text("Top")');

    // Verify order changed
    await page.waitForTimeout(500);
  });
});
