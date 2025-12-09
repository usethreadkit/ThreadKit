# @threadkit/plugin-latex

LaTeX/math rendering plugin for ThreadKit. Renders math expressions using KaTeX.

## Installation

```bash
npm install @threadkit/plugin-latex
```

## Usage

```tsx
import { ThreadKit } from '@threadkit/react';
import { latexPlugin } from '@threadkit/plugin-latex';
import '@threadkit/react/styles.css';

function App() {
  return (
    <ThreadKit
      projectId="your-project-id"
      pageId="unique-page-id"
      plugins={[latexPlugin()]}
    />
  );
}
```

## Documentation

For full documentation, visit [usethreadkit.com/docs/packages/plugin-latex](https://usethreadkit.com/docs/packages/plugin-latex).

## License

MIT
