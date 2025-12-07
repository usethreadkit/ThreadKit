import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import '@threadkit/react/styles';

type Mode = 'comments' | 'chat';
type Theme = 'light' | 'dark';

// Configuration for local development
// Make sure your server is running at localhost:8080
// Set these values to match your server/.env file
const LOCAL_API_KEY = 'tk_pub_o7ho3wt97dv7aat5jnou5yh3pml0i16p';
const API_URL = 'http://localhost:8080/v1';

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
              Start the server: <code>cd server && cargo run</code>
            </li>
            <li>
              Update <code>LOCAL_API_KEY</code> in this file to match your{' '}
              <code>API_KEY_PUBLIC</code> from <code>server/.env</code>
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
          onError={(error) => console.error('ThreadKit error:', error)}
        />
      </main>

      <footer style={{ marginTop: 32, color: '#666', fontSize: 14 }}>
        <p>
          API Endpoint: <code>{API_URL}</code>
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
