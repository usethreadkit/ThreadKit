import { useState } from 'react';
import type { CommentProps } from '../types';
import { CommentForm } from './CommentForm';
import { UserHoverCard } from './UserHoverCard';
import { parseMarkdown } from '../utils/markdown';

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Hate speech',
  'Misinformation',
  'Other',
] as const;

function formatTimestamp(timestamp: number): string {
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

export function Comment({
  comment,
  currentUser,
  depth = 0,
  maxDepth = 5,
  collapsed: initialCollapsed = false,
  index = 0,
  totalSiblings = 1,
  onReply,
  onVote,
  onDelete,
  onEdit,
  onBan,
  onBlock,
  onReport,
  onPermalink,
  onPrev,
  onNext,
  onCollapse,
  getUserProfile,
  plugins,
}: CommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [confirmingAction, setConfirmingAction] = useState<'block' | 'delete' | 'ban' | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  const upvotes = comment.upvotes.length;
  const downvotes = comment.downvotes.length;
  const score = upvotes - downvotes;
  const hasUpvoted = currentUser && comment.upvotes.includes(currentUser.id);
  const hasDownvoted = currentUser && comment.downvotes.includes(currentUser.id);
  const isModOrAdmin = currentUser?.isModerator || currentUser?.isAdmin;
  const isOwnComment = currentUser && comment.userId === currentUser.id;

  const handleReply = async () => {
    onReply?.(comment.id);
    setShowReplyForm(false);
  };

  const handleCollapse = () => {
    setCollapsed(!collapsed);
    onCollapse?.(comment.id);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== comment.text) {
      onEdit?.(comment.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(comment.text);
    setIsEditing(false);
  };

  if (collapsed) {
    return (
      <div className="threadkit-comment threadkit-comment-collapsed">
        <button
          className="threadkit-expand-btn"
          onClick={handleCollapse}
          title="Expand comment"
        >
          [+]
        </button>
        <UserHoverCard
          userName={comment.userName}
          userId={comment.userId}
          getUserProfile={getUserProfile}
        >
          <span className="threadkit-author">{comment.userName}</span>
        </UserHoverCard>
        <span className="threadkit-collapsed-info">
          {score} point{score !== 1 ? 's' : ''} · {formatTimestamp(comment.timestamp)}
          {comment.children.length > 0 && ` · ${comment.children.length} ${comment.children.length === 1 ? 'child' : 'children'}`}
        </span>
      </div>
    );
  }

  return (
    <div className="threadkit-comment">
      <div className="threadkit-comment-wrapper">
        {/* Vote column */}
        {onVote && (
          <div className="threadkit-vote-column">
            <button
              className={`threadkit-vote-btn threadkit-vote-up ${hasUpvoted ? 'active' : ''}`}
              onClick={() => onVote(comment.id, 'up')}
              aria-label="Upvote"
            >
              ▲
            </button>
            <button
              className={`threadkit-vote-btn threadkit-vote-down ${hasDownvoted ? 'active' : ''}`}
              onClick={() => onVote(comment.id, 'down')}
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>
        )}

        {/* Content column */}
        <div className="threadkit-comment-content">
          {/* Header line */}
          <div className="threadkit-comment-header">
            <UserHoverCard
              userName={comment.userName}
              userId={comment.userId}
              getUserProfile={getUserProfile}
            >
              <span className="threadkit-author">{comment.userName}</span>
            </UserHoverCard>

            <span className="threadkit-score">
              {score} point{score !== 1 ? 's' : ''}
              <span className="threadkit-score-breakdown">
                (+{upvotes}/-{downvotes})
              </span>
            </span>

            <span className="threadkit-timestamp">
              {formatTimestamp(comment.timestamp)}
            </span>

            {comment.edited && <span className="threadkit-edited">*</span>}

            {comment.pinned && <span className="threadkit-pinned">pinned</span>}

            <span className="threadkit-header-divider">|</span>

            {index > 0 && onPrev && (
              <button className="threadkit-nav-btn" onClick={onPrev}>
                prev
              </button>
            )}

            {index < totalSiblings - 1 && onNext && (
              <button className="threadkit-nav-btn" onClick={onNext}>
                next
              </button>
            )}

            <button
              className="threadkit-collapse-btn"
              onClick={handleCollapse}
              title="Collapse comment"
            >
              [–]
            </button>
          </div>

          {/* Comment body */}
          <div className="threadkit-comment-body">
            {isEditing ? (
              <div className="threadkit-edit-form">
                <textarea
                  className="threadkit-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  autoFocus
                />
                <div className="threadkit-edit-actions">
                  <button
                    className="threadkit-submit-btn"
                    onClick={handleSaveEdit}
                    disabled={!editText.trim()}
                  >
                    save
                  </button>
                  <button
                    className="threadkit-cancel-btn"
                    onClick={handleCancelEdit}
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              parseMarkdown(comment.text, {
                allowLinks: true,
                enableAutoLinks: true,
                enableMentions: true,
                getUserProfile,
                plugins,
              })
            )}
          </div>

          {/* Action row */}
          {!isEditing && (
            <div className="threadkit-comment-actions">
              {/* Permalink - always shown */}
              <a
                className="threadkit-action-btn"
                href={`#threadkit-${comment.id}`}
                id={`threadkit-${comment.id}`}
              >
                permalink
              </a>

              {/* Own comment actions: edit, reply, delete */}
              {isOwnComment ? (
                <>
                  {onEdit && (
                    <button
                      className="threadkit-action-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      edit
                    </button>
                  )}

                  {depth < maxDepth && (
                    <button
                      className="threadkit-action-btn"
                      onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                      reply
                    </button>
                  )}

                  {onDelete && (
                    confirmingAction === 'delete' ? (
                      <span className="threadkit-confirm-inline">
                        delete?
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onDelete(comment.id);
                            setConfirmingAction(null);
                          }}
                        >
                          yes
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          no
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn"
                        onClick={() => setConfirmingAction('delete')}
                      >
                        delete
                      </button>
                    )
                  )}
                </>
              ) : (
                <>
                  {/* Other user's comment actions: block, report, reply, (mod: delete, ban) */}
                  {currentUser && onBlock && (
                    confirmingAction === 'block' ? (
                      <span className="threadkit-confirm-inline">
                        block user?
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onBlock(comment.userId);
                            setConfirmingAction(null);
                          }}
                        >
                          yes
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          no
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn"
                        onClick={() => setConfirmingAction('block')}
                      >
                        block
                      </button>
                    )
                  )}

                  {currentUser && onReport && (
                    reportSubmitted ? (
                      <span className="threadkit-report-thanks">thanks!</span>
                    ) : showReportForm ? (
                      <span className="threadkit-report-inline">
                        <select
                          className="threadkit-report-select"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                        >
                          <option value="">select reason...</option>
                          {REPORT_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          disabled={!reportReason}
                          onClick={() => {
                            onReport(comment.id);
                            setShowReportForm(false);
                            setReportSubmitted(true);
                          }}
                        >
                          submit
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => {
                            setShowReportForm(false);
                            setReportReason('');
                          }}
                        >
                          cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn"
                        onClick={() => setShowReportForm(true)}
                      >
                        report
                      </button>
                    )
                  )}

                  {depth < maxDepth && (
                    <button
                      className="threadkit-action-btn"
                      onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                      reply
                    </button>
                  )}

                  {isModOrAdmin && onDelete && (
                    confirmingAction === 'delete' ? (
                      <span className="threadkit-confirm-inline">
                        delete?
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onDelete(comment.id);
                            setConfirmingAction(null);
                          }}
                        >
                          yes
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          no
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn threadkit-mod-action"
                        onClick={() => setConfirmingAction('delete')}
                      >
                        delete
                      </button>
                    )
                  )}

                  {isModOrAdmin && onBan && (
                    confirmingAction === 'ban' ? (
                      <span className="threadkit-confirm-inline">
                        ban user?
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onBan(comment.userId);
                            setConfirmingAction(null);
                          }}
                        >
                          yes
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          no
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn threadkit-mod-action"
                        onClick={() => setConfirmingAction('ban')}
                      >
                        ban
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          )}

          {/* Reply form */}
          {showReplyForm && (
            <div className="threadkit-reply-form">
              <CommentForm
                parentId={comment.id}
                placeholder="Write a reply..."
                onSubmit={handleReply}
                onCancel={() => setShowReplyForm(false)}
              />
            </div>
          )}

          {/* Child comments */}
          {comment.children.length > 0 && (
            <div className="threadkit-replies">
              {comment.children.map((child, childIndex) => (
                <Comment
                  key={child.id}
                  comment={child}
                  currentUser={currentUser}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  index={childIndex}
                  totalSiblings={comment.children.length}
                  onReply={onReply}
                  onVote={onVote}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onBan={onBan}
                  onBlock={onBlock}
                  onReport={onReport}
                  onPermalink={onPermalink}
                  onCollapse={onCollapse}
                  getUserProfile={getUserProfile}
                  plugins={plugins}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
