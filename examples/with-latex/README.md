# ThreadKit - LaTeX Math Rendering

This example demonstrates how to add LaTeX math rendering to ThreadKit using the `@threadkit/plugin-latex` plugin powered by KaTeX.

## What You'll See

- Inline math: `$E = mc^2$`
- Display math: `$$\int_0^\infty e^{-x^2} dx$$`
- Beautiful rendering of mathematical formulas
- Full KaTeX support

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
cd examples/with-latex
pnpm dev
```

Then open http://localhost:5173

## Usage

Install the plugin:
```bash
npm install @threadkit/react @threadkit/plugin-latex
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { createLatexPlugin } from '@threadkit/plugin-latex';
import '@threadkit/react/styles';

const latexPlugin = createLatexPlugin();

function App() {
  return (
    <ThreadKit
      projectId="your-project-id"
      url={window.location.pathname}
      apiUrl="http://localhost:8080/v1"
      wsUrl="ws://localhost:8081"
      plugins={[latexPlugin]}
    />
  );
}
```

## Examples to Try

- Inline: `$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$`
- Display: `$$\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}$$`
- Matrix: `$$\begin{bmatrix} a & b \\ c & d \end{bmatrix}$$`

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/plugin-latex Package](../../packages/plugin-latex)
- [KaTeX Documentation](https://katex.org/)
