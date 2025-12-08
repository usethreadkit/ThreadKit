import { useTranslation } from '../i18n';

interface NewRepliesIndicatorProps {
  count: number;
  onClick: () => void;
}

export function NewRepliesIndicator({ count, onClick }: NewRepliesIndicatorProps) {
  const t = useTranslation();

  if (count === 0) return null;

  // Simple interpolation for the translation string
  const text = t('loadNewReplies')
    .replace('{n}', String(count))
    .replace('{n, plural, one {reply} other {replies}}', count === 1 ? 'reply' : 'replies');

  return (
    <button
      className="threadkit-new-replies-indicator"
      onClick={onClick}
    >
      {text}
    </button>
  );
}
