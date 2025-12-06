import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createSolanaAuthPlugin } from '@threadkit/plugin-auth-solana';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

// Create the Solana auth plugin in standalone mode
const { plugin, Provider, ThreadKitSolanaWalletButton, useSolanaAuth } =
  createSolanaAuthPlugin({
    provider: {
      mode: 'standalone',
      network: 'mainnet-beta',
    },
    onSignIn: (user, address) => {
      console.log('Signed in:', user.name, address);
    },
    onError: (error) => {
      console.error('Auth error:', error);
    },
  });

function WalletStatus() {
  const { address, isConnected, isSignedIn, user } = useSolanaAuth();

  if (!isConnected) {
    return <span style={{ color: '#666' }}>No wallet connected</span>;
  }

  const truncatedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : '';

  if (isSignedIn && user) {
    return (
      <span style={{ color: '#22c55e' }}>
        Signed in as {user.name || truncatedAddress}
      </span>
    );
  }

  return <span style={{ color: '#f59e0b' }}>Connected: {truncatedAddress}</span>;
}

function App() {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <Provider>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ marginBottom: 8 }}>ThreadKit - Solana Wallet Auth</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>
            ThreadKit with Solana wallet authentication. Connect your wallet
            (Phantom, Solflare, Coinbase) to sign in.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
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

            <WalletStatus />
          </div>

          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: '#f3e8ff',
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <strong>How it works:</strong>
            <ol style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Click "Connect Wallet" to connect your Solana wallet</li>
              <li>Sign a message to authenticate with ThreadKit</li>
              <li>Your wallet address becomes your identity for commenting</li>
            </ol>
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
            url="/solana-auth"
            theme={theme}
            sortBy="newest"
            plugins={[plugin]}
            apiUrl="/api"
          />
        </main>
      </div>
    </Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
