#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join } from 'path';
import { gzipSync } from 'zlib';

const DIST_DIR = 'dist';

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getGzipSize(filePath) {
  const content = readFileSync(filePath);
  return gzipSync(content).length;
}

function getFileStats(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getFileStats(fullPath, files);
    } else {
      files.push({
        path: fullPath.replace(DIST_DIR + '/', ''),
        size: stat.size,
        gzip: getGzipSize(fullPath),
      });
    }
  }
  return files;
}

console.log('\n📦 Building @threadkit/react...\n');

// Run TypeScript compiler
console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

// Copy CSS from core package
console.log('Copying styles from @threadkit/core...');
copyFileSync('../core/src/styles/threadkit.css', 'dist/styles.css');

// Get file stats
const files = getFileStats(DIST_DIR);

// Calculate totals
const totalSize = files.reduce((sum, f) => sum + f.size, 0);
const totalGzip = files.reduce((sum, f) => sum + f.gzip, 0);

// Print results
console.log('\n📊 Bundle Size Report\n');
console.log('─'.repeat(60));
console.log(`${'File'.padEnd(35)} ${'Size'.padStart(10)} ${'Gzip'.padStart(10)}`);
console.log('─'.repeat(60));

// Sort by size descending
files.sort((a, b) => b.size - a.size);

for (const file of files) {
  const name = file.path.length > 33 ? '...' + file.path.slice(-30) : file.path;
  console.log(
    `${name.padEnd(35)} ${formatBytes(file.size).padStart(10)} ${formatBytes(file.gzip).padStart(10)}`
  );
}

console.log('─'.repeat(60));
console.log(
  `${'Total'.padEnd(35)} ${formatBytes(totalSize).padStart(10)} ${formatBytes(totalGzip).padStart(10)}`
);
console.log('─'.repeat(60));

// Highlight key files
const jsFiles = files.filter(f => f.path.endsWith('.js'));
const cssFiles = files.filter(f => f.path.endsWith('.css'));
const jsSize = jsFiles.reduce((sum, f) => sum + f.gzip, 0);
const cssSize = cssFiles.reduce((sum, f) => sum + f.gzip, 0);

console.log('\n✨ Summary (gzipped)');
console.log(`   JavaScript: ${formatBytes(jsSize)}`);
console.log(`   CSS:        ${formatBytes(cssSize)}`);
console.log(`   Total:      ${formatBytes(jsSize + cssSize)}\n`);
