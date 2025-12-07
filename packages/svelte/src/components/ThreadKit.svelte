<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { createCommentsStore, type CommentsStore } from '../stores/comments';
  import { createWebSocketStore, type WebSocketStore } from '../stores/websocket';
  import { createAuthStore, type AuthStore } from '../stores/auth';
  import type { Comment, SortBy, ThreadKitPlugin, User, UserProfile, PartialTranslations } from '@threadkit/core';
  import { setTranslationContext } from '../i18n';
  import CommentsView from './CommentsView.svelte';
  import ChatView from './ChatView.svelte';
  import SettingsPanel from './SettingsPanel.svelte';

  interface Props {
    siteId: string;
    url: string;
    apiKey?: string;
    apiUrl?: string;
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
    translations?: PartialTranslations;
    initialComments?: Comment[];
    onSignIn?: (user: User) => void;
    onSignOut?: () => void;
    onCommentPosted?: (comment: Comment) => void;
    onCommentReceived?: (comment: Comment) => void;
    onCommentDeleted?: (commentId: string) => void;
    onCommentEdited?: (commentId: string, newText: string) => void;
    onError?: (error: Error) => void;
  }

  let {
    siteId,
    url,
    apiKey = '',
    apiUrl = 'https://api.usethreadkit.com',
    mode = 'comments',
    theme = 'light',
    sortBy = 'votes',
    maxDepth = 5,
    allowVoting = true,
    showLastN = 100,
    autoScroll = true,
    hideBranding = false,
    showPresence = false,
    showTyping = false,
    plugins = [],
    translations,
    initialComments,
    onSignIn,
    onSignOut,
    onCommentPosted,
    onCommentReceived,
    onCommentDeleted,
    onCommentEdited,
    onError,
  }: Props = $props();

  // Set up translations context
  const t = setTranslationContext(translations);

  // Create stores
  let commentsStore: CommentsStore;
  let wsStore: WebSocketStore;
  let authStore: AuthStore;

  // Local state
  let currentSort = $state<SortBy>(sortBy);
  let currentTheme = $state<'light' | 'dark'>(theme);
  let highlightedCommentId = $state<string | null>(null);
  let collapsedThreads = $state<Set<string>>(new Set());

  // Reactive state from stores
  let comments = $state<Comment[]>([]);
  let loading = $state(true);
  let error = $state<Error | null>(null);
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
      siteId,
      url,
      apiUrl,
      apiKey,
      sortBy: currentSort,
      initialComments,
    });

    wsStore = createWebSocketStore({
      siteId,
      url,
      apiUrl,
    });

    authStore = createAuthStore({
      apiUrl,
      apiKey,
    });

    // Subscribe to comments store
    unsubComments = commentsStore.subscribe(async (state) => {
      const wasLoading = loading;
      comments = state.comments;
      loading = state.loading;
      error = state.error;

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
          socialLinks: state.user.social_links, // Assuming social_links is returned by authStore
        };
        onSignIn?.(currentUser);
      } else if (currentUser !== null) {
        currentUser = null;
        onSignOut?.();
      }
    });

    // Subscribe to websocket store
    unsubWs = wsStore.subscribe((state) => {
      connected = state.connected;
      presenceCount = state.presenceCount;
      typingUsers = state.typingUsers;
    });

    // Initialize auth
    authStore.initialize();

    // Subscribe to WebSocket events
    unsubWsAdded = wsStore.onCommentAdded((comment) => {
      commentsStore.addComment(comment);
      onCommentReceived?.(comment);
    });

    unsubWsDeleted = wsStore.onCommentDeleted((commentId) => {
      commentsStore.removeComment(commentId);
      onCommentDeleted?.(commentId);
    });

    unsubWsEdited = wsStore.onCommentEdited((commentId, text) => {
      commentsStore.updateComment(commentId, { text, edited: true });
      onCommentEdited?.(commentId, text);
    });
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
    authStore?.destroy();
  });

  // Computed
  const isModerator = $derived(currentUser?.isModerator || currentUser?.isAdmin || false);

  async function handleUpdateSocialLinks(socialLinks: SocialLinks) {
    console.log('Updating social links:', socialLinks);
    // TODO: Implement actual API call to update user social links
    // For now, update the current user's social links locally
    if (currentUser) {
      currentUser = { ...currentUser, socialLinks };
      // Also likely need to update the authStore here if it manages user data
      // authStore.updateUser({ socialLinks }); // Assuming authStore has an updateUser method
    }
  }

  async function handleUpdateName(name: string) {
    console.log('Updating name:', name);
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

  // Handlers
  async function handlePost(text: string, parentId?: string) {
    try {
      const comment = await commentsStore.post(text, parentId);
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

<div
  class="threadkit-root"
  data-theme={currentTheme}
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
    <SettingsPanel
      {currentUser}
      onLogin={() => authStore.signIn()}
      onLogout={() => authStore.signOut()}
      onUpdateSocialLinks={handleUpdateSocialLinks}
      onUpdateName={handleUpdateName}
      onThemeChange={handleThemeChange}
      theme={currentTheme}
    />
    {#if mode === 'chat'}
    <ChatView
      {comments}
      currentUser={user ?? undefined}
      {showLastN}
      {autoScroll}
      {showPresence}
      {presenceCount}
      typingUsers={showTyping ? typingUsers : []}
      onSend={handlePost}
      onTyping={handleTyping}
      onBlock={handleBlock}
      onReport={handleReport}
      onDelete={handleDelete}
      onEdit={handleEdit}
      onBan={isModerator ? handleBan : undefined}
      {plugins}
    />
  {:else}
    <CommentsView
      {comments}
      currentUser={user ?? undefined}
      {maxDepth}
      {allowVoting}
      sortBy={currentSort}
      {highlightedCommentId}
      {collapsedThreads}
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
    />
  {/if}

  {#if !hideBranding}
    <div class="threadkit-branding">
      <a href="https://usethreadkit.com" target="_blank" rel="noopener noreferrer">
        {t('poweredByThreadKit')}
      </a>
    </div>
  {/if}
</div>
