#!/usr/bin/env node

/**
 * Build-time validation script for translation completeness.
 * Ensures all locale files have all required translation keys.
 *
 * Run with: node scripts/validate-translations.js
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '../dist/locales');

// All required keys from TranslationStrings interface
const REQUIRED_KEYS = [
  // Common actions
  'post', 'cancel', 'save', 'edit', 'delete', 'reply', 'report', 'share',
  'block', 'unblock', 'ban', 'send', 'verify', 'continue', 'close', 'submit',
  'yes', 'no', 'prev', 'next', 'back',
  // Loading states
  'loading', 'loadingComments', 'posting', 'signingInWith',
  // Empty states
  'noComments', 'noNotifications', 'noBlockedUsers',
  // Sorting
  'sortedBy', 'sortTop', 'sortNew', 'sortControversial', 'sortOld',
  // Comment form
  'writeComment', 'writeReply', 'formattingHelp', 'markdownSupported', 'youType', 'youSee',
  // Voting
  'upvote', 'downvote', 'point', 'points',
  // Threading
  'expandComment', 'collapseComment', 'child', 'children',
  // Badges
  'pinned',
  // Confirmations
  'deleteConfirm', 'blockConfirm', 'banConfirm',
  // Report reasons
  'reportSpam', 'reportHarassment', 'reportHateSpeech', 'reportMisinformation',
  'reportOther', 'selectReason', 'reportSubmitted',
  // Chat
  'typeMessage', 'signInToChat', 'personOnline', 'peopleOnline',
  'personTyping', 'peopleTyping',
  // Settings
  'settings', 'signIn', 'signOut', 'changeAvatar', 'theme', 'blockedUsers',
  'notifications', 'emailOnReplies', 'emailOnMentions', 'weeklyDigest',
  'deleteAccount', 'accountDeleted', 'holdToDelete', 'holdForSeconds',
  // Username
  'usernameTaken', 'usernameAvailable', 'checking',
  // Auth - general
  'signInToPost', 'signInLabel', 'continueWith', 'chooseSignInMethod',
  // Auth - OTP
  'enterEmail', 'enterPhone', 'sendCode', 'checkEmail', 'checkPhone',
  'enterCode', 'codeSentTo', 'invalidCode', 'verificationFailed',
  'weWillSendCode', 'emailPlaceholder', 'phonePlaceholder', 'otpPlaceholder',
  // Auth - name input
  'welcome', 'chooseDisplayName', 'yourName',
  // Auth - OAuth
  'popupShouldOpen', 'completingSignIn',
  // Auth - Web3
  'connectingTo',
  // User profile
  'karma', 'comments', 'joined',
  // Time formatting
  'justNow', 'minutesAgo', 'hoursAgo', 'daysAgo',
  // Notifications
  'markAllRead',
  // Errors
  'failedToPost', 'failedToVote', 'failedToDelete', 'failedToEdit',
  'failedToBan', 'failedToBlock', 'failedToUnblock', 'failedToReport',
  'failedToPin', 'failedToFetchAuthMethods', 'failedToStartLogin', 'failedToSendOtp',
  // Error pages
  'siteNotConfigured', 'siteNotConfiguredMessage', 'invalidApiKey',
  'invalidApiKeyMessage', 'rateLimited', 'rateLimitedMessage',
  'failedToLoadComments', 'tryAgainLater',
  // Branding
  'poweredByThreadKit',
];

async function validateTranslations() {
  console.log('🔍 Validating translation completeness...\n');

  let hasErrors = false;
  const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.js'));

  for (const file of localeFiles) {
    const localeName = file.replace('.js', '');
    const localePath = join(localesDir, file);

    try {
      // Dynamic import the built locale file
      const localeModule = await import(`file://${localePath}`);
      const localeMetadata = localeModule[localeName];

      if (!localeMetadata) {
        console.error(`❌ ${localeName}: Could not find export '${localeName}'`);
        hasErrors = true;
        continue;
      }

      // Extract translations from LocaleMetadata structure
      const translations = localeMetadata.translations || localeMetadata;

      const missingKeys = REQUIRED_KEYS.filter(key => !(key in translations));
      const extraKeys = Object.keys(translations).filter(key => !REQUIRED_KEYS.includes(key));

      if (missingKeys.length === 0) {
        console.log(`✅ ${localeName}: All ${REQUIRED_KEYS.length} keys present`);
      } else {
        console.error(`❌ ${localeName}: Missing ${missingKeys.length} keys:`);
        missingKeys.forEach(key => console.error(`   - ${key}`));
        hasErrors = true;
      }

      if (extraKeys.length > 0) {
        console.warn(`⚠️  ${localeName}: Has ${extraKeys.length} extra keys:`);
        extraKeys.forEach(key => console.warn(`   - ${key}`));
      }
    } catch (err) {
      console.error(`❌ ${localeName}: Failed to load - ${err.message}`);
      hasErrors = true;
    }
  }

  console.log('');

  if (hasErrors) {
    console.error('❌ Validation failed! Some translations are incomplete.');
    process.exit(1);
  } else {
    console.log('✅ All translations are complete!');
  }
}

validateTranslations().catch(err => {
  console.error('Validation error:', err);
  process.exit(1);
});
