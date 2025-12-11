import * as fs from 'fs';
import * as path from 'path';

export type FrameworkType =
  | 'nextjs-app'
  | 'nextjs-pages'
  | 'sveltekit'
  | 'svelte'
  | 'vite-react'
  | 'remix'
  | 'astro'
  | 'gatsby'
  | 'unknown';

export interface Framework {
  type: FrameworkType;
  name: string;
}

export async function detectFramework(): Promise<Framework | null> {
  const cwd = process.cwd();

  // Check for package.json
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Next.js detection
  if (deps['next']) {
    // Check for App Router vs Pages Router
    if (
      fs.existsSync(path.join(cwd, 'app')) ||
      fs.existsSync(path.join(cwd, 'src', 'app'))
    ) {
      return { type: 'nextjs-app', name: 'Next.js (App Router)' };
    }
    if (
      fs.existsSync(path.join(cwd, 'pages')) ||
      fs.existsSync(path.join(cwd, 'src', 'pages'))
    ) {
      return { type: 'nextjs-pages', name: 'Next.js (Pages Router)' };
    }
    // Default to App Router for new Next.js projects
    return { type: 'nextjs-app', name: 'Next.js (App Router)' };
  }

  // SvelteKit detection
  if (deps['@sveltejs/kit']) {
    return { type: 'sveltekit', name: 'SvelteKit' };
  }

  // Svelte (without Kit) detection
  if (deps['svelte'] && !deps['@sveltejs/kit']) {
    return { type: 'svelte', name: 'Svelte' };
  }

  // Remix detection
  if (deps['@remix-run/react'] || deps['@remix-run/node']) {
    return { type: 'remix', name: 'Remix' };
  }

  // Astro detection
  if (deps['astro']) {
    return { type: 'astro', name: 'Astro' };
  }

  // Gatsby detection
  if (deps['gatsby']) {
    return { type: 'gatsby', name: 'Gatsby' };
  }

  // Vite + React detection
  if (deps['vite'] && (deps['react'] || deps['react-dom'])) {
    return { type: 'vite-react', name: 'Vite + React' };
  }

  // Generic React detection
  if (deps['react'] || deps['react-dom']) {
    return { type: 'vite-react', name: 'React' };
  }

  return { type: 'unknown', name: 'Unknown' };
}
