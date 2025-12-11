# ThreadKit E2E Tests

End-to-end tests for ThreadKit using Playwright.

## Setup

```bash
# Install dependencies
pnpm install

# Install Playwright browsers (first time only)
pnpm exec playwright install chromium
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in headed mode (see browser)
pnpm test:headed

# Run tests in debug mode
pnpm test:debug

# Run tests with UI
pnpm test:ui

# View test report
pnpm report
```

## Test Structure

- `tests/commenting.spec.ts` - Basic commenting flows (post, edit, delete, vote)
- `tests/realtime.spec.ts` - WebSocket real-time features (live updates, typing indicators, presence)
- `tests/auth-oauth.spec.ts` - OAuth authentication flows (Google, GitHub)

## Configuration

The test server is automatically started before running tests. Configuration can be found in `playwright.config.ts`.

### Environment Variables

- `BASE_URL` - Base URL for tests (default: `http://localhost:3000`)
- `SKIP_SERVER` - Skip starting the dev server (useful if already running)

### OAuth Testing

OAuth tests are skipped by default as they require:
1. OAuth provider credentials configured in the server
2. Test accounts for OAuth providers
3. Proper environment variables (e.g., `GOOGLE_TEST_EMAIL`, `GOOGLE_TEST_PASSWORD`)

To enable OAuth tests, remove the `test.skip` prefix and provide the required credentials.

## CI/CD Integration

For CI environments:
- Tests run in headless mode by default
- Screenshots are captured on failure
- Traces are recorded on first retry
- Workers are limited to 1 in CI to avoid conflicts

Example GitHub Actions configuration:

```yaml
- name: Run E2E tests
  run: |
    cd e2e
    pnpm install
    pnpm exec playwright install --with-deps chromium
    pnpm test
```

## Writing New Tests

1. Create a new `.spec.ts` file in the `tests/` directory
2. Use data-testid attributes in components for reliable selectors
3. Follow the existing test patterns for consistency
4. Add comments for complex interactions
5. Use appropriate timeouts for async operations

Example:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-threadkit-root]');
  });

  test('should do something', async ({ page }) => {
    // Your test code here
  });
});
```

## Debugging Tips

1. Use `test:headed` to see what's happening in the browser
2. Use `test:debug` to step through tests with Playwright Inspector
3. Add `await page.pause()` to pause at a specific point
4. Check screenshots in `test-results/` after failures
5. View traces with `pnpm report` after test runs

## Known Issues

- OAuth tests require manual setup and are skipped by default
- WebSocket reconnection tests may be flaky depending on network conditions
- Presence count tests may vary based on server load
