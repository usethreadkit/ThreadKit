#!/usr/bin/env node

import * as p from '@clack/prompts';
import pc from 'picocolors';
import { detectFramework, type Framework } from './detect-framework.js';
import { detectPackageManager, type PackageManager } from './detect-package-manager.js';
import { checkGitStatus } from './git-status.js';
import { installPackages } from './install.js';
import { createExamplePage } from './templates/index.js';
import { updateEnvFile } from './env.js';

const PLUGINS = [
  {
    name: '@threadkit/i18n',
    label: 'i18n - Translations (30+ languages)',
    description: 'Pass translations={locales[locale]} to ThreadKit',
  },
  {
    name: '@threadkit/plugin-syntax-highlight',
    label: 'Syntax Highlighting - Code blocks with Shiki',
    description: 'Pass plugins={[syntaxHighlightPlugin]} to ThreadKit',
  },
  {
    name: '@threadkit/plugin-latex',
    label: 'LaTeX - Math/equation rendering',
    description: 'Pass plugins={[latexPlugin]} to ThreadKit',
  },
  {
    name: '@threadkit/plugin-media-preview',
    label: 'Media Preview - Link/image previews',
    description: 'Pass plugins={[mediaPreviewPlugin]} to ThreadKit',
  },
  {
    name: '@threadkit/plugin-turnstile',
    label: 'Turnstile - Cloudflare bot protection',
    description: 'Requires TURNSTILE_SITE_KEY. Pass plugins={[turnstilePlugin]} to ThreadKit',
  },
  {
    name: '@threadkit/plugin-auth-ethereum',
    label: 'Ethereum Auth - Wallet login (MetaMask, WalletConnect)',
    description: 'Wrap app in Provider, pass plugins={[plugin]} to ThreadKit',
  },
  {
    name: '@threadkit/plugin-auth-solana',
    label: 'Solana Auth - Wallet login (Phantom, Solflare)',
    description: 'Wrap app in Provider, pass plugins={[plugin]} to ThreadKit',
  },
] as const;

async function main() {
  console.clear();

  p.intro(pc.bgCyan(pc.black(' ThreadKit ')));

  // Check git status
  const gitCheck = await checkGitStatus();
  if (!gitCheck.clean && !gitCheck.notARepo) {
    const shouldContinue = await p.confirm({
      message: `You have uncommitted changes. Continue anyway?`,
      initialValue: false,
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel('Setup cancelled. Commit or stash your changes first.');
      process.exit(0);
    }
  }

  // Detect framework
  const framework = await detectFramework();
  if (!framework) {
    p.cancel('Could not detect framework. Make sure you are in a project directory.');
    process.exit(1);
  }

  // Detect package manager
  const packageManager = detectPackageManager();

  p.note(
    `Framework: ${pc.cyan(framework.name)}\nPackage manager: ${pc.cyan(packageManager)}`,
    'Detected'
  );

  // Ask about hosting
  const hostingType = await p.select({
    message: 'How are you using ThreadKit?',
    options: [
      {
        value: 'hosted',
        label: 'Hosted (usethreadkit.com)',
        hint: 'Free, no setup required',
      },
      {
        value: 'self-hosted',
        label: 'Self-hosted',
        hint: 'Run your own server',
      },
    ],
  });

  if (p.isCancel(hostingType)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Get project ID
  let projectId: string;

  if (hostingType === 'hosted') {
    const hasKey = await p.confirm({
      message: 'Do you have a ThreadKit project ID?',
      initialValue: true,
    });

    if (p.isCancel(hasKey)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    if (!hasKey) {
      p.note(
        `1. Go to ${pc.cyan('https://usethreadkit.com/new')}\n` +
        `2. Create your site\n` +
        `3. Copy your Public Key from the settings page`,
        'Get your project ID'
      );

      const ready = await p.confirm({
        message: 'Ready to continue?',
        initialValue: true,
      });

      if (p.isCancel(ready) || !ready) {
        p.cancel('Setup cancelled.');
        process.exit(0);
      }
    }

    const key = await p.text({
      message: 'Enter your Public Key (from dashboard settings):',
      placeholder: 'tk_pub_...',
      validate: (value) => {
        if (!value) return 'Public key is required';
        if (!value.startsWith('tk_pub_')) return 'Public key should start with tk_pub_';
        return undefined;
      },
    });

    if (p.isCancel(key)) {
      p.cancel('Setup cancelled.');
      process.exit(0);
    }

    projectId = key as string;
  } else {
    projectId = 'tk_pub_your_public_key';
    p.note(
      `Using default project ID: ${pc.cyan(projectId)}\n` +
      `Update this after setting up your server.`,
      'Self-hosted'
    );
  }

  // Ask about plugins
  const selectedPlugins = await p.multiselect({
    message: 'Would you like any optional plugins? (space to select)',
    options: PLUGINS.map((plugin) => ({
      value: plugin.name,
      label: plugin.label,
      hint: plugin.description,
    })),
    required: false,
  });

  if (p.isCancel(selectedPlugins)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Determine packages to install
  const packages = getPackagesToInstall(framework, selectedPlugins as string[]);

  // Show what we're going to do
  p.note(
    `Packages to install:\n${packages.map((pkg) => `  ${pc.green('+')} ${pkg}`).join('\n')}\n\n` +
    `Files to create:\n  ${pc.green('+')} ${getExamplePath(framework)}\n` +
    `  ${pc.yellow('~')} .env.local (add NEXT_PUBLIC_THREADKIT_PROJECT_ID)`,
    'Summary'
  );

  const proceed = await p.confirm({
    message: 'Proceed with setup?',
    initialValue: true,
  });

  if (p.isCancel(proceed) || !proceed) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Install packages
  const s = p.spinner();
  s.start('Installing packages...');

  try {
    await installPackages(packages, packageManager);
    s.stop('Packages installed');
  } catch (error) {
    s.stop('Failed to install packages');
    p.cancel(`Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }

  // Create example page
  s.start('Creating example page...');
  try {
    const examplePath = await createExamplePage(framework, projectId, selectedPlugins as string[]);
    s.stop(`Created ${examplePath}`);
  } catch (error) {
    s.stop('Failed to create example page');
    p.log.warn(`Could not create example page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Update .env.local
  s.start('Updating .env.local...');
  try {
    await updateEnvFile(projectId, hostingType as 'hosted' | 'self-hosted');
    s.stop('Updated .env.local');
  } catch (error) {
    s.stop('Could not update .env.local');
    p.log.warn(`Manually add: NEXT_PUBLIC_THREADKIT_PROJECT_ID=${projectId}`);
  }

  // Show next steps
  const pluginNotes = getPluginNotes(selectedPlugins as string[]);

  p.note(
    `1. Start your dev server\n` +
    `2. Visit ${pc.cyan(getExampleUrl(framework))}\n` +
    `3. Copy the component to any page\n\n` +
    `Docs: ${pc.cyan('https://usethreadkit.com/docs')}` +
    (pluginNotes ? `\n\n${pc.yellow('Plugin setup:')}\n${pluginNotes}` : ''),
    'Next steps'
  );

  p.outro(pc.green('ThreadKit is ready!'));
}

function getPackagesToInstall(framework: Framework, plugins: string[]): string[] {
  const packages: string[] = [];

  // Main package based on framework
  if (framework.type === 'svelte' || framework.type === 'sveltekit') {
    packages.push('@threadkit/svelte');
  } else {
    packages.push('@threadkit/react');
  }

  // Add selected plugins
  packages.push(...plugins);

  return packages;
}

function getExamplePath(framework: Framework): string {
  switch (framework.type) {
    case 'nextjs-app':
      return 'app/threadkit-demo/page.tsx';
    case 'nextjs-pages':
      return 'pages/threadkit-demo.tsx';
    case 'sveltekit':
      return 'src/routes/threadkit-demo/+page.svelte';
    case 'svelte':
    case 'vite-react':
    case 'remix':
    case 'astro':
    default:
      return 'src/ThreadKitDemo.tsx';
  }
}

function getExampleUrl(framework: Framework): string {
  switch (framework.type) {
    case 'nextjs-app':
    case 'nextjs-pages':
    case 'sveltekit':
      return '/threadkit-demo';
    default:
      return '/ (import ThreadKitDemo component)';
  }
}

function getPluginNotes(plugins: string[]): string {
  const notes: string[] = [];

  for (const plugin of plugins) {
    const info = PLUGINS.find((p) => p.name === plugin);
    if (info) {
      notes.push(`${pc.cyan(plugin)}: ${info.description}`);
    }
  }

  return notes.join('\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
