import { useTranslation } from '../i18n';

interface NewCommentsBannerProps {
  count: number;
  onClick: () => void;
}

export function NewCommentsBanner({ count, onClick }: NewCommentsBannerProps) {
  const t = useTranslation();

  if (count === 0) return null;

  // Simple interpolation for the translation string
  const text = t('loadNewComments')
    .replace('{n}', String(count))
    .replace('{n, plural, one {comment} other {comments}}', count === 1 ? 'comment' : 'comments');

  return (
    <button
      className="threadkit-new-comments-banner"
      onClick={onClick}
    >
      {text}
    </button>
  );
}
