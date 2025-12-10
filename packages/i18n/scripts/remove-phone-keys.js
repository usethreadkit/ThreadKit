/**
 * Remove unused phone/SMS-related translation keys from all locale files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const KEYS_TO_REMOVE = ['enterPhone', 'checkPhone', 'phonePlaceholder'];

// Get all locale files
const localeFiles = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.ts'));

console.log(`Found ${localeFiles.length} locale files`);
console.log(`Removing keys: ${KEYS_TO_REMOVE.join(', ')}\n`);

let totalRemoved = 0;

for (const file of localeFiles) {
  const filePath = path.join(LOCALES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let removed = 0;

  // Remove each key
  for (const key of KEYS_TO_REMOVE) {
    // Match the line with the key (handle single/double quotes and any value)
    const pattern = new RegExp(`^  ${key}: ['"'].*['"'],?\\n`, 'gm');
    const matches = content.match(pattern);
    if (matches) {
      content = content.replace(pattern, '');
      removed += matches.length;
    }
  }

  if (removed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${file}: removed ${removed} key(s)`);
    totalRemoved += removed;
  } else {
    console.log(`  ${file}: no keys found`);
  }
}

console.log(`\nTotal keys removed: ${totalRemoved}`);
