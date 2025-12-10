#!/usr/bin/env node

/**
 * Script to convert locale files from TranslationStrings to LocaleMetadata format
 * Adds rtl: false for LTR languages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '../src/locales');

// RTL languages (already converted)
const rtlLanguages = ['ar', 'he', 'fa'];

// Get all locale files
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const locale = file.replace('.ts', '');

  // Skip RTL languages (already converted)
  if (rtlLanguages.includes(locale)) {
    console.log(`Skipping ${locale} (already converted)`);
    continue;
  }

  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already converted
  if (content.includes('LocaleMetadata')) {
    console.log(`Skipping ${locale} (already uses LocaleMetadata)`);
    continue;
  }

  // Replace import
  content = content.replace(
    "import type { TranslationStrings } from '@threadkit/core';",
    "import type { LocaleMetadata } from '@threadkit/core';"
  );

  // Replace export declaration
  const exportRegex = new RegExp(`export const ${locale}: TranslationStrings = \\{`);
  content = content.replace(
    exportRegex,
    `export const ${locale}: LocaleMetadata = {\n  code: '${locale}',\n  rtl: false,\n  translations: {`
  );

  // Add closing brace for translations and metadata objects
  // Find the last closing brace and replace it with two closing braces
  const lastBraceIndex = content.lastIndexOf('};');
  if (lastBraceIndex !== -1) {
    content = content.slice(0, lastBraceIndex) + '  },\n};' + content.slice(lastBraceIndex + 2);
  }

  fs.writeFileSync(filePath, content);
  console.log(`✓ Converted ${locale}`);
}

console.log('\nDone!');
