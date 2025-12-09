# ThreadKit Examples

These examples demonstrate ThreadKit integration with various frameworks. All examples use a **mock API** that runs in-memory, so you can try them immediately without setting up a backend server.

## Quick Start

From the monorepo root:

```bash
# Install dependencies
pnpm install

# Run an example
pnpm --filter react-example dev
pnpm --filter svelte-example dev
pnpm --filter vanilla-example dev
```

Or navigate to an example directory:

```bash
cd examples/react
pnpm dev
```

## Available Examples

| Example | Description |
|---------|-------------|
| `react` | Basic React setup |
| `svelte` | Basic Svelte setup |
| `vanilla` | Vanilla JS (no framework) |
| `with-latex` | LaTeX math rendering plugin |
| `with-syntax-highlight` | Code syntax highlighting plugin |
| `with-media-preview` | YouTube/Vimeo/image embeds plugin |
| `with-ethereum` | Ethereum wallet authentication |
| `with-solana` | Solana wallet authentication |
| `kitchen-sink` | All plugins combined |
| `nextjs-ssr` | Next.js with server-side rendering |

## Mock API

All examples (except `nextjs-ssr`) use a shared Vite plugin (`shared/plugin.ts`) that provides a mock API with:

- Pre-populated comments from `shared/data.json`
- Comment posting, voting, and deletion
- No authentication required

This makes it easy to explore ThreadKit features without any backend setup.

## Using with a Real Backend

To connect to a real ThreadKit backend:

1. Remove the `mockApiPlugin()` from `vite.config.ts`
2. Update the `apiUrl` prop to point to your server
3. Add your `projectId` prop

```tsx
<ThreadKit
  siteId="your-site-id"
  url={window.location.pathname}
  apiUrl="https://api.usethreadkit.com"
  projectId="your-project-id"
/>
```
