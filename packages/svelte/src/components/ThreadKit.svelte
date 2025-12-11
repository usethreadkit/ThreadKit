<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { createCommentsStore, type CommentsStore } from '../stores/comments';
  import { createWebSocketStore, type WebSocketStore } from '../stores/websocket';
  import { createAuthStore, type AuthStore } from '../stores/auth';
  import type { Comment, SortBy, ThreadKitPlugin, User, UserProfile, PartialTranslations, LocaleMetadata, SocialLinks } from '@threadkit/core';
  import { setTranslationContext, getRTL } from '../i18n';
  import CommentsView from './CommentsView.svelte';
  import ChatView from './ChatView.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import NotificationsPanel from './NotificationsPanel.svelte';
  import DebugPanel from './DebugPanel.svelte';

  interface Props {
    url: string;
    projectId: string;
    apiUrl?: string;
    wsUrl?: string;
    mode?: 'comments' | 'chat';
    theme?: 'light' | 'dark';
    sortBy?: SortBy;
    maxDepth?: number;
    allowVoting?: boolean;
    showLastN?: number;
    autoScroll?: boolean;
    hideBranding?: boolean;
    showPresence?: boolean;
    showTyping?: boolean;
    plugins?: ThreadKitPlugin[];
    translations?: PartialTranslations | LocaleMetadata;
    rtl?: boolean;
    initialComments?: Comment[];
    debug?: boolean;
    onSignIn?: (user: User) => void;
    onSignOut?: () => void;
    onCommentPosted?: (comment: Comment) => void;
    onCommentReceived?: (comment: Comment) => void;
    onCommentDeleted?: (commentId: string) => void;
    onCommentEdited?: (commentId: string, newText: string) => void;
    onVote?: (commentId: string, voteType: 'up' | 'down') => void;
    onError?: (error: Error) => void;
  }

  let {
    url,
    projectId,
    apiUrl = 'https://api.usethreadkit.com/v1',
    wsUrl,
    mode = 'comments',
    theme = 'light',
    sortBy = 'top',
    maxDepth = 5,
    allowVoting = true,
    showLastN = 100,
    autoScroll = true,
    hideBranding = false,
    showPresence = false,
    showTyping = false,
    plugins = [],
    translations,
    rtl: rtlProp,
    initialComments,
    debug = false,
    onSignIn,
    onSignOut,
    onCommentPosted,
    onCommentReceived,
    onCommentDeleted,
    onCommentEdited,
    onVote,
    onError,
  }: Props = $props();

  // Set up translations context with RTL support
  const t = setTranslationContext(translations, rtlProp);
  const isRTL = getRTL();

  // Create stores
  let commentsStore: CommentsStore;
  let wsStore: WebSocketStore;
  let authStore: AuthStore;

  // Local state
  let currentSort = $state<SortBy>(sortBy);
  let currentTheme = $state<'light' | 'dark'>(theme);
  let highlightedCommentId = $state<string | null>(null);
  let collapsedThreads = $state<Set<string>>(new Set());

  // Pending comments for banner mode (default for comments mode)
  let pendingRootComments = $state<Comment[]>([]);
  let pendingReplies = $state<Map<string, Comment[]>>(new Map());

  // Track recently posted comment IDs to avoid duplicate additions from WebSocket
  let recentlyPostedIds = new Set<string>();

  // Real-time mode: default to 'auto' for chat mode, 'banner' for comments mode
  const realTimeMode = mode === 'chat' ? 'auto' : 'banner';

  // Reactive state from stores
  let comments = $state<Comment[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);
  let pageId = $state<string | null>(null);
  let currentUser = $state<User | null>(null);
  let connected = $state(false);
  let presenceCount = $state(0);
  let typingUsers = $state<Array<{ userId: string; userName: string }>>([]);

  // Unsubscribe functions
  let unsubComments: (() => void) | undefined;
  let unsubAuth: (() => void) | undefined;
  let unsubWs: (() => void) | undefined;
  let unsubWsAdded: (() => void) | undefined;
  let unsubWsDeleted: (() => void) | undefined;
  let unsubWsEdited: (() => void) | undefined;

  // Initialize on mount
  onMount(() => {
    commentsStore = createCommentsStore({
      url,
      apiUrl,
      projectId,
      sortBy: currentSort,
      initialComments,
      debug,
    });

    authStore = createAuthStore({
      apiUrl,
      projectId,
    });

    // Subscribe to comments store
    unsubComments = commentsStore.subscribe(async (state) => {
      const wasLoading = loading;
      comments = state.comments;
      loading = state.loading;
      error = state.error;

      // Initialize WebSocket when pageId becomes available
      if (state.pageId && !pageId && wsUrl) {
        pageId = state.pageId;
        wsStore = createWebSocketStore({
          wsUrl,
          url,
          projectId,
          pageId: state.pageId,
          enabled: true,
        });

        // Subscribe to websocket store
        unsubWs = wsStore.subscribe((wsState) => {
          connected = wsState.connected;
          presenceCount = wsState.presenceCount;
          typingUsers = wsState.typingUsers;
        });

        // Subscribe to WebSocket events
        unsubWsAdded = wsStore.onCommentAdded((comment) => {
          // Skip comments we just posted (already added via HTTP response)
          if (recentlyPostedIds.has(comment.id)) {
            recentlyPostedIds.delete(comment.id);
            return;
          }

          // Always call onCommentReceived for sound effects etc.
          onCommentReceived?.(comment);

          // Handle based on realTimeMode
          if (realTimeMode === 'auto') {
            // In chat mode with auto mode, replies should appear both in thread AND at top
            if (mode === 'chat' && comment.parentId) {
              // First, add the threaded reply (with parent)
              commentsStore.addComment(comment);

              // Then, add a top-level reference copy (without parent, with replyReferenceId)
              const topLevelCopy: Comment = {
                ...comment,
                id: `${comment.id}-ref`, // Unique ID for the reference
                parentId: undefined,
                replyReferenceId: comment.id, // Link to the actual threaded comment
                children: [],
              };
              commentsStore.addComment(topLevelCopy);
            } else {
              // Regular behavior for non-replies or comments mode
              commentsStore.addComment(comment);
            }
          } else {
            // Banner mode: queue comments instead of adding directly
            if (!comment.parentId) {
              // Root comment - add to pending root comments
              pendingRootComments = [...pendingRootComments, comment];
            } else {
              // Reply - add to pending replies for parent
              const existing = pendingReplies.get(comment.parentId) || [];
              pendingReplies = new Map(pendingReplies).set(comment.parentId, [...existing, comment]);
            }
          }
        });

        unsubWsDeleted = wsStore.onCommentDeleted((commentId) => {
          commentsStore.removeComment(commentId);
          onCommentDeleted?.(commentId);
        });

        unsubWsEdited = wsStore.onCommentEdited((commentId, text) => {
          commentsStore.updateComment(commentId, { text, edited: true });
          onCommentEdited?.(commentId, text);
        });
      }

      // Scroll to hash after comments finish loading
      if (wasLoading && !state.loading && state.comments.length > 0) {
        const hash = window.location.hash;
        if (hash?.startsWith('#threadkit-')) {
          const commentId = hash.slice('#threadkit-'.length);
          highlightedCommentId = commentId;
          // Wait for DOM to update, then scroll
          await tick();
          const element = document.getElementById(hash.slice(1));
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });

    // Subscribe to auth store
    unsubAuth = authStore.subscribe((state) => {
      if (state.user) {
        currentUser = {
          id: state.user.id,
          name: state.user.name,
          avatar: state.user.avatar_url,
          isModerator: false,
          isAdmin: false,
          socialLinks: state.user.social_links,
        };
        onSignIn?.(currentUser);
      } else if (currentUser !== null) {
        currentUser = null;
        onSignOut?.();
      }
    });

    // Initialize auth and set up OAuth listener
    authStore.initialize();
    authStore.setupOAuthListener();
  });

  // Cleanup on destroy
  onDestroy(() => {
    unsubComments?.();
    unsubAuth?.();
    unsubWs?.();
    unsubWsAdded?.();
    unsubWsDeleted?.();
    unsubWsEdited?.();
    commentsStore?.destroy();
    wsStore?.destroy();
    authStore?.destroyOAuthListener();
    authStore?.destroy();
  });

  // Computed
  const isModerator = $derived(currentUser?.isModerator || currentUser?.isAdmin || false);

  async function handleUpdateSocialLinks(socialLinks: SocialLinks) {
    // TODO: Implement actual API call to update user social links
    // For now, update the current user's social links locally
    if (currentUser) {
      currentUser = { ...currentUser, socialLinks };
      // Also likely need to update the authStore here if it manages user data
      // authStore.updateUser({ socialLinks }); // Assuming authStore has an updateUser method
    }
  }

  async function handleUpdateName(name: string) {
    // TODO: Implement actual API call to update user name
    if (currentUser) {
      currentUser = { ...currentUser, name };
      // authStore.updateUser({ name }); // Assuming authStore has an updateUser method
    }
  }

  function handleThemeChange(newTheme: 'light' | 'dark') {
    currentTheme = newTheme;
    // Potentially save theme preference to local storage or API
  }

  // Handler to load pending root comments (banner click)
  function handleLoadPendingComments() {
    // Add all pending comments to the list
    pendingRootComments.forEach(comment => {
      commentsStore.addComment(comment);

      // Also load any pending replies for this comment
      const replies = pendingReplies.get(comment.id);
      if (replies) {
        replies.forEach(reply => commentsStore.addComment(reply));
      }
    });

    // Clear pending root comments and their replies
    const loadedCommentIds = pendingRootComments.map(c => c.id);
    pendingRootComments = [];
    const nextPending = new Map(pendingReplies);
    loadedCommentIds.forEach(id => nextPending.delete(id));
    pendingReplies = nextPending;
  }

  // Handler to load pending replies for a specific comment
  function handleLoadPendingReplies(parentId: string) {
    const pending = pendingReplies.get(parentId);
    if (pending) {
      pending.forEach(comment => commentsStore.addComment(comment));
      const nextPending = new Map(pendingReplies);
      nextPending.delete(parentId);
      pendingReplies = nextPending;
    }
  }

  // Handlers
  async function handlePost(text: string, parentId?: string) {
    try {
      const comment = await commentsStore.post(text, parentId);

      // Track this comment ID to skip the WebSocket echo
      recentlyPostedIds.add(comment.id);
      setTimeout(() => recentlyPostedIds.delete(comment.id), 30000);

      commentsStore.addComment(comment);
      onCommentPosted?.(comment);
    } catch (e) {
      onError?.(e as Error);
      throw e;
    }
  }

  async function handleVote(commentId: string, voteType: 'up' | 'down') {
    if (!allowVoting) return;
    try {
      const result = await commentsStore.vote(commentId, voteType);
      // Update with server response
      commentsStore.updateComment(commentId, {
        upvotes: result.upvotes,
        downvotes: result.downvotes,
        userVote: result.user_vote ?? undefined,
      });
      onVote?.(commentId, voteType);
    } catch (e) {
      onError?.(e as Error);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await commentsStore.delete(commentId);
      commentsStore.removeComment(commentId);
      onCommentDeleted?.(commentId);
    } catch (e) {
      onError?.(e as Error);
    }
  }

  async function handleEdit(commentId: string, newText: string) {
    try {
      const token = localStorage.getItem('threadkit_token');
      const response = await fetch(`${apiUrl}/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: newText }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit comment');
      }

      commentsStore.updateComment(commentId, { text: newText, edited: true });
      onCommentEdited?.(commentId, newText);
    } catch (e) {
      onError?.(e as Error);
    }
  }

  async function handleBan(userId: string) {
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
        .forEach((c) => commentsStore.removeComment(c.id));
    } catch (e) {
      onError?.(e as Error);
    }
  }

  async function handleBlock(userId: string) {
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

      // Hide comments from blocked user (client-side only)
      comments
        .filter((c) => c.userId === userId)
        .forEach((c) => commentsStore.removeComment(c.id));
    } catch (e) {
      onError?.(e as Error);
    }
  }

  async function handleReport(commentId: string) {
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
    } catch (e) {
      onError?.(e as Error);
    }
  }

  function handleSortChange(sort: SortBy) {
    currentSort = sort;
    commentsStore.setSortBy(sort);
  }

  function handleCollapse(commentId: string) {
    if (collapsedThreads.has(commentId)) {
      const next = new Set(collapsedThreads);
      next.delete(commentId);
      collapsedThreads = next;
    } else {
      collapsedThreads = new Set(collapsedThreads).add(commentId);
    }
  }

  function handleTyping() {
    wsStore?.sendTyping();
  }
</script>

{#snippet toolbarIcons()}
  {#if currentUser}
    <div class="threadkit-toolbar-icons">
      <NotificationsPanel
        notifications={[]}
        onMarkRead={() => {}}
        onMarkAllRead={() => {}}
      />
      <SettingsPanel
        currentUser={currentUser}
        onLogin={() => authStore.startLogin()}
        onLogout={() => authStore.logout()}
        onUpdateSocialLinks={handleUpdateSocialLinks}
        onUpdateName={handleUpdateName}
        onThemeChange={handleThemeChange}
        theme={currentTheme}
      />
    </div>
  {/if}
{/snippet}

<div
  class="threadkit-root"
  data-theme={currentTheme}
  dir={isRTL ? 'rtl' : 'ltr'}
>
  {#if loading}
    <div class="threadkit-loading">{t('loadingComments')}</div>
  {:else if error}
    <div class="threadkit-error">
      <strong>{t('failedToLoadComments')}</strong>
      <p>{t('tryAgainLater')}</p>
      {#if error.message}
        <code class="threadkit-error-code">{error.message}</code>
      {/if}
    </div>
  {:else}
    {#if mode === 'chat'}
    <ChatView
      {comments}
      currentUser={currentUser ?? undefined}
      {showLastN}
      {autoScroll}
      {showPresence}
      wsConnected={connected}
      {presenceCount}
      typingUsers={showTyping ? typingUsers : []}
      {authStore}
      {apiUrl}
      {projectId}
      onSend={handlePost}
      onTyping={handleTyping}
      onBlock={handleBlock}
      onReport={handleReport}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onBan={isModerator ? handleBan : undefined}
      {plugins}
      toolbarEnd={toolbarIcons}
    />
  {:else}
    <CommentsView
      {comments}
      currentUser={currentUser ?? undefined}
      {apiUrl}
      {projectId}
      {maxDepth}
      {allowVoting}
      sortBy={currentSort}
      {highlightedCommentId}
      {collapsedThreads}
      pendingRootCount={pendingRootComments.length}
      {pendingReplies}
      onLoadPendingComments={handleLoadPendingComments}
      onLoadPendingReplies={handleLoadPendingReplies}
      onSortChange={handleSortChange}
      onPost={handlePost}
      onVote={handleVote}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onBan={isModerator ? handleBan : undefined}
      onBlock={handleBlock}
      onReport={handleReport}
      onCollapse={handleCollapse}
      {plugins}
      {currentTheme}
      {authStore}
      onLogin={() => authStore.startLogin()}
      onLogout={() => authStore.logout()}
      onUpdateSocialLinks={handleUpdateSocialLinks}
      onUpdateName={handleUpdateName}
      onThemeChange={handleThemeChange}
    />
    {/if}
  {/if}

  {#if !hideBranding}
    <div class="threadkit-branding">
      <a href="https://usethreadkit.com" target="_blank" rel="noopener noreferrer">
        {t('poweredByThreadKit')}
      </a>
    </div>
  {/if}
</div>

{#if debug}
  <DebugPanel
    {comments}
    {loading}
    {error}
    {pageId}
    {currentUser}
    connected={connected}
    {presenceCount}
    config={{
      apiUrl,
      projectId,
      url,
      mode,
      theme: currentTheme,
      sortBy: currentSort,
    }}
  />
{/if}
