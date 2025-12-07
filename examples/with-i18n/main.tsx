import { StrictMode, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { locales, supportedLocales, type LocaleCode } from '@threadkit/i18n';
import '@threadkit/react/styles';

// Human-readable language names
const languageNames: Record<LocaleCode, string> = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  de: 'Deutsch',
  pt: 'Portugues',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Russian',
  tr: 'Turkce',
  fa: 'Farsi',
  vi: 'Tieng Viet',
  cs: 'Cestina',
  id: 'Bahasa Indonesia',
  hu: 'Magyar',
  uk: 'Ukrainian',
  ar: 'Arabic',
  sv: 'Svenska',
  ro: 'Romana',
};

type Theme = 'light' | 'dark';

const codeExample = `// Install
npm install @threadkit/react @threadkit/i18n

// Import
import { ThreadKit } from '@threadkit/react';
import { locales, type LocaleCode } from '@threadkit/i18n';
import '@threadkit/react/styles';

// Use with language selection
function Comments() {
  const [locale, setLocale] = useState<LocaleCode>('en');

  return (
    <ThreadKit
      siteId="your-site-id"
      url={window.location.pathname}
      translations={locales[locale]}
    />
  );
}`;

function App() {
  const [locale, setLocale] = useState<LocaleCode>('en');
  const [theme, setTheme] = useState<Theme>('light');

  // Get translations for selected locale
  const translations = useMemo(() => locales[locale], [locale]);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - i18n Example</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          Demonstrates how to use @threadkit/i18n for multi-language support.
          Select a language from the dropdown to see ThreadKit in different languages.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Language:
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as LocaleCode)}
              style={{ padding: '4px 8px' }}
            >
              {supportedLocales.map((code) => (
                <option key={code} value={code}>
                  {languageNames[code]} ({code})
                </option>
              ))}
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

        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#e8f4f8',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <strong>Current language:</strong> {languageNames[locale]} ({locale})
          <br />
          <strong>Available languages:</strong> {supportedLocales.length}
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
          mode="comments"
          theme={theme}
          sortBy="newest"
          translations={translations}
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
