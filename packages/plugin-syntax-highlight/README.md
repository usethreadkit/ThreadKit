# @threadkit/plugin-syntax-highlight

Syntax highlighting plugin for ThreadKit. Highlights code blocks using Shiki.

## Installation

```bash
npm install @threadkit/plugin-syntax-highlight
```

## Usage

```tsx
import { ThreadKit } from '@threadkit/react';
import { syntaxHighlightPlugin } from '@threadkit/plugin-syntax-highlight';
import '@threadkit/react/styles.css';

function App() {
  return (
    <ThreadKit
      apiKey="your-api-key"
      pageId="unique-page-id"
      plugins={[syntaxHighlightPlugin()]}
    />
  );
}
```

## Documentation

For full documentation, visit [usethreadkit.com/docs/packages/plugin-syntax-highlight](https://usethreadkit.com/docs/packages/plugin-syntax-highlight).

## License

MIT
