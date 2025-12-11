# CDN Usage Guide

ThreadKit can be used directly from a CDN with a simple `<script>` tag - no build tools required!

## Quick Start

### React (Standalone - easiest)

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@threadkit/react@latest/dist/cdn/threadkit.min.css">
</head>
<body>
  <div id="comments"></div>

  <script src="https://cdn.jsdelivr.net/npm/@threadkit/react@latest/dist/cdn/threadkit.min.js"></script>
  <script>
    // ThreadKit.Comments is now available globally
    const container = document.getElementById('comments');
    ThreadKit.render(container, {
      apiUrl: 'https://your-api.com',
      apiKey: 'your-public-key',
      pageUrl: window.location.href
    });
  </script>
</body>
</html>
```

**Size:** 110KB gzipped (includes React)

### React (with external React - smaller)

If you already have React on your page:

```html
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/@threadkit/react@latest/dist/cdn/threadkit.nonbundled-react.min.js"></script>
```

**Size:** 52KB gzipped (React external)

### Svelte (Standalone)

```html
<script src="https://cdn.jsdelivr.net/npm/@threadkit/svelte@latest/dist/cdn/threadkit.min.js"></script>
```

**Size:** 42KB gzipped (includes Svelte)

### Svelte (with external Svelte)

```html
<script src="https://unpkg.com/svelte@5/svelte.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@threadkit/svelte@latest/dist/cdn/threadkit.nonbundled-svelte.min.js"></script>
```

**Size:** 22KB gzipped (external Svelte)

### Core (Framework-agnostic)

```html
<script src="https://cdn.jsdelivr.net/npm/@threadkit/core@latest/dist/cdn/threadkit.min.js"></script>
<script>
  // ThreadKitCore is now available globally
  const store = new ThreadKitCore.CommentStore(config);
</script>
```

**Size:** 11KB gzipped

## CDN Bundle Structure

Each package provides CDN bundles in a consistent format:

```
packages/
├── react/dist/cdn/
│   ├── threadkit.min.js                    # Standalone (React bundled)
│   └── threadkit.nonbundled-react.min.js   # External React
├── svelte/dist/cdn/
│   ├── threadkit.min.js                    # Standalone (Svelte bundled)
│   └── threadkit.nonbundled-svelte.min.js  # External Svelte
└── core/dist/cdn/
    └── threadkit.min.js                    # Framework-agnostic
```

## Building CDN Bundles

To build the CDN bundles yourself:

```bash
# Build all CDN bundles
pnpm --filter @threadkit/react build:cdn
pnpm --filter @threadkit/svelte build:cdn
pnpm --filter @threadkit/core build:cdn

# Or build a specific package
cd packages/react
pnpm build:cdn
```

## Bundle Sizes

| Package | Standalone | External Framework |
|---------|------------|-------------------|
| **React** | 110KB gzipped | 52KB gzipped |
| **Svelte** | 42KB gzipped | 22KB gzipped |
| **Core** | 11KB gzipped | N/A |

## npm Usage

For npm users, ThreadKit still ships as tree-shakeable ESM modules:

```bash
npm install @threadkit/react
# or
npm install @threadkit/svelte
```

The CDN bundles are just an additional option for those who prefer simple script tags.

## CDN Providers

ThreadKit CDN bundles are available on:

- **jsDelivr**: `https://cdn.jsdelivr.net/npm/@threadkit/react@latest/dist/cdn/threadkit.min.js`
- **unpkg**: `https://unpkg.com/@threadkit/react@latest/dist/cdn/threadkit.min.js`

## Comparison to Competitors

ThreadKit's CDN bundles are significantly smaller than alternatives:

| System | Size | Requests |
|--------|------|----------|
| **ThreadKit** | 110KB | 1 |
| Isso | 123KB | 12 |
| Remark42 | 404KB | 11 |
| Comentario | 583KB | 13 |
| Disqus | 3,305KB | 33 |

See [bench/RESULTS.md](./bench/RESULTS.md) for full benchmark results.
