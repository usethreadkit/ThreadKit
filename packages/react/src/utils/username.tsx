import { parseAnonUsername } from '@threadkit/core';
import type { TranslatorFunction } from '../i18n';

/**
 * Format a username for display (returns plain string).
 * Converts anonymous usernames to their display name or "Guest".
 * Use this for non-JSX contexts (tooltips, placeholders, etc.)
 */
export function formatUsername(userName: string, t: TranslatorFunction): string {
  const { isAnonymous, displayName } = parseAnonUsername(userName);

  if (!isAnonymous) {
    return userName;
  }

  return displayName || t('guest');
}

/**
 * Render a username with proper formatting and guest badge.
 * Use this for JSX contexts (rendering in UI).
 */
export function GuestAwareUsername({ userName, t }: { userName: string; t: TranslatorFunction }) {
  const { isAnonymous, displayName } = parseAnonUsername(userName);

  if (!isAnonymous) {
    return <>{userName}</>;
  }

  // Show display name or "Anonymous", always with "Guest" badge
  return (
    <span className="threadkit-guest-author">
      {displayName || t('anonymous')}
      <span className="threadkit-guest-badge">{t('guest')}</span>
    </span>
  );
}
