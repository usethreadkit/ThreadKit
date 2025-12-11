# ThreadKit - Syntax Highlighting

This example demonstrates how to add code syntax highlighting to ThreadKit using the `@threadkit/plugin-syntax-highlight` plugin powered by Shiki.

## What You'll See

- Beautiful syntax highlighting for code blocks
- 100+ languages supported
- Light and dark themes that match your UI
- Line numbers and proper formatting

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
cd examples/with-syntax-highlight
pnpm dev
```

Then open http://localhost:5173

## Usage

Install the plugin:
```bash
npm install @threadkit/react @threadkit/plugin-syntax-highlight
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { createSyntaxHighlightPlugin } from '@threadkit/plugin-syntax-highlight';
import '@threadkit/react/styles';

const syntaxPlugin = createSyntaxHighlightPlugin({
  theme: 'light' // or 'dark'
});

function App() {
  return (
    <ThreadKit
      projectId="your-project-id"
      url={window.location.pathname}
      apiUrl="http://localhost:8080/v1"
      wsUrl="ws://localhost:8081"
      theme="light"
      plugins={[syntaxPlugin]}
    />
  );
}
```

## Examples to Try

Post a comment with a code block using triple backticks:

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

Supported languages include: typescript, javascript, python, rust, go, java, c, cpp, ruby, php, and many more!

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/plugin-syntax-highlight Package](../../packages/plugin-syntax-highlight)
- [Shiki Documentation](https://shiki.style/)
