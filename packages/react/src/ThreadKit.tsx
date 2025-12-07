import { useCallback, useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import type { ThreadKitProps, ThreadKitCSSVariables, ThreadKitRef, User, Comment, SortBy } from './types';
import { useComments, ThreadKitError } from './hooks/useComments';
import { useWebSocket } from './hooks/useWebSocket';
import { CommentsView } from './components/CommentsView';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationsPanel, type Notification } from './components/NotificationsPanel';
import { AuthProvider, useAuth, LoginModal, injectAuthStyles } from './auth';
import type { User as AuthUser } from './auth/types';
import { TranslationProvider, useTranslation } from './i18n';
import { DebugProvider } from './debug';

const DEFAULT_API_URL = 'https://api.usethreadkit.com/v1';

// Track injected plugin styles to avoid duplicates
const injectedStyles = new Set<string>();

interface BlockedUser {
  id: string;
  name: string;
}

/**
 * Convert cssVariables prop to inline CSS custom properties
 */
function cssVariablesToStyle(vars?: ThreadKitCSSVariables): React.CSSProperties {
  if (!vars) return {};

  const style: Record<string, string> = {};

  if (vars.primary) style['--threadkit-primary'] = vars.primary;
  if (vars.primaryHover) style['--threadkit-primary-hover'] = vars.primaryHover;
  if (vars.upvote) style['--threadkit-upvote'] = vars.upvote;
  if (vars.downvote) style['--threadkit-downvote'] = vars.downvote;
  if (vars.link) style['--threadkit-link'] = vars.link;
  if (vars.linkHover) style['--threadkit-link-hover'] = vars.linkHover;
  if (vars.danger) style['--threadkit-danger'] = vars.danger;
  if (vars.success) style['--threadkit-success'] = vars.success;
  if (vars.bg) style['--threadkit-bg'] = vars.bg;
  if (vars.bgSecondary) style['--threadkit-bg-secondary'] = vars.bgSecondary;
  if (vars.bgHover) style['--threadkit-bg-hover'] = vars.bgHover;
  if (vars.border) style['--threadkit-border'] = vars.border;
  if (vars.borderLight) style['--threadkit-border-light'] = vars.borderLight;
  if (vars.text) style['--threadkit-text'] = vars.text;
  if (vars.textSecondary) style['--threadkit-text-secondary'] = vars.textSecondary;
  if (vars.textMuted) style['--threadkit-text-muted'] = vars.textMuted;
  if (vars.radius) style['--threadkit-radius'] = vars.radius;
  if (vars.fontFamily) style['--threadkit-font-family'] = vars.fontFamily;
  if (vars.fontSize) style['--threadkit-font-size'] = vars.fontSize;
  if (vars.lineHeight) style['--threadkit-line-height'] = vars.lineHeight;

  return style as React.CSSProperties;
}

// Props for inner component (includes ref forwarding)
interface ThreadKitInnerProps extends ThreadKitProps {
  innerRef?: React.Ref<ThreadKitRef>;
}

// Inner component that has access to auth context
function ThreadKitInner({
  url,
  mode = 'comments',
  theme = 'light',
  className,
  style,
  cssVariables,
  maxDepth = 5,
  sortBy = 'votes',
  allowVoting = true,
  showLastN = 100,
  autoScroll = true,
  showPresence = false,
  showTyping = false,
  apiUrl = DEFAULT_API_URL,
  apiKey,
  initialComments,
  hideBranding = false,
  plugins,
  authPlugins,
  getPostHeaders,
  onCommentPosted,
  onCommentReceived,
  onCommentDeleted,
  onCommentEdited,
  onVote,
  onReplyStart,
  onSignOut: _onSignOut, // Handled at outer component level
  onError,
  onSignIn: _onSignIn,
  innerRef,
}: ThreadKitInnerProps) {
  const { state: authState, login, logout, registerPlugin } = useAuth();
  const t = useTranslation();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Register auth plugins on mount
  useEffect(() => {
    authPlugins?.forEach((plugin) => registerPlugin(plugin));
  }, [authPlugins, registerPlugin]);

  // Convert auth user to ThreadKit user format
  const currentUser: User | undefined = authState.user
    ? {
        id: authState.user.id,
        name: authState.user.name,
        avatar: authState.user.avatar_url,
        isModerator: false, // TODO: Get from server
        isAdmin: false,
      }
    : undefined;

  const isModerator = currentUser?.isModerator || currentUser?.isAdmin || false;
  const [currentSort, setCurrentSort] = useState<SortBy>(sortBy);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(theme);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);

  // Inject plugin styles into document head
  useEffect(() => {
    if (!plugins) return;

    plugins.forEach((plugin) => {
      if (plugin.styles && !injectedStyles.has(plugin.name)) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-threadkit-plugin', plugin.name);
        styleEl.textContent = plugin.styles;
        document.head.appendChild(styleEl);
        injectedStyles.add(plugin.name);
      }
    });
  }, [plugins]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const {
    comments,
    loading,
    error,
    postComment,
    deleteComment,
    editComment,
    vote,
    addComment,
    removeComment,
    updateComment,
    refresh,
  } = useComments({
    url,
    apiUrl,
    apiKey,
    sortBy: currentSort,
    initialComments,
    getPostHeaders,
  });

  // State for imperative API
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  // Imperative handle for parent component control
  useImperativeHandle(innerRef, () => ({
    scrollToComment: (commentId: string) => {
      const element = rootRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedCommentId(commentId);
        // Auto-clear highlight after 3 seconds
        setTimeout(() => setHighlightedCommentId(null), 3000);
      }
    },
    highlightComment: (commentId: string, duration = 3000) => {
      setHighlightedCommentId(commentId);
      if (duration > 0) {
        setTimeout(() => setHighlightedCommentId(null), duration);
      }
    },
    clearHighlight: () => setHighlightedCommentId(null),
    getComments: () => comments,
    refresh,
    collapseThread: (commentId: string) => {
      setCollapsedThreads(prev => new Set(prev).add(commentId));
    },
    expandThread: (commentId: string) => {
      setCollapsedThreads(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    },
    collapseAll: () => {
      const allIds = new Set(comments.map(c => c.id));
      setCollapsedThreads(allIds);
    },
    expandAll: () => setCollapsedThreads(new Set()),
  }), [comments, refresh]);

  // Scroll to hash comment after comments load
  const hasScrolledToHash = useRef(false);
  useEffect(() => {
    if (!loading && comments.length > 0 && !hasScrolledToHash.current) {
      const hash = window.location.hash;
      if (hash?.startsWith('#threadkit-')) {
        const commentId = hash.slice('#threadkit-'.length);
        hasScrolledToHash.current = true;
        setHighlightedCommentId(commentId);
        // Wait for DOM to render, then scroll
        requestAnimationFrame(() => {
          const element = document.getElementById(hash.slice(1));
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [loading, comments]);

  const handleCommentAdded = useCallback(
    (comment: Comment) => {
      addComment(comment);
      // onCommentReceived is for WebSocket messages (from any user)
      onCommentReceived?.(comment);
    },
    [addComment, onCommentReceived]
  );

  const handleCommentDeleted = useCallback(
    (commentId: string) => {
      removeComment(commentId);
    },
    [removeComment]
  );

  const handleCommentEdited = useCallback(
    (commentId: string, text: string) => {
      updateComment(commentId, { text, edited: true });
    },
    [updateComment]
  );

  const handleCommentPinned = useCallback(
    (commentId: string, pinned: boolean) => {
      updateComment(commentId, { pinned });
    },
    [updateComment]
  );

  const handleUserBanned = useCallback(
    (userId: string) => {
      // Remove all comments from banned user
      comments
        .filter((c) => c.userId === userId)
        .forEach((c) => removeComment(c.id));
    },
    [comments, removeComment]
  );

  const { presenceCount, typingUsers, sendTyping } = useWebSocket({
    url,
    apiUrl,
    enabled: true,
    onCommentAdded: handleCommentAdded,
    onCommentDeleted: handleCommentDeleted,
    onCommentEdited: handleCommentEdited,
    onCommentPinned: handleCommentPinned,
    onUserBanned: handleUserBanned,
  });

  const handlePost = useCallback(
    async (text: string, parentId?: string) => {
      try {
        const comment = await postComment(text, parentId);
        addComment(comment);
        onCommentPosted?.(comment);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to post');
        onError?.(error);
        throw error;
      }
    },
    [postComment, addComment, onCommentPosted, onError]
  );

  const handleVote = useCallback(
    async (commentId: string, voteType: 'up' | 'down') => {
      try {
        const result = await vote(commentId, voteType);
        // Update with response from server
        updateComment(commentId, {
          upvotes: result.upvotes,
          downvotes: result.downvotes,
          userVote: result.user_vote ?? null,
        });
        onVote?.(commentId, voteType);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to vote'));
      }
    },
    [vote, updateComment, onVote, onError]
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        await deleteComment(commentId);
        removeComment(commentId);
        onCommentDeleted?.(commentId);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to delete'));
      }
    },
    [deleteComment, removeComment, onCommentDeleted, onError]
  );

  const handleEdit = useCallback(
    async (commentId: string, newText: string) => {
      try {
        await editComment(commentId, newText);
        updateComment(commentId, { text: newText, edited: true });
        onCommentEdited?.(commentId, newText);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to edit'));
      }
    },
    [editComment, updateComment, onCommentEdited, onError]
  );

  const handleBan = useCallback(
    async (userId: string) => {
      try {
        const token = localStorage.getItem('threadkit_token');
        const response = await fetch(`${apiUrl}/users/${userId}/ban`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to ban user');
        }

        // Remove all comments from banned user
        comments
          .filter((c) => c.userId === userId)
          .forEach((c) => removeComment(c.id));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to ban user'));
      }
    },
    [apiUrl, comments, removeComment, onError]
  );

  const handlePin = useCallback(
    async (commentId: string) => {
      try {
        const token = localStorage.getItem('threadkit_token');
        const comment = comments.find((c) => c.id === commentId);
        const newPinned = !comment?.pinned;

        const response = await fetch(`${apiUrl}/comments/${commentId}/pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ pinned: newPinned }),
        });

        if (!response.ok) {
          throw new Error('Failed to pin comment');
        }

        updateComment(commentId, { pinned: newPinned });
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to pin'));
      }
    },
    [apiUrl, comments, updateComment, onError]
  );

  const handlePermalink = useCallback(
    (commentId: string) => {
      // Copy permalink to clipboard
      const permalink = `${window.location.origin}${window.location.pathname}#comment-${commentId}`;
      navigator.clipboard.writeText(permalink).catch(() => {
        // Fallback: update URL
        window.location.hash = `comment-${commentId}`;
      });
    },
    []
  );

  const handleBlock = useCallback(
    async (userId: string) => {
      try {
        const token = localStorage.getItem('threadkit_token');
        const response = await fetch(`${apiUrl}/users/${userId}/block`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to block user');
        }

        // Find user name from their comments
        const userComment = comments.find((c) => c.userId === userId);
        if (userComment) {
          setBlockedUsers((prev) => [...prev, { id: userId, name: userComment.userName }]);
        }

        // Hide comments from blocked user (client-side only for now)
        comments
          .filter((c) => c.userId === userId)
          .forEach((c) => removeComment(c.id));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to block user'));
      }
    },
    [apiUrl, comments, removeComment, onError]
  );

  const handleUnblock = useCallback(
    async (userId: string) => {
      try {
        const token = localStorage.getItem('threadkit_token');
        await fetch(`${apiUrl}/users/${userId}/unblock`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to unblock user'));
      }
    },
    [apiUrl, onError]
  );

  const handleLogin = useCallback(() => {
    login();
    setShowLoginModal(true);
  }, [login]);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const handleUpdateAvatar = useCallback(async (avatar: string) => {
    // TODO: Implement avatar update via API
    console.log('Update avatar:', avatar);
  }, []);

  const handleUpdateName = useCallback(async (name: string) => {
    // TODO: Implement name update via API
    console.log('Update name:', name);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const token = localStorage.getItem('threadkit_token');
      await fetch(`${apiUrl}/users/me`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      localStorage.removeItem('threadkit_token');
      // User will be logged out via auth context
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to delete account'));
    }
  }, [apiUrl, onError]);

  const handleMarkNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const handleMarkAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleReport = useCallback(
    async (commentId: string) => {
      try {
        const token = localStorage.getItem('threadkit_token');
        const response = await fetch(`${apiUrl}/comments/${commentId}/report`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error('Failed to report comment');
        }

        // Could show a toast notification here
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to report'));
      }
    },
    [apiUrl, onError]
  );

  // Compute merged styles (cssVariables + user style)
  const rootStyle = { ...cssVariablesToStyle(cssVariables), ...style };
  const rootClassName = className ? `threadkit-root ${className}` : 'threadkit-root';

  if (loading) {
    return (
      <div ref={rootRef} className={rootClassName} data-theme={currentTheme} style={rootStyle}>
        <div className="threadkit-loading">{t('loadingComments')}</div>
      </div>
    );
  }

  if (error) {
    const isThreadKitError = error instanceof ThreadKitError;
    const errorCode = isThreadKitError ? error.code : 'UNKNOWN';

    let errorContent: React.ReactNode;

    switch (errorCode) {
      case 'SITE_NOT_FOUND':
        errorContent = (
          <>
            <strong>{t('siteNotConfigured')}</strong>
            <p>
              {t('siteNotConfiguredMessage').split('usethreadkit.com/dashboard')[0]}
              <a href="https://usethreadkit.com/dashboard" target="_blank" rel="noopener noreferrer">
                usethreadkit.com/dashboard
              </a>
              {t('siteNotConfiguredMessage').split('usethreadkit.com/dashboard')[1]}
            </p>
          </>
        );
        break;
      case 'INVALID_API_KEY':
        errorContent = (
          <>
            <strong>{t('invalidApiKey')}</strong>
            <p>
              {t('invalidApiKeyMessage').split('dashboard')[0]}
              <a href="https://usethreadkit.com/dashboard" target="_blank" rel="noopener noreferrer">
                dashboard
              </a>
              {t('invalidApiKeyMessage').split('dashboard')[1]}
            </p>
          </>
        );
        break;
      case 'RATE_LIMITED':
        errorContent = (
          <>
            <strong>{t('rateLimited')}</strong>
            <p>{t('rateLimitedMessage')}</p>
          </>
        );
        break;
      default:
        errorContent = (
          <>
            <strong>{t('failedToLoadComments')}</strong>
            <p>{t('tryAgainLater')}</p>
            {error.message && <code className="threadkit-error-code">{error.message}</code>}
          </>
        );
    }

    return (
      <div ref={rootRef} className={rootClassName} data-theme={currentTheme} style={rootStyle}>
        <div className="threadkit-error">
          {errorContent}
        </div>
      </div>
    );
  }

  // Only show toolbar icons (notifications, settings) when logged in
  const toolbarIcons = currentUser ? (
    <div className="threadkit-toolbar-icons">
      <NotificationsPanel
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />
      <SettingsPanel
        currentUser={currentUser}
        theme={currentTheme}
        blockedUsers={blockedUsers}
        apiUrl={apiUrl}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateAvatar={handleUpdateAvatar}
        onUpdateName={handleUpdateName}
        onUnblock={handleUnblock}
        onThemeChange={setCurrentTheme}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={rootClassName} data-theme={currentTheme} style={rootStyle}>
      {mode === 'chat' ? (
        <ChatView
          comments={comments}
          currentUser={currentUser}
          needsUsername={authState.step === 'username-required' || authState.user?.username_set === false}
          showLastN={showLastN}
          autoScroll={autoScroll}
          showPresence={showPresence}
          presenceCount={presenceCount}
          typingUsers={showTyping ? typingUsers : []}
          onSend={handlePost}
          onTyping={sendTyping}
          onBlock={handleBlock}
          onReport={handleReport}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onBan={isModerator ? handleBan : undefined}
          toolbarEnd={toolbarIcons}
          plugins={plugins}
        />
      ) : (
        <CommentsView
          comments={comments}
          currentUser={currentUser}
          needsUsername={authState.step === 'username-required' || authState.user?.username_set === false}
          maxDepth={maxDepth}
          allowVoting={allowVoting}
          sortBy={currentSort}
          highlightedCommentId={highlightedCommentId}
          collapsedThreads={collapsedThreads}
          apiUrl={apiUrl}
          apiKey={apiKey}
          onSortChange={setCurrentSort}
          onPost={handlePost}
          onVote={handleVote}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onBan={isModerator ? handleBan : undefined}
          onPin={handlePin}
          onPermalink={handlePermalink}
          onBlock={handleBlock}
          onReport={handleReport}
          onCollapse={(id) => {
            if (collapsedThreads.has(id)) {
              setCollapsedThreads(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            } else {
              setCollapsedThreads(prev => new Set(prev).add(id));
            }
          }}
          onReplyStart={onReplyStart}
          toolbarEnd={toolbarIcons}
          plugins={plugins}
        />
      )}

      {!hideBranding && (
        <div className="threadkit-branding">
          <a href="https://usethreadkit.com" target="_blank" rel="noopener noreferrer">
            {t('poweredByThreadKit')}
          </a>
        </div>
      )}

      {showLoginModal && authState.step !== 'idle' && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          apiUrl={apiUrl}
          apiKey={apiKey}
        />
      )}
    </div>
  );
}

// Main exported component that wraps with AuthProvider and TranslationProvider
export const ThreadKit = forwardRef<ThreadKitRef, ThreadKitProps>(function ThreadKit(props, ref) {
  const { apiUrl = DEFAULT_API_URL, apiKey, onSignIn, onSignOut, translations, debug = false } = props;

  // Inject auth styles on mount
  useEffect(() => {
    injectAuthStyles();
  }, []);

  const handleUserChange = useCallback(
    (user: AuthUser | null) => {
      if (user && onSignIn) {
        onSignIn({
          id: user.id,
          name: user.name,
          avatar: user.avatar_url,
        });
      } else if (!user && onSignOut) {
        onSignOut();
      }
    },
    [onSignIn, onSignOut]
  );

  return (
    <DebugProvider value={debug}>
      <TranslationProvider translations={translations}>
        <AuthProvider apiUrl={apiUrl} apiKey={apiKey} onUserChange={handleUserChange}>
          <ThreadKitInner {...props} innerRef={ref} />
        </AuthProvider>
      </TranslationProvider>
    </DebugProvider>
  );
});
