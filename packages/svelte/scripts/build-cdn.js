#!/usr/bin/env node

/**
 * Build CDN bundle for ThreadKit Svelte
 * Creates single minified JS files suitable for CDN distribution
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';
import sveltePlugin from 'esbuild-svelte';
import sveltePreprocess from 'svelte-preprocess';

console.log('📦 Building CDN bundles for @threadkit/svelte...\n');

mkdirSync('./dist/cdn', { recursive: true });

// Build with Svelte bundled (standalone)
await build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'ThreadKit',
  outfile: './dist/cdn/threadkit.min.js',
  platform: 'browser',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: ['katex', 'dompurify', 'shiki'], // Optional plugins
  plugins: [
    sveltePlugin({
      compilerOptions: { css: 'injected' },
      preprocess: sveltePreprocess(),
    }),
  ],
  logLevel: 'info',
});

// Build with Svelte external (for users who already have Svelte)
await build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'ThreadKit',
  outfile: './dist/cdn/threadkit.nonbundled-svelte.min.js',
  platform: 'browser',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: ['svelte', 'svelte/store', 'katex', 'dompurify', 'shiki'],
  plugins: [
    sveltePlugin({
      compilerOptions: { css: 'injected' },
      preprocess: sveltePreprocess(),
    }),
  ],
  banner: {
    js: '/* ThreadKit Svelte - https://usethreadkit.com - Requires Svelte */',
  },
  logLevel: 'info',
});

// Report sizes
const standalone = readFileSync('./dist/cdn/threadkit.min.js');
const withExternal = readFileSync('./dist/cdn/threadkit.nonbundled-svelte.min.js');

const standaloneGzip = gzipSync(standalone);
const externalGzip = gzipSync(withExternal);

console.log('\n📊 Bundle Sizes:');
console.log('================\n');

console.log('Standalone (Svelte bundled):');
console.log(`  Raw:     ${(standalone.length / 1024).toFixed(2)} KB`);
console.log(`  Gzipped: ${(standaloneGzip.length / 1024).toFixed(2)} KB`);

console.log('\nWith external Svelte:');
console.log(`  Raw:     ${(withExternal.length / 1024).toFixed(2)} KB`);
console.log(`  Gzipped: ${(externalGzip.length / 1024).toFixed(2)} KB`);

console.log('\n✅ CDN bundles built successfully!');
console.log('   dist/cdn/threadkit.min.js');
console.log('   dist/cdn/threadkit.nonbundled-svelte.min.js\n');

// Write size report
writeFileSync(
  './dist/cdn/bundle-sizes.json',
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      standalone: {
        raw: standalone.length,
        gzipped: standaloneGzip.length,
      },
      withExternalSvelte: {
        raw: withExternal.length,
        gzipped: externalGzip.length,
      },
    },
    null,
    2
  )
);
