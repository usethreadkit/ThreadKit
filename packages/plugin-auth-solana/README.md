# @threadkit/plugin-auth-solana

Solana wallet authentication plugin for ThreadKit. Supports Phantom, Solflare, Coinbase Wallet, and other Solana wallets.

## Installation

```bash
npm install @threadkit/plugin-auth-solana
```

## Usage

### Standalone Mode

For apps without existing Solana wallet adapter:

```tsx
import { createSolanaAuthPlugin } from '@threadkit/plugin-auth-solana';

const { plugin, Provider, ThreadKitSolanaWalletButton, useSolanaAuth } = createSolanaAuthPlugin({
  projectId: 'your-threadkit-project-id',
  provider: {
    mode: 'standalone',
    network: 'mainnet-beta', // 'mainnet-beta' | 'testnet' | 'devnet'
  },
});

function App() {
  return (
    <Provider>
      <ThreadKitSolanaWalletButton />
      <ThreadKit plugins={[plugin]} />
    </Provider>
  );
}
```

### External Mode

For apps with existing Solana wallet adapter setup:

```tsx
import { createSolanaAuthPlugin } from '@threadkit/plugin-auth-solana';

const { plugin, Provider, ThreadKitSolanaWalletButton } = createSolanaAuthPlugin({
  projectId: 'your-threadkit-project-id',
  provider: { mode: 'external' },
});

function App() {
  return (
    <YourExistingSolanaProvider>
      <Provider>
        <ThreadKitSolanaWalletButton />
        <ThreadKit plugins={[plugin]} />
      </Provider>
    </YourExistingSolanaProvider>
  );
}
```

## Hooks

### useSolanaAuth

Combined hook for wallet connection and sign-in:

```tsx
const {
  address,
  isConnected,
  isConnecting,
  connect,
  disconnect,
  isSignedIn,
  isSigningIn,
  user,
  signIn,
  signOut,
} = useSolanaAuth();
```

### useWallet

Wallet connection only:

```tsx
const { address, isConnected, isConnecting, connect, disconnect } = useWallet();
```

### useSignIn

Sign-in flow only:

```tsx
const { isSignedIn, isSigningIn, user, signIn, signOut } = useSignIn();
```

## Documentation

Full documentation at [usethreadkit.com/docs/packages/plugin-auth-solana](https://usethreadkit.com/docs/packages/plugin-auth-solana)
