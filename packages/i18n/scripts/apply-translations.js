#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { missingTranslations } from './missing-translations.js';

const localesDir = join(process.cwd(), 'src', 'locales');
const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.ts'));

for (const filename of localeFiles) {
  const localeCode = filename.replace('.ts', '');

  if (localeCode === 'en') {
    console.log(`✓ Skipping ${filename} (already updated)`);
    continue;
  }

  const translations = missingTranslations[localeCode];
  if (!translations) {
    console.log(`⚠ No translations found for ${localeCode}, skipping`);
    continue;
  }

  console.log(`Processing ${filename}...`);
  const filePath = join(localesDir, filename);
  let content = readFileSync(filePath, 'utf8');

  // Check if already has the keys
  if (content.includes('signInToVote:') && content.includes('guestNamePlaceholder:') && content.includes('loadNewComments:')) {
    console.log(`  ✓ Already has all keys`);
    continue;
  }

  // Add signInToVote after the comment "// Auth - general" but before signInToPost
  if (!content.includes('signInToVote:')) {
    content = content.replace(
      /(\/\/ Auth - general[\s\S]*?)(signInToPost:)/,
      `$1signInToVote: '${translations.signInToVote}',\n  $2`
    );
  }

  // Add Auth - Anonymous section after Auth - Web3
  if (!content.includes('// Auth - Anonymous')) {
    content = content.replace(
      /(connectingTo: '[^']*',)\n\n(  \/\/ User profile)/,
      `$1\n\n  // Auth - Anonymous\n  guestNamePlaceholder: '${translations.guestNamePlaceholder}',\n  continueAsGuest: '${translations.continueAsGuest}',\n  guest: '${translations.guest}',\n  anonymous: '${translations.anonymous}',\n\n$2`
    );
  }

  // Add Real-time updates section before closing brace
  if (!content.includes('// Real-time updates')) {
    content = content.replace(
      /(poweredByThreadKit: '[^']*',)\n};/,
      `$1\n\n  // Real-time updates\n  loadNewComments: '${translations.loadNewComments}',\n  loadNewReplies: '${translations.loadNewReplies}',\n  isTyping: '${translations.isTyping}',\n};`
    );
  }

  writeFileSync(filePath, content, 'utf8');
  console.log(`  ✓ Updated with proper translations`);
}

console.log('\n✅ Done! All locale files updated.');
