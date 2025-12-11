# ThreadKit - Solana Wallet Authentication

This example demonstrates how to add Solana wallet authentication to ThreadKit using the `@threadkit/plugin-auth-solana` plugin.

## What You'll See

- Connect with Phantom, Solflare, or Coinbase Wallet
- Sign-in-with-Solana (SIWS) authentication
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
cd examples/with-solana
pnpm dev
```

Then open http://localhost:5173

## Usage

Install the plugin:
```bash
npm install @threadkit/react @threadkit/plugin-auth-solana
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { createSolanaAuthPlugin } from '@threadkit/plugin-auth-solana';
import '@threadkit/react/styles';

const { plugin, Provider, ThreadKitSolanaWalletButton } =
  createSolanaAuthPlugin({
    provider: {
      mode: 'standalone',
      network: 'mainnet-beta', // or 'devnet', 'testnet'
    },
  });

function App() {
  return (
    <Provider>
      <ThreadKitSolanaWalletButton />
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

1. Click "Connect Wallet" to connect your Solana wallet
2. Sign a message to authenticate with ThreadKit
3. Your wallet address becomes your identity for commenting
4. Comments are associated with your Solana address

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/plugin-auth-solana Package](../../packages/plugin-auth-solana)
- [Solana Wallet Adapter](https://github.com/anza-xyz/wallet-adapter)
