import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createSyntaxHighlightPlugin } from '@threadkit/plugin-syntax-highlight';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

function App() {
  const [theme, setTheme] = useState<Theme>('light');

  // Create the syntax highlight plugin with matching theme
  const syntaxPlugin = createSyntaxHighlightPlugin({ theme });

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - Syntax Highlighting</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          ThreadKit with the Shiki-powered syntax highlighting plugin.
          Try posting code blocks with triple backticks!
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
          <strong>Try this:</strong> Post a comment with a code block:
          <pre style={{ marginTop: 8, background: '#fff', padding: 8, borderRadius: 4 }}>
{`\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`;
}
\`\`\``}
          </pre>
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
          url="/syntax-highlight"
          theme={theme}
          sortBy="new"
          plugins={[syntaxPlugin]}
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
