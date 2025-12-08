import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import '@threadkit/react/styles';

type Mode = 'comments' | 'chat';
type Theme = 'light' | 'dark';

// Configuration for local development
// These are the default values for the local-server example.
// Run: cargo run --release --bin threadkit-http -- --create-site "Local Dev" localhost none tk_pub_local_example_key tk_sec_local_example_key 00000000-0000-0000-0000-000000000001
const LOCAL_API_KEY = 'tk_pub_local_example_key';
const SITE_ID = '00000000-0000-0000-0000-000000000001';
const API_URL = 'http://localhost:8080/v1';
const WS_URL = 'ws://localhost:8081';

function App() {
  const [mode, setMode] = useState<Mode>('comments');
  const [theme, setTheme] = useState<Theme>('light');
  const [pageUrl, setPageUrl] = useState('/demo');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - Local Server</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Connects to your local ThreadKit server at <code>localhost:8080</code>
        </p>

        <div
          style={{
            background: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <strong>Setup:</strong>
          <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
            <li>
              Start Redis: <code>redis-server</code>
            </li>
            <li>
              Create site (first time only):
              <pre style={{ margin: '4px 0', padding: 8, background: '#f5f5f5', borderRadius: 4, fontSize: 12, overflow: 'auto' }}>
cd server && cargo run --release --bin threadkit-http -- \{'\n'}  --create-site "Local Dev" localhost none \{'\n'}  tk_pub_local_example_key tk_sec_local_example_key \{'\n'}  00000000-0000-0000-0000-000000000001
              </pre>
            </li>
            <li>
              Start the server: <code>cd server && cargo run --release --bin threadkit-http</code>
            </li>
          </ol>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Mode:
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              style={{ padding: '4px 8px' }}
            >
              <option value="comments">Comments</option>
              <option value="chat">Chat</option>
            </select>
          </label>

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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Page:
            <input
              type="text"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              style={{ padding: '4px 8px', width: 150 }}
              placeholder="/your-page-url"
            />
          </label>
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
          apiKey={LOCAL_API_KEY}
          url={pageUrl}
          mode={mode}
          theme={theme}
          sortBy="newest"
          showPresence={mode === 'chat'}
          showTyping={mode === 'chat'}
          apiUrl={API_URL}
          wsUrl={WS_URL}
          debug={true}
          onError={(error) => console.error('ThreadKit error:', error)}
        />
      </main>

      <footer style={{ marginTop: 32, color: '#666', fontSize: 14 }}>
        <div style={{
          background: '#f5f5f5',
          borderRadius: 8,
          padding: 16,
          marginBottom: 16,
          fontFamily: 'monospace',
          fontSize: 12,
        }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Debug Info:</strong>
          </div>
          <div>Site ID: <code>{SITE_ID}</code></div>
          <div>Page URL: <code>{pageUrl}</code></div>
          <div>API Key: <code>{LOCAL_API_KEY}</code></div>
        </div>
        <p>
          API Endpoint: <code>{API_URL}</code>
        </p>
        <p>
          WebSocket: <code>{WS_URL}</code>
        </p>
        <p>
          View API docs:{' '}
          <a href="http://localhost:8080/docs" target="_blank" rel="noopener noreferrer">
            http://localhost:8080/docs
          </a>
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
