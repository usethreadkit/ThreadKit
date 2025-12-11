import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  createConfig,
  http,
  WagmiProvider,
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
} from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base, type Chain } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ThreadKitPlugin } from '@threadkit/react';

// ============================================================================
// Types
// ============================================================================

export type EthereumAuthMode = 'standalone' | 'external';

export interface StandaloneConfig {
  mode: 'standalone';
  /** WalletConnect project ID (required for WalletConnect support) */
  walletConnectProjectId?: string;
  /** Chain IDs to support (default: mainnet, polygon, arbitrum, optimism, base) */
  chainIds?: number[];
}

export interface ExternalConfig {
  mode: 'external';
  /** Uses existing WagmiProvider from parent app */
}

export interface EthereumAuthPluginOptions {
  /** API base URL for ThreadKit backend */
  apiUrl?: string;
  /** API key for ThreadKit */
  apiKey?: string;
  /** localStorage key for token (default: 'threadkit_token') */
  tokenStorageKey?: string;
  /** Callback when sign-in succeeds */
  onSignIn?: (user: User, address: string) => void;
  /** Callback when sign-in fails */
  onError?: (error: Error) => void;
  /** Provider configuration */
  provider: StandaloneConfig | ExternalConfig;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  email_verified: boolean;
  phone_verified: boolean;
  username_set: boolean;
}

export interface EthereumWalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export interface EthereumSignInState {
  isSigningIn: boolean;
  isSignedIn: boolean;
  user: User | null;
  error: Error | null;
}

export interface UseWalletReturn extends EthereumWalletState {
  connect: () => void;
  disconnect: () => void;
  connectors: { id: string; name: string }[];
}

export interface UseSignInReturn extends EthereumSignInState {
  signIn: () => Promise<void>;
  signOut: () => void;
}

export interface WalletButtonProps {
  connectLabel?: string;
  signingInLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

// ============================================================================
// Context
// ============================================================================

interface EthereumAuthContextValue {
  options: EthereumAuthPluginOptions;
  walletState: EthereumWalletState;
  signInState: EthereumSignInState;
  setSignInState: React.Dispatch<React.SetStateAction<EthereumSignInState>>;
}

const EthereumAuthContext = createContext<EthereumAuthContextValue | null>(null);

function useEthereumAuthContext() {
  const ctx = useContext(EthereumAuthContext);
  if (!ctx) {
    throw new Error('useEthereumAuth must be used within EthereumAuthProvider');
  }
  return ctx;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchNonce(
  apiUrl: string,
  apiKey: string,
  address: string
): Promise<{ nonce: string; message: string }> {
  const res = await fetch(
    `${apiUrl}/auth/ethereum/nonce?address=${encodeURIComponent(address)}`,
    {
      headers: { 'projectid': apiKey },
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Failed to get nonce');
  }
  return res.json();
}

async function verifySignature(
  apiUrl: string,
  apiKey: string,
  address: string,
  message: string,
  signature: string
): Promise<{ token: string; refresh_token: string; user: User }> {
  const res = await fetch(`${apiUrl}/auth/ethereum/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'projectid': apiKey,
    },
    body: JSON.stringify({ address, message, signature }),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || 'Signature verification failed');
  }
  return res.json();
}

// ============================================================================
// Hooks
// ============================================================================

export function useWallet(): UseWalletReturn {
  const { walletState } = useEthereumAuthContext();
  const { connectors, connect: wagmiConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const connect = useCallback(() => {
    // Connect with first available connector (usually injected/MetaMask)
    const connector = connectors[0];
    if (connector) {
      wagmiConnect({ connector });
    }
  }, [connectors, wagmiConnect]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  return {
    ...walletState,
    connect,
    disconnect,
    connectors: connectors.map((c) => ({ id: c.id, name: c.name })),
  };
}

export function useSignIn(): UseSignInReturn {
  const { options, signInState, setSignInState } = useEthereumAuthContext();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const apiUrl = options.apiUrl || 'https://api.usethreadkit.com';
  const apiKey = options.apiKey || '';
  const tokenKey = options.tokenStorageKey || 'threadkit_token';

  const signIn = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setSignInState((s) => ({ ...s, isSigningIn: true, error: null }));

    try {
      // 1. Get nonce from server
      const { message } = await fetchNonce(apiUrl, apiKey, address);

      // 2. Sign the message
      const signature = await signMessageAsync({ message });

      // 3. Verify signature and get token
      const { token, user } = await verifySignature(
        apiUrl,
        apiKey,
        address,
        message,
        signature
      );

      // 4. Store token
      localStorage.setItem(tokenKey, token);

      // 5. Update state
      setSignInState({
        isSigningIn: false,
        isSignedIn: true,
        user,
        error: null,
      });

      // 6. Callback
      options.onSignIn?.(user, address);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setSignInState((s) => ({ ...s, isSigningIn: false, error }));
      options.onError?.(error);
    }
  }, [address, signMessageAsync, apiUrl, apiKey, tokenKey, options, setSignInState]);

  const signOut = useCallback(() => {
    localStorage.removeItem(tokenKey);
    setSignInState({
      isSigningIn: false,
      isSignedIn: false,
      user: null,
      error: null,
    });
  }, [tokenKey, setSignInState]);

  return {
    ...signInState,
    signIn,
    signOut,
  };
}

export function useEthereumAuth(): UseWalletReturn & UseSignInReturn {
  const wallet = useWallet();
  const signIn = useSignIn();
  return { ...wallet, ...signIn };
}

// ============================================================================
// Components
// ============================================================================

export function ThreadKitEthereumWalletButton({
  connectLabel = 'Connect Wallet',
  signingInLabel = 'Signing in...',
  className,
  style,
}: WalletButtonProps) {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const { isSigningIn, isSignedIn, user, signIn, signOut } = useSignIn();

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  if (isSignedIn && user) {
    return (
      <button
        onClick={signOut}
        className={className}
        style={style}
        type="button"
      >
        {user.name || truncatedAddress}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        onClick={signIn}
        disabled={isSigningIn}
        className={className}
        style={style}
        type="button"
      >
        {isSigningIn ? signingInLabel : `Sign in as ${truncatedAddress}`}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className={className}
      style={style}
      type="button"
    >
      {isConnecting ? 'Connecting...' : connectLabel}
    </button>
  );
}

// ============================================================================
// Provider
// ============================================================================

function InnerProvider({
  children,
  options,
}: {
  children: ReactNode;
  options: EthereumAuthPluginOptions;
}) {
  const account = useAccount();

  const walletState: EthereumWalletState = {
    address: account.address ?? null,
    chainId: account.chainId ?? null,
    isConnected: account.isConnected,
    isConnecting: account.isConnecting,
  };

  const [signInState, setSignInState] = useState<EthereumSignInState>({
    isSigningIn: false,
    isSignedIn: false,
    user: null,
    error: null,
  });

  // Check for existing token on mount
  useEffect(() => {
    const tokenKey = options.tokenStorageKey || 'threadkit_token';
    const token = localStorage.getItem(tokenKey);
    if (token) {
      // We have a token but no user info - could validate with server
      // For now, just mark as signed in
      setSignInState((s) => ({ ...s, isSignedIn: true }));
    }
  }, [options.tokenStorageKey]);

  const value = useMemo(
    () => ({ options, walletState, signInState, setSignInState }),
    [options, walletState, signInState]
  );

  return (
    <EthereumAuthContext.Provider value={value}>
      {children}
    </EthereumAuthContext.Provider>
  );
}

// ============================================================================
// Factory Function
// ============================================================================

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
};

export function createEthereumAuthPlugin(options: EthereumAuthPluginOptions) {
  // Create the ThreadKit plugin (minimal - just for identification)
  const plugin: ThreadKitPlugin = {
    name: 'ethereum-auth',
  };

  // Create provider based on mode
  let Provider: React.ComponentType<{ children: ReactNode }>;

  if (options.provider.mode === 'standalone') {
    const standaloneConfig = options.provider as StandaloneConfig;
    const chainIds = standaloneConfig.chainIds || [1, 137, 42161, 10, 8453];
    const chains = chainIds
      .map((id) => CHAIN_MAP[id])
      .filter(Boolean) as [Chain, ...Chain[]];

    const connectors = [
      injected(),
      standaloneConfig.walletConnectProjectId
        ? walletConnect({ projectId: standaloneConfig.walletConnectProjectId })
        : null,
      coinbaseWallet({ appName: 'ThreadKit' }),
    ].filter(Boolean) as any[];

    const wagmiConfig = createConfig({
      chains,
      connectors,
      transports: Object.fromEntries(chains.map((chain) => [chain.id, http()])) as Record<number, ReturnType<typeof http>>,
    });

    const queryClient = new QueryClient();

    Provider = function StandaloneProvider({ children }: { children: ReactNode }) {
      return (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <InnerProvider options={options}>{children}</InnerProvider>
          </QueryClientProvider>
        </WagmiProvider>
      );
    };
  } else {
    // External mode - assumes WagmiProvider exists in parent
    Provider = function ExternalProvider({ children }: { children: ReactNode }) {
      return <InnerProvider options={options}>{children}</InnerProvider>;
    };
  }

  return {
    plugin,
    Provider,
    useWallet,
    useSignIn,
    useEthereumAuth,
    ThreadKitEthereumWalletButton,
  };
}

// Re-export ThreadKitPlugin type for convenience
export type { ThreadKitPlugin };

// ============================================================================
// Auth Plugin Integration
// ============================================================================

// Import AuthPlugin type from @threadkit/react
import type { AuthPlugin, AuthPluginRenderProps } from '@threadkit/react';

// Ethereum icon component
function EthereumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 784.37 1277.39" fill="none">
      <polygon fill="#343434" points="392.07,0 383.5,29.11 383.5,873.74 392.07,882.29 784.13,650.54" />
      <polygon fill="#8C8C8C" points="392.07,0 -0,650.54 392.07,882.29 392.07,472.33" />
      <polygon fill="#3C3C3B" points="392.07,956.52 387.24,962.41 387.24,1263.28 392.07,1277.38 784.37,724.89" />
      <polygon fill="#8C8C8C" points="392.07,1277.38 392.07,956.52 -0,724.89" />
      <polygon fill="#141414" points="392.07,882.29 784.13,650.54 392.07,472.33" />
      <polygon fill="#393939" points="0,650.54 392.07,882.29 392.07,472.33" />
    </svg>
  );
}

/**
 * Create an AuthPlugin for use with ThreadKit's auth system.
 *
 * This allows Ethereum authentication to appear in the login modal alongside
 * email, phone, and OAuth options.
 *
 * @example
 * ```tsx
 * import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';
 *
 * const { Provider, authPlugin } = createEthereumAuthPlugin({
 *   provider: { mode: 'standalone' },
 * });
 *
 * <Provider>
 *   <ThreadKit authPlugins={[authPlugin]} ... />
 * </Provider>
 * ```
 */
export function createEthereumAuthPluginForThreadKit(
  options: Omit<EthereumAuthPluginOptions, 'apiUrl' | 'apiKey'>
): { Provider: React.ComponentType<{ children: ReactNode }>; authPlugin: AuthPlugin } {
  const { Provider } = createEthereumAuthPlugin({
    ...options,
    // These will be passed at render time from ThreadKit
    apiUrl: '',
    apiKey: '',
  });

  const authPlugin: AuthPlugin = {
    id: 'ethereum',
    name: 'Ethereum',
    type: 'web3',
    Icon: EthereumIcon,
    render: ({ onSuccess, onError, onCancel, apiUrl, projectId }: AuthPluginRenderProps) => {
      console.log('[EthereumAuthPlugin] render called with:', { apiUrl, projectId });
      // Render a modal/UI for wallet connection
      return (
        <EthereumAuthModal
          apiUrl={apiUrl}
          apiKey={projectId}
          onSuccess={onSuccess}
          onError={onError}
          onCancel={onCancel}
          providerConfig={options.provider}
        />
      );
    },
  };

  return { Provider, authPlugin };
}

// Internal modal component for the auth flow
function EthereumAuthModal({
  apiUrl,
  apiKey,
  onSuccess,
  onError,
  onCancel,
}: {
  apiUrl: string;
  apiKey: string;
  onSuccess: AuthPluginRenderProps['onSuccess'];
  onError: AuthPluginRenderProps['onError'];
  onCancel: AuthPluginRenderProps['onCancel'];
  providerConfig: StandaloneConfig | ExternalConfig;
}) {
  const [step, setStep] = useState<'connect' | 'sign' | 'loading'>('connect');
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useWallet();
  const { signMessageAsync } = useSignMessage();
  const { connect: wagmiConnect, connectors: wagmiConnectors } = useConnect();

  console.log('[EthereumAuthModal] Render:', { step, isConnected, address, connectorCount: wagmiConnectors.length });

  // Auto-advance when connected
  useEffect(() => {
    if (isConnected && address) {
      setStep('sign');
    }
  }, [isConnected, address]);

  const handleSign = useCallback(async () => {
    if (!address) return;

    setStep('loading');
    setError(null);

    try {
      // 1. Get nonce
      const { message } = await fetchNonce(apiUrl, apiKey, address);

      // 2. Sign
      const signature = await signMessageAsync({ message });

      // 3. Verify
      const { token, refresh_token, user } = await verifySignature(
        apiUrl,
        apiKey,
        address,
        message,
        signature
      );

      // 4. Success callback
      onSuccess(token, refresh_token, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        email_verified: user.email_verified,
        phone_verified: false,
        username_set: user.username_set ?? true,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      onError(msg);
      setStep('sign');
    }
  }, [address, apiUrl, apiKey, signMessageAsync, onSuccess, onError]);

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  const handleConnectorClick = useCallback((connectorId: string) => {
    console.log('[EthereumAuthModal] Connector clicked:', connectorId);
    const connector = wagmiConnectors.find(c => c.id === connectorId);
    if (connector) {
      console.log('[EthereumAuthModal] Connecting to:', connector.name);
      wagmiConnect({ connector });
    } else {
      console.error('[EthereumAuthModal] Connector not found:', connectorId);
    }
  }, [wagmiConnectors, wagmiConnect]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return createPortal(
    <div className="threadkit-root threadkit-user-modal-overlay" onClick={onCancel}>
      <div className="threadkit-root tk-auth-web3-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'connect' && (
          <div className="tk-auth-web3-connect">
            <div className="threadkit-avatar-modal-header">
              <h3>Connect your wallet</h3>
              <button
                className="threadkit-avatar-modal-close"
                onClick={onCancel}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="tk-auth-web3-connectors">
              {wagmiConnectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnectorClick(connector.id)}
                  className="tk-auth-method-btn"
                >
                  {connector.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'sign' && (
          <div className="tk-auth-web3-sign">
            <div className="threadkit-avatar-modal-header">
              <h3>Sign message</h3>
              <button
                className="threadkit-avatar-modal-close"
                onClick={onCancel}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="tk-auth-web3-sign-body">
              <p>Connected as {truncatedAddress}</p>
              <p className="tk-auth-subtitle">
                Sign a message to verify ownership of your wallet
              </p>
              {error && <p className="tk-auth-error">{error}</p>}
              <button onClick={handleSign} className="tk-auth-submit-btn">
                Sign to continue
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="tk-auth-loading">
            <p>Verifying signature...</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
