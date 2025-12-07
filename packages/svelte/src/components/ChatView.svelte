<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Comment, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
  import { getTranslation } from '../i18n';
  import ChatMessage from './ChatMessage.svelte';

  const t = getTranslation();

  interface Props {
    comments: Comment[];
    currentUser?: User;
    showLastN?: number;
    autoScroll?: boolean;
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
    toolbarEnd?: Snippet;
    plugins?: ThreadKitPlugin[];
  }

  let {
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
  }: Props = $props();

  let messagesEl: HTMLDivElement | undefined = $state();
  let inputEl: HTMLInputElement | undefined = $state();
  let inputValue = $state('');
  let isSubmitting = $state(false);

  const isModOrAdmin = $derived(currentUser?.isModerator || currentUser?.isAdmin || false);
  const messages = $derived(comments.slice(-showLastN));

  // Auto-scroll to top on new messages
  $effect(() => {
    if (autoScroll && messagesEl && messages.length) {
      messagesEl.scrollTop = 0;
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isSubmitting) return;

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
      placeholder={currentUser ? t('typeMessage') : t('signInToChat')}
      disabled={!currentUser || isSubmitting}
    />
    <button
      type="submit"
      class="threadkit-submit-btn"
      disabled={!currentUser || isSubmitting || !inputValue.trim()}
    >
      {t('send')}
    </button>
  </form>

  {#if showPresence}
    <div class="threadkit-chat-presence">
      {presenceCount === 1 ? t('personOnline', { n: presenceCount }) : t('peopleOnline', { n: presenceCount })}
    </div>
  {/if}

  {#if typingUsers.length > 0}
    <div class="threadkit-typing-indicator">
      {typingUsers.length === 1 ? t('personTyping', { n: typingUsers.length }) : t('peopleTyping', { n: typingUsers.length })}
    </div>
  {/if}

  <div class="threadkit-chat-messages" bind:this={messagesEl}>
    {#each messages as message (message.id)}
      <ChatMessage
        {message}
        {currentUser}
        {isModOrAdmin}
        {onBlock}
        {onReport}
        {onDelete}
        {onEdit}
        {onBan}
        {getUserProfile}
        {plugins}
      />
    {/each}
  </div>
</div>
