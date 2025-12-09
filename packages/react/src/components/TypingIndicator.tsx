import type { TypingUser } from '@threadkit/core';
import { useTranslation } from '../i18n';
import { formatUsername } from '../utils/username';

interface TypingIndicatorProps {
  /** Users currently typing for this context */
  typingUsers: TypingUser[];
}

/**
 * Shows who is currently typing a reply.
 * Displays "{name} is replying..." for the first typing user.
 */
export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  const t = useTranslation();

  if (typingUsers.length === 0) {
    return null;
  }

  // Show the first typing user's name
  const firstName = formatUsername(typingUsers[0].userName, t);
  const text = t('isTyping').replace('{name}', firstName);

  return (
    <div className="threadkit-typing-indicator">
      <span className="threadkit-typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="threadkit-typing-text">{text}</span>
    </div>
  );
}
