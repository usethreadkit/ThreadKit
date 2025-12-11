import { type TemplateOptions } from './index.js';

export function viteReactTemplate(options: TemplateOptions): string {
  const { projectId, plugins } = options;

  const hasI18n = plugins.includes('@threadkit/i18n');
  const hasEthereum = plugins.includes('@threadkit/plugin-auth-ethereum');
  const hasSolana = plugins.includes('@threadkit/plugin-auth-solana');
  const hasSyntax = plugins.includes('@threadkit/plugin-syntax-highlight');
  const hasLatex = plugins.includes('@threadkit/plugin-latex');
  const hasMedia = plugins.includes('@threadkit/plugin-media-preview');
  const hasTurnstile = plugins.includes('@threadkit/plugin-turnstile');

  const imports: string[] = [
    `import { ThreadKit } from '@threadkit/react';`,
    `import '@threadkit/react/styles';`,
  ];

  const pluginImports: string[] = [];
  const pluginSetup: string[] = [];
  const pluginProps: string[] = [];
  const wrapperStart: string[] = [];

  if (hasI18n) {
    imports.push(`import { locales, type LocaleCode } from '@threadkit/i18n';`);
    imports.push(`import { useState } from 'react';`);
  }

  if (hasEthereum) {
    pluginImports.push(`import { createEthereumAuthPlugin } from '@threadkit/plugin-auth-ethereum';`);
    pluginSetup.push(`
// Create Ethereum auth plugin
const {
  plugin: ethereumPlugin,
  Provider: EthereumProvider,
  ThreadKitEthereumWalletButton,
} = createEthereumAuthPlugin({
  provider: { mode: 'standalone' },
});`);
    wrapperStart.push('EthereumProvider');
  }

  if (hasSolana) {
    pluginImports.push(`import { createSolanaAuthPlugin } from '@threadkit/plugin-auth-solana';`);
    pluginSetup.push(`
// Create Solana auth plugin
const {
  plugin: solanaPlugin,
  Provider: SolanaProvider,
  ThreadKitSolanaWalletButton,
} = createSolanaAuthPlugin({
  provider: { mode: 'standalone', network: 'mainnet-beta' },
});`);
    wrapperStart.push('SolanaProvider');
  }

  if (hasSyntax) {
    pluginImports.push(`import { createSyntaxHighlightPlugin } from '@threadkit/plugin-syntax-highlight';`);
    pluginSetup.push(`
// Create syntax highlight plugin
const syntaxPlugin = createSyntaxHighlightPlugin({
  languages: ['javascript', 'typescript', 'python', 'rust'],
});`);
  }

  if (hasLatex) {
    pluginImports.push(`import { createLatexPlugin } from '@threadkit/plugin-latex';`);
    pluginSetup.push(`
// Create LaTeX plugin
const latexPlugin = createLatexPlugin();`);
  }

  if (hasMedia) {
    pluginImports.push(`import { createMediaPreviewPlugin } from '@threadkit/plugin-media-preview';`);
    pluginSetup.push(`
// Create media preview plugin
const mediaPlugin = createMediaPreviewPlugin();`);
  }

  if (hasTurnstile) {
    pluginImports.push(`import { createTurnstilePlugin } from '@threadkit/plugin-turnstile';`);
    pluginSetup.push(`
// Create Turnstile plugin
const turnstilePlugin = createTurnstilePlugin({
  siteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || 'your-site-key',
});`);
  }

  // Build plugins array
  const pluginNames: string[] = [];
  if (hasEthereum) pluginNames.push('ethereumPlugin');
  if (hasSolana) pluginNames.push('solanaPlugin');
  if (hasSyntax) pluginNames.push('syntaxPlugin');
  if (hasLatex) pluginNames.push('latexPlugin');
  if (hasMedia) pluginNames.push('mediaPlugin');
  if (hasTurnstile) pluginNames.push('turnstilePlugin');

  if (pluginNames.length > 0) {
    pluginProps.push(`plugins={[${pluginNames.join(', ')}]}`);
  }

  if (hasI18n) {
    pluginProps.push(`translations={locales[locale]}`);
  }

  // Build the component
  let component = '';

  if (hasI18n) {
    component = `
export function ThreadKitDemo() {
  const [locale, setLocale] = useState<LocaleCode>('en');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>ThreadKit Demo</h1>
      <p>This is an example component with ThreadKit comments.</p>

      <div style={{ marginBottom: 16 }}>
        <label>
          Language:{' '}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleCode)}
          >
            <option value="en">English</option>
            <option value="es">Espanol</option>
            <option value="fr">Francais</option>
            <option value="de">Deutsch</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
          </select>
        </label>
      </div>
${hasEthereum ? `
      <div style={{ marginBottom: 16 }}>
        <ThreadKitEthereumWalletButton />
      </div>
` : ''}${hasSolana ? `
      <div style={{ marginBottom: 16 }}>
        <ThreadKitSolanaWalletButton />
      </div>
` : ''}
      <ThreadKit
        projectId={import.meta.env.VITE_THREADKIT_PROJECT_ID || '${projectId}'}
        url={window.location.pathname}
        ${pluginProps.join('\n        ')}
      />
    </div>
  );
}`;
  } else {
    component = `
export function ThreadKitDemo() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>ThreadKit Demo</h1>
      <p>This is an example component with ThreadKit comments.</p>
${hasEthereum ? `
      <div style={{ marginBottom: 16 }}>
        <ThreadKitEthereumWalletButton />
      </div>
` : ''}${hasSolana ? `
      <div style={{ marginBottom: 16 }}>
        <ThreadKitSolanaWalletButton />
      </div>
` : ''}
      <ThreadKit
        projectId={import.meta.env.VITE_THREADKIT_PROJECT_ID || '${projectId}'}
        url={window.location.pathname}
        ${pluginProps.length > 0 ? pluginProps.join('\n        ') : ''}
      />
    </div>
  );
}`;
  }

  // Wrap with providers if needed
  if (wrapperStart.length > 0) {
    const wrappedComponent = component
      .replace(
        'return (',
        `return (\n    ${wrapperStart.map((p) => `<${p}>`).join('\n    ')}`
      )
      .replace(
        /(\s+)\);(\s*)}\s*$/,
        `$1  ${wrapperStart.reverse().map((p) => `</${p}>`).join('\n    ')}\n$1);$2}\n`
      );
    component = wrappedComponent;
  }

  return [
    ...imports,
    ...pluginImports,
    ...pluginSetup,
    component,
  ].join('\n');
}
