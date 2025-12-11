import { useCallback, useState, useMemo } from 'react';
import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin } from '../types';
import type { TypingUser } from '@threadkit/core';
import { extractPinnedComments } from '@threadkit/core';
import { Comment } from './Comment';
import { PinnedMessage } from './PinnedMessage';
import { CommentForm } from './CommentForm';
import { SignInPrompt } from './SignInPrompt';
import { useTranslation } from '../i18n';
import { ScoreDisplayProvider } from '../contexts/ScoreDisplayContext';
import { useKeyboardShortcuts, getDefaultShortcuts } from '../hooks/useKeyboardShortcuts';
import { useAuth } from '../auth';

interface CommentsViewProps {
  comments: CommentType[];
  currentUser?: User;
  /** Whether the user needs to set their username before posting */
  needsUsername?: boolean;
  allowVoting?: boolean;
  sortBy?: SortBy;
  highlightedCommentId?: string | null;
  collapsedThreads?: Set<string>;
  apiUrl: string;
  projectId: string;
  /** List of pinned comment IDs with their pinned timestamps */
  pinnedIds?: Array<[string, number]>;
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
  /** Whether keyboard navigation shortcuts are enabled */
  keyboardNavigationEnabled?: boolean;
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
  allowVoting = true,
  sortBy = 'top',
  highlightedCommentId,
  collapsedThreads,
  apiUrl,
  projectId,
  pinnedIds = [],
  pendingRootCount = 0,
  pendingReplies,
  onLoadPendingComments,
  onLoadPendingReplies,
  typingByComment,
  keyboardNavigationEnabled = true,
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
  const { state: authState } = useAuth();
  const [focusedCommentId, setFocusedCommentId] = useState<string | null>(null);

  // Extract pinned comments
  const pinnedComments = useMemo(
    () => extractPinnedComments(comments, pinnedIds),
    [comments, pinnedIds]
  );

  // Navigate to a comment by scrolling it into view
  const handleNavigateToComment = useCallback((commentId: string) => {
    const element = document.querySelector(`[data-comment-id="${commentId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Briefly highlight the comment
      element.classList.add('threadkit-comment-highlight');
      setTimeout(() => element.classList.remove('threadkit-comment-highlight'), 2000);
    }
  }, []);

  const handleReply = useCallback(
    (parentId: string) => {
      onReplyStart?.(parentId);
    },
    [onReplyStart]
  );

  // Helper to get all visible comments in DOM order
  const getAllVisibleComments = useCallback(() => {
    // Get all comment elements in DOM order (visual order)
    // Include both expanded and collapsed comments for navigation
    return Array.from(document.querySelectorAll('.threadkit-comment'));
  }, []);

  // Wrap onPost to select the newly created comment
  const handlePost = useCallback(
    async (text: string, parentId?: string) => {
      // Get existing comment IDs before posting
      const existingIds = new Set(
        Array.from(document.querySelectorAll('.threadkit-comment'))
          .map(el => el.getAttribute('data-comment-id'))
          .filter(Boolean)
      );

      await onPost(text, parentId);

      // After posting, find the new comment by comparing IDs
      setTimeout(() => {
        const allComments = Array.from(document.querySelectorAll('.threadkit-comment'));

        // Find the comment that wasn't in the existing set
        for (const commentEl of allComments) {
          const commentId = commentEl.getAttribute('data-comment-id');
          if (commentId && !existingIds.has(commentId)) {
            // Found the new comment!
            setFocusedCommentId(commentId);
            commentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }, 300);
    },
    [onPost]
  );

  const handleCommentClick = useCallback((commentId: string) => {
    setFocusedCommentId(commentId);
  }, []);

  const toggleCollapse = useCallback(() => {
    console.log('toggleCollapse called', { focusedCommentId, hasOnCollapse: !!onCollapse, isCollapsed: focusedCommentId ? collapsedThreads?.has(focusedCommentId) : null });
    if (!focusedCommentId || !onCollapse) return;
    console.log('Toggling collapse for:', focusedCommentId);
    onCollapse(focusedCommentId);
  }, [focusedCommentId, onCollapse, collapsedThreads]);

  const upvoteComment = useCallback(() => {
    if (!focusedCommentId || !onVote) return;
    onVote(focusedCommentId, 'up');
  }, [focusedCommentId, onVote]);

  const downvoteComment = useCallback(() => {
    if (!focusedCommentId || !onVote) return;
    onVote(focusedCommentId, 'down');
  }, [focusedCommentId, onVote]);

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
    // Use ID selector to get the exact comment (not collapsed duplicates)
    const commentEl = document.getElementById(`threadkit-${focusedCommentId}`);
    if (!commentEl) return;

    // Find the comment's own action buttons (not from nested comments)
    // Use specific path to avoid selecting nested comment buttons
    const commentMain = commentEl.querySelector(':scope > .threadkit-comment-wrapper > .threadkit-comment-content > .threadkit-comment-main');
    if (!commentMain) return;

    const buttons = Array.from(commentMain.querySelectorAll('.threadkit-action-btn')) as HTMLButtonElement[];
    const editBtn = buttons.find(btn => btn.textContent?.toLowerCase().trim().includes('edit'));
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
    // Use ID selector to get the exact comment (not collapsed duplicates)
    const commentEl = document.getElementById(`threadkit-${focusedCommentId}`);
    if (!commentEl) return;

    // Find the comment's own action buttons (not from nested comments)
    // Use specific path to avoid selecting nested comment buttons
    const commentMain = commentEl.querySelector(':scope > .threadkit-comment-wrapper > .threadkit-comment-content > .threadkit-comment-main');
    if (!commentMain) return;

    const buttons = Array.from(commentMain.querySelectorAll('.threadkit-action-btn')) as HTMLButtonElement[];
    const replyBtn = buttons.find(btn => btn.textContent?.toLowerCase().trim().includes('reply'));
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
    // Use ID selector to get the exact comment (not collapsed duplicates)
    const commentEl = document.getElementById(`threadkit-${focusedCommentId}`);
    if (!commentEl) return;

    // Find the comment's own action buttons (not from nested comments)
    // Use specific path to avoid selecting nested comment buttons
    const commentMain = commentEl.querySelector(':scope > .threadkit-comment-wrapper > .threadkit-comment-content > .threadkit-comment-main');
    if (!commentMain) return;

    const buttons = Array.from(commentMain.querySelectorAll('.threadkit-action-btn')) as HTMLButtonElement[];
    const deleteBtn = buttons.find(btn => btn.textContent?.toLowerCase().trim().includes('delete'));
    deleteBtn?.click();
  }, [focusedCommentId]);

  const confirmYes = useCallback(() => {
    // Find any visible confirmation dialog and click "Yes"
    const yesBtn = document.querySelector('.threadkit-confirm-yes') as HTMLButtonElement;
    if (!yesBtn) return;

    // If we have a focused comment, remember the previous one to select after deletion
    if (focusedCommentId) {
      const allComments = getAllVisibleComments();
      const currentIndex = allComments.findIndex(el => el.getAttribute('data-comment-id') === focusedCommentId);

      // Find the previous comment to select after deletion
      let nextFocusId: string | null = null;
      if (currentIndex > 0) {
        nextFocusId = allComments[currentIndex - 1].getAttribute('data-comment-id');
      } else if (currentIndex === 0 && allComments.length > 1) {
        // If deleting first comment, select the new first comment (what was second)
        nextFocusId = allComments[1].getAttribute('data-comment-id');
      }

      yesBtn.click();

      // After deletion, set focus to the next comment
      // Use longer timeout to ensure React has re-rendered and DOM is updated
      if (nextFocusId) {
        setTimeout(() => {
          setFocusedCommentId(nextFocusId);
          // Wait a bit more for the focused class to be applied
          setTimeout(() => {
            const nextEl = document.querySelector(`[data-comment-id="${nextFocusId}"]`);
            nextEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }, 300);
      } else {
        // No comments left, clear focus
        setFocusedCommentId(null);
      }
    } else {
      yesBtn.click();
    }
  }, [focusedCommentId, getAllVisibleComments]);

  const confirmNo = useCallback(() => {
    // Find any visible confirmation dialog and click "No"
    const noBtn = document.querySelector('.threadkit-confirm-no') as HTMLButtonElement;
    noBtn?.click();
  }, []);

  const cancelAction = useCallback(() => {
    // First check for confirmation dialogs
    const noBtn = document.querySelector('.threadkit-confirm-no') as HTMLButtonElement;
    if (noBtn) {
      noBtn.click();
      return;
    }

    // Then check for cancel buttons in edit/reply forms
    // Note: The forms should preserve text when closed and reopened
    const cancelBtn = document.querySelector('.threadkit-cancel-btn') as HTMLButtonElement;
    if (cancelBtn) {
      cancelBtn.click();
      return;
    }
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
    cancelAction,
    toggleCollapse,
    upvote: upvoteComment,
    downvote: downvoteComment,
  }), [focusInput, nextComment, prevComment, editComment, replyToComment, deleteComment, confirmYes, confirmNo, cancelAction, toggleCollapse, upvoteComment, downvoteComment]);

  useKeyboardShortcuts({ shortcuts, enabled: keyboardNavigationEnabled });

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
              apiUrl={apiUrl}
              projectId={projectId}
              token={authState.token || undefined}
            />
          ) : (
            <SignInPrompt apiUrl={apiUrl} projectId={projectId} />
          )}
        </div>

        {pinnedComments.length > 0 && (
          <div className="threadkit-pinned-section">
            {pinnedComments.map((comment) => (
              <PinnedMessage
                key={comment.id}
                comment={comment}
                onNavigate={handleNavigateToComment}
              />
            ))}
          </div>
        )}

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
                token={authState.token || undefined}
                index={index}
                totalSiblings={comments.length}
                highlighted={highlightedCommentId === comment.id}
                collapsed={collapsedThreads?.has(comment.id)}
                pendingRepliesCount={pendingReplies?.get(comment.id)?.length ?? 0}
                onLoadPendingReplies={onLoadPendingReplies}
                typingByComment={typingByComment}
                onPost={handlePost}
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
                onCommentClick={handleCommentClick}
              />
            ))}
          </div>
        )}
      </div>
    </ScoreDisplayProvider>
  );
}
