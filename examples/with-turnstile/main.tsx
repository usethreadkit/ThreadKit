import { StrictMode, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createTurnstilePlugin } from '@threadkit/plugin-turnstile';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

// Your Turnstile site key from Cloudflare dashboard
const TURNSTILE_SITE_KEY = '0x4AAAAAACFIvrOhSYjx2IQC';
const API_URL = 'https://api.usethreadkit.com';

// Create the Turnstile plugin instance
const turnstilePlugin = createTurnstilePlugin({
  siteKey: TURNSTILE_SITE_KEY,
});

function App() {
  const [theme, setTheme] = useState<Theme>('light');

  // Create a getPostHeaders function that gets a Turnstile token before each post
  const getPostHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const result = await turnstilePlugin.getToken(API_URL);

    if (result.success && result.token) {
      return { 'X-Turnstile-Token': result.token };
    }

    // Throw error to prevent posting without valid token
    throw new Error(result.error || 'Bot verification failed. Please try again.');
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - Turnstile Bot Protection</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          ThreadKit with Cloudflare Turnstile integration for bot protection.
          A popup will appear when you submit a comment to verify you're human.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Theme:
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              style={{ padding: '4px 8px' }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: '#fff3cd', borderRadius: 6, fontSize: 14 }}>
          <strong>How it works:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>When you post a comment, a popup opens with a Turnstile challenge</li>
            <li>Complete the challenge (usually automatic with "Managed" mode)</li>
            <li>The token is sent with your comment to verify you're not a bot</li>
            <li>If verification fails, your comment won't be posted</li>
          </ul>
        </div>
      </header>

      <main
        style={{
          background: theme === 'dark' ? '#1a1a1a' : '#fff',
          borderRadius: 8,
          padding: 24,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <ThreadKit
          siteId="demo"
          url="/turnstile-demo"
          apiKey="tk_pub_demo_key"
          apiUrl={API_URL}
          theme={theme}
          sortBy="newest"
          getPostHeaders={getPostHeaders}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
