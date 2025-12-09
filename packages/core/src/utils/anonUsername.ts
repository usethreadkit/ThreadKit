/**
 * Parse an anonymous username to extract the display name.
 * Anonymous usernames have the format: __anon-{10 random chars}-{optional user input}
 *
 * @param username The full username
 * @returns { isAnonymous: boolean, displayName: string } - display name and anonymous status
 */
export function parseAnonUsername(username: string): { isAnonymous: boolean; displayName: string } {
  if (!username.startsWith('__anon-')) {
    return { isAnonymous: false, displayName: username };
  }

  // Format: __anon-{10 chars}-{optional name}
  // Remove the __anon- prefix
  const withoutPrefix = username.slice(7);

  // Check if there's a user-chosen part after the random ID
  const dashIndex = withoutPrefix.indexOf('-');
  if (dashIndex >= 10) {
    // There's a user-chosen name after the 10-char random part
    const userPart = withoutPrefix.slice(dashIndex + 1);
    if (userPart) {
      return { isAnonymous: true, displayName: userPart };
    }
  }

  // No user-chosen name, just return "Guest"
  return { isAnonymous: true, displayName: '' };
}
