<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin, SocialLinks } from '@threadkit/core';
  import type { AuthStore } from '../stores/auth';
  import { getTranslation } from '../i18n';
  import Comment from './Comment.svelte';
  import CommentForm from './CommentForm.svelte';
  import SettingsPanel from './SettingsPanel.svelte';
  import SignInPrompt from './SignInPrompt.svelte';
  import NotificationsPanel, { type Notification } from './NotificationsPanel.svelte';

  const t = getTranslation();

  type SortOptionKey = 'sortTop' | 'sortNew' | 'sortControversial' | 'sortOld';
  const SORT_OPTIONS: { value: SortBy; key: SortOptionKey }[] = [
    { value: 'top', key: 'sortTop' },
    { value: 'new', key: 'sortNew' },
    { value: 'controversial', key: 'sortControversial' },
    { value: 'old', key: 'sortOld' },
  ];

  interface Props {
    comments: CommentType[];
    currentUser?: User;
    apiUrl?: string;
    projectId?: string;
    maxDepth?: number;
    allowVoting?: boolean;
    sortBy?: SortBy;
    highlightedCommentId?: string | null;
    collapsedThreads?: Set<string>;
    currentTheme?: 'light' | 'dark';
    authStore: AuthStore;
    onSortChange?: (sort: SortBy) => void;
    onPost: (text: string, parentId?: string) => Promise<void>;
    onVote?: (commentId: string, voteType: 'up' | 'down') => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string) => void;
    onBan?: (userId: string) => void;
    onPin?: (commentId: string) => void;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onPermalink?: (commentId: string) => void;
    onCollapse?: (commentId: string) => void;
    onReplyStart?: (parentId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    toolbarEnd?: Snippet;
    plugins?: ThreadKitPlugin[];
    onLogin?: () => void;
    onLogout?: () => void;
    onUpdateSocialLinks?: (socialLinks: SocialLinks) => void;
    onUpdateName?: (name: string) => void;
    onThemeChange?: (theme: 'light' | 'dark') => void;
  }

  let {
    comments,
    currentUser,
    apiUrl,
    projectId,
    maxDepth = 5,
    allowVoting = true,
    sortBy = 'top',
    highlightedCommentId,
    collapsedThreads,
    currentTheme = 'light',
    authStore,
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
    onCollapse,
    onReplyStart,
    getUserProfile,
    toolbarEnd,
    plugins,
    onLogin,
    onLogout,
    onUpdateSocialLinks,
    onUpdateName,
    onThemeChange,
  }: Props = $props();

  function handleReply(parentId: string) {
    onReplyStart?.(parentId);
  }

  // Notifications state (for demo purposes - in a real app this would come from props or a store)
  let notifications = $state<Notification[]>([]);

  function handleMarkNotificationRead(id: string) {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  }

  function handleMarkAllNotificationsRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
  }

  // Keyboard navigation state
  let focusedCommentId = $state<string | null>(null);

  function handleCommentClick(commentId: string) {
    focusedCommentId = commentId;
  }

  // Get all visible comments in DOM order
  function getAllVisibleComments() {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('.threadkit-comment'));
  }

  // Keyboard navigation handlers
  function focusInput() {
    if (typeof document === 'undefined') return;
    const textarea = document.querySelector('.threadkit-comment-form textarea') as HTMLTextAreaElement;
    textarea?.focus();
    focusedCommentId = null;
  }

  function nextComment() {
    const allComments = getAllVisibleComments();
    if (allComments.length === 0) return;

    if (!focusedCommentId) {
      // Focus first comment
      const firstId = allComments[0].getAttribute('data-comment-id');
      if (firstId) {
        focusedCommentId = firstId;
        allComments[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Find current comment and move to next
    const currentIndex = allComments.findIndex(el => el.getAttribute('data-comment-id') === focusedCommentId);
    if (currentIndex >= 0 && currentIndex < allComments.length - 1) {
      const nextId = allComments[currentIndex + 1].getAttribute('data-comment-id');
      if (nextId) {
        focusedCommentId = nextId;
        allComments[currentIndex + 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function prevComment() {
    const allComments = getAllVisibleComments();
    if (allComments.length === 0) return;

    if (!focusedCommentId) return;

    // Find current comment and move to previous
    const currentIndex = allComments.findIndex(el => el.getAttribute('data-comment-id') === focusedCommentId);
    if (currentIndex > 0) {
      const prevId = allComments[currentIndex - 1].getAttribute('data-comment-id');
      if (prevId) {
        focusedCommentId = prevId;
        allComments[currentIndex - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (currentIndex === 0) {
      // Go back to input
      focusInput();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Don't interfere with typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    switch (e.key) {
      case 'j':
        e.preventDefault();
        nextComment();
        break;
      case 'k':
        e.preventDefault();
        prevComment();
        break;
      case 'c':
        e.preventDefault();
        focusInput();
        break;
      case '-':
        e.preventDefault();
        if (focusedCommentId && onCollapse) {
          onCollapse(focusedCommentId);
        }
        break;
    }
  }

  // Set up keyboard listeners
  onMount(() => {
    if (typeof document === 'undefined') return;
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    if (typeof document === 'undefined') return;
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="threadkit-comments">
  <div class="threadkit-toolbar">
    {#if onSortChange}
      <div class="threadkit-sort">
        <span class="threadkit-sort-label">{t('sortedBy')}</span>
        {#each SORT_OPTIONS as option}
          <button
            class="threadkit-sort-option"
            class:active={sortBy === option.value}
            onclick={() => onSortChange?.(option.value)}
          >
            {t(option.key)}
          </button>
        {/each}
      </div>
    {/if}
    {#if currentUser && onLogin && onLogout && onUpdateSocialLinks && onUpdateName && onThemeChange}
      <div class="threadkit-toolbar-icons">
        <NotificationsPanel
          {notifications}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />
        <SettingsPanel
          currentUser={currentUser}
          onLogin={onLogin}
          onLogout={onLogout}
          onUpdateSocialLinks={onUpdateSocialLinks}
          onUpdateName={onUpdateName}
          onThemeChange={onThemeChange}
          theme={currentTheme}
        />
      </div>
    {/if}
    {#if toolbarEnd}
      {@render toolbarEnd()}
    {/if}
  </div>
  <div class="threadkit-comments-header">
    {#if currentUser}
      <CommentForm
        placeholder={t('writeComment')}
        onSubmit={onPost}
      />
    {:else}
      <SignInPrompt
        {authStore}
        {apiUrl}
        {projectId}
        placeholder={t('writeComment')}
      />
    {/if}
  </div>

  {#if comments.length === 0}
    <div class="threadkit-empty">
      {t('noComments')}
    </div>
  {:else}
    <div class="threadkit-comment-list">
      {#each comments as comment, index (comment.id)}
        <Comment
          {comment}
          {currentUser}
          {authStore}
          {apiUrl}
          {projectId}
          {maxDepth}
          {index}
          totalSiblings={comments.length}
          highlighted={highlightedCommentId === comment.id}
          collapsed={collapsedThreads?.has(comment.id)}
          onReply={handleReply}
          onVote={allowVoting ? onVote : undefined}
          {onDelete}
          {onEdit}
          {onBan}
          {onBlock}
          {onReport}
          {onPermalink}
          {onCollapse}
          onLogin={onLogin}
          onPost={onPost}
          {getUserProfile}
          {plugins}
          {highlightedCommentId}
          {collapsedThreads}
          {focusedCommentId}
          onCommentClick={handleCommentClick}
        />
      {/each}
    </div>
  {/if}
</div>
