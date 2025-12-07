import { useState } from 'react';
import { formatTimestamp } from '@threadkit/core';
import type { CommentProps } from '../types';
import { CommentForm } from './CommentForm';
import { UserHoverCard } from './UserHoverCard';
import { renderMarkdown } from '../utils/markdown';
import { useTranslation } from '../i18n';

type ReportReasonKey = 'reportSpam' | 'reportHarassment' | 'reportHateSpeech' | 'reportMisinformation' | 'reportOther';
const REPORT_REASON_KEYS: ReportReasonKey[] = [
  'reportSpam',
  'reportHarassment',
  'reportHateSpeech',
  'reportMisinformation',
  'reportOther',
];

export function Comment({
  comment,
  currentUser,
  depth = 0,
  maxDepth = 5,
  collapsed: initialCollapsed = false,
  highlighted = false,
  index = 0,
  totalSiblings = 1,
  highlightedCommentId,
  collapsedThreads,
  onPost,
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
  const t = useTranslation();
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

  const handleReply = async (text: string, parentId?: string) => {
    if (onPost) {
      await onPost(text, parentId);
    }
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

  const commentClassName = `threadkit-comment${highlighted ? ' threadkit-highlighted' : ''}`;

  if (collapsed) {
    return (
      <div className={`${commentClassName} threadkit-comment-collapsed`} data-comment-id={comment.id}>
        <button
          className="threadkit-expand-btn"
          onClick={handleCollapse}
          title={t('expandComment')}
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
          {score} {score !== 1 ? t('points') : t('point')} · {formatTimestamp(comment.timestamp)}
          {comment.children.length > 0 && ` · ${comment.children.length} ${comment.children.length === 1 ? t('child') : t('children')}`}
        </span>
      </div>
    );
  }

  return (
    <div className={commentClassName} data-comment-id={comment.id} id={`threadkit-${comment.id}`}>
      <div className="threadkit-comment-wrapper">
        {/* Vote column */}
        {onVote && (
          <div className="threadkit-vote-column">
            <button
              className={`threadkit-vote-btn threadkit-vote-up ${hasUpvoted ? 'active' : ''}`}
              onClick={() => onVote(comment.id, 'up')}
              aria-label={t('upvote')}
            >
              ▲
            </button>
            <button
              className={`threadkit-vote-btn threadkit-vote-down ${hasDownvoted ? 'active' : ''}`}
              onClick={() => onVote(comment.id, 'down')}
              aria-label={t('downvote')}
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
              {score} {score !== 1 ? t('points') : t('point')}
              <span className="threadkit-score-breakdown">
                (+{upvotes}/-{downvotes})
              </span>
            </span>

            <span className="threadkit-timestamp">
              {formatTimestamp(comment.timestamp)}
            </span>

            {comment.edited && <span className="threadkit-edited">*</span>}

            {comment.pinned && <span className="threadkit-pinned">{t('pinned')}</span>}

            <span className="threadkit-header-divider">|</span>

            {index > 0 && onPrev && (
              <button className="threadkit-nav-btn" onClick={onPrev}>
                {t('prev')}
              </button>
            )}

            {index < totalSiblings - 1 && onNext && (
              <button className="threadkit-nav-btn" onClick={onNext}>
                {t('next')}
              </button>
            )}

            <button
              className="threadkit-collapse-btn"
              onClick={handleCollapse}
              title={t('collapseComment')}
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
                    {t('save')}
                  </button>
                  <button
                    className="threadkit-cancel-btn"
                    onClick={handleCancelEdit}
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              renderMarkdown(comment.text, {
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
              {/* Share button - uses Web Share API when available, falls back to copy link */}
              <button
                className="threadkit-action-btn"
                onClick={async () => {
                  const url = `${window.location.origin}${window.location.pathname}#threadkit-${comment.id}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ url });
                    } catch {
                      // User cancelled or share failed, silently ignore
                    }
                  } else {
                    await navigator.clipboard.writeText(url);
                  }
                }}
              >
                {t('share')}
              </button>

              {/* Own comment actions: edit, reply, delete */}
              {isOwnComment ? (
                <>
                  {onEdit && (
                    <button
                      className="threadkit-action-btn"
                      onClick={() => setIsEditing(true)}
                    >
                      {t('edit')}
                    </button>
                  )}

                  {depth < maxDepth && (
                    <button
                      className="threadkit-action-btn"
                      onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                      {t('reply')}
                    </button>
                  )}

                  {onDelete && (
                    confirmingAction === 'delete' ? (
                      <span className="threadkit-confirm-inline">
                        {t('deleteConfirm')}
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onDelete(comment.id);
                            setConfirmingAction(null);
                          }}
                        >
                          {t('yes')}
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          {t('no')}
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn"
                        onClick={() => setConfirmingAction('delete')}
                      >
                        {t('delete')}
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
                        {t('blockConfirm')}
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onBlock(comment.userId);
                            setConfirmingAction(null);
                          }}
                        >
                          {t('yes')}
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          {t('no')}
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn"
                        onClick={() => setConfirmingAction('block')}
                      >
                        {t('block')}
                      </button>
                    )
                  )}

                  {currentUser && onReport && (
                    reportSubmitted ? (
                      <span className="threadkit-report-thanks">{t('reportSubmitted')}</span>
                    ) : showReportForm ? (
                      <span className="threadkit-report-inline">
                        <select
                          className="threadkit-report-select"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                        >
                          <option value="">{t('selectReason')}</option>
                          {REPORT_REASON_KEYS.map((reasonKey) => (
                            <option key={reasonKey} value={reasonKey}>
                              {t(reasonKey)}
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
                          {t('submit')}
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => {
                            setShowReportForm(false);
                            setReportReason('');
                          }}
                        >
                          {t('cancel')}
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn"
                        onClick={() => setShowReportForm(true)}
                      >
                        {t('report')}
                      </button>
                    )
                  )}

                  {depth < maxDepth && (
                    <button
                      className="threadkit-action-btn"
                      onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                      {t('reply')}
                    </button>
                  )}

                  {isModOrAdmin && onDelete && (
                    confirmingAction === 'delete' ? (
                      <span className="threadkit-confirm-inline">
                        {t('deleteConfirm')}
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onDelete(comment.id);
                            setConfirmingAction(null);
                          }}
                        >
                          {t('yes')}
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          {t('no')}
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn threadkit-mod-action"
                        onClick={() => setConfirmingAction('delete')}
                      >
                        {t('delete')}
                      </button>
                    )
                  )}

                  {isModOrAdmin && onBan && (
                    confirmingAction === 'ban' ? (
                      <span className="threadkit-confirm-inline">
                        {t('banConfirm')}
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-yes"
                          onClick={() => {
                            onBan(comment.userId);
                            setConfirmingAction(null);
                          }}
                        >
                          {t('yes')}
                        </button>
                        <button
                          className="threadkit-confirm-btn threadkit-confirm-no"
                          onClick={() => setConfirmingAction(null)}
                        >
                          {t('no')}
                        </button>
                      </span>
                    ) : (
                      <button
                        className="threadkit-action-btn threadkit-mod-action"
                        onClick={() => setConfirmingAction('ban')}
                      >
                        {t('ban')}
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
                placeholder={t('writeReply')}
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
                  highlighted={highlightedCommentId === child.id}
                  collapsed={collapsedThreads?.has(child.id)}
                  highlightedCommentId={highlightedCommentId}
                  collapsedThreads={collapsedThreads}
                  onPost={onPost}
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
