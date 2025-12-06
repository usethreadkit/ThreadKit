#!/usr/bin/env node

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

console.log('\n📦 Building @threadkit/svelte...\n');

// Run svelte-package
console.log('Compiling Svelte components...');
execSync('npx svelte-package -i src -o dist', { stdio: 'inherit' });

// Copy CSS from core package
console.log('Copying styles from @threadkit/core...');
if (!existsSync('dist')) {
  mkdirSync('dist', { recursive: true });
}
copyFileSync('../core/src/styles/threadkit.css', 'dist/styles.css');

console.log('\n✅ Build complete!\n');
