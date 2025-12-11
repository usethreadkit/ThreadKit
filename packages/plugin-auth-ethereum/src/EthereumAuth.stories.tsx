import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { createEthereumAuthPluginForThreadKit } from './index';

const meta = {
  title: 'Plugins/Auth/Ethereum',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

// Create the plugin with standalone provider
const { Provider: EthereumProvider, authPlugin } = createEthereumAuthPluginForThreadKit({
  provider: { mode: 'standalone' },
});

// Mock ThreadKit auth context
function MockAuthContext({ children }: { children: React.ReactNode }) {
  return (
    <EthereumProvider>
      {children}
    </EthereumProvider>
  );
}

// Story component that renders the auth modal
function EthereumAuthStory() {
  const [showModal, setShowModal] = useState(false);

  return (
    <MockAuthContext>
      <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Ethereum Wallet Authentication</h2>
        <p>Click the button below to open the wallet connection modal.</p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '16px',
          }}
        >
          Connect Ethereum Wallet
        </button>

        {showModal && authPlugin.render?.({
          onSuccess: (token, refreshToken, user) => {
            console.log('Auth success:', { token, user });
            alert(`Successfully authenticated as ${user.name || user.id}`);
            setShowModal(false);
          },
          onError: (error) => {
            console.error('Auth error:', error);
            alert(`Authentication failed: ${error}`);
          },
          onCancel: () => {
            console.log('Auth cancelled');
            setShowModal(false);
          },
          apiUrl: 'http://localhost:8080/v1',
          projectId: 'tk_pub_your_public_key',
        })}
      </div>
    </MockAuthContext>
  );
}

export const Default: StoryObj = {
  render: () => <EthereumAuthStory />,
};

export const WithWalletConnect: StoryObj = {
  render: () => {
    const { Provider, authPlugin: wcAuthPlugin } = createEthereumAuthPluginForThreadKit({
      provider: {
        mode: 'standalone',
        walletConnectProjectId: 'demo_project_id', // Replace with actual project ID for testing
      },
    });

    const [showModal, setShowModal] = useState(false);

    return (
      <Provider>
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Ethereum Wallet Authentication (with WalletConnect)</h2>
          <p>This includes WalletConnect support for mobile wallets.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '16px',
            }}
          >
            Connect Ethereum Wallet
          </button>

          {showModal && wcAuthPlugin.render?.({
            onSuccess: (token, refreshToken, user) => {
              console.log('Auth success:', { token, user });
              alert(`Successfully authenticated as ${user.name || user.id}`);
              setShowModal(false);
            },
            onError: (error) => {
              console.error('Auth error:', error);
              alert(`Authentication failed: ${error}`);
            },
            onCancel: () => {
              console.log('Auth cancelled');
              setShowModal(false);
            },
            apiUrl: 'http://localhost:8080/v1',
            projectId: 'tk_pub_your_public_key',
          })}
        </div>
      </Provider>
    );
  },
};

export const DarkTheme: StoryObj = {
  render: () => (
    <div data-theme="dark" style={{ minHeight: '100vh', background: '#1a1a1a', color: '#fff' }}>
      <EthereumAuthStory />
    </div>
  ),
};
