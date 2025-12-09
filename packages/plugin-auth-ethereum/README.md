# @threadkit/plugin-auth-ethereum

Ethereum wallet authentication plugin for ThreadKit. Supports MetaMask, WalletConnect, Coinbase Wallet, and other EVM-compatible wallets.

## Installation

```bash
npm install @threadkit/plugin-auth-ethereum
```

## Usage

### Standalone Mode

For apps without existing web3 integration:

```tsx
import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';

const { plugin, Provider, ThreadKitEthereumWalletButton, useEthereumAuth } = createEthereumAuthPlugin({
  projectId: 'your-threadkit-project-id',
  provider: {
    mode: 'standalone',
    walletConnectProjectId: 'your-walletconnect-project-id', // optional
  },
});

function App() {
  return (
    <Provider>
      <ThreadKitEthereumWalletButton />
      <ThreadKit plugins={[plugin]} />
    </Provider>
  );
}
```

### External Mode

For apps with existing wagmi/viem setup:

```tsx
import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';

const { plugin, Provider, ThreadKitEthereumWalletButton } = createEthereumAuthPlugin({
  projectId: 'your-threadkit-project-id',
  provider: { mode: 'external' },
});

function App() {
  return (
    <YourExistingWagmiProvider>
      <Provider>
        <ThreadKitEthereumWalletButton />
        <ThreadKit plugins={[plugin]} />
      </Provider>
    </YourExistingWagmiProvider>
  );
}
```

## Hooks

### useEthereumAuth

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
} = useEthereumAuth();
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

Full documentation at [usethreadkit.com/docs/packages/plugin-auth-ethereum](https://usethreadkit.com/docs/packages/plugin-auth-ethereum)
