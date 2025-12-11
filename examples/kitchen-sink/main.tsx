import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createSyntaxHighlightPlugin } from '@threadkit/plugin-syntax-highlight';
import { createLatexPlugin } from '@threadkit/plugin-latex';
import { createMediaPreviewPlugin } from '@threadkit/plugin-media-preview';
import {
  createEthereumAuthPlugin,
  useEthereumAuth,
} from '@threadkit/plugin-auth-ethereum';
import {
  createSolanaAuthPlugin,
  useSolanaAuth,
} from '@threadkit/plugin-auth-solana';
import '@threadkit/react/styles';

type Mode = 'comments' | 'chat';
type Theme = 'light' | 'dark';
type AuthMode = 'none' | 'ethereum' | 'solana';

// Create Ethereum auth plugin
const {
  plugin: ethereumPlugin,
  Provider: EthereumProvider,
  ThreadKitEthereumWalletButton,
} = createEthereumAuthPlugin({
  provider: { mode: 'standalone' },
});

// Create Solana auth plugin
const {
  plugin: solanaPlugin,
  Provider: SolanaProvider,
  ThreadKitSolanaWalletButton,
} = createSolanaAuthPlugin({
  provider: { mode: 'standalone', network: 'mainnet-beta' },
});

function EthereumStatus() {
  const { address, isConnected, isSignedIn, user } = useEthereumAuth();
  if (!isConnected) return null;
  const truncated = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  return (
    <span style={{ color: isSignedIn ? '#22c55e' : '#f59e0b', fontSize: 14 }}>
      {isSignedIn ? `Signed in: ${user?.name || truncated}` : `Connected: ${truncated}`}
    </span>
  );
}

function SolanaStatus() {
  const { address, isConnected, isSignedIn, user } = useSolanaAuth();
  if (!isConnected) return null;
  const truncated = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : '';
  return (
    <span style={{ color: isSignedIn ? '#22c55e' : '#f59e0b', fontSize: 14 }}>
      {isSignedIn ? `Signed in: ${user?.name || truncated}` : `Connected: ${truncated}`}
    </span>
  );
}

function AppContent({
  mode,
  setMode,
  theme,
  setTheme,
  authMode,
  setAuthMode,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  authMode: AuthMode;
  setAuthMode: (a: AuthMode) => void;
}) {
  // Create plugins - syntax highlight theme should match UI theme
  const syntaxPlugin = createSyntaxHighlightPlugin({ theme });
  const latexPlugin = createLatexPlugin();
  const mediaPlugin = createMediaPreviewPlugin();

  // Build plugins array based on auth mode
  const plugins = [syntaxPlugin, latexPlugin, mediaPlugin];
  if (authMode === 'ethereum') plugins.push(ethereumPlugin);
  if (authMode === 'solana') plugins.push(solanaPlugin);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>ThreadKit - Kitchen Sink</h1>
        <p style={{ color: '#666', marginBottom: 16 }}>
          ThreadKit with all plugins: syntax highlighting, LaTeX math, media
          previews, and web3 wallet authentication.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
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
            Auth:
            <select
              value={authMode}
              onChange={(e) => setAuthMode(e.target.value as AuthMode)}
              style={{ padding: '4px 8px' }}
            >
              <option value="none">None</option>
              <option value="ethereum">Ethereum</option>
              <option value="solana">Solana</option>
            </select>
          </label>
        </div>

        {authMode === 'ethereum' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <ThreadKitEthereumWalletButton
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            />
            <EthereumStatus />
          </div>
        )}

        {authMode === 'solana' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
            <ThreadKitSolanaWalletButton
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#9945FF',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            />
            <SolanaStatus />
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#e8f4fd',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <strong>Features enabled:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>
              <strong>Syntax highlighting:</strong> Use triple backticks for code
              blocks
            </li>
            <li>
              <strong>LaTeX math:</strong> Use <code>$...$</code> for inline,{' '}
              <code>$$...$$</code> for display
            </li>
            <li>
              <strong>Media embeds:</strong> Paste YouTube, Vimeo, or image URLs
            </li>
            <li>
              <strong>Web3 auth:</strong> Connect Ethereum or Solana wallet to sign
              in
            </li>
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
          url="/kitchen-sink"
          mode={mode}
          theme={theme}
          sortBy="newest"
          showPresence={mode === 'chat'}
          showTyping={mode === 'chat'}
          plugins={plugins}
          apiUrl="http://localhost:8080/v1"
          wsUrl="ws://localhost:8081"
        />
      </main>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>('comments');
  const [theme, setTheme] = useState<Theme>('light');
  const [authMode, setAuthMode] = useState<AuthMode>('none');

  const content = (
    <AppContent
      mode={mode}
      setMode={setMode}
      theme={theme}
      setTheme={setTheme}
      authMode={authMode}
      setAuthMode={setAuthMode}
    />
  );

  // Wrap with appropriate provider based on auth mode
  if (authMode === 'ethereum') {
    return <EthereumProvider>{content}</EthereumProvider>;
  }
  if (authMode === 'solana') {
    return <SolanaProvider>{content}</SolanaProvider>;
  }
  return content;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
