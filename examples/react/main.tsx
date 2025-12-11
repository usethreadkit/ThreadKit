import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

// Configuration for local development
const LOCAL_PROJECT_ID = 'tk_pub_your_public_key';
const API_URL = 'http://localhost:8080/v1';
const WS_URL = 'ws://localhost:8081';

function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const [pageUrl, setPageUrl] = useState('/demo');

  return (
    <>
      <style>{`
        .demo-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }

        .demo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        .demo-main {
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        @media (max-width: 768px) {
          .demo-container {
            padding: 0;
          }

          .demo-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .demo-main {
            border-radius: 0;
            padding: 16px;
            box-shadow: none;
          }
        }
      `}</style>
      <div className="demo-container">
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - React Example (Two Instances)</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Testing chat and thread modes side-by-side at <code>localhost:8080</code>
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
                cargo run --release --bin threadkit-http -- \
                <br />
                --create-site "My Site" example.com \
                <br />
                --enable-auth email,google,github,anonymous
              </pre>
            </li>
            <li>
              Start the server: <code>cd server && cargo run --release --bin threadkit-http</code>
            </li>
          </ol>
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
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

      <div className="demo-grid">
        <main
          className="demo-main"
          style={{
            background: theme === 'dark' ? '#1a1a1a' : '#fff',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Chat Mode</h2>
          <ThreadKit
            projectId={LOCAL_PROJECT_ID}
            url={pageUrl}
            mode="chat"
            theme={theme}
            sortBy="new"
            showPresence={true}
            showTyping={true}
            apiUrl={API_URL}
            wsUrl={WS_URL}
            debug={true}
            onError={(error) => console.error('ThreadKit chat error:', error)}
          />
        </main>

        <main
          className="demo-main"
          style={{
            background: theme === 'dark' ? '#1a1a1a' : '#fff',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18 }}>Thread Mode</h2>
          <ThreadKit
            projectId={LOCAL_PROJECT_ID}
            url={pageUrl}
            mode="comments"
            theme={theme}
            sortBy="new"
            showPresence={false}
            showTyping={false}
            apiUrl={API_URL}
            wsUrl={WS_URL}
            debug={true}
            onError={(error) => console.error('ThreadKit thread error:', error)}
          />
        </main>
      </div>

      <footer style={{ marginTop: 32, color: '#666', fontSize: 14 }}>
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
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
