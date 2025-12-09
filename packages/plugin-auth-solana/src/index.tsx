import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
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
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
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
