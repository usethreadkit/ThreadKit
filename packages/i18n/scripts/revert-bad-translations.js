#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesDir = join(__dirname, '../src/locales');

// Get all locale files except English
const localeFiles = readdirSync(localesDir)
  .filter(f => f.endsWith('.ts') && f !== 'en.ts');

console.log(`Removing toggleCollapseFocusedComment from ${localeFiles.length} non-English locale files...\n`);

for (const file of localeFiles) {
  const filePath = join(localesDir, file);
  let content = readFileSync(filePath, 'utf-8');

  // Remove toggleCollapseFocusedComment line
  const before = content;
  content = content.replace(/\s*toggleCollapseFocusedComment:\s*['"'].*?['"'],?\n/g, '');

  if (content !== before) {
    writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Removed from ${file}`);
  } else {
    console.log(`- No change needed for ${file}`);
  }
}

console.log('\n✅ Reverted inappropriate translations');
console.log('Note: Only English (en.ts) should have toggleCollapseFocusedComment');
console.log('Other languages should be translated by native speakers');
