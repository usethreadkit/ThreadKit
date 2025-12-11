import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createMediaPreviewPlugin } from '@threadkit/plugin-media-preview';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

// Create the media preview plugin
const mediaPlugin = createMediaPreviewPlugin({
  youtube: true,
  vimeo: true,
  images: true,
  maxImageWidth: 500,
});

function App() {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - Media Preview</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          ThreadKit with automatic media embeds for YouTube, Vimeo, and images.
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

        <div style={{ marginTop: 16, padding: 12, background: '#e8f4fd', borderRadius: 6, fontSize: 14 }}>
          <strong>Try posting links to:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>YouTube: <code>https://youtube.com/watch?v=dQw4w9WgXcQ</code></li>
            <li>Vimeo: <code>https://vimeo.com/123456789</code></li>
            <li>Images: <code>https://picsum.photos/400/300.jpg</code></li>
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
          projectId="tk_pub_your_public_key"
          url="/media-preview"
          theme={theme}
          sortBy="newest"
          plugins={[mediaPlugin]}
          apiUrl="http://localhost:8080/v1"
          wsUrl="ws://localhost:8081"
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
