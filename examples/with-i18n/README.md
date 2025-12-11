# ThreadKit - Internationalization (i18n)

This example demonstrates how to add multi-language support to ThreadKit using the `@threadkit/i18n` package.

## What You'll See

- 23+ language translations
- Language switcher dropdown
- RTL (right-to-left) support for Arabic, Hebrew, Farsi
- All UI text translated (buttons, labels, placeholders, etc.)

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
cd examples/with-i18n
pnpm dev
```

Then open http://localhost:5173

## Usage

Install the package:
```bash
npm install @threadkit/react @threadkit/i18n
```

Add to your app:
```tsx
import { ThreadKit } from '@threadkit/react';
import { locales, type LocaleCode } from '@threadkit/i18n';
import '@threadkit/react/styles';
import { useState, useMemo } from 'react';

function App() {
  const [locale, setLocale] = useState<LocaleCode>('en');
  const translations = useMemo(() => locales[locale], [locale]);

  return (
    <ThreadKit
      projectId="your-project-id"
      url={window.location.pathname}
      apiUrl="http://localhost:8080/v1"
      wsUrl="ws://localhost:8081"
      translations={translations}
    />
  );
}
```

## Supported Languages

English, Spanish, French, German, Portuguese, Japanese, Chinese, Korean, Italian, Dutch, Polish, Russian, Turkish, Farsi, Vietnamese, Czech, Indonesian, Hungarian, Ukrainian, Arabic, Swedish, Romanian, and more!

## Custom Translations

You can override any translation or add your own:

```tsx
import { locales } from '@threadkit/i18n';

const customTranslations = {
  ...locales.en,
  post_comment: 'Share your thoughts',
  sign_in: 'Login',
};
```

## Learn More

- [ThreadKit Documentation](https://usethreadkit.com/docs)
- [@threadkit/i18n Package](../../packages/i18n)
