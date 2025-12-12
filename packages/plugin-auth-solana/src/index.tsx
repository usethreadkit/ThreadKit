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
  ConnectionProvider,
  WalletProvider,
  useWallet as useSolanaWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import type { ThreadKitPlugin } from '@threadkit/react';

// ============================================================================
// Types
// ============================================================================

export type SolanaAuthMode = 'standalone' | 'external';
export type SolanaNetwork = 'mainnet-beta' | 'testnet' | 'devnet';

export interface StandaloneConfig {
  mode: 'standalone';
  /** Solana network (default: mainnet-beta) */
  network?: SolanaNetwork;
  /** Custom RPC endpoint */
  rpcEndpoint?: string;
}

export interface ExternalConfig {
  mode: 'external';
  /** Uses existing Solana wallet adapter context from parent app */
}

export interface SolanaAuthPluginOptions {
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

export interface SolanaWalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
}

export interface SolanaSignInState {
  isSigningIn: boolean;
  isSignedIn: boolean;
  user: User | null;
  error: Error | null;
}

export interface UseWalletReturn extends SolanaWalletState {
  connect: () => void;
  disconnect: () => void;
  wallets: { name: string; icon: string }[];
}

export interface UseSignInReturn extends SolanaSignInState {
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

interface SolanaAuthContextValue {
  options: SolanaAuthPluginOptions;
  walletState: SolanaWalletState;
  signInState: SolanaSignInState;
  setSignInState: React.Dispatch<React.SetStateAction<SolanaSignInState>>;
}

const SolanaAuthContext = createContext<SolanaAuthContextValue | null>(null);

function useSolanaAuthContext() {
  const ctx = useContext(SolanaAuthContext);
  if (!ctx) {
    throw new Error('useSolanaAuth must be used within SolanaAuthProvider');
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
    `${apiUrl}/auth/solana/nonce?address=${encodeURIComponent(address)}`,
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
  const res = await fetch(`${apiUrl}/auth/solana/verify`, {
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
  const { walletState } = useSolanaAuthContext();
  const { wallets, select, disconnect: solanaDisconnect } = useSolanaWallet();

  const connect = useCallback(() => {
    // Connect with first available wallet (usually Phantom)
    const wallet = wallets[0];
    if (wallet) {
      select(wallet.adapter.name);
    }
  }, [wallets, select]);

  const disconnect = useCallback(() => {
    solanaDisconnect();
  }, [solanaDisconnect]);

  return {
    ...walletState,
    connect,
    disconnect,
    wallets: wallets.map((w) => ({ name: w.adapter.name, icon: w.adapter.icon })),
  };
}

export function useSignIn(): UseSignInReturn {
  const { options, signInState, setSignInState } = useSolanaAuthContext();
  const { publicKey, signMessage } = useSolanaWallet();

  const apiUrl = options.apiUrl || 'https://api.usethreadkit.com';
  const apiKey = options.apiKey || '';
  const tokenKey = options.tokenStorageKey || 'threadkit_token';

  const signIn = useCallback(async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }
    if (!signMessage) {
      throw new Error('Wallet does not support message signing');
    }

    const address = publicKey.toBase58();
    setSignInState((s) => ({ ...s, isSigningIn: true, error: null }));

    try {
      // 1. Get nonce from server
      const { message } = await fetchNonce(apiUrl, apiKey, address);

      // 2. Sign the message
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);

      // Convert signature to base58
      const signature = encodeBase58(signatureBytes);

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
  }, [publicKey, signMessage, apiUrl, apiKey, tokenKey, options, setSignInState]);

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

export function useSolanaAuth(): UseWalletReturn & UseSignInReturn {
  const wallet = useWallet();
  const signIn = useSignIn();
  return { ...wallet, ...signIn };
}

// ============================================================================
// Base58 Encoding
// ============================================================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function encodeBase58(bytes: Uint8Array): string {
  const digits: number[] = [0];

  for (const byte of bytes) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }

  // Handle leading zeros
  let str = '';
  for (let i = 0; bytes[i] === 0 && i < bytes.length - 1; i++) {
    str += BASE58_ALPHABET[0];
  }

  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }

  return str;
}

// ============================================================================
// Components
// ============================================================================

export function ThreadKitSolanaWalletButton({
  connectLabel = 'Connect Wallet',
  signingInLabel = 'Signing in...',
  className,
  style,
}: WalletButtonProps) {
  const { address, isConnected, isConnecting, connect } = useWallet();
  const { isSigningIn, isSignedIn, user, signIn, signOut } = useSignIn();

  const truncatedAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
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
  options: SolanaAuthPluginOptions;
}) {
  const { publicKey, connecting, connected } = useSolanaWallet();

  const walletState: SolanaWalletState = {
    address: publicKey?.toBase58() ?? null,
    isConnected: connected,
    isConnecting: connecting,
  };

  const [signInState, setSignInState] = useState<SolanaSignInState>({
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
      setSignInState((s) => ({ ...s, isSignedIn: true }));
    }
  }, [options.tokenStorageKey]);

  const value = useMemo(
    () => ({ options, walletState, signInState, setSignInState }),
    [options, walletState, signInState]
  );

  return (
    <SolanaAuthContext.Provider value={value}>
      {children}
    </SolanaAuthContext.Provider>
  );
}

// ============================================================================
// Factory Function
// ============================================================================

const NETWORK_MAP: Record<SolanaNetwork, WalletAdapterNetwork> = {
  'mainnet-beta': WalletAdapterNetwork.Mainnet,
  'testnet': WalletAdapterNetwork.Testnet,
  'devnet': WalletAdapterNetwork.Devnet,
};

export function createSolanaAuthPlugin(options: SolanaAuthPluginOptions) {
  // Create the ThreadKit plugin (minimal - just for identification)
  const plugin: ThreadKitPlugin = {
    name: 'solana-auth',
  };

  // Create provider based on mode
  let Provider: React.ComponentType<{ children: ReactNode }>;

  if (options.provider.mode === 'standalone') {
    const standaloneConfig = options.provider as StandaloneConfig;
    const network = standaloneConfig.network || 'mainnet-beta';
    const endpoint = standaloneConfig.rpcEndpoint || clusterApiUrl(NETWORK_MAP[network]);

    const wallets = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
    ];

    Provider = function StandaloneProvider({ children }: { children: ReactNode }) {
      return (
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider wallets={wallets} autoConnect>
            <InnerProvider options={options}>{children}</InnerProvider>
          </WalletProvider>
        </ConnectionProvider>
      );
    };
  } else {
    // External mode - assumes Solana wallet adapter context exists in parent
    Provider = function ExternalProvider({ children }: { children: ReactNode }) {
      return <InnerProvider options={options}>{children}</InnerProvider>;
    };
  }

  return {
    plugin,
    Provider,
    useWallet,
    useSignIn,
    useSolanaAuth,
    ThreadKitSolanaWalletButton,
  };
}

// Re-export ThreadKitPlugin type for convenience
export type { ThreadKitPlugin };

// ============================================================================
// Auth Plugin Integration
// ============================================================================

// Import AuthPlugin type from @threadkit/react
import type { AuthPlugin, AuthPluginRenderProps } from '@threadkit/react';

// Solana icon component
function SolanaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 397.7 311.7" fill="none">
      <defs>
        <linearGradient id="solana-gradient" x1="360.879%" y1="351.582%" x2="-101.077%" y2="-101.077%">
          <stop offset="0%" stopColor="#00FFA3" />
          <stop offset="100%" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z" fill="url(#solana-gradient)"/>
      <path d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z" fill="url(#solana-gradient)"/>
      <path d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z" fill="url(#solana-gradient)"/>
    </svg>
  );
}

/**
 * Create an AuthPlugin for use with ThreadKit's auth system.
 *
 * This allows Solana authentication to appear in the login modal alongside
 * email, phone, and OAuth options.
 *
 * @example
 * ```tsx
 * import { createSolanaAuthPlugin } from '@threadkit/plugin-auth-solana';
 *
 * const { Provider, authPlugin } = createSolanaAuthPlugin({
 *   provider: { mode: 'standalone' },
 * });
 *
 * <Provider>
 *   <ThreadKit authPlugins={[authPlugin]} ... />
 * </Provider>
 * ```
 */
export function createSolanaAuthPluginForThreadKit(
  options: Omit<SolanaAuthPluginOptions, 'apiUrl' | 'apiKey'>
): { Provider: React.ComponentType<{ children: ReactNode }>; authPlugin: AuthPlugin } {
  const { Provider } = createSolanaAuthPlugin({
    ...options,
    // These will be passed at render time from ThreadKit
    apiUrl: '',
    apiKey: '',
  });

  const authPlugin: AuthPlugin = {
    id: 'solana',
    name: 'Solana',
    type: 'web3',
    Icon: SolanaIcon,
    render: ({ onSuccess, onError, onCancel, apiUrl, projectId }: AuthPluginRenderProps) => {
      console.log('[SolanaAuthPlugin] render called with:', { apiUrl, projectId });
      // Render a modal/UI for wallet connection
      return (
        <SolanaAuthModal
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
function SolanaAuthModal({
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
  const { address, isConnected } = useWallet();
  const { signMessage, wallets: allWallets, select, disconnect, connect, connected, publicKey, wallet } = useSolanaWallet();
  const { connection } = useConnection();

  // Initialize step based on connection state
  const [step, setStep] = useState<'connect' | 'sign' | 'loading'>(() => {
    return connected && publicKey ? 'sign' : 'connect';
  });
  const [error, setError] = useState<string | null>(null);

  // Filter to only Solana-native wallets and deduplicate
  const SOLANA_NATIVE_WALLETS = ['phantom', 'solflare', 'backpack', 'glow', 'slope', 'sollet', 'torus', 'coinbase'];
  const seenNames = new Set<string>();
  const wallets = allWallets.filter((w) => {
    const lowerName = w.adapter.name.toLowerCase();
    // Skip if already seen (deduplicate)
    if (seenNames.has(lowerName)) return false;
    // Skip non-Solana-native wallets (MetaMask, Brave show up but don't work well for Solana)
    const isSolanaNative = SOLANA_NATIVE_WALLETS.some(name => lowerName.includes(name));
    if (!isSolanaNative) return false;
    seenNames.add(lowerName);
    return true;
  });

  console.log('[SolanaAuthModal] Render:', { step, isConnected, address, connected, publicKey: publicKey?.toBase58(), walletCount: wallets.length });

  // Auto-advance when connected
  useEffect(() => {
    if (connected && publicKey) {
      setStep('sign');
    } else if (!connected && !publicKey) {
      setStep('connect');
    }
  }, [connected, publicKey]);

  const handleSign = useCallback(async () => {
    const addr = publicKey?.toBase58();
    if (!addr || !signMessage) return;

    setStep('loading');
    setError(null);

    try {
      // 1. Get nonce
      const nonceRes = await fetch(
        `${apiUrl}/auth/solana/nonce?address=${encodeURIComponent(addr)}`,
        {
          headers: { 'projectid': apiKey },
        }
      );
      if (!nonceRes.ok) throw new Error('Failed to get nonce');
      const { message } = await nonceRes.json();

      // 2. Sign
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      // 3. Verify
      const verifyRes = await fetch(`${apiUrl}/auth/solana/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'projectid': apiKey,
        },
        body: JSON.stringify({
          address: addr,
          message,
          signature: Array.from(signature),
        }),
      });
      if (!verifyRes.ok) throw new Error('Signature verification failed');
      const { token, refresh_token, user } = await verifyRes.json();

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
  }, [publicKey, signMessage, apiUrl, apiKey, onSuccess, onError]);

  const walletAddress = publicKey?.toBase58() || address || '';
  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : '';

  const handleWalletClick = useCallback(async (walletName: string) => {
    console.log('[SolanaAuthModal] Wallet clicked:', walletName);
    select(walletName as any);

    // Need to manually trigger connect after select
    // The wallet adapter doesn't auto-connect on select
    try {
      await connect();
    } catch (err) {
      // Error is expected if wallet popup is closed or already connecting
      console.log('[SolanaAuthModal] Connect after select:', err);
    }
  }, [select, connect]);

  const handleDisconnect = useCallback(async () => {
    console.log('[SolanaAuthModal] Disconnect clicked, wallet:', wallet?.adapter.name, 'connected:', connected);
    try {
      // Try to disconnect via the wallet adapter
      if (wallet?.adapter) {
        await wallet.adapter.disconnect();
      }
      await disconnect();
    } catch (err) {
      console.error('[SolanaAuthModal] Disconnect error:', err);
    }
    // Force step back to connect regardless
    setStep('connect');
    setError(null);
  }, [disconnect, wallet]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const getWalletIcon = (walletName: string) => {
    const lowerName = walletName.toLowerCase();
    // Brave Wallet
    if (lowerName.includes('brave')) {
      return (
        <svg className="tk-auth-method-icon" viewBox="0 0 64 64">
          <defs><linearGradient id="brave-grad-sol" x1="-.031" y1="44.365" x2="26.596" y2="44.365" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f1562b"/><stop offset=".3" stopColor="#f1542b"/><stop offset=".41" stopColor="#f04d2a"/><stop offset=".49" stopColor="#ef4229"/><stop offset=".5" stopColor="#ef4029"/><stop offset=".56" stopColor="#e83e28"/><stop offset=".67" stopColor="#e13c26"/><stop offset="1" stopColor="#df3c26"/></linearGradient></defs>
          <path d="M26.605 38.85l-.964-2.617.67-1.502c.086-.194.044-.42-.105-.572l-1.822-1.842a2.94 2.94 0 0 0-3.066-.712l-.5.177-2.783-3.016-4.752-.026-4.752.037-2.78 3.04-.495-.175a2.95 2.95 0 0 0-3.086.718L.304 34.237a.41.41 0 0 0-.083.456l.7 1.56-.96 2.615 3.447 13.107c.326 1.238 1.075 2.323 2.118 3.066l6.817 4.62a1.51 1.51 0 0 0 1.886 0l6.813-4.627c1.042-.743 1.8-1.828 2.115-3.066l2.812-10.752z" fill="url(#brave-grad-sol)" transform="matrix(2.048177 0 0 2.048177 4.795481 -58.865395)"/>
          <path d="M33.595 39.673a8.26 8.26 0 0 0-1.139-.413h-.686a8.26 8.26 0 0 0-1.139.413l-1.727.718-1.95.897-3.176 1.655c-.235.076-.4.288-.417.535s.118.48.34.586L26.458 46a21.86 21.86 0 0 1 1.695 1.346l.776.668 1.624 1.422.736.65a1.27 1.27 0 0 0 1.62 0l3.174-2.773 1.7-1.346 2.758-1.974a.6.6 0 0 0-.085-1.117l-3.17-1.6-1.96-.897zm19.555-17.77l.1-.287a7.73 7.73 0 0 0-.072-1.148c-.267-.68-.6-1.326-1.023-1.93l-1.794-2.633-1.278-1.736-2.404-3c-.22-.293-.458-.572-.713-.834h-.05l-1.068.197-5.284 1.018c-.535.025-1.07-.053-1.574-.23l-2.902-.937-2.077-.574a8.68 8.68 0 0 0-1.834 0l-2.077.58-2.902.942a4.21 4.21 0 0 1-1.574.23l-5.278-1-1.068-.197h-.05c-.256.262-.494.54-.713.834l-2.4 3a29.33 29.33 0 0 0-1.278 1.736l-1.794 2.633-.848 1.413c-.154.543-.235 1.104-.242 1.67l.1.287c.043.184.1.366.166.543l1.417 1.628 6.28 6.674a1.79 1.79 0 0 1 .318 1.794L18.178 35a3.16 3.16 0 0 0-.049 2.005l.206.565a5.45 5.45 0 0 0 1.673 2.346l.987.803c.52.376 1.2.457 1.794.215l3.508-1.673a8.79 8.79 0 0 0 1.794-1.19l2.808-2.534a1.12 1.12 0 0 0 .37-.795 1.13 1.13 0 0 0-.312-.82l-6.338-4.27a1.23 1.23 0 0 1-.386-1.556l2.458-4.62a2.4 2.4 0 0 0 .121-1.834 2.8 2.8 0 0 0-1.395-1.265l-7.706-2.9c-.556-.2-.525-.45.063-.484l4.526-.45a7.02 7.02 0 0 1 2.113.188l3.938 1.1c.578.174.94.75.843 1.346l-1.547 8.45a4.37 4.37 0 0 0-.076 1.426c.063.202.592.45 1.17.592l2.4.5a5.83 5.83 0 0 0 2.108 0l2.157-.5c.58-.13 1.103-.404 1.17-.606a4.38 4.38 0 0 0-.08-1.426l-1.556-8.45a1.21 1.21 0 0 1 .843-1.346l3.938-1.103a6.98 6.98 0 0 1 2.113-.188l4.526.422c.592.054.62.274.067.484l-7.7 2.92a2.76 2.76 0 0 0-1.395 1.265 2.41 2.41 0 0 0 .12 1.834l2.462 4.62a1.23 1.23 0 0 1-.386 1.556l-6.333 4.28a1.13 1.13 0 0 0 .058 1.615l2.812 2.534a8.89 8.89 0 0 0 1.794 1.184l3.508 1.67c.596.24 1.274.158 1.794-.22l.987-.807a5.44 5.44 0 0 0 1.673-2.35l.206-.565a3.16 3.16 0 0 0-.049-2.005l-1.032-2.436a1.8 1.8 0 0 1 .318-1.794l6.28-6.683 1.413-1.628a4.36 4.36 0 0 0 .193-.53z" fill="#fff"/>
        </svg>
      );
    }
    // MetaMask
    if (lowerName.includes('metamask')) {
      return (
        <svg className="tk-auth-method-icon" viewBox="0 0 256 240">
          <path fill="#e17726" d="M250.066 0L140.219 81.279l20.427-47.9z"/>
          <path fill="#e27625" d="m6.191.096l89.181 33.289l19.396 48.528zM205.86 172.858l48.551.924l-16.968 57.642l-59.243-16.311zm-155.721 0l27.557 42.255l-59.143 16.312l-16.865-57.643z"/>
          <path fill="#e27625" d="m112.131 69.552l1.984 64.083l-59.371-2.701l16.888-25.478l.214-.245zm31.123-.715l40.9 36.376l.212.244l16.888 25.478l-59.358 2.7zM79.435 173.044l32.418 25.259l-37.658 18.181zm97.136-.004l5.131 43.445l-37.553-18.184z"/>
          <path fill="#d5bfb2" d="m144.978 195.922l38.107 18.452l-35.447 16.846l.368-11.134zm-33.967.008l-2.909 23.974l.239 11.303l-35.53-16.833z"/>
          <path fill="#233447" d="m100.007 141.999l9.958 20.928l-33.903-9.932zm55.985.002l24.058 10.994l-34.014 9.929z"/>
          <path fill="#cc6228" d="m82.026 172.83l-5.48 45.04l-29.373-44.055zm91.95.001l34.854.984l-29.483 44.057zm28.136-44.444l-25.365 25.851l-19.557-8.937l-9.363 19.684l-6.138-33.849zm-148.237 0l60.435 2.749l-6.139 33.849l-9.365-19.681l-19.453 8.935z"/>
          <path fill="#e27525" d="m52.166 123.082l28.698 29.121l.994 28.749zm151.697-.052l-29.746 57.973l1.12-28.8zm-90.956 1.826l1.155 7.27l2.854 18.111l-1.835 55.625l-8.675-44.685l-.003-.462zm30.171-.101l6.521 35.96l-.003.462l-8.697 44.797l-.344-11.205l-1.357-44.862z"/>
          <path fill="#f5841f" d="m177.788 151.046l-.971 24.978l-30.274 23.587l-6.12-4.324l6.86-35.335zm-99.471 0l30.399 8.906l6.86 35.335l-6.12 4.324l-30.275-23.589z"/>
          <path fill="#c0ac9d" d="m67.018 208.858l38.732 18.352l-.164-7.837l3.241-2.845h38.334l3.358 2.835l-.248 7.831l38.487-18.29l-18.728 15.476l-22.645 15.553h-38.869l-22.63-15.617z"/>
          <path fill="#161616" d="m142.204 193.479l5.476 3.869l3.209 25.604l-4.644-3.921h-36.476l-4.556 4l3.104-25.681l5.478-3.871z"/>
          <path fill="#763e1a" d="M242.814 2.25L256 41.807l-8.235 39.997l5.864 4.523l-7.935 6.054l5.964 4.606l-7.897 7.191l4.848 3.511l-12.866 15.026l-52.77-15.365l-.457-.245l-38.027-32.078zm-229.628 0l98.326 72.777l-38.028 32.078l-.457.245l-52.77 15.365l-12.866-15.026l4.844-3.508l-7.892-7.194l5.952-4.601l-8.054-6.071l6.085-4.526L0 41.809z"/>
          <path fill="#f5841f" d="m180.392 103.99l55.913 16.279l18.165 55.986h-47.924l-33.02.416l24.014-46.808zm-104.784 0l-17.151 25.873l24.017 46.808l-33.005-.416H1.631l18.063-55.985zm87.776-70.878l-15.639 42.239l-3.319 57.06l-1.27 17.885l-.101 45.688h-30.111l-.098-45.602l-1.274-17.986l-3.32-57.045l-15.637-42.239z"/>
        </svg>
      );
    }
    // Phantom
    if (lowerName.includes('phantom')) {
      return (
        <svg className="tk-auth-method-icon" viewBox="0 0 128 128" fill="none">
          <rect width="128" height="128" rx="26" fill="#AB9FF2"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M55.6416 82.1477C50.8744 89.4525 42.8862 98.6966 32.2568 98.6966C27.232 98.6966 22.4004 96.628 22.4004 87.6424C22.4004 64.7584 53.6445 29.3335 82.6339 29.3335C99.1257 29.3335 105.697 40.7755 105.697 53.7689C105.697 70.4471 94.8739 89.5171 84.1156 89.5171C80.7013 89.5171 79.0264 87.6424 79.0264 84.6688C79.0264 83.8931 79.1552 83.0527 79.4129 82.1477C75.7409 88.4182 68.6546 94.2361 62.0192 94.2361C57.1877 94.2361 54.7397 91.1979 54.7397 86.9314C54.7397 85.3799 55.0618 83.7638 55.6416 82.1477ZM80.6133 53.3182C80.6133 57.1044 78.3795 58.9975 75.8806 58.9975C73.3438 58.9975 71.1479 57.1044 71.1479 53.3182C71.1479 49.532 73.3438 47.6389 75.8806 47.6389C78.3795 47.6389 80.6133 49.532 80.6133 53.3182ZM94.8102 53.3184C94.8102 57.1046 92.5763 58.9977 90.0775 58.9977C87.5407 58.9977 85.3447 57.1046 85.3447 53.3184C85.3447 49.5323 87.5407 47.6392 90.0775 47.6392C92.5763 47.6392 94.8102 49.5323 94.8102 53.3184Z" fill="#FFFDF8"/>
        </svg>
      );
    }
    // Solflare
    if (lowerName.includes('solflare')) {
      return (
        <svg className="tk-auth-method-icon" viewBox="0 0 290 290" fill="none">
          <path d="M63.2951 1H226.705C261.11 1 289 28.8905 289 63.2951V226.705C289 261.11 261.11 289 226.705 289H63.2951C28.8905 289 1 261.11 1 226.705V63.2951C1 28.8905 28.8905 1 63.2951 1Z" fill="#FFEF46" stroke="#EEDA0F" strokeWidth="2"/>
          <path d="M140.548 153.231L154.832 139.432L181.462 148.147C198.893 153.958 207.609 164.61 207.609 179.62C207.609 190.999 203.251 198.504 194.536 208.188L191.873 211.093L192.841 204.314C196.714 179.62 189.452 168.968 165.484 161.22L140.548 153.231ZM104.717 68.739L177.347 92.9488L161.61 107.959L123.843 95.3698C110.77 91.012 106.412 83.9911 104.717 69.2232V68.739ZM100.359 191.725L116.822 175.988L147.811 186.157C164.031 191.483 169.599 198.504 167.905 216.177L100.359 191.725ZM79.539 121.516C79.539 116.917 81.9599 112.559 86.0756 108.927C90.4334 115.222 97.9384 120.79 109.801 124.664L135.464 133.137L121.18 146.937L96.0016 138.705C84.3809 134.832 79.539 129.021 79.539 121.516ZM155.558 248.618C208.819 213.272 237.387 189.304 237.387 159.768C237.387 140.158 225.766 129.263 200.104 120.79L180.736 114.253L233.756 63.4128L223.103 52.0342L207.367 65.8337L133.043 41.3818C110.043 48.8869 80.9916 70.9178 80.9916 92.9487C80.9916 95.3697 81.2337 97.7907 81.96 100.454C62.8342 111.348 55.0871 121.516 55.0871 134.105C55.0871 145.968 61.3816 157.831 81.4758 164.368L97.4542 169.694L42.2559 222.713L52.9082 234.092L70.0972 218.356L155.558 248.618Z" fill="#02050A"/>
        </svg>
      );
    }
    // Coinbase
    if (lowerName.includes('coinbase')) {
      return (
        <svg className="tk-auth-method-icon" viewBox="0 0 1024 1024">
          <circle cx="512" cy="512" r="512" fill="#0052ff"/>
          <path d="M516.3 361.83c60.28 0 108.1 37.18 126.26 92.47H764C742 336.09 644.47 256 517.27 256 372.82 256 260 365.65 260 512.49S370 768 517.27 768c124.35 0 223.82-80.09 245.84-199.28H642.55c-17.22 55.3-65 93.45-125.32 93.45-83.23 0-141.56-63.89-141.56-149.68.04-86.77 57.43-150.66 140.63-150.66z" fill="#fff"/>
        </svg>
      );
    }
    // Generic Solana wallet
    return (
      <svg className="tk-auth-method-icon" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="sol-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9945FF"/>
            <stop offset="50%" stopColor="#14F195"/>
            <stop offset="100%" stopColor="#00D1FF"/>
          </linearGradient>
        </defs>
        <path d="M5.5 16.5l2-2h11l-2 2H5.5zm0-4.5l2-2h11l-2 2H5.5zm13-4.5l-2 2h-11l2-2h11z" stroke="url(#sol-grad)" strokeWidth="1.5" fill="none"/>
      </svg>
    );
  };

  const title = step === 'connect' ? 'Connect Wallet' : step === 'sign' ? 'Sign Message' : 'Verifying';

  return createPortal(
    <div className="tk-auth-overlay" onClick={onCancel}>
      <div className="tk-auth-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="tk-auth-header">
          <h3 className="tk-auth-header-title">{title}</h3>
          <button className="tk-auth-close-btn" onClick={onCancel} aria-label="Close">
            <svg className="tk-auth-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="tk-auth-content">
          {step === 'connect' && (
            <div className="tk-auth-method-list">
              {wallets.map((w, index) => (
                <button
                  key={`${w.adapter.name}-${index}`}
                  onClick={() => handleWalletClick(w.adapter.name)}
                  className="tk-auth-method-btn"
                >
                  {getWalletIcon(w.adapter.name)}
                  <span>{w.adapter.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'sign' && (
            <div>
              <div className="tk-auth-wallet-row">
                <span className="tk-auth-wallet-address">{truncatedAddress}</span>
                <button className="tk-auth-disconnect-btn" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
              {error && <p className="tk-auth-error">{error}</p>}
              <button onClick={handleSign} className="tk-auth-submit-btn">
                Sign
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="tk-auth-loading">
              <svg className="tk-auth-spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M8.76 15.24l-2.83 2.83m11.31 0l-2.83-2.83M8.76 8.76L5.93 5.93"/>
              </svg>
              <span>Verifying...</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
