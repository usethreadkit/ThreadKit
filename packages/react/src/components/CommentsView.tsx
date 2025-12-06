import { useCallback } from 'react';
import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin } from '../types';
import { Comment } from './Comment';
import { CommentForm } from './CommentForm';

interface CommentsViewProps {
  comments: CommentType[];
  currentUser?: User;
  maxDepth?: number;
  allowVoting?: boolean;
  sortBy?: SortBy;
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
  getUserProfile?: (userId: string) => UserProfile | undefined;
  toolbarEnd?: React.ReactNode;
  plugins?: ThreadKitPlugin[];
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'votes', label: 'top' },
  { value: 'newest', label: 'new' },
  { value: 'controversial', label: 'controversial' },
  { value: 'oldest', label: 'old' },
];

export function CommentsView({
  comments,
  currentUser,
  maxDepth = 5,
  allowVoting = true,
  sortBy = 'votes',
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
  getUserProfile,
  toolbarEnd,
  plugins,
}: CommentsViewProps) {
  const handleReply = useCallback(
    (_parentId: string) => {
      // Reply form is handled inside Comment component
    },
    []
  );

  return (
    <div className="threadkit-comments">
      <div className="threadkit-toolbar">
        {onSortChange && (
          <div className="threadkit-sort">
            <span className="threadkit-sort-label">sorted by:</span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`threadkit-sort-option ${sortBy === option.value ? 'active' : ''}`}
                onClick={() => onSortChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
        {toolbarEnd}
      </div>
      <div className="threadkit-comments-header">
        <CommentForm
          placeholder={currentUser ? 'Write a comment...' : 'Sign in to comment'}
          onSubmit={onPost}
        />
      </div>

      {comments.length === 0 ? (
        <div className="threadkit-empty">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="threadkit-comment-list">
          {comments.map((comment, index) => (
            <Comment
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              maxDepth={maxDepth}
              index={index}
              totalSiblings={comments.length}
              onReply={handleReply}
              onVote={allowVoting ? onVote : undefined}
              onDelete={onDelete}
              onEdit={onEdit}
              onBan={onBan}
              onPin={onPin}
              onBlock={onBlock}
              onReport={onReport}
              onPermalink={onPermalink}
              getUserProfile={getUserProfile}
              plugins={plugins}
            />
          ))}
        </div>
      )}
    </div>
  );
}
