# @threadkit/plugin-turnstile

Cloudflare Turnstile bot protection plugin for ThreadKit.

## Overview

This plugin adds Cloudflare Turnstile verification to ThreadKit comment submissions, helping protect against spam bots and abuse. It uses a popup-based flow that works across all sites using ThreadKit, bypassing Turnstile's 15-hostname limitation.

## Installation

```bash
npm install @threadkit/plugin-turnstile
# or
pnpm add @threadkit/plugin-turnstile
```

## Setup

### 1. Get Turnstile Keys

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/turnstile)
2. Create a new widget
3. Add your ThreadKit API domain to the allowed hostnames (e.g., `api.usethreadkit.com`)
4. Copy your **Site Key** (public) and **Secret Key** (private)

### 2. Configure the Server

Add your secret key to the server's `.env`:

```env
TURNSTILE_SECRET_KEY=your_secret_key_here
```

### 3. Enable in Site Settings

Configure Turnstile in your site settings (via API or dashboard):

```json
{
  "turnstile": {
    "enabled": true,
    "enforce_on": "all",
    "cache_duration_seconds": 3600
  }
}
```

**Enforcement options:**
- `all` - Require verification for all comment submissions
- `anonymous` - Only require for anonymous/guest users
- `unverified` - Only require for users without verified email/phone
- `none` - Disabled (don't require verification)

### 4. Configure the Client

Create the plugin and pass `getPostHeaders` to ThreadKit:

```tsx
import { ThreadKit } from '@threadkit/react';
import { createTurnstilePlugin } from '@threadkit/plugin-turnstile';

const API_URL = 'https://api.usethreadkit.com';

// Create the plugin instance
const turnstilePlugin = createTurnstilePlugin({
  siteKey: 'your-turnstile-site-key',
});

function App() {
  // Create a function that gets a token before each comment submission
  const getPostHeaders = async () => {
    const result = await turnstilePlugin.getToken(API_URL);

    if (result.success && result.token) {
      return { 'X-Turnstile-Token': result.token };
    }

    throw new Error(result.error || 'Verification failed');
  };

  return (
    <ThreadKit
      siteId="your-site-id"
      projectId="your-project-id"
      apiUrl={API_URL}
      url={window.location.href}
      getPostHeaders={getPostHeaders}
    />
  );
}
```

## How It Works

1. User clicks "Submit" on a comment
2. `getPostHeaders` is called, which triggers the Turnstile plugin
3. Plugin opens a small popup to your API's `/v1/turnstile/challenge` endpoint
4. Cloudflare Turnstile runs its challenge (usually invisible with "Managed" mode)
5. On success, the popup sends the token back via `postMessage`
6. The token is included in the comment submission as `X-Turnstile-Token` header
7. Server verifies the token with Cloudflare before accepting the comment

This popup approach allows a single Turnstile configuration to work across all sites, since Turnstile widgets are limited to 15 hostnames.

## React Hook

For more control, use the `useTurnstile` hook:

```tsx
import { useTurnstile } from '@threadkit/plugin-turnstile';

function MyComponent() {
  const { requestToken, isLoading, error } = useTurnstile({
    siteKey: 'your-site-key',
    apiUrl: 'https://api.usethreadkit.com',
  });

  const handleSubmit = async () => {
    const result = await requestToken();
    if (result.success) {
      // Submit with result.token
    }
  };

  return (
    <button onClick={handleSubmit} disabled={isLoading}>
      {isLoading ? 'Verifying...' : 'Submit'}
    </button>
  );
}
```

## Standalone Usage

You can also use the plugin directly for custom implementations:

```tsx
import { createTurnstilePlugin } from '@threadkit/plugin-turnstile';

const turnstile = createTurnstilePlugin({
  siteKey: 'your-site-key',
});

async function submitComment() {
  const result = await turnstile.getToken('https://api.usethreadkit.com');

  if (result.success) {
    await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'X-Turnstile-Token': result.token!,
      },
      body: JSON.stringify({ text: 'Hello!' }),
    });
  }
}
```

## Configuration Options

### Plugin Configuration

```typescript
interface TurnstilePluginConfig {
  /** Your Turnstile site key from Cloudflare dashboard */
  siteKey: string;
  /** Popup window dimensions (optional) */
  popupOptions?: {
    width?: number;  // default: 450
    height?: number; // default: 500
  };
  /** Timeout for challenge completion in ms (default: 120000) */
  timeout?: number;
}
```

### Server Site Settings

```typescript
interface TurnstileSettings {
  /** Enable Turnstile protection for this site */
  enabled: boolean;
  /** When to require Turnstile verification */
  enforce_on: 'all' | 'anonymous' | 'unverified' | 'none';
  /** Cache successful verifications per user session (in seconds, 0 = no caching) */
  cache_duration_seconds: number;
}
```

## Self-Hosting

If you're self-hosting ThreadKit:

1. Create your own Turnstile widget in Cloudflare
2. Add your API domain to the widget's allowed hostnames
3. Set `TURNSTILE_SECRET_KEY` in your server's `.env`
4. Pass your site key to the plugin

## API Reference

### `createTurnstilePlugin(config)`

Creates a Turnstile plugin instance.

```typescript
const plugin = createTurnstilePlugin({
  siteKey: 'your-site-key',
  popupOptions: { width: 450, height: 500 },
  timeout: 120000,
});

// Get a verification token
const result = await plugin.getToken(apiUrl);
// result: { success: boolean, token?: string, error?: string }

// Check if a challenge is in progress
plugin.isInProgress();

// Cancel any pending challenge
plugin.cancel();
```

### `useTurnstile(options)` (React Hook)

React hook for Turnstile integration.

```typescript
const {
  requestToken,  // () => Promise<TurnstileResult>
  isLoading,     // boolean
  error,         // string | null
  token,         // string | null (last successful token)
  cancel,        // () => void
  reset,         // () => void (clear token/error state)
} = useTurnstile({
  siteKey: 'your-site-key',
  apiUrl: 'https://api.usethreadkit.com',
  autoCleanup: true, // cleanup on unmount (default: true)
});
```

## License

MIT
