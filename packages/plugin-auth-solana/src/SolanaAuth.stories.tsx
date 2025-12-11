import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { createSolanaAuthPluginForThreadKit } from './index';

const meta = {
  title: 'Plugins/Auth/Solana',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;

// Create the plugin with standalone provider
const { Provider: SolanaProvider, authPlugin } = createSolanaAuthPluginForThreadKit({
  provider: { mode: 'standalone', network: 'mainnet-beta' },
});

// Mock ThreadKit auth context
function MockAuthContext({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProvider>
      {children}
    </SolanaProvider>
  );
}

// Story component that renders the auth modal
function SolanaAuthStory() {
  const [showModal, setShowModal] = useState(false);

  return (
    <MockAuthContext>
      <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Solana Wallet Authentication</h2>
        <p>Click the button below to open the wallet connection modal.</p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: '#14f195',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '16px',
            fontWeight: 600,
          }}
        >
          Connect Solana Wallet
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
  render: () => <SolanaAuthStory />,
};

export const Devnet: StoryObj = {
  render: () => {
    const { Provider, authPlugin: devnetAuthPlugin } = createSolanaAuthPluginForThreadKit({
      provider: {
        mode: 'standalone',
        network: 'devnet',
      },
    });

    const [showModal, setShowModal] = useState(false);

    return (
      <Provider>
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Solana Wallet Authentication (Devnet)</h2>
          <p>Testing on Solana Devnet for development.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#14f195',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '16px',
              fontWeight: 600,
            }}
          >
            Connect Solana Wallet (Devnet)
          </button>

          {showModal && devnetAuthPlugin.render?.({
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
      <SolanaAuthStory />
    </div>
  ),
};

export const CustomRPC: StoryObj = {
  render: () => {
    const { Provider, authPlugin: customAuthPlugin } = createSolanaAuthPluginForThreadKit({
      provider: {
        mode: 'standalone',
        network: 'mainnet-beta',
        rpcEndpoint: 'https://api.mainnet-beta.solana.com', // Example custom RPC
      },
    });

    const [showModal, setShowModal] = useState(false);

    return (
      <Provider>
        <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
          <h2>Solana Wallet Authentication (Custom RPC)</h2>
          <p>Using a custom RPC endpoint for Solana connections.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#14f195',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '16px',
              fontWeight: 600,
            }}
          >
            Connect Solana Wallet
          </button>

          {showModal && customAuthPlugin.render?.({
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
