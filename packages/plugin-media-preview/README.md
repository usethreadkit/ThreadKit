# @threadkit/plugin-media-preview

Media preview plugin for ThreadKit. Renders YouTube, Vimeo, and image embeds in comments.

## Installation

```bash
npm install @threadkit/plugin-media-preview
```

## Usage

```tsx
import { ThreadKit } from '@threadkit/react';
import { mediaPreviewPlugin } from '@threadkit/plugin-media-preview';
import '@threadkit/react/styles.css';

function App() {
  return (
    <ThreadKit
      projectId="your-project-id"
      pageId="unique-page-id"
      plugins={[mediaPreviewPlugin()]}
    />
  );
}
```

## Documentation

For full documentation, visit [usethreadkit.com/docs/packages/plugin-media-preview](https://usethreadkit.com/docs/packages/plugin-media-preview).

## License

MIT
