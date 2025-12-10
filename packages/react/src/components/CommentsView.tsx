import { useCallback, useState, useMemo } from 'react';
import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin } from '../types';
import type { TypingUser } from '@threadkit/core';
import { Comment } from './Comment';
import { CommentForm } from './CommentForm';
import { SignInPrompt } from './SignInPrompt';
import { useTranslation } from '../i18n';
import { ScoreDisplayProvider } from '../contexts/ScoreDisplayContext';
import { useKeyboardShortcuts, getDefaultShortcuts } from '../hooks/useKeyboardShortcuts';

interface CommentsViewProps {
  comments: CommentType[];
  currentUser?: User;
  /** Whether the user needs to set their username before posting */
  needsUsername?: boolean;
  maxDepth?: number;
  allowVoting?: boolean;
  sortBy?: SortBy;
  highlightedCommentId?: string | null;
  collapsedThreads?: Set<string>;
  apiUrl: string;
  projectId: string;
  /** Number of pending root-level comments waiting to be loaded */
  pendingRootCount?: number;
  /** Map of parent comment ID -> pending replies for that comment */
  pendingReplies?: Map<string, CommentType[]>;
  /** Handler to load all pending root comments */
  onLoadPendingComments?: () => void;
  /** Handler to load pending replies for a specific comment */
  onLoadPendingReplies?: (parentId: string) => void;
  /** Map of comment ID (or null for root) -> users typing for that context */
  typingByComment?: Map<string | null, TypingUser[]>;
  onSortChange?: (sort: SortBy) => void;
  onPost: (text: string, parentId?: string) => Promise<void>;
  onVote?: (commentId: string, voteType: 'up' | 'down') => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onBan?: (userId: string) => void;
  onPin?: (commentId: string) => void;
  onBlock?: (userId: string) => void;
  onReport?: (commentId: string) => void;
  onPermalink?: (commentId: string) => void;
  onCollapse?: (commentId: string) => void;
  onReplyStart?: (parentId: string) => void;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  fetchUserProfile?: (userId: string) => Promise<void>;
  toolbarEnd?: React.ReactNode;
  plugins?: ThreadKitPlugin[];
}

type SortOptionKey = 'sortTop' | 'sortNew' | 'sortControversial' | 'sortOld';
const SORT_OPTIONS: { value: SortBy; key: SortOptionKey }[] = [
  { value: 'top', key: 'sortTop' },
  { value: 'new', key: 'sortNew' },
  { value: 'controversial', key: 'sortControversial' },
  { value: 'old', key: 'sortOld' },
];

export function CommentsView({
  comments,
  currentUser,
  needsUsername = false,
  maxDepth = 5,
  allowVoting = true,
  sortBy = 'top',
  highlightedCommentId,
  collapsedThreads,
  apiUrl,
  projectId,
  pendingRootCount = 0,
  pendingReplies,
  onLoadPendingComments,
  onLoadPendingReplies,
  typingByComment,
  onSortChange,
  onPost,
  onVote,
  onDelete,
  onEdit,
  onBan,
  onPin,
  onBlock,
  onReport,
  onPermalink,
  onCollapse,
  onReplyStart,
  getUserProfile,
  fetchUserProfile,
  toolbarEnd,
  plugins,
}: CommentsViewProps) {
  const t = useTranslation();
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);

  const handleReply = useCallback(
    (parentId: string) => {
      onReplyStart?.(parentId);
    },
    [onReplyStart]
  );

  // Keyboard navigation helpers
  const getAllVisibleComments = useCallback(() => {
    // Get all comment elements in DOM order (visual order)
    return Array.from(document.querySelectorAll('.threadkit-comment:not(.threadkit-comment-collapsed)'));
  }, []);

  // Keyboard navigation handlers
  const focusInput = useCallback(() => {
    const textarea = document.querySelector('.threadkit-comment-form textarea') as HTMLTextAreaElement;
    textarea?.focus();
    setFocusedCommentId(null);
  }, []);

  const nextComment = useCallback(() => {
    const allComments = getAllVisibleComments();
    if (allComments.length === 0) return;

    if (!focusedCommentId) {
      // Focus first comment
      const firstId = allComments[0].getAttribute('data-comment-id');
      if (firstId) {
        setFocusedCommentId(firstId);
        allComments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Find current comment and move to next
    const currentIndex = allComments.findIndex(el => el.getAttribute('data-comment-id') === focusedCommentId);
    if (currentIndex >= 0 && currentIndex < allComments.length - 1) {
      const nextId = allComments[currentIndex + 1].getAttribute('data-comment-id');
      if (nextId) {
        setFocusedCommentId(nextId);
        allComments[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedCommentId, getAllVisibleComments]);

  const prevComment = useCallback(() => {
    const allComments = getAllVisibleComments();
    if (allComments.length === 0) return;

    if (!focusedCommentId) return;

    // Find current comment and move to previous
    const currentIndex = allComments.findIndex(el => el.getAttribute('data-comment-id') === focusedCommentId);
    if (currentIndex > 0) {
      const prevId = allComments[currentIndex - 1].getAttribute('data-comment-id');
      if (prevId) {
        setFocusedCommentId(prevId);
        allComments[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (currentIndex === 0) {
      // Go back to input
      focusInput();
    }
  }, [focusedCommentId, getAllVisibleComments, focusInput]);

  const editComment = useCallback(() => {
    if (!focusedCommentId) return;
    const commentEl = document.querySelector(`[data-comment-id="${focusedCommentId}"]`);
    if (!commentEl) return;

    // Find and click the edit button
    const editBtn = commentEl.querySelector('[title*="dit"]') as HTMLButtonElement;
    if (editBtn) {
      editBtn.click();
      // Auto-focus the edit textarea after a short delay
      setTimeout(() => {
        const textarea = commentEl.querySelector('textarea') as HTMLTextAreaElement;
        textarea?.focus();
      }, 100);
    }
  }, [focusedCommentId]);

  const replyToComment = useCallback(() => {
    if (!focusedCommentId) return;
    const commentEl = document.querySelector(`[data-comment-id="${focusedCommentId}"]`);
    if (!commentEl) return;

    // Find and click the reply button
    const replyBtn = commentEl.querySelector('[title*="eply"]') as HTMLButtonElement;
    if (replyBtn) {
      replyBtn.click();
      // Auto-focus the reply textarea after a short delay
      setTimeout(() => {
        const textarea = commentEl.querySelector('.threadkit-comment-form textarea') as HTMLTextAreaElement;
        textarea?.focus();
      }, 100);
    }
  }, [focusedCommentId]);

  const deleteComment = useCallback(() => {
    if (!focusedCommentId) return;
    const commentEl = document.querySelector(`[data-comment-id="${focusedCommentId}"]`);
    if (!commentEl) return;

    // Find and click the delete button
    const deleteBtn = commentEl.querySelector('[title*="elete"]') as HTMLButtonElement;
    deleteBtn?.click();
  }, [focusedCommentId]);

  const confirmYes = useCallback(() => {
    // Find any visible confirmation dialog and click "Yes"
    const yesBtn = document.querySelector('.threadkit-confirm-yes') as HTMLButtonElement;
    yesBtn?.click();
  }, []);

  const confirmNo = useCallback(() => {
    // Find any visible confirmation dialog and click "No"
    const noBtn = document.querySelector('.threadkit-confirm-no') as HTMLButtonElement;
    noBtn?.click();
  }, []);

  // Setup keyboard shortcuts
  const shortcuts = useMemo(() => getDefaultShortcuts({
    focusInput,
    nextComment,
    prevComment,
    editComment,
    replyToComment,
    deleteComment,
    confirmYes,
    confirmNo,
  }), [focusInput, nextComment, prevComment, editComment, replyToComment, deleteComment, confirmYes, confirmNo]);

  useKeyboardShortcuts({ shortcuts });

  return (
    <ScoreDisplayProvider>
      <div className="threadkit-comments">
        <div className="threadkit-toolbar">
          {onSortChange && (
            <div className="threadkit-sort">
              <span className="threadkit-sort-label">{t('sortedBy')}</span>
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`threadkit-sort-option ${sortBy === option.value ? 'active' : ''}`}
                  onClick={() => onSortChange(option.value)}
                >
                  {t(option.key)}
                </button>
              ))}
            </div>
          )}
          {toolbarEnd}
        </div>
        <div className="threadkit-comments-header">
          {currentUser && !needsUsername ? (
            <CommentForm
              placeholder={t('writeComment')}
              onSubmit={onPost}
              pendingCount={pendingRootCount}
              onLoadPending={onLoadPendingComments}
            />
          ) : (
            <SignInPrompt apiUrl={apiUrl} projectId={projectId} />
          )}
        </div>

        {comments.length === 0 ? (
          <div className="threadkit-empty">
            {t('noComments')}
          </div>
        ) : (
          <div className="threadkit-comment-list">
            {comments.map((comment, index) => (
              <Comment
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                needsUsername={needsUsername}
                apiUrl={apiUrl}
                projectId={projectId}
                maxDepth={maxDepth}
                index={index}
                totalSiblings={comments.length}
                highlighted={highlightedCommentId === comment.id}
                collapsed={collapsedThreads?.has(comment.id)}
                pendingRepliesCount={pendingReplies?.get(comment.id)?.length ?? 0}
                onLoadPendingReplies={onLoadPendingReplies}
                typingByComment={typingByComment}
                onPost={onPost}
                onReply={handleReply}
                onVote={allowVoting ? onVote : undefined}
                onDelete={onDelete}
                onEdit={onEdit}
                onBan={onBan}
                onPin={onPin}
                onBlock={onBlock}
                onReport={onReport}
                onPermalink={onPermalink}
                onCollapse={onCollapse}
                getUserProfile={getUserProfile}
                fetchUserProfile={fetchUserProfile}
                plugins={plugins}
                highlightedCommentId={highlightedCommentId}
                collapsedThreads={collapsedThreads}
                pendingReplies={pendingReplies}
                focusedCommentId={focusedCommentId}
              />
            ))}
          </div>
        )}
      </div>
    </ScoreDisplayProvider>
  );
}
