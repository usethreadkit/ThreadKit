/**
 * Format a timestamp as a relative time string (e.g., "5 minutes ago")
 */
export function formatTimestamp(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

/**
 * Format a timestamp as a time string (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a timestamp as a date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Username Utilities
// ============================================================================

/** Maximum username length */
export const MAX_USERNAME_LENGTH = 24;

/** Minimum username length */
export const MIN_USERNAME_LENGTH = 1;

/**
 * Normalize a display name into a valid username.
 * Converts to lowercase, replaces spaces with hyphens, removes invalid characters.
 */
export function normalizeUsername(name: string): string {
  let result = '';
  let lastWasSeparator = true; // Prevent starting with separator

  for (const c of name) {
    if (/[a-zA-Z0-9]/.test(c)) {
      result += c.toLowerCase();
      lastWasSeparator = false;
    } else if (c === ' ' || c === '-' || c === '_') {
      // Convert spaces to hyphens, collapse consecutive separators
      if (!lastWasSeparator && result.length > 0) {
        result += '-';
        lastWasSeparator = true;
      }
    }
    // Skip all other characters
  }

  // Remove trailing separator
  while (result.endsWith('-') || result.endsWith('_')) {
    result = result.slice(0, -1);
  }

  // Truncate to max length
  if (result.length > MAX_USERNAME_LENGTH) {
    result = result.slice(0, MAX_USERNAME_LENGTH);
    // Make sure we didn't truncate mid-separator
    while (result.endsWith('-') || result.endsWith('_')) {
      result = result.slice(0, -1);
    }
  }

  return result;
}

/**
 * Validate a username format.
 * Returns null if valid, error message if invalid.
 */
export function validateUsername(username: string): string | null {
  if (username.length === 0) {
    return 'Username cannot be empty';
  }

  if (username.length > MAX_USERNAME_LENGTH) {
    return `Username must be ${MAX_USERNAME_LENGTH} characters or less`;
  }

  // Check for valid characters
  for (const c of username) {
    if (!/[a-zA-Z0-9\-_]/.test(c)) {
      return 'Username can only contain letters, numbers, hyphens, and underscores';
    }
  }

  // Check for leading/trailing separators
  if (username[0] === '-' || username[0] === '_') {
    return 'Username cannot start with a hyphen or underscore';
  }

  if (username[username.length - 1] === '-' || username[username.length - 1] === '_') {
    return 'Username cannot end with a hyphen or underscore';
  }

  // Check for consecutive separators
  let prevWasSeparator = false;
  for (const c of username) {
    const isSeparator = c === '-' || c === '_';
    if (isSeparator && prevWasSeparator) {
      return 'Username cannot have consecutive hyphens or underscores';
    }
    prevWasSeparator = isSeparator;
  }

  return null;
}
