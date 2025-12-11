#!/usr/bin/env node

/**
 * Build CDN bundle for ThreadKit React
 * Creates a single minified JS file suitable for CDN distribution
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { gzipSync } from 'zlib';

console.log('📦 Building CDN bundle for @threadkit/react...\n');

// Build with React bundled (standalone)
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
  external: ['katex', 'dompurify', 'shiki'], // These are optional plugins, loaded dynamically
  logLevel: 'info',
});

// Build with React external (for users who already have React)
await build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'ThreadKit',
  outfile: './dist/cdn/threadkit.nonbundled-react.min.js',
  platform: 'browser',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: ['react', 'react-dom', 'katex', 'dompurify', 'shiki'], // External React + optional plugins
  globalName: 'ThreadKit',
  banner: {
    js: '/* ThreadKit - https://usethreadkit.com - Requires React & ReactDOM */',
  },
  logLevel: 'info',
});

// Report sizes
const standalone = readFileSync('./dist/cdn/threadkit.min.js');
const withExternal = readFileSync('./dist/cdn/threadkit.nonbundled-react.min.js');

const standaloneGzip = gzipSync(standalone);
const externalGzip = gzipSync(withExternal);

console.log('\n📊 Bundle Sizes:');
console.log('================\n');

console.log('Standalone (React bundled):');
console.log(`  Raw:     ${(standalone.length / 1024).toFixed(2)} KB`);
console.log(`  Gzipped: ${(standaloneGzip.length / 1024).toFixed(2)} KB`);

console.log('\nWith external React:');
console.log(`  Raw:     ${(withExternal.length / 1024).toFixed(2)} KB`);
console.log(`  Gzipped: ${(externalGzip.length / 1024).toFixed(2)} KB`);

console.log('\n✅ CDN bundles built successfully!');
console.log('   dist/cdn/threadkit.min.js');
console.log('   dist/cdn/threadkit.nonbundled-react.min.js\n');

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
      withExternalReact: {
        raw: withExternal.length,
        gzipped: externalGzip.length,
      },
    },
    null,
    2
  )
);
