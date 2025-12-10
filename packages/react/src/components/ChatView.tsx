import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { Comment, User, UserProfile, ThreadKitPlugin } from '../types';
import { UserHoverCard } from './UserHoverCard';
import { renderMarkdown } from '../utils/markdown';
import { useTranslation } from '../i18n';
import { useAuth, AUTH_ICONS, LoadingSpinner } from '../auth';
import type { AuthMethod } from '../auth/types';
import { GuestAwareUsername, formatUsername } from '../utils/username';
import { normalizeUsername, validateUsername, MAX_USERNAME_LENGTH } from '@threadkit/core';

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
  onSend: (text: string, parentId?: string) => Promise<void>;
  onTyping?: () => void;
  onBlock?: (userId: string) => void;
  onReport?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onBan?: (userId: string) => void;
  onScrollToComment?: (commentId: string) => void;
  highlightedCommentId?: string | null;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  fetchUserProfile?: (userId: string) => Promise<void>;
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
  depth?: number;
  currentUser?: User;
  isModOrAdmin: boolean;
  highlighted?: boolean;
  onBlock?: (userId: string) => void;
  onReport?: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onBan?: (userId: string) => void;
  onScrollToComment?: (commentId: string) => void;
  onReply?: (parentId: string, text: string) => Promise<void>;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  fetchUserProfile?: (userId: string) => Promise<void>;
  plugins?: ThreadKitPlugin[];
  t: ReturnType<typeof useTranslation>;
}

function ChatMessage({
  message,
  depth = 0,
  currentUser,
  isModOrAdmin,
  highlighted = false,
  onBlock,
  onReport,
  onDelete,
  onEdit,
  onBan,
  onScrollToComment,
  onReply,
  getUserProfile,
  fetchUserProfile,
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
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

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

  const handleSendReply = async () => {
    if (replyText.trim() && onReply) {
      await onReply(message.id, replyText.trim());
      setReplyText('');
      setIsReplying(false);
      setIsExpanded(false);
    }
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

  if (isReplying) {
    const replyToName = formatUsername(message.userName, t);

    return (
      <div className="threadkit-chat-message replying">
        <div className="threadkit-chat-reply-form">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`${t('reply')} to ${replyToName}...`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && replyText.trim()) {
                handleSendReply();
              }
              if (e.key === 'Escape') {
                setIsReplying(false);
                setReplyText('');
              }
            }}
          />
          <button
            className="threadkit-submit-btn"
            onClick={handleSendReply}
            disabled={!replyText.trim()}
          >
            {t('send')}
          </button>
          <button
            className="threadkit-cancel-btn"
            onClick={() => {
              setIsReplying(false);
              setReplyText('');
            }}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`threadkit-chat-message ${isExpanded ? 'expanded' : ''} ${highlighted ? 'highlighted' : ''} ${message.replyReferenceId ? 'reply-message' : ''}`}
      style={{ paddingLeft: depth > 0 ? `${depth * 20}px` : undefined }}
      onClick={() => setIsExpanded(!isExpanded)}
      data-comment-id={message.id}
    >
      <div className="threadkit-chat-message-line">
        <span className="threadkit-chat-time">{formatTime(message.timestamp)}</span>
        <UserHoverCard
          userId={message.userId}
          getUserProfile={getUserProfile}
          fetchUserProfile={fetchUserProfile}
        >
          <span className="threadkit-chat-author">
            <GuestAwareUsername userName={message.userName} t={t} />
          </span>
        </UserHoverCard>
        <span className="threadkit-chat-text">
          {renderMarkdown(message.text, {
            allowLinks: true,
            enableAutoLinks: true,
            enableMentions: true,
            getUserProfile,
            fetchUserProfile,
            plugins,
          })}
          {message.edited && <span className="threadkit-edited">*</span>}
          {message.replyReferenceId && onScrollToComment && (
            <button
              className="threadkit-chat-reply-ref"
              onClick={(e) => {
                e.stopPropagation();
                onScrollToComment(message.replyReferenceId!);
              }}
              title="View in thread"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.78 1.97a.75.75 0 010 1.06L3.81 6h6.44A4.75 4.75 0 0115 10.75v2.5a.75.75 0 01-1.5 0v-2.5a3.25 3.25 0 00-3.25-3.25H3.81l2.97 2.97a.75.75 0 11-1.06 1.06L1.47 7.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z"/>
              </svg>
            </button>
          )}
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

          {/* Reply button - available for all messages */}
          {onReply && (
            <button
              className="threadkit-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsReplying(true);
                setIsExpanded(false);
              }}
            >
              {t('reply')}
            </button>
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
  onScrollToComment,
  highlightedCommentId,
  getUserProfile,
  fetchUserProfile,
  toolbarEnd,
  plugins,
}: ChatViewProps) {
  const t = useTranslation();
  const { state: authState, login, selectMethod, setOtpTarget, verifyOtp, updateUsername, plugins: authPlugins } = useAuth();
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const authInputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);
  const hasInitialized = useRef(false);
  const hasShownUsernameSuggestion = useRef(false);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oauthWindowRef = useRef<Window | null>(null);
  const stepRef = useRef(authState.step);
  stepRef.current = authState.step;
  const isModOrAdmin = currentUser?.isModerator || currentUser?.isAdmin;
  const isLoggedIn = currentUser && !needsUsername;
  const canSubmitUsername = username.trim().length >= 1 && isUsernameAvailable === true && !usernameError;

  // Filter out current user from typing users (don't show "you are typing")
  const otherTypingUsers = useMemo(() => {
    if (!currentUser) return typingUsers;
    return typingUsers.filter(user => user.userId !== currentUser.id);
  }, [typingUsers, currentUser]);

  // Flatten comments tree while preserving order and thread structure
  const flattenWithThreading = (nodes: Comment[], depth = 0): Array<{ comment: Comment; depth: number }> => {
    const result: Array<{ comment: Comment; depth: number }> = [];
    for (const node of nodes) {
      result.push({ comment: node, depth });
      if (node.children && node.children.length > 0) {
        result.push(...flattenWithThreading(node.children, depth + 1));
      }
    }
    return result;
  };

  const messages = flattenWithThreading(comments).slice(-showLastN);

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
      setInputValue('');

      // Refocus input for mobile - blur first to ensure focus change is detected
      requestAnimationFrame(() => {
        inputRef.current?.blur();
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      });

      try {
        await onSend(text);
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

  // Handle reply to a specific message
  const handleReply = useCallback(
    async (parentId: string, text: string) => {
      await onSend(text, parentId);
    },
    [onSend]
  );

  // Check username availability with debouncing
  const checkUsernameAvailability = useCallback(async (value: string) => {
    // First validate format
    const validationError = validateUsername(value);
    if (validationError) {
      setUsernameError(validationError);
      setIsUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const headers: Record<string, string> = {
        'projectid': projectId,
        'Content-Type': 'application/json',
      };
      // Include auth token so server can exclude current user from check
      if (authState.token) {
        headers['Authorization'] = `Bearer ${authState.token}`;
      }
      const res = await fetch(`${apiUrl}/users/check-username`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username: value }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setUsernameError(data.error);
          setIsUsernameAvailable(false);
        } else {
          setUsernameError(null);
          setIsUsernameAvailable(data.available);
        }
      }
    } catch {
      // Ignore errors, user can still try to submit
    } finally {
      setIsCheckingUsername(false);
    }
  }, [apiUrl, projectId, authState.token]);

  // Initialize username from user's email or name when username-required step is shown (only once)
  useEffect(() => {
    if ((authState.step === 'username-required' || authState.step === 'otp-name') && !hasShownUsernameSuggestion.current) {
      hasShownUsernameSuggestion.current = true;
      let suggestion = '';

      // For email users, use the part before @ as the suggestion
      const email = authState.user?.email || authState.otpTarget;
      if (email && email.includes('@')) {
        const emailPrefix = email.split('@')[0];
        suggestion = normalizeUsername(emailPrefix);
      }

      // Fall back to user's name if no email or email prefix is too short
      if (suggestion.length < 2 && authState.user?.name) {
        suggestion = normalizeUsername(authState.user.name);
      }

      if (suggestion) {
        setUsername(suggestion);
        // Immediately check availability of the suggested username
        if (suggestion.length >= 1) {
          checkUsernameAvailability(suggestion);
        }
      }
    }
  }, [authState.step, authState.user?.name, authState.user?.email, authState.otpTarget, checkUsernameAvailability]);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Normalize on input: lowercase, replace spaces with hyphens, remove invalid chars
    value = value.toLowerCase();
    value = value.replace(/\s+/g, '-'); // Replace spaces with hyphens
    value = value.replace(/[^a-z0-9\-_]/g, ''); // Remove invalid characters
    value = value.slice(0, MAX_USERNAME_LENGTH); // Enforce max length

    setUsername(value);
    setUsernameError(null);
    setIsUsernameAvailable(null);

    // Debounce the availability check
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    if (value.length >= 1) {
      usernameCheckTimeout.current = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 300);
    }
  }, [checkUsernameAvailability]);

  const handleUsernameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (username.trim() && isUsernameAvailable && !usernameError && !isSubmittingUsername) {
        setIsSubmittingUsername(true);
        try {
          if (authState.step === 'otp-name') {
            // For otp-name, we need to verify with the username
            await verifyOtp(otpCode.trim(), username.trim());
          } else {
            // For username-required, just update the username
            await updateUsername(username.trim());
          }
        } finally {
          setIsSubmittingUsername(false);
        }
      }
    },
    [username, isUsernameAvailable, usernameError, isSubmittingUsername, authState.step, otpCode, verifyOtp, updateUsername]
  );

  // Reset hasInitialized and local state when user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      hasInitialized.current = false;
      hasShownUsernameSuggestion.current = false;
    } else {
      // User logged in - clear any OTP/auth related local state
      setOtpEmail('');
      setOtpCode('');
      setUsername('');
      setUsernameError(null);
      setIsUsernameAvailable(null);
    }
  }, [isLoggedIn]);

  // Initialize auth methods on mount if not logged in
  useEffect(() => {
    if (!isLoggedIn && !hasInitialized.current && authState.step === 'idle') {
      hasInitialized.current = true;
      login();
    }
  }, [isLoggedIn, authState.step, login]);

  // Focus auth input when step changes
  useEffect(() => {
    if (authState.step === 'otp-input' || authState.step === 'otp-verify' || authState.step === 'username-required' || authState.step === 'otp-name') {
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
          `${baseUrl}/auth/${method.id}?project_id=${encodeURIComponent(projectId)}`,
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

    // Username selection for new users (after OAuth/OTP login)
    if (authState.step === 'username-required' || authState.step === 'otp-name') {
      return (
        <div className="threadkit-chat-signin">
          <form onSubmit={handleUsernameSubmit} className="threadkit-username-inline-form">
            <span className="threadkit-username-inline-label">{t('chooseUsername')}:</span>
            <div className="threadkit-username-inline-input-wrapper">
              <input
                ref={authInputRef}
                type="text"
                className="threadkit-username-inline-input"
                placeholder={t('usernamePlaceholder')}
                value={username}
                onChange={handleUsernameChange}
                autoComplete="username"
                maxLength={MAX_USERNAME_LENGTH}
              />
              {isCheckingUsername && (
                <span className="threadkit-username-status threadkit-username-checking">{t('checking')}</span>
              )}
              {!isCheckingUsername && isUsernameAvailable === true && !usernameError && (
                <span className="threadkit-username-status threadkit-username-available">✓</span>
              )}
              {!isCheckingUsername && (isUsernameAvailable === false || usernameError) && (
                <span className="threadkit-username-status threadkit-username-taken">
                  {usernameError || t('usernameTaken')}
                </span>
              )}
            </div>
            <button
              type="submit"
              className="threadkit-submit-btn"
              disabled={!canSubmitUsername || isSubmittingUsername}
            >
              {isSubmittingUsername ? t('loading') : authState.step === 'otp-name' ? t('continue') : t('save')}
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

      {(showPresence && wsConnected) || otherTypingUsers.length > 0 ? (
        <div className="threadkit-chat-status">
          {otherTypingUsers.length > 0 && (
            <>
              <span className="threadkit-chat-typing">
                {otherTypingUsers.length} {otherTypingUsers.length === 1 ? t('personTyping') : t('peopleTyping')}
              </span>
              {showPresence && wsConnected && <span className="threadkit-chat-separator">|</span>}
            </>
          )}
          {showPresence && wsConnected && (
            <span className="threadkit-chat-presence">
              {presenceCount} {presenceCount === 1 ? t('personOnline') : t('peopleOnline')}
            </span>
          )}
        </div>
      ) : null}

      <div className="threadkit-chat-messages" ref={messagesRef}>
        {messages.map(({ comment, depth }) => (
          <ChatMessage
            key={comment.id}
            message={comment}
            depth={depth}
            currentUser={currentUser}
            isModOrAdmin={isModOrAdmin || false}
            highlighted={highlightedCommentId === comment.id}
            onBlock={onBlock}
            onReport={onReport}
            onDelete={onDelete}
            onEdit={onEdit}
            onBan={onBan}
            onScrollToComment={onScrollToComment}
            onReply={handleReply}
            getUserProfile={getUserProfile}
            fetchUserProfile={fetchUserProfile}
            plugins={plugins}
            t={t}
          />
        ))}
      </div>
      <div
        className="threadkit-chat-tap-area"
        onClick={() => inputRef.current?.focus()}
      />
    </div>
  );
}
