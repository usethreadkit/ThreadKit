<div align="center">

<img src=".github/threadkit.webp" alt="ThreadKit" width="280" />

### Drop-in comments & live chat for any website

[![npm version](https://img.shields.io/npm/v/@threadkit/react?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@threadkit/react)
[![npm downloads](https://img.shields.io/npm/dm/@threadkit/react?style=flat-square&color=cb3837)](https://www.npmjs.com/package/@threadkit/react)
[![minzipped size](https://img.shields.io/bundlejs/size/@threadkit/react?style=flat-square&color=cb3837)](https://bundlejs.com/?q=%40threadkit%2Freact)
[![GitHub license](https://img.shields.io/github/license/usethreadkit/threadkit?style=flat-square)](https://github.com/usethreadkit/threadkit/blob/master/LICENSE.md)
[![Coverage Status](https://img.shields.io/coverallsCoverage/github/usethreadkit/threadkit?style=flat-square)](https://coveralls.io/github/usethreadkit/threadkit)
[![CodeRabbit Reviews](https://img.shields.io/coderabbit/prs/github/usethreadkit/threadkit?style=flat-square&labelColor=171717&color=FF570A&label=CodeRabbit+Reviews)](https://coderabbit.ai)
[![GitHub stars](https://img.shields.io/github/stars/usethreadkit/threadkit?style=social)](https://github.com/usethreadkit/threadkit)

<br />

[Website](https://usethreadkit.com) · [Documentation](https://usethreadkit.com/docs) · [Live Demo](https://usethreadkit.com/demo) · [Examples](./examples)

</div>

---

## Screenshots

<div align="center">
<table>
<tr>
<td><img src=".github/screenshots/desktop.png" alt="Desktop" width="400" /></td>
<td><img src=".github/screenshots/mobile.png" alt="Mobile" width="200" /></td>
</tr>
<tr>
<td align="center"><em>Desktop</em></td>
<td align="center"><em>Mobile</em></td>
</tr>
</table>
</div>

## Features

- **Privacy-first** — Your data, your server. No tracking, no ads, no third-party cookies. GDPR compliant.
- **Real-time** — WebSocket-powered live updates, typing indicators, and presence.
- **Threaded replies** — Nested conversations with unlimited depth.
- **SSR support** — Server-side rendering for SEO. Comments are indexable by search engines.
- **Notifications** — Email and push notifications for replies and mentions.
- **Responsive** — Works great on desktop and mobile.
- **Moderation tools** — Approve/reject queue, shadowbans, reports, and role-based permissions.
- **Self-hostable** — Run on your own infrastructure. Redis is the only dependency.
- **Lightweight** — Small bundle size. No heavy dependencies.

## Authentication

ThreadKit supports multiple authentication methods out of the box:

| Method | Provider |
|--------|----------|
| Email OTP | [Resend](https://resend.com) |
| Phone OTP | [Twilio](https://twilio.com) |
| Google OAuth | Google |
| GitHub OAuth | GitHub |
| Ethereum | Web3 wallet (MetaMask, Rainbow, etc.) |
| Solana | Phantom, Solflare, etc. |
| Anonymous | No login required |

## Get Started

**Cloud (free)** — Sign up at [usethreadkit.com](https://usethreadkit.com) and get running in minutes. No server setup required.

**Self-hosted** — Run on your own infrastructure for full control. See [self-hosting](#self-hosting) below.

### React

```bash
npm install @threadkit/react
```

```tsx
import { ThreadKit } from '@threadkit/react'
import '@threadkit/react/styles.css'

function App() {
  return (
    <ThreadKit
      apiKey="your-api-key"
      pageId="unique-page-id"
    />
  )
}
```

### Vanilla JS / Any Framework

ThreadKit works on any website. Load it from our CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@threadkit/react/dist/styles.css" />
<script src="https://cdn.jsdelivr.net/npm/@threadkit/react/dist/threadkit.umd.js"></script>

<div id="comments"></div>

<script>
  ThreadKit.render('#comments', {
    apiKey: 'your-api-key',
    pageId: 'unique-page-id'
  })
</script>
```

## Packages

| Package | Description |
|---------|-------------|
| [`server`](./server) | Self-hosted Rust backend with HTTP & WebSocket APIs |
| [`@threadkit/react`](./packages/react) | React components for comments and chat |

## Plugins

ThreadKit is designed to be extensible. Add functionality with official plugins or build your own.

### Official Plugins

| Plugin | Description |
|--------|-------------|
| [`@threadkit/plugin-auth-ethereum`](./packages/plugin-auth-ethereum) | Sign in with Ethereum wallet |
| [`@threadkit/plugin-auth-solana`](./packages/plugin-auth-solana) | Sign in with Solana wallet |
| [`@threadkit/plugin-latex`](./packages/plugin-latex) | Render LaTeX math equations |
| [`@threadkit/plugin-media-preview`](./packages/plugin-media-preview) | Rich previews for images, videos, and links |
| [`@threadkit/plugin-syntax-highlight`](./packages/plugin-syntax-highlight) | Syntax highlighting for code blocks |

### Using Plugins

```tsx
import { ThreadKit } from '@threadkit/react'
import { ethereumPlugin } from '@threadkit/plugin-auth-ethereum'
import { latexPlugin } from '@threadkit/plugin-latex'

<ThreadKit
  apiKey="your-api-key"
  pageId="unique-page-id"
  plugins={[ethereumPlugin(), latexPlugin()]}
/>
```

### Custom Styling

ThreadKit uses CSS custom properties for easy theming:

```css
:root {
  --tk-primary: #6366f1;
  --tk-background: #ffffff;
  --tk-text: #1f2937;
  --tk-border: #e5e7eb;
  --tk-radius: 8px;
}
```

See the [theming guide](https://usethreadkit.com/docs/theming) for all available CSS variables.

### Building Your Own Plugin

Plugins can add custom renderers, authentication methods, or modify comment behavior:

```tsx
import { definePlugin } from '@threadkit/react'

export const myPlugin = definePlugin({
  name: 'my-plugin',

  // Add custom markdown renderers
  renderers: {
    myCustomBlock: (props) => <MyComponent {...props} />
  },

  // Add toolbar buttons
  toolbar: [
    { icon: MyIcon, action: (editor) => editor.insert('...') }
  ],

  // Hook into comment lifecycle
  onCommentCreate: (comment) => { /* ... */ },
  onCommentRender: (comment) => { /* ... */ }
})
```

## Moderation

ThreadKit includes powerful moderation tools to keep your community safe:

- **Manual moderation** — Approve/reject queue, edit/delete comments, ban users, shadowbans
- **Akismet integration** — Automatic spam detection powered by [Akismet](https://akismet.com)
- **LLM moderation** — AI-powered content moderation that detects spam, abuse, harassment, hate speech, and more
- **Reports** — Users can report inappropriate content for review
- **Role-based permissions** — Owner, Admin, Moderator, and User roles with granular permissions

## Self-Hosting

ThreadKit can be fully self-hosted. The server is written in Rust for performance. **Redis is the only dependency.**

```bash
# Clone the repo
git clone https://github.com/usethreadkit/threadkit.git
cd threadkit/server

# Build and run
cargo build --release
./target/release/threadkit-http
```

See the [self-hosting guide](https://usethreadkit.com/docs/self-hosting) for detailed instructions including Docker deployment.

## Documentation

Visit [usethreadkit.com/docs](https://usethreadkit.com/docs) for full documentation.

- [Getting Started](https://usethreadkit.com/docs/getting-started)
- [Self-Hosting Guide](https://usethreadkit.com/docs/self-hosting)
- [API Reference](https://usethreadkit.com/docs/api)
- [Authentication](https://usethreadkit.com/docs/authentication)
- [Moderation](https://usethreadkit.com/docs/moderation)
- [Plugins](https://usethreadkit.com/docs/plugins)

## Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## Contributors

<a href="https://github.com/usethreadkit/threadkit/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=usethreadkit/threadkit" />
</a>

<br /><br />

<a href="https://star-history.com/#usethreadkit/threadkit&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=usethreadkit/threadkit&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=usethreadkit/threadkit&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=usethreadkit/threadkit&type=Date" width="600" />
  </picture>
</a>

## License

[MIT](LICENSE.md) © [ThreadKit](https://usethreadkit.com)
