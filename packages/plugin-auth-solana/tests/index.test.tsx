import { describe, it, expect } from 'vitest';
import {
  createSolanaAuthPlugin,
  type SolanaAuthPluginOptions,
  type User,
  type SolanaWalletState,
  type SolanaSignInState,
} from '../src/index';

describe('createSolanaAuthPlugin', () => {
  describe('plugin structure', () => {
    it('creates a result with plugin object in standalone mode', () => {
      const options: SolanaAuthPluginOptions = {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        provider: {
          mode: 'standalone',
        },
      };

      const result = createSolanaAuthPlugin(options);

      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
      expect(result.plugin.name).toBe('solana-auth');
    });

    it('creates a result with plugin object in external mode', () => {
      const options: SolanaAuthPluginOptions = {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        provider: {
          mode: 'external',
        },
      };

      const result = createSolanaAuthPlugin(options);

      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
      expect(result.plugin.name).toBe('solana-auth');
    });

    it('works when API URL is not provided', () => {
      const options: SolanaAuthPluginOptions = {
        provider: { mode: 'standalone' },
      };

      const result = createSolanaAuthPlugin(options);
      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
    });

    it('accepts network configuration', () => {
      const options: SolanaAuthPluginOptions = {
        provider: {
          mode: 'standalone',
          network: 'devnet',
        },
      };

      const result = createSolanaAuthPlugin(options);
      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
    });

    it('accepts custom RPC endpoint', () => {
      const options: SolanaAuthPluginOptions = {
        provider: {
          mode: 'standalone',
          rpcEndpoint: 'https://custom-rpc.example.com',
        },
      };

      const result = createSolanaAuthPlugin(options);
      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
    });
  });

  describe('result properties', () => {
    it('returns plugin, Provider, and hooks', () => {
      const result = createSolanaAuthPlugin({
        provider: { mode: 'standalone' },
      });

      // Check all returned properties exist
      expect(result.plugin).toBeDefined();
      expect(result.plugin.name).toBe('solana-auth');
      expect(result.Provider).toBeDefined();
      expect(typeof result.Provider).toBe('function');
    });

    it('exposes wallet and sign-in hooks', () => {
      const result = createSolanaAuthPlugin({
        provider: { mode: 'standalone' },
      });

      // Result should expose these hooks for advanced usage
      expect(result.useWallet).toBeDefined();
      expect(typeof result.useWallet).toBe('function');
      expect(result.useSignIn).toBeDefined();
      expect(typeof result.useSignIn).toBe('function');
    });

    it('exposes useSolanaAuth hook', () => {
      const result = createSolanaAuthPlugin({
        provider: { mode: 'standalone' },
      });

      expect(result.useSolanaAuth).toBeDefined();
      expect(typeof result.useSolanaAuth).toBe('function');
    });

    it('exposes ThreadKitSolanaWalletButton component', () => {
      const result = createSolanaAuthPlugin({
        provider: { mode: 'standalone' },
      });

      expect(result.ThreadKitSolanaWalletButton).toBeDefined();
      expect(typeof result.ThreadKitSolanaWalletButton).toBe('function');
    });
  });
});

describe('type exports', () => {
  it('exports User type', () => {
    const user: User = {
      id: 'user-1',
      name: 'Test User',
      email_verified: false,
    };

    expect(user.id).toBe('user-1');
    expect(user.name).toBe('Test User');
  });

  it('exports SolanaWalletState type', () => {
    const state: SolanaWalletState = {
      address: 'So1anaAddressHere123',
      isConnected: true,
      isConnecting: false,
    };

    expect(state.address).toBe('So1anaAddressHere123');
    expect(state.isConnected).toBe(true);
  });

  it('exports SolanaSignInState type', () => {
    const state: SolanaSignInState = {
      isSigningIn: false,
      isSignedIn: true,
      user: { id: '1', name: 'Test', email_verified: false },
      error: null,
    };

    expect(state.isSignedIn).toBe(true);
    expect(state.user?.name).toBe('Test');
  });
});
