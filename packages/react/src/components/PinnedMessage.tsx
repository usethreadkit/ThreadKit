import type { Comment } from '../types';
import { formatTimestamp } from '@threadkit/core';
import { renderMarkdown } from '../utils/markdown';
import { GuestAwareUsername } from '../utils/username';
import { useTranslation } from '../i18n';
import { UserHoverCard } from './UserHoverCard';

interface PinnedMessageProps {
  comment: Comment;
  onNavigate: (commentId: string) => void;
}

export function PinnedMessage({ comment, onNavigate }: PinnedMessageProps) {
  const t = useTranslation();

  return (
    <div className="threadkit-pinned-message">
      <div className="threadkit-pinned-badge">
        <svg className="threadkit-icon" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z"/>
        </svg>
        {t('pinned')}
      </div>

      <div className="threadkit-pinned-header">
        <UserHoverCard userId={comment.userId}>
          <span className="threadkit-comment-author">
            <GuestAwareUsername userName={comment.userName} t={t} />
          </span>
        </UserHoverCard>
        <span className="threadkit-comment-meta">
          <span className="threadkit-comment-time">{formatTimestamp(comment.timestamp)}</span>
          {comment.edited && <span className="threadkit-comment-edited">*</span>}
        </span>
      </div>

      <div
        className="threadkit-comment-text"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(comment.html || comment.text) as string }}
      />

      <div className="threadkit-pinned-footer">
        <button
          className="threadkit-action-btn"
          onClick={() => onNavigate(comment.id)}
          type="button"
        >
          <svg className="threadkit-icon" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
          </svg>
          Go to comment
        </button>
      </div>
    </div>
  );
}
