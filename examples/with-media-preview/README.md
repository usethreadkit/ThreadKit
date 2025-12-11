# ThreadKit - Media Preview

This example demonstrates how to add automatic media embeds to ThreadKit using the `@threadkit/plugin-media-preview` plugin.

## What You'll See

- YouTube video embeds
- Vimeo video embeds
- Image previews with automatic sizing
- Click-to-expand functionality

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
cd examples/with-media-preview
pnpm dev
```

Then open http://localhost:5173

## Usage

Install the plugin:
```bash
npm install @threadkit/react @threadkit/plugin-media-preview
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { createMediaPreviewPlugin } from '@threadkit/plugin-media-preview';
import '@threadkit/react/styles';

const mediaPlugin = createMediaPreviewPlugin({
  youtube: true,
  vimeo: true,
  images: true,
  maxImageWidth: 500,
});

function App() {
  return (
    <ThreadKit
      projectId="your-project-id"
      url={window.location.pathname}
      apiUrl="http://localhost:8080/v1"
      wsUrl="ws://localhost:8081"
      plugins={[mediaPlugin]}
    />
  );
}
```

## Examples to Try

Post comments with these URLs:

- **YouTube**: `https://youtube.com/watch?v=dQw4w9WgXcQ`
- **Vimeo**: `https://vimeo.com/123456789`
- **Images**: `https://picsum.photos/400/300.jpg`

The plugin automatically detects and embeds these media types!

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/plugin-media-preview Package](../../packages/plugin-media-preview)
