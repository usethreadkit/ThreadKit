<script lang="ts">
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { Comment, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
  import type { AuthStore } from '../stores/auth';
  import { getTranslation } from '../i18n';
  import ChatMessage from './ChatMessage.svelte';
  import { AUTH_ICONS, LoadingSpinner } from '../auth/icons';

  const t = getTranslation();

  const MAX_CHAT_LENGTH = 500;

  interface Props {
    comments: Comment[];
    currentUser?: User;
    showLastN?: number;
    autoScroll?: boolean;
    showPresence?: boolean;
    wsConnected?: boolean;
    presenceCount?: number;
    typingUsers?: Array<{ userId: string; userName: string }>;
    authStore: AuthStore;
    apiUrl: string;
    projectId: string;
    onSend: (text: string, parentId?: string) => Promise<void>;
    onTyping?: () => void;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    toolbarEnd?: Snippet;
    plugins?: ThreadKitPlugin[];
  }

  let {
    comments,
    currentUser,
    showLastN = 100,
    autoScroll = true,
    showPresence = false,
    wsConnected = false,
    presenceCount = 0,
    typingUsers = [],
    authStore,
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
  }: Props = $props();

  let messagesEl: HTMLDivElement | undefined = $state();
  let inputEl: HTMLInputElement | undefined = $state();
  let inputValue = $state('');
  let isSubmitting = $state(false);
  let hasInitialized = false;

  const authState = $derived($authStore);
  const isLoggedIn = $derived(!!authState.user && !!authState.token);
  const isModOrAdmin = $derived(currentUser?.isModerator || currentUser?.isAdmin || false);

  // Flatten comments tree while preserving order and thread structure
  function flattenWithThreading(nodes: Comment[], depth = 0): Array<{ comment: Comment; depth: number }> {
    const result: Array<{ comment: Comment; depth: number }> = [];
    for (const node of nodes) {
      result.push({ comment: node, depth });
      if (node.children && node.children.length > 0) {
        result.push(...flattenWithThreading(node.children, depth + 1));
      }
    }
    return result;
  }

  const messages = $derived(flattenWithThreading(comments).slice(-showLastN));

  // Filter out current user from typing users
  const otherTypingUsers = $derived(
    typingUsers.filter((u) => !currentUser || u.userId !== currentUser.id)
  );

  // Fetch auth methods on mount if not logged in
  onMount(() => {
    if (!hasInitialized && !isLoggedIn && authState.step === 'idle') {
      hasInitialized = true;
      authStore.startLogin();
    }
  });

  // Auto-scroll to top on new messages
  $effect(() => {
    if (autoScroll && messagesEl && messages.length) {
      messagesEl.scrollTop = 0;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isSubmitting || !isLoggedIn) return;

    isSubmitting = true;
    try {
      await onSend(text);
      inputValue = '';
    } finally {
      isSubmitting = false;
      // Refocus input after sending
      inputEl?.focus();
    }
  }

  function handleInputChange(e: Event) {
    inputValue = (e.target as HTMLInputElement).value;
    onTyping?.();
  }

  async function handleReply(parentId: string, text: string) {
    await onSend(text, parentId);
    // Focus the main input after sending a reply
    inputEl?.focus();
  }

  function handleMethodSelect(method: any) {
    // For OAuth methods, open popup
    if (method.type === 'oauth') {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
      const oauthUrl = `${baseUrl}/auth/${method.id}?project_id=${encodeURIComponent(projectId)}`;

      window.open(
        oauthUrl,
        'threadkit-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    }

    authStore.selectMethod(method);
  }

  function getMethodIcon(methodId: string) {
    const iconFn = AUTH_ICONS[methodId];
    if (iconFn) {
      return iconFn();
    }
    return null;
  }
</script>

<div class="threadkit-chat">
  {#if toolbarEnd}
    <div class="threadkit-toolbar">
      {@render toolbarEnd()}
    </div>
  {/if}

  <form class="threadkit-chat-input" onsubmit={handleSubmit}>
    <input
      bind:this={inputEl}
      type="text"
      value={inputValue}
      oninput={handleInputChange}
      placeholder={t('typeMessage')}
      disabled={isSubmitting}
      maxLength={MAX_CHAT_LENGTH}
    />
    <!-- TODO: Add MediaUploader here when implemented -->
    <button
      type="submit"
      class="threadkit-submit-btn"
      disabled={!isLoggedIn || isSubmitting || !inputValue.trim()}
    >
      {t('send')}
    </button>
  </form>

  {#if !isLoggedIn}
    <!-- Sign-in area shown when not logged in -->
    {#if authState.step === 'loading'}
      <div class="threadkit-chat-signin">
        <span class="threadkit-signin-spinner-small">
          {@html LoadingSpinner()}
        </span>
      </div>
    {:else}
      <div class="threadkit-chat-signin">
        <span class="threadkit-signin-label-inline">{t('signInLabel')}</span>
        {#each authState.availableMethods as method (method.id)}
          <button
            class="threadkit-signin-method-btn"
            onclick={() => handleMethodSelect(method)}
            title={`${t('continueWith')} ${method.name}`}
          >
            {#if getMethodIcon(method.id)}
              <span class="threadkit-signin-method-icon">
                {@html getMethodIcon(method.id)}
              </span>
            {:else}
              <span class="threadkit-signin-method-icon">{method.name[0]}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  {/if}

  {#if (showPresence && wsConnected) || otherTypingUsers.length > 0}
    <div class="threadkit-chat-status">
      {#if otherTypingUsers.length > 0}
        <span class="threadkit-chat-typing">
          {otherTypingUsers.length} {otherTypingUsers.length === 1 ? t('personTyping') : t('peopleTyping')}
        </span>
        {#if showPresence && wsConnected}
          <span class="threadkit-chat-separator">|</span>
        {/if}
      {/if}
      {#if showPresence && wsConnected}
        <span class="threadkit-chat-presence">
          {presenceCount} {presenceCount === 1 ? t('personOnline') : t('peopleOnline')}
        </span>
      {/if}
    </div>
  {/if}

  <div class="threadkit-chat-messages" bind:this={messagesEl}>
    {#each messages as { comment, depth } (comment.id)}
      <ChatMessage
        message={comment}
        {depth}
        {currentUser}
        {isModOrAdmin}
        {onBlock}
        {onReport}
        {onDelete}
        {onEdit}
        {onBan}
        onReply={handleReply}
        {getUserProfile}
        {plugins}
      />
    {/each}
  </div>
</div>
