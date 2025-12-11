import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createLatexPlugin } from '@threadkit/plugin-latex';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

// Create the LaTeX plugin
const latexPlugin = createLatexPlugin();

function App() {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - LaTeX Math</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          ThreadKit with the KaTeX-powered LaTeX plugin for beautiful math rendering.
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
          <strong>Try these:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Inline math: <code>$E = mc^2$</code></li>
            <li>Display math: <code>$$\int_0^\infty e^{'{-x^2}'} dx = \frac{'{\\sqrt{\\pi}}'}{'{2}'}$$</code></li>
            <li>Quadratic formula: <code>$x = \frac{'{-b \\pm \\sqrt{b^2 - 4ac}}'}{'{2a}'}$</code></li>
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
          url="/latex"
          theme={theme}
          sortBy="new"
          plugins={[latexPlugin]}
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
