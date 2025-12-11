# ThreadKit - Ethereum Wallet Authentication

This example demonstrates how to add Ethereum wallet authentication to ThreadKit using the `@threadkit/plugin-auth-ethereum` plugin.

## What You'll See

- Connect with MetaMask, WalletConnect, or Coinbase Wallet
- Sign-in-with-Ethereum (SIWE) authentication
- Wallet address as user identity
- Real-time connection status

## Setup

### 1. Start Redis
```bash
redis-server
```

### 2. Create Site (first time only)
```bash
cargo run --release --bin threadkit-http -- \
  --create-site "My Site" example.com \
  --enable-auth email,google,github,anonymous,ethereum,solana
```

### 3. Start the Server
```bash
cd server && cargo run --release --bin threadkit-http
```

### 4. Run the Example
```bash
cd examples/with-ethereum
pnpm dev
```

Then open http://localhost:5173

## Usage

Install the plugin:
```bash
npm install @threadkit/react @threadkit/plugin-auth-ethereum
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';
import '@threadkit/react/styles';

const { plugin, Provider, ThreadKitEthereumWalletButton } =
  createEthereumAuthPlugin({
    provider: {
      mode: 'standalone',
      // Optional: Add WalletConnect support
      // walletConnectProjectId: 'your-project-id',
    },
  });

function App() {
  return (
    <Provider>
      <ThreadKitEthereumWalletButton />
      <ThreadKit
        projectId="your-project-id"
        url={window.location.pathname}
        apiUrl="http://localhost:8080/v1"
        wsUrl="ws://localhost:8081"
        plugins={[plugin]}
      />
    </Provider>
  );
}
```

## How It Works

1. Click "Connect Wallet" to connect your Ethereum wallet
2. Sign a message to authenticate with ThreadKit
3. Your wallet address becomes your identity for commenting
4. Comments are associated with your Ethereum address

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/plugin-auth-ethereum Package](../../packages/plugin-auth-ethereum)
- [Sign-In with Ethereum](https://login.xyz/)
