import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import '@threadkit/react/styles';

type Mode = 'comments' | 'chat';
type Theme = 'light' | 'dark';

function App() {
  const [mode, setMode] = useState<Mode>('comments');
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - Basic Example</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          A basic ThreadKit setup without any plugins.
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
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
