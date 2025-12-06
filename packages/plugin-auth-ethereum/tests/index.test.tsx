import { describe, it, expect } from 'vitest';
import {
  createEthereumAuthPlugin,
  type EthereumAuthPluginOptions,
  type User,
  type EthereumWalletState,
  type EthereumSignInState,
} from '../src/index';

describe('createEthereumAuthPlugin', () => {
  describe('plugin structure', () => {
    it('creates a result with plugin object in standalone mode', () => {
      const options: EthereumAuthPluginOptions = {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        provider: {
          mode: 'standalone',
        },
      };

      const result = createEthereumAuthPlugin(options);

      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
      expect(result.plugin.name).toBe('ethereum-auth');
    });

    it('creates a result with plugin object in external mode', () => {
      const options: EthereumAuthPluginOptions = {
        apiUrl: 'https://api.example.com',
        apiKey: 'test-key',
        provider: {
          mode: 'external',
        },
      };

      const result = createEthereumAuthPlugin(options);

      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
      expect(result.plugin.name).toBe('ethereum-auth');
    });

    it('works when API URL is not provided', () => {
      const options: EthereumAuthPluginOptions = {
        provider: { mode: 'standalone' },
      };

      const result = createEthereumAuthPlugin(options);
      expect(result).toBeDefined();
      expect(result.plugin).toBeDefined();
    });
  });

  describe('result properties', () => {
    it('returns plugin, Provider, and hooks', () => {
      const result = createEthereumAuthPlugin({
        provider: { mode: 'standalone' },
      });

      // Check all returned properties exist
      expect(result.plugin).toBeDefined();
      expect(result.plugin.name).toBe('ethereum-auth');
      expect(result.Provider).toBeDefined();
      expect(typeof result.Provider).toBe('function');
    });

    it('exposes wallet and sign-in hooks', () => {
      const result = createEthereumAuthPlugin({
        provider: { mode: 'standalone' },
      });

      // Result should expose these hooks for advanced usage
      expect(result.useWallet).toBeDefined();
      expect(typeof result.useWallet).toBe('function');
      expect(result.useSignIn).toBeDefined();
      expect(typeof result.useSignIn).toBe('function');
    });

    it('exposes useEthereumAuth hook', () => {
      const result = createEthereumAuthPlugin({
        provider: { mode: 'standalone' },
      });

      expect(result.useEthereumAuth).toBeDefined();
      expect(typeof result.useEthereumAuth).toBe('function');
    });

    it('exposes ThreadKitEthereumWalletButton component', () => {
      const result = createEthereumAuthPlugin({
        provider: { mode: 'standalone' },
      });

      expect(result.ThreadKitEthereumWalletButton).toBeDefined();
      expect(typeof result.ThreadKitEthereumWalletButton).toBe('function');
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

  it('exports EthereumWalletState type', () => {
    const state: EthereumWalletState = {
      address: '0x1234567890abcdef',
      chainId: 1,
      isConnected: true,
      isConnecting: false,
    };

    expect(state.address).toBe('0x1234567890abcdef');
    expect(state.chainId).toBe(1);
  });

  it('exports EthereumSignInState type', () => {
    const state: EthereumSignInState = {
      isSigningIn: false,
      isSignedIn: true,
      user: { id: '1', name: 'Test', email_verified: false },
      error: null,
    };

    expect(state.isSignedIn).toBe(true);
    expect(state.user?.name).toBe('Test');
  });
});
