import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreadKit } from '@threadkit/react';
import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';
import '@threadkit/react/styles';

type Theme = 'light' | 'dark';

// Create the Ethereum auth plugin in standalone mode
const { plugin, Provider, ThreadKitEthereumWalletButton, useEthereumAuth } =
  createEthereumAuthPlugin({
    provider: {
      mode: 'standalone',
      // Add your WalletConnect project ID for WalletConnect support
      // walletConnectProjectId: 'your-project-id',
    },
    onSignIn: (user, address) => {
      console.log('Signed in:', user.name, address);
    },
    onError: (error) => {
      console.error('Auth error:', error);
    },
  });

function WalletStatus() {
  const { address, isConnected, isSignedIn, user } = useEthereumAuth();

  if (!isConnected) {
    return <span style={{ color: '#666' }}>No wallet connected</span>;
  }

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
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
          <h1 style={{ marginBottom: 8 }}>ThreadKit - Ethereum Wallet Auth</h1>
          <p style={{ color: '#666', marginBottom: 16 }}>
            ThreadKit with Ethereum wallet authentication. Connect your wallet
            (MetaMask, WalletConnect, Coinbase) to sign in.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
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
              background: '#e8f4fd',
              borderRadius: 6,
              fontSize: 14,
            }}
          >
            <strong>How it works:</strong>
            <ol style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Click "Connect Wallet" to connect your Ethereum wallet</li>
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
            url="/ethereum-auth"
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
