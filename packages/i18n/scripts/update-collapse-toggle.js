#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesDir = join(__dirname, '../src/locales');

// Get all locale files
const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.ts'));

console.log(`Updating ${localeFiles.length} locale files...`);

for (const file of localeFiles) {
  const filePath = join(localesDir, file);
  let content = readFileSync(filePath, 'utf-8');

  // Remove collapseFocusedComment and expandFocusedComment
  content = content.replace(/\s*collapseFocusedComment:\s*['"'].*?['"'],?\n/g, '');
  content = content.replace(/\s*expandFocusedComment:\s*['"'].*?['"'],?\n/g, '');

  // Add toggleCollapseFocusedComment after deleteFocusedComment
  if (!content.includes('toggleCollapseFocusedComment')) {
    content = content.replace(
      /(deleteFocusedComment:\s*['"'].*?['"'],?)\n/,
      "$1\n  toggleCollapseFocusedComment: 'Toggle collapse',\n"
    );
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Updated ${file}`);
}

console.log('\nDone! All locale files updated.');
console.log('Note: toggleCollapseFocusedComment has been set to English "Toggle collapse".');
console.log('Please translate this string for each language as needed.');
