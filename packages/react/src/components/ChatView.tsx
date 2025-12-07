import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Comment, User, UserProfile, ThreadKitPlugin } from '../types';
import { UserHoverCard } from './UserHoverCard';
import { renderMarkdown } from '../utils/markdown';
import { useTranslation } from '../i18n';

interface ChatViewProps {
  comments: Comment[];
  currentUser?: User;
  showLastN?: number;
  autoScroll?: boolean;
  reactions?: string[];
  showPresence?: boolean;
  presenceCount?: number;
  typingUsers?: Array<{ userId: string; userName: string }>;
  onSend: (text: string) => Promise<void>;
  onTyping?: () => void;
  onBlock?: (userId: string) => void;
  onReport?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onBan?: (userId: string) => void;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  toolbarEnd?: React.ReactNode;
  plugins?: ThreadKitPlugin[];
}

type ReportReasonKey = 'reportSpam' | 'reportHarassment' | 'reportHateSpeech' | 'reportMisinformation' | 'reportOther';
const REPORT_REASON_KEYS: ReportReasonKey[] = [
  'reportSpam',
  'reportHarassment',
  'reportHateSpeech',
  'reportMisinformation',
  'reportOther',
];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ChatMessageProps {
  message: Comment;
  currentUser?: User;
  isModOrAdmin: boolean;
  onBlock?: (userId: string) => void;
  onReport?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onBan?: (userId: string) => void;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  plugins?: ThreadKitPlugin[];
  t: ReturnType<typeof useTranslation>;
}

function ChatMessage({
  message,
  currentUser,
  isModOrAdmin,
  onBlock,
  onReport,
  onDelete,
  onEdit,
  onBan,
  getUserProfile,
  plugins,
  t,
}: ChatMessageProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<'block' | 'ban' | 'delete' | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);

  const isOwnMessage = currentUser && message.userId === currentUser.id;

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit?.(message.id, editText.trim());
    }
    setIsEditing(false);
    setIsExpanded(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.text);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="threadkit-chat-message editing">
        <div className="threadkit-chat-edit-form">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editText.trim()) {
                handleSaveEdit();
              }
              if (e.key === 'Escape') {
                handleCancelEdit();
              }
            }}
          />
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
    );
  }

  return (
    <div
      className={`threadkit-chat-message ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="threadkit-chat-message-line">
        <span className="threadkit-chat-time">{formatTime(message.timestamp)}</span>
        <UserHoverCard
          userName={message.userName}
          userId={message.userId}
          getUserProfile={getUserProfile}
        >
          <span className="threadkit-chat-author">{message.userName}</span>
        </UserHoverCard>
        <span className="threadkit-chat-text">
          {renderMarkdown(message.text, {
            allowLinks: true,
            enableAutoLinks: true,
            enableMentions: true,
            getUserProfile,
            plugins,
          })}
          {message.edited && <span className="threadkit-edited">*</span>}
        </span>
      </div>
      {isExpanded && currentUser && (
        <div className="threadkit-chat-actions">
          {/* Own message actions: edit, delete */}
          {isOwnMessage ? (
            <>
              {onEdit && (
                <button
                  className="threadkit-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                >
                  {t('edit')}
                </button>
              )}

              {onDelete && (
                confirmingAction === 'delete' ? (
                  <span className="threadkit-confirm-inline">
                    {t('deleteConfirm')}
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-yes"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(message.id);
                        setConfirmingAction(null);
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-no"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingAction(null);
                      }}
                    >
                      {t('no')}
                    </button>
                  </span>
                ) : (
                  <button
                    className="threadkit-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingAction('delete');
                    }}
                  >
                    {t('delete')}
                  </button>
                )
              )}
            </>
          ) : (
            <>
              {/* Other user's message actions: block, report, (mod: delete, ban) */}
              {onBlock && (
                confirmingAction === 'block' ? (
                  <span className="threadkit-confirm-inline">
                    {t('blockConfirm')}
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-yes"
                      onClick={(e) => {
                        e.stopPropagation();
                        onBlock(message.userId);
                        setConfirmingAction(null);
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-no"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingAction(null);
                      }}
                    >
                      {t('no')}
                    </button>
                  </span>
                ) : (
                  <button
                    className="threadkit-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingAction('block');
                    }}
                  >
                    {t('block')}
                  </button>
                )
              )}

              {onReport && (
                reportSubmitted ? (
                  <span className="threadkit-report-thanks">{t('reportSubmitted')}</span>
                ) : showReportForm ? (
                  <span className="threadkit-report-inline" onClick={(e) => e.stopPropagation()}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onReport(message.id);
                        setShowReportForm(false);
                        setReportSubmitted(true);
                      }}
                    >
                      {t('submit')}
                    </button>
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-no"
                      onClick={(e) => {
                        e.stopPropagation();
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReportForm(true);
                    }}
                  >
                    {t('report')}
                  </button>
                )
              )}

              {isModOrAdmin && onDelete && (
                confirmingAction === 'delete' ? (
                  <span className="threadkit-confirm-inline">
                    {t('deleteConfirm')}
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-yes"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(message.id);
                        setConfirmingAction(null);
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-no"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingAction(null);
                      }}
                    >
                      {t('no')}
                    </button>
                  </span>
                ) : (
                  <button
                    className="threadkit-action-btn threadkit-mod-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingAction('delete');
                    }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onBan(message.userId);
                        setConfirmingAction(null);
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      className="threadkit-confirm-btn threadkit-confirm-no"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingAction(null);
                      }}
                    >
                      {t('no')}
                    </button>
                  </span>
                ) : (
                  <button
                    className="threadkit-action-btn threadkit-mod-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingAction('ban');
                    }}
                  >
                    {t('ban')}
                  </button>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatView({
  comments,
  currentUser,
  showLastN = 100,
  autoScroll = true,
  showPresence = false,
  presenceCount = 0,
  typingUsers = [],
  onSend,
  onTyping,
  onBlock,
  onReport,
  onDelete,
  onEdit,
  onBan,
  getUserProfile,
  toolbarEnd,
  plugins,
}: ChatViewProps) {
  const t = useTranslation();
  const messagesRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isModOrAdmin = currentUser?.isModerator || currentUser?.isAdmin;

  // Get flat list of messages (chat mode has no nesting)
  const messages = comments.slice(-showLastN);

  // Auto-scroll to top on new messages (newest are at top)
  useEffect(() => {
    if (autoScroll && messagesRef.current) {
      messagesRef.current.scrollTop = 0;
    }
  }, [messages.length, autoScroll]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = inputValue.trim();
      if (!text || isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onSend(text);
        setInputValue('');
      } finally {
        setIsSubmitting(false);
      }
    },
    [inputValue, isSubmitting, onSend]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      onTyping?.();
    },
    [onTyping]
  );

  return (
    <div className="threadkit-chat">
      {toolbarEnd && (
        <div className="threadkit-toolbar">
          {toolbarEnd}
        </div>
      )}
      <form className="threadkit-chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={currentUser ? t('typeMessage') : t('signInToChat')}
          disabled={!currentUser || isSubmitting}
        />
        <button
          type="submit"
          className="threadkit-submit-btn"
          disabled={!currentUser || isSubmitting || !inputValue.trim()}
        >
          {t('send')}
        </button>
      </form>

      {showPresence && (
        <div className="threadkit-chat-presence">
          {presenceCount === 1 ? t('personOnline', { n: presenceCount }) : t('peopleOnline', { n: presenceCount })}
        </div>
      )}

      {typingUsers.length > 0 && (
        <div className="threadkit-typing-indicator">
          {typingUsers.length === 1 ? t('personTyping', { n: typingUsers.length }) : t('peopleTyping', { n: typingUsers.length })}
        </div>
      )}

      <div className="threadkit-chat-messages" ref={messagesRef}>
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            currentUser={currentUser}
            isModOrAdmin={isModOrAdmin || false}
            onBlock={onBlock}
            onReport={onReport}
            onDelete={onDelete}
            onEdit={onEdit}
            onBan={onBan}
            getUserProfile={getUserProfile}
            plugins={plugins}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
