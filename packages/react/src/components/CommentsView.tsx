import { useCallback } from 'react';
import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin } from '../types';
import type { TypingUser } from '@threadkit/core';
import { Comment } from './Comment';
import { CommentForm } from './CommentForm';
import { SignInPrompt } from './SignInPrompt';
import { NewCommentsBanner } from './NewCommentsBanner';
import { useTranslation } from '../i18n';
import { ScoreDisplayProvider } from '../contexts/ScoreDisplayContext';

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
  toolbarEnd?: React.ReactNode;
  plugins?: ThreadKitPlugin[];
}

type SortOptionKey = 'sortTop' | 'sortNew' | 'sortControversial' | 'sortOld';
const SORT_OPTIONS: { value: SortBy; key: SortOptionKey }[] = [
  { value: 'votes', key: 'sortTop' },
  { value: 'newest', key: 'sortNew' },
  { value: 'controversial', key: 'sortControversial' },
  { value: 'oldest', key: 'sortOld' },
];

export function CommentsView({
  comments,
  currentUser,
  needsUsername = false,
  maxDepth = 5,
  allowVoting = true,
  sortBy = 'votes',
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
  toolbarEnd,
  plugins,
}: CommentsViewProps) {
  const t = useTranslation();

  const handleReply = useCallback(
    (parentId: string) => {
      onReplyStart?.(parentId);
    },
    [onReplyStart]
  );

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
            />
          ) : (
            <SignInPrompt apiUrl={apiUrl} projectId={projectId} />
          )}
        </div>

        {pendingRootCount > 0 && onLoadPendingComments && (
          <NewCommentsBanner
            count={pendingRootCount}
            onClick={onLoadPendingComments}
          />
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
                  plugins={plugins}
                  highlightedCommentId={highlightedCommentId}
                  collapsedThreads={collapsedThreads}
                  pendingReplies={pendingReplies}
                />
            ))}
          </div>
        )}
      </div>
    </ScoreDisplayProvider>
  );
}
