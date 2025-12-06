import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import '@threadkit/react/styles';

type Mode = 'comments' | 'chat';
type Theme = 'light' | 'dark';

const codeExample = `// Install
npm install @threadkit/react

// Import
import { ThreadKit } from '@threadkit/react';
import '@threadkit/react/styles';

// Use in your component
function Comments() {
  return (
    <ThreadKit
      siteId="your-site-id"
      url={window.location.pathname}
      mode="comments"
      theme="light"
    />
  );
}`;

function App() {
  const [mode, setMode] = useState<Mode>('comments');
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - React Example</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          A ThreadKit React setup without any plugins.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
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
          url="/demo"
          mode={mode}
          theme={theme}
          sortBy="newest"
          showPresence={mode === 'chat'}
          showTyping={mode === 'chat'}
          apiUrl="/api"
        />
      </main>

      <div
        style={{
          marginTop: 32,
          padding: 16,
          background: '#1a1a1a',
          borderRadius: 8,
          overflow: 'auto',
        }}
      >
        <pre
          style={{
            margin: 0,
            color: '#e0e0e0',
            fontFamily: "'Fira Code', Monaco, Consolas, monospace",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <code>{codeExample}</code>
        </pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
