import React, { useCallback, useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import type { ThreadKitProps, ThreadKitCSSVariables, ThreadKitRef, User, Comment, SortBy, UserProfile } from './types';
import { useComments, ThreadKitError } from './hooks/useComments';
import { useWebSocket } from './hooks/useWebSocket';
import { sortComments, getUser } from '@threadkit/core';
import { CommentsView } from './components/CommentsView';
import { ChatView } from './components/ChatView';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationsPanel, type Notification } from './components/NotificationsPanel';
import { AuthProvider, useAuth, LoginModal, injectAuthStyles } from './auth';
import type { User as AuthUser } from './auth/types';
import { TranslationProvider, useTranslation, useRTL } from './i18n';
import { DebugProvider } from './debug';

const DEFAULT_API_URL = 'https://api.usethreadkit.com/v1';

// Track injected plugin styles to avoid duplicates
const injectedStyles = new Set<string>();

interface BlockedUser {
  id: string;
  name: string;
}

// Error Boundary Component
class ThreadKitErrorBoundary extends React.Component<
  {
    children: React.ReactNode;
    sentry?: { captureException: (error: Error) => void };
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; sentry?: { captureException: (error: Error) => void } }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ThreadKit Error:', error, errorInfo);

    // Report to Sentry if provided
    if (this.props.sentry) {
      this.props.sentry.captureException(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="threadkit threadkit-error-boundary" data-theme="light">
          <div className="threadkit-error">
            <strong>Something went wrong</strong>
            <p>ThreadKit encountered an error. Please check the console for details.</p>
            {this.state.error && <code className="threadkit-error-code">{this.state.error.message}</code>}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
  sortBy = 'top',
  allowVoting = true,
  showLastN: _showLastN = 100,
  autoScroll: _autoScroll = true,
  showPresence: _showPresence = false,
  showTyping: _showTyping = false,
  apiUrl = DEFAULT_API_URL,
  projectId,
  wsUrl,
  pageId: _pageId, // Deprecated - pageId now comes from API response
  realTimeMode: realTimeModeProp,
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
  const { state: authState, login, logout, registerPlugin, updateUsername, updateAvatar } = useAuth();
  const t = useTranslation();
  const isRTL = useRTL();
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
        socialLinks: authState.user.social_links,
      }
    : undefined;

  const isModerator = currentUser?.isModerator || currentUser?.isAdmin || false;

  // Initialize sort from localStorage or prop
  const [currentSort, setCurrentSort] = useState<SortBy>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('threadkit_sort');
      if (saved === 'top' || saved === 'new' || saved === 'controversial' || saved === 'old') {
        return saved;
      }
    }
    return sortBy;
  });

  // Persist sort changes to localStorage
  const handleSortChange = useCallback((newSort: SortBy) => {
    setCurrentSort(newSort);
    if (typeof window !== 'undefined') {
      localStorage.setItem('threadkit_sort', newSort);
    }
  }, []);

  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark' | 'system'>(theme);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [userProfileCache, setUserProfileCache] = useState<Map<string, UserProfile>>(new Map());

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

  // Get cached user profile (does NOT fetch)
  const getUserProfile = useCallback((userId: string): UserProfile | undefined => {
    return userProfileCache.get(userId);
  }, [userProfileCache]);

  // Fetch user profile on demand (for hover)
  const fetchUserProfile = useCallback(async (userId: string): Promise<void> => {
    // Skip special user IDs (deleted/anonymous)
    if (userId === 'd0000000-0000-0000-0000-000000000000' ||
        userId === 'a0000000-0000-0000-0000-000000000000') {
      return;
    }

    // Skip if already cached
    if (userProfileCache.has(userId)) {
      return;
    }

    try {
      const token = authState.token;
      const profile = await getUser(apiUrl, projectId, userId, token);
      setUserProfileCache(prev => new Map(prev).set(userId, profile));
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  }, [apiUrl, projectId, authState.token, userProfileCache]);

  const {
    comments,
    loading,
    error,
    pageId: fetchedPageId,
    pinnedIds,
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
    projectId,
    sortBy: currentSort,
    initialComments,
    getPostHeaders,
  });

  // Use pageId from API response for WebSocket subscription
  const effectivePageId = fetchedPageId || '';

  // State for imperative API
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);

  // Track recently posted comment IDs to avoid duplicate additions from WebSocket
  const recentlyPostedIds = useRef<Set<string>>(new Set());

  // Real-time mode: default to 'banner' for comments mode, 'auto' for chat mode
  const realTimeMode = realTimeModeProp ?? (mode === 'chat' ? 'auto' : 'banner');

  // Pending comments for banner mode
  const [pendingRootComments, setPendingRootComments] = useState<Comment[]>([]);
  const [pendingReplies, setPendingReplies] = useState<Map<string, Comment[]>>(new Map());

  // Sort comments by newest for chat mode
  const chatComments = useMemo(() => {
    if (mode === 'chat') return sortComments(comments, 'new');
    return comments;
  }, [mode, comments]);

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

  // WebSocket handlers
  const handleWsCommentAdded = useCallback(
    (_pageId: string, comment: Comment) => {
      // Skip comments we just posted (already added via HTTP response)
      if (recentlyPostedIds.current.has(comment.id)) {
        recentlyPostedIds.current.delete(comment.id);
        return;
      }

      // Always call onCommentReceived for sound effects etc.
      onCommentReceived?.(comment);

      // Handle based on realTimeMode
      if (realTimeMode === 'auto') {
        // In chat mode with auto mode, replies should appear both in thread AND at top
        if (mode === 'chat' && comment.parentId) {
          // First, add the threaded reply (with parent)
          addComment(comment);

          // Then, add a top-level reference copy (without parent, with replyReferenceId)
          const topLevelCopy: Comment = {
            ...comment,
            id: `${comment.id}-ref`, // Unique ID for the reference
            parentId: undefined,
            replyReferenceId: comment.id, // Link to the actual threaded comment
            children: [],
          };
          addComment(topLevelCopy);
        } else {
          // Regular behavior for non-replies or comments mode
          addComment(comment);
        }
      } else {
        // Banner mode: queue comments instead of adding directly
        if (!comment.parentId) {
          // Root comment - add to pending root comments
          setPendingRootComments(prev => [...prev, comment]);
        } else {
          // Reply - add to pending replies for parent
          setPendingReplies(prev => {
            const next = new Map(prev);
            const existing = next.get(comment.parentId!) || [];
            next.set(comment.parentId!, [...existing, comment]);
            return next;
          });
        }
      }
    },
    [addComment, onCommentReceived, currentUser, realTimeMode, mode]
  );

  const handleWsCommentDeleted = useCallback(
    (_pageId: string, commentId: string) => {
      removeComment(commentId);
      onCommentDeleted?.(commentId);
    },
    [removeComment, onCommentDeleted]
  );

  const handleWsCommentEdited = useCallback(
    (_pageId: string, commentId: string, text: string, _textHtml: string) => {
      updateComment(commentId, { text, edited: true });
      onCommentEdited?.(commentId, text);
    },
    [updateComment, onCommentEdited]
  );

  const handleWsVoteUpdated = useCallback(
    (_pageId: string, commentId: string, upvotes: number, downvotes: number) => {
      updateComment(commentId, { upvotes, downvotes });
    },
    [updateComment]
  );

  const handleWsPinUpdated = useCallback(
    (_pageId: string, commentId: string, pinned: boolean, pinned_at: number | null) => {
      updateComment(commentId, { pinned: pinned || undefined, pinned_at: pinned_at || undefined });
    },
    [updateComment]
  );

  // WebSocket connection (enabled when wsUrl provided and pageId available from API)
  const { connected: _wsConnected, presenceCount: _presenceCount, typingUsers: _typingUsers, typingByComment, sendTyping: _sendTyping } = useWebSocket({
    wsUrl: wsUrl || '',
    projectId,
    pageId: effectivePageId,
    enabled: Boolean(wsUrl && effectivePageId),
    onCommentAdded: handleWsCommentAdded,
    onCommentDeleted: handleWsCommentDeleted,
    onCommentEdited: handleWsCommentEdited,
    onVoteUpdated: handleWsVoteUpdated,
    onPinUpdated: handleWsPinUpdated,
  });

  // Handler to load pending root comments (banner click)
  const handleLoadPendingComments = useCallback(() => {
    // Add all pending comments to the list (prepend)
    pendingRootComments.forEach(comment => addComment(comment));
    setPendingRootComments([]);
  }, [pendingRootComments, addComment]);

  // Handler to load pending replies for a specific comment
  const handleLoadPendingReplies = useCallback((parentId: string) => {
    const pending = pendingReplies.get(parentId);
    if (pending) {
      pending.forEach(comment => addComment(comment));
      setPendingReplies(prev => {
        const next = new Map(prev);
        next.delete(parentId);
        return next;
      });
    }
  }, [pendingReplies, addComment]);

  const handlePost = useCallback(
    async (text: string, parentId?: string) => {
      try {
        const comment = await postComment(text, parentId);

        // Track this comment ID to skip the WebSocket echo
        recentlyPostedIds.current.add(comment.id);
        setTimeout(() => recentlyPostedIds.current.delete(comment.id), 30000);

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

  // BroadcastChannel for cross-tab vote synchronization
  const voteChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for vote sync
  useEffect(() => {
    // Check if BroadcastChannel is supported (not available in SSR or some older browsers)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(`threadkit-votes-${url}`);
      voteChannelRef.current = channel;

      // Listen for vote messages from other tabs
      channel.onmessage = (event: MessageEvent) => {
        const { type, commentId, pageUrl, voteType, upvotes, downvotes } = event.data;

        // Only process vote messages for the same page
        if (type === 'vote' && pageUrl === url) {
          // Update local state to match the vote from another tab
          updateComment(commentId, {
            upvotes,
            downvotes,
            userVote: voteType,
          });
        }
      };

      return () => {
        channel.close();
        voteChannelRef.current = null;
      };
    }
  }, [url, updateComment]);

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

        // Broadcast vote to other tabs
        if (voteChannelRef.current) {
          voteChannelRef.current.postMessage({
            type: 'vote',
            commentId,
            pageUrl: url,
            voteType: result.user_vote ?? null,
            upvotes: result.upvotes,
            downvotes: result.downvotes,
          });
        }

        onVote?.(commentId, voteType);
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to vote'));
      }
    },
    [vote, updateComment, onVote, onError, url]
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

        // Find comment and build path
        const findCommentPath = (nodes: typeof comments, targetId: string, currentPath: string[] = []): string[] | null => {
          for (const node of nodes) {
            const newPath = [...currentPath, node.id];
            if (node.id === targetId) {
              return newPath;
            }
            const found = findCommentPath(node.children, targetId, newPath);
            if (found) return found;
          }
          return null;
        };

        const path = findCommentPath(comments, commentId);
        if (!path) {
          throw new Error('Comment not found in tree');
        }

        const response = await fetch(`${apiUrl}/comments/${commentId}/pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'projectid': projectId,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            page_url: url,
            path,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to pin comment');
        }

        const data = await response.json();
        updateComment(commentId, {
          pinned: data.pinned,
          pinned_at: data.pinned_at,
        });
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error('Failed to pin'));
      }
    },
    [apiUrl, projectId, url, comments, updateComment, onError]
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
    try {
      await updateAvatar(avatar);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to update avatar'));
    }
  }, [updateAvatar, onError]);

  const handleUpdateName = useCallback(async (name: string) => {
    try {
      await updateUsername(name);
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to update username'));
    }
  }, [updateUsername, onError]);

  const handleUpdateSocialLinks = useCallback(async (socialLinks: import('./types').SocialLinks) => {
    try {
      const token = localStorage.getItem('threadkit_token');
      const response = await fetch(`${apiUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'projectid': projectId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ social_links: socialLinks }),
      });

      if (!response.ok) {
        throw new Error('Failed to update social links');
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error('Failed to update social links'));
    }
  }, [apiUrl, projectId, currentUser, onError]);

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

  // Handler to scroll to a comment by ID (for chat mode reply references)
  const handleScrollToComment = useCallback((commentId: string) => {
    const element = rootRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedCommentId(commentId);
      // Auto-clear highlight after 3 seconds
      setTimeout(() => setHighlightedCommentId(null), 3000);
    }
  }, []);

  // Compute merged styles (cssVariables + user style)
  const rootStyle = { ...cssVariablesToStyle(cssVariables), ...style };
  const rootClassName = className ? `threadkit-root ${className}` : 'threadkit-root';

  if (loading) {
    return (
      <div ref={rootRef} className={rootClassName} data-theme={currentTheme} dir={isRTL ? 'rtl' : 'ltr'} style={rootStyle}>
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
              {t('siteNotConfiguredMessage').split('usethreadkit.com/sites')[0]}
              <a href="https://usethreadkit.com/sites" target="_blank" rel="noopener noreferrer">
                usethreadkit.com/sites
              </a>
              {t('siteNotConfiguredMessage').split('usethreadkit.com/sites')[1]}
            </p>
          </>
        );
        break;
      case 'INVALID_API_KEY':
        errorContent = (
          <>
            <strong>{t('invalidApiKey')}</strong>
            <p>
              {t('invalidApiKeyMessage').split('https://usethreadkit.com/sites')[0]}
              <a href="https://usethreadkit.com/sites" target="_blank" rel="noopener noreferrer">
                https://usethreadkit.com/sites
              </a>
              {t('invalidApiKeyMessage').split('https://usethreadkit.com/sites')[1]}
            </p>
          </>
        );
        break;
      case 'INVALID_ORIGIN':
        errorContent = (
          <>
            <strong>Origin Not Allowed</strong>
            <p>{error.message}</p>
            <p style={{ fontSize: '0.9em', marginTop: '0.5rem', opacity: 0.8 }}>
              Add your domain to the allowed origins list in your{' '}
              <a href="https://usethreadkit.com/sites" target="_blank" rel="noopener noreferrer">
                site settings
              </a>
              .
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
      <div ref={rootRef} className={rootClassName} data-theme={currentTheme} dir={isRTL ? 'rtl' : 'ltr'} style={rootStyle}>
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
        projectId={projectId}
        token={authState.token ?? undefined}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onUpdateAvatar={handleUpdateAvatar}
        onUpdateName={handleUpdateName}
        onUpdateSocialLinks={handleUpdateSocialLinks}
        onUnblock={handleUnblock}
        onThemeChange={setCurrentTheme}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={rootClassName} data-theme={currentTheme} dir={isRTL ? 'rtl' : 'ltr'} style={rootStyle}>
      {mode === 'chat' ? (
        <ChatView
          comments={chatComments}
          currentUser={currentUser}
          needsUsername={authState.step === 'username-required' || authState.user?.username_set === false}
          showLastN={_showLastN}
          autoScroll={_autoScroll}
          showPresence={_showPresence}
          wsConnected={_wsConnected}
          presenceCount={_presenceCount}
          typingUsers={_showTyping ? _typingUsers : []}
          apiUrl={apiUrl}
          projectId={projectId}
          onSend={handlePost}
          onTyping={_sendTyping}
          onBlock={handleBlock}
          onReport={handleReport}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onBan={isModerator ? handleBan : undefined}
          onScrollToComment={handleScrollToComment}
          highlightedCommentId={highlightedCommentId}
          toolbarEnd={toolbarIcons}
          plugins={plugins}
          getUserProfile={getUserProfile}
          fetchUserProfile={fetchUserProfile}
        />
      ) : (
        <CommentsView
          comments={comments}
          currentUser={currentUser}
          needsUsername={authState.step === 'username-required' || authState.user?.username_set === false}
          allowVoting={allowVoting}
          sortBy={currentSort}
          highlightedCommentId={highlightedCommentId}
          collapsedThreads={collapsedThreads}
          apiUrl={apiUrl}
          projectId={projectId}
          pinnedIds={pinnedIds}
          pendingRootCount={pendingRootComments.length}
          pendingReplies={pendingReplies}
          onLoadPendingComments={handleLoadPendingComments}
          onLoadPendingReplies={handleLoadPendingReplies}
          typingByComment={typingByComment}
          onSortChange={handleSortChange}
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
          getUserProfile={getUserProfile}
          fetchUserProfile={fetchUserProfile}
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
          projectId={projectId}
        />
      )}
    </div>
  );
}

// Main exported component that wraps with AuthProvider and TranslationProvider
export const ThreadKit = forwardRef<ThreadKitRef, ThreadKitProps>(function ThreadKit(props, ref) {
  const { apiUrl = DEFAULT_API_URL, projectId, onSignIn, onSignOut, translations, rtl, debug = false, sentry } = props;

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
    <ThreadKitErrorBoundary sentry={sentry}>
      <DebugProvider value={debug}>
        <TranslationProvider translations={translations} rtl={rtl}>
          <AuthProvider apiUrl={apiUrl} projectId={projectId} onUserChange={handleUserChange}>
            <ThreadKitInner {...props} innerRef={ref} />
          </AuthProvider>
        </TranslationProvider>
      </DebugProvider>
    </ThreadKitErrorBoundary>
  );
});
