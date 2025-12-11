# ThreadKit with Cloudflare Turnstile

This example demonstrates how to integrate Cloudflare Turnstile bot protection with ThreadKit to prevent spam and automated abuse.

## What is Turnstile?

[Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) is a privacy-first CAPTCHA alternative that runs invisible challenges to verify users are human without annoying puzzles or clicking on traffic lights.

## How it Works

1. User submits a comment
2. A small popup opens to run the Turnstile challenge
3. Turnstile verifies the user (usually automatically with "Managed" mode)
4. The verification token is sent with the comment
5. Server validates the token with Cloudflare before accepting the comment

This approach allows a single Turnstile configuration to work across all sites using ThreadKit, bypassing Turnstile's 15-hostname limitation.

## Setup

### 1. Get Turnstile Keys

1. Go to [Cloudflare Turnstile Dashboard](https://dash.cloudflare.com/turnstile)
2. Create a new widget
3. For the domain, add your ThreadKit API URL (e.g., `api.usethreadkit.com` for cloud, or `localhost` for local development)
4. Copy your **Site Key** (public) and **Secret Key** (private)

### 2. Configure Your Server

If self-hosting, add the secret key to your server's `.env`:

```env
TURNSTILE_SECRET_KEY=your-secret-key-here
```

If using the cloud version, contact support to enable Turnstile.

### 3. Enable Turnstile in Site Settings

You need to enable Turnstile in your site's settings. This can be done via the API:

```bash
# Update site settings to enable Turnstile
curl -X PATCH 'https://api.usethreadkit.com/v1/sites/{site_id}' \
  -H 'Authorization: Bearer YOUR_SECRET_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "settings": {
      "turnstile": {
        "enabled": true,
        "enforce_on": "all",
        "cache_duration_seconds": 3600
      }
    }
  }'
```

**Enforcement options:**
- `all` - Require verification for all comment submissions
- `anonymous` - Only require for anonymous/guest users (default)
- `unverified` - Only require for users without verified email/phone
- `none` - Disabled

**Cache duration:**
- How long to cache successful verifications per user session (in seconds)
- Set to `0` to disable caching and require verification on every comment
- Recommended: `3600` (1 hour)

### 4. Install Dependencies

```bash
npm install @threadkit/react @threadkit/plugin-turnstile
```

### 5. Add to Your React App

```tsx
import { ThreadKit } from '@threadkit/react';
import { createTurnstilePlugin } from '@threadkit/plugin-turnstile';
import '@threadkit/react/styles';

// Your Turnstile site key (public)
const TURNSTILE_SITE_KEY = 'your-site-key';
const API_URL = 'https://api.usethreadkit.com'; // or your self-hosted URL

// Create the plugin
const turnstilePlugin = createTurnstilePlugin({
  siteKey: TURNSTILE_SITE_KEY,
});

function App() {
  // This function is called before each comment submission
  const getPostHeaders = async () => {
    const result = await turnstilePlugin.getToken(API_URL);

    if (result.success && result.token) {
      return { 'X-Turnstile-Token': result.token };
    }

    // This error will be shown to the user
    throw new Error(result.error || 'Bot verification failed. Please try again.');
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

## Running This Example

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev
```

Then open http://localhost:5173 and try posting a comment. A Turnstile verification popup will appear.

## Configuration Options

### Plugin Options

```typescript
createTurnstilePlugin({
  siteKey: 'your-site-key',     // Required: Your Turnstile site key
  popupOptions: {
    width: 450,                   // Popup width in pixels
    height: 500,                  // Popup height in pixels
  },
  timeout: 120000,                // Timeout in milliseconds (default: 2 minutes)
});
```

### Server Settings

```typescript
{
  "turnstile": {
    "enabled": true,              // Enable Turnstile for this site
    "enforce_on": "all",          // When to require: all | anonymous | unverified | none
    "cache_duration_seconds": 3600 // Cache successful verifications (0 = no caching)
  }
}
```

## Testing

For local development, you can use Cloudflare's test keys:

- **Site key (public):** `1x00000000000000000000AA`
- **Secret key:** `1x0000000000000000000000000000000AA`

These keys always pass verification and should only be used for testing.

## Security Notes

- The secret key must never be exposed to the client
- Always validate tokens server-side
- Tokens are single-use and expire after a short time
- Consider caching successful verifications to reduce friction for legitimate users

## Learn More

- [Cloudflare Turnstile Documentation](https://developers.cloudflare.com/turnstile/)
- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/plugin-turnstile Package](../../packages/plugin-turnstile)
