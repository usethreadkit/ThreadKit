# ThreadKit - Kitchen Sink

This example demonstrates ThreadKit with **all plugins enabled**: syntax highlighting, LaTeX math, media embeds, and web3 wallet authentication.

## What You'll See

- **Syntax highlighting** - Beautiful code blocks with Shiki
- **LaTeX math** - Render mathematical formulas with KaTeX
- **Media embeds** - Automatic YouTube, Vimeo, and image previews
- **Ethereum wallet auth** - Sign in with MetaMask, WalletConnect, Coinbase
- **Solana wallet auth** - Sign in with Phantom, Solflare, Coinbase
- **Chat and thread modes** - Switch between comment threads and live chat
- **Theme switcher** - Light and dark mode

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
cd examples/kitchen-sink
pnpm dev
```

Then open http://localhost:5173

## Usage

Install all plugins:
```bash
npm install @threadkit/react \
  @threadkit/plugin-syntax-highlight \
  @threadkit/plugin-latex \
  @threadkit/plugin-media-preview \
  @threadkit/plugin-auth-ethereum \
  @threadkit/plugin-auth-solana
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { createSyntaxHighlightPlugin } from '@threadkit/plugin-syntax-highlight';
import { createLatexPlugin } from '@threadkit/plugin-latex';
import { createMediaPreviewPlugin } from '@threadkit/plugin-media-preview';
import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';
import '@threadkit/react/styles';

const syntaxPlugin = createSyntaxHighlightPlugin({ theme: 'light' });
const latexPlugin = createLatexPlugin();
const mediaPlugin = createMediaPreviewPlugin();
const { plugin: ethereumPlugin, Provider } = createEthereumAuthPlugin({
  provider: { mode: 'standalone' },
});

function App() {
  return (
    <Provider>
      <ThreadKit
        projectId="your-project-id"
        url={window.location.pathname}
        apiUrl="http://localhost:8080/v1"
        wsUrl="ws://localhost:8081"
        plugins={[syntaxPlugin, latexPlugin, mediaPlugin, ethereumPlugin]}
      />
    </Provider>
  );
}
```

## Things to Try

- **Code blocks**: Use triple backticks with a language name
- **Math**: `$E = mc^2$` for inline, `$$...$$` for display
- **Videos**: Paste a YouTube or Vimeo URL
- **Images**: Paste an image URL
- **Wallet**: Connect your Ethereum or Solana wallet

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [All Plugins](../../packages)
