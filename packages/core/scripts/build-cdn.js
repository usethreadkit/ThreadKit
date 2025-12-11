#!/usr/bin/env node

/**
 * Build CDN bundle for ThreadKit Core
 * Creates single minified JS file suitable for CDN distribution
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { gzipSync } from 'zlib';

console.log('📦 Building CDN bundle for @threadkit/core...\n');

mkdirSync('./dist/cdn', { recursive: true });

// Core is framework-agnostic, so just one bundle
await build({
  entryPoints: ['./src/index.ts'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  globalName: 'ThreadKitCore',
  outfile: './dist/cdn/threadkit.min.js',
  platform: 'browser',
  target: 'es2020',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  external: [], // Core has no framework dependencies
  logLevel: 'info',
});

// Report sizes
const bundle = readFileSync('./dist/cdn/threadkit.min.js');
const bundleGzip = gzipSync(bundle);

console.log('\n📊 Bundle Size:');
console.log('================\n');

console.log('Core (framework-agnostic):');
console.log(`  Raw:     ${(bundle.length / 1024).toFixed(2)} KB`);
console.log(`  Gzipped: ${(bundleGzip.length / 1024).toFixed(2)} KB`);

console.log('\n✅ CDN bundle built successfully!');
console.log('   dist/cdn/threadkit.min.js\n');

// Write size report
writeFileSync(
  './dist/cdn/bundle-sizes.json',
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      bundle: {
        raw: bundle.length,
        gzipped: bundleGzip.length,
      },
    },
    null,
    2
  )
);
