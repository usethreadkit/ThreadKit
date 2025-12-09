import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { Comment, User, UserProfile, ThreadKitPlugin } from '../types';
import { UserHoverCard } from './UserHoverCard';
import { renderMarkdown } from '../utils/markdown';
import { useTranslation } from '../i18n';
import { useAuth, AUTH_ICONS, LoadingSpinner } from '../auth';
import type { AuthMethod } from '../auth/types';

interface ChatViewProps {
  comments: Comment[];
  currentUser?: User;
  /** Whether the user needs to set their username before chatting */
  needsUsername?: boolean;
  showLastN?: number;
  autoScroll?: boolean;
  reactions?: string[];
  showPresence?: boolean;
  /** Whether the WebSocket is connected */
  wsConnected?: boolean;
  presenceCount?: number;
  typingUsers?: Array<{ userId: string; userName: string }>;
  apiUrl: string;
  projectId: string;
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
  needsUsername = false,
  showLastN = 100,
  autoScroll = true,
  showPresence = false,
  wsConnected = false,
  presenceCount = 0,
  typingUsers = [],
  apiUrl,
  projectId,
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
  const { state: authState, login, selectMethod, setOtpTarget, verifyOtp, plugins: authPlugins } = useAuth();
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const authInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const hasInitialized = useRef(false);
  const oauthWindowRef = useRef<Window | null>(null);
  const stepRef = useRef(authState.step);
  stepRef.current = authState.step;
  const isModOrAdmin = currentUser?.isModerator || currentUser?.isAdmin;
  const isLoggedIn = currentUser && !needsUsername;

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
        // Refocus input after sending
        inputRef.current?.focus();
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

  // Initialize auth methods on mount if not logged in
  useEffect(() => {
    if (!isLoggedIn && !hasInitialized.current && authState.step === 'idle') {
      hasInitialized.current = true;
      login();
    }
  }, [isLoggedIn, authState.step, login]);

  // Focus auth input when step changes
  useEffect(() => {
    if (authState.step === 'otp-input' || authState.step === 'otp-verify') {
      authInputRef.current?.focus();
    }
  }, [authState.step]);

  // Handle back to method selection
  const handleBack = useCallback(() => {
    setOtpEmail('');
    setOtpCode('');
    login();
  }, [login]);

  // Handle OTP email/phone submit
  const handleOtpSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (otpEmail.trim()) {
        setOtpTarget(otpEmail.trim());
      }
    },
    [otpEmail, setOtpTarget]
  );

  // Handle OTP code verify
  const handleVerifySubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (otpCode.trim() && otpCode.length === 6) {
        verifyOtp(otpCode.trim());
      }
    },
    [otpCode, verifyOtp]
  );

  // Handle OTP code input change with auto-submit
  const handleOtpCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
      setOtpCode(value);
      // Auto-submit when 6 digits entered
      if (value.length === 6) {
        verifyOtp(value);
      }
    },
    [verifyOtp]
  );

  // Handle OAuth method selection
  const handleMethodSelect = useCallback(
    (method: AuthMethod) => {
      if (method.type === 'oauth') {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
        oauthWindowRef.current = window.open(
          `${baseUrl}/auth/${method.id}?api_key=${encodeURIComponent(projectId)}`,
          'threadkit-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        const pollTimer = setInterval(() => {
          try {
            if (oauthWindowRef.current?.closed) {
              clearInterval(pollTimer);
              if (stepRef.current === 'oauth-pending') {
                handleBack();
              }
            }
          } catch {
            clearInterval(pollTimer);
          }
        }, 500);
      }
      selectMethod(method);
    },
    [apiUrl, projectId, selectMethod, handleBack]
  );

  // Get icon for auth method
  const getMethodIcon = (method: AuthMethod) => {
    const CustomIcon = AUTH_ICONS[method.id];
    if (CustomIcon) {
      return <CustomIcon className="threadkit-signin-method-icon" />;
    }
    const plugin = authPlugins.find((p) => p.id === method.id);
    if (plugin?.Icon) {
      return <plugin.Icon className="threadkit-signin-method-icon" />;
    }
    return <span className="threadkit-signin-method-icon">{method.name[0]}</span>;
  };

  // Render sign-in UI below the input when not logged in
  const renderSignInArea = () => {
    if (isLoggedIn) return null;

    // Loading auth methods
    if (authState.step === 'loading') {
      return (
        <div className="threadkit-chat-signin">
          <LoadingSpinner className="threadkit-signin-spinner-small" />
        </div>
      );
    }

    // OTP input (email/phone entry)
    if (authState.step === 'otp-input') {
      const isEmail = authState.selectedMethod?.id === 'email';
      return (
        <div className="threadkit-chat-signin">
          <form onSubmit={handleOtpSubmit} className="threadkit-otp-inline-form">
            <button type="button" className="threadkit-signin-back-inline" onClick={handleBack}>
              ←
            </button>
            <input
              ref={authInputRef}
              type={isEmail ? 'email' : 'tel'}
              className="threadkit-otp-inline-input"
              placeholder={isEmail ? t('enterEmail') : t('enterPhone')}
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              autoComplete={isEmail ? 'email' : 'tel'}
            />
            <button
              type="submit"
              className="threadkit-submit-btn"
              disabled={!otpEmail.trim()}
            >
              {t('sendCode')}
            </button>
          </form>
          {authState.error && <span className="threadkit-signin-error">{authState.error}</span>}
        </div>
      );
    }

    // OTP verify (code entry)
    if (authState.step === 'otp-verify') {
      return (
        <div className="threadkit-chat-signin">
          <form onSubmit={handleVerifySubmit} className="threadkit-otp-inline-form">
            <button type="button" className="threadkit-signin-back-inline" onClick={handleBack}>
              ←
            </button>
            <span className="threadkit-otp-inline-hint">{t('codeSentTo')} {authState.otpTarget}</span>
            <input
              ref={authInputRef}
              type="text"
              className="threadkit-otp-inline-input threadkit-otp-code-input"
              placeholder={t('otpPlaceholder')}
              value={otpCode}
              onChange={handleOtpCodeChange}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />
            <button
              type="submit"
              className="threadkit-submit-btn"
              disabled={otpCode.length !== 6}
            >
              {t('verify')}
            </button>
          </form>
          {authState.error && <span className="threadkit-signin-error">{authState.error}</span>}
        </div>
      );
    }

    // OAuth pending
    if (authState.step === 'oauth-pending' || authState.step === 'web3-pending') {
      return (
        <div className="threadkit-chat-signin">
          <LoadingSpinner className="threadkit-signin-spinner-small" />
          <span>{t('signingInWith')} {authState.selectedMethod?.name}...</span>
          <button type="button" className="threadkit-signin-cancel-inline" onClick={handleBack}>
            {t('cancel')}
          </button>
        </div>
      );
    }

    // Show auth method buttons
    return (
      <div className="threadkit-chat-signin">
        <span className="threadkit-signin-label-inline">{t('signInLabel')}</span>
        {authState.availableMethods.map((method) => (
          <button
            key={method.id}
            className="threadkit-signin-method-btn"
            onClick={() => handleMethodSelect(method)}
            title={`${t('continueWith')} ${method.name}`}
          >
            {getMethodIcon(method)}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="threadkit-chat">
      {toolbarEnd && (
        <div className="threadkit-toolbar">
          {toolbarEnd}
        </div>
      )}
      <form className="threadkit-chat-input" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={t('typeMessage')}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className="threadkit-submit-btn"
          disabled={!isLoggedIn || isSubmitting || !inputValue.trim()}
        >
          {t('send')}
        </button>
      </form>
      {renderSignInArea()}

      {showPresence && wsConnected && (
        <div className="threadkit-chat-presence">
          {presenceCount} {presenceCount === 1 ? t('personOnline') : t('peopleOnline')}
        </div>
      )}

      {typingUsers.length > 0 && (
        <div className="threadkit-typing-indicator">
          {typingUsers.length} {typingUsers.length === 1 ? t('personTyping') : t('peopleTyping')}
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
