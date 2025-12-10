#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesDir = join(__dirname, '../src/locales');
const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.ts'));

console.log('Fixing formatting issues...\n');

for (const file of localeFiles) {
  const filePath = join(localesDir, file);
  let content = readFileSync(filePath, 'utf-8');

  // Fix line 122 formatting - split properties that got merged
  content = content.replace(
    /(deleteFocusedComment:\s*['"'].*?['"']),\s*(upvoteFocusedComment:)/g,
    '$1,\n  $2'
  );

  content = content.replace(
    /(upvoteFocusedComment:\s*['"'].*?['"']),\s*(downvoteFocusedComment:)/g,
    '$1,\n  $2'
  );

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Fixed ${file}`);
}

console.log('\n✅ Formatting fixed!');
