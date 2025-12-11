import { describe, it, expect } from 'vitest';
import { nextjsAppTemplate } from '../src/templates/nextjs-app.js';
import { nextjsPagesTemplate } from '../src/templates/nextjs-pages.js';
import { sveltekitTemplate } from '../src/templates/sveltekit.js';
import { viteReactTemplate } from '../src/templates/vite-react.js';

describe('nextjsAppTemplate', () => {
  it('generates basic template without plugins', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: [],
    });

    expect(result).toContain("'use client'");
    expect(result).toContain("import { ThreadKit } from '@threadkit/react'");
    expect(result).toContain("import '@threadkit/react/styles'");
    expect(result).toContain('projectId={process.env.NEXT_PUBLIC_THREADKIT_PROJECT_ID');
    expect(result).toContain("tk_pub_test123");
  });

  it('adds i18n support when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/i18n'],
    });

    expect(result).toContain("import { locales, type LocaleCode } from '@threadkit/i18n'");
    expect(result).toContain('useState<LocaleCode>');
    expect(result).toContain('translations={locales[locale]}');
    expect(result).toContain('<select');
  });

  it('adds Ethereum plugin when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-auth-ethereum'],
    });

    expect(result).toContain("import { createEthereumAuthPlugin }");
    expect(result).toContain('EthereumProvider');
    expect(result).toContain('ThreadKitEthereumWalletButton');
    expect(result).toContain('plugins={[ethereumPlugin]}');
  });

  it('adds Solana plugin when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-auth-solana'],
    });

    expect(result).toContain("import { createSolanaAuthPlugin }");
    expect(result).toContain('SolanaProvider');
    expect(result).toContain('ThreadKitSolanaWalletButton');
    expect(result).toContain('plugins={[solanaPlugin]}');
  });

  it('adds syntax highlight plugin when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-syntax-highlight'],
    });

    expect(result).toContain("import { createSyntaxHighlightPlugin }");
    expect(result).toContain("languages: ['javascript', 'typescript', 'python', 'rust']");
    expect(result).toContain('plugins={[syntaxPlugin]}');
  });

  it('adds LaTeX plugin when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-latex'],
    });

    expect(result).toContain("import { createLatexPlugin }");
    expect(result).toContain('latexPlugin');
  });

  it('adds media preview plugin when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-media-preview'],
    });

    expect(result).toContain("import { createMediaPreviewPlugin }");
    expect(result).toContain('mediaPlugin');
  });

  it('adds Turnstile plugin when selected', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-turnstile'],
    });

    expect(result).toContain("import { createTurnstilePlugin }");
    expect(result).toContain('NEXT_PUBLIC_TURNSTILE_SITE_KEY');
    expect(result).toContain('turnstilePlugin');
  });

  it('combines multiple plugins correctly', () => {
    const result = nextjsAppTemplate({
      projectId: 'tk_pub_test123',
      plugins: [
        '@threadkit/i18n',
        '@threadkit/plugin-syntax-highlight',
        '@threadkit/plugin-auth-ethereum',
      ],
    });

    expect(result).toContain('locales');
    expect(result).toContain('syntaxPlugin');
    expect(result).toContain('ethereumPlugin');
    expect(result).toContain('plugins={[ethereumPlugin, syntaxPlugin]}');
    expect(result).toContain('translations={locales[locale]}');
  });
});

describe('nextjsPagesTemplate', () => {
  it('generates basic template without use client directive', () => {
    const result = nextjsPagesTemplate({
      projectId: 'tk_pub_test123',
      plugins: [],
    });

    expect(result).not.toContain("'use client'");
    expect(result).toContain("import { ThreadKit } from '@threadkit/react'");
  });

  it('adds plugins correctly', () => {
    const result = nextjsPagesTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/i18n'],
    });

    expect(result).toContain('locales');
    expect(result).toContain('translations={locales[locale]}');
  });
});

describe('sveltekitTemplate', () => {
  it('generates Svelte template', () => {
    const result = sveltekitTemplate({
      projectId: 'tk_pub_test123',
      plugins: [],
    });

    expect(result).toContain('<script lang="ts">');
    expect(result).toContain("import { ThreadKit } from '@threadkit/svelte'");
    expect(result).toContain("import '@threadkit/svelte/styles.css'");
    expect(result).toContain('projectId="tk_pub_test123"');
  });

  it('adds i18n support when selected', () => {
    const result = sveltekitTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/i18n'],
    });

    expect(result).toContain("import { locales, type LocaleCode } from '@threadkit/i18n'");
    expect(result).toContain('translations={locales[locale]}');
    expect(result).toContain('bind:value={locale}');
  });
});

describe('viteReactTemplate', () => {
  it('generates Vite React template', () => {
    const result = viteReactTemplate({
      projectId: 'tk_pub_test123',
      plugins: [],
    });

    expect(result).toContain("import { ThreadKit } from '@threadkit/react'");
    expect(result).toContain('import.meta.env.VITE_THREADKIT_PROJECT_ID');
    expect(result).toContain('url={window.location.pathname}');
    expect(result).toContain('export function ThreadKitDemo()');
  });

  it('uses Vite env variables for Turnstile', () => {
    const result = viteReactTemplate({
      projectId: 'tk_pub_test123',
      plugins: ['@threadkit/plugin-turnstile'],
    });

    expect(result).toContain('import.meta.env.VITE_TURNSTILE_SITE_KEY');
  });
});
