<script lang="ts">
  import type { Comment, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
  import { renderMarkdown, formatTime } from '../utils/markdown';
  import { getTranslation } from '../i18n';
  import UserHoverCard from './UserHoverCard.svelte';

  const t = getTranslation();

  type ReportReasonKey = 'reportSpam' | 'reportHarassment' | 'reportHateSpeech' | 'reportMisinformation' | 'reportOther';
  const REPORT_REASON_KEYS: ReportReasonKey[] = [
    'reportSpam',
    'reportHarassment',
    'reportHateSpeech',
    'reportMisinformation',
    'reportOther',
  ];

  interface Props {
    message: Comment;
    depth?: number;
    currentUser?: User;
    isModOrAdmin: boolean;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    onReply?: (parentId: string, text: string) => Promise<void>;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    plugins?: ThreadKitPlugin[];
  }

  let {
    message,
    depth = 0,
    currentUser,
    isModOrAdmin,
    onBlock,
    onReport,
    onDelete,
    onEdit,
    onBan,
    onReply,
    getUserProfile,
    plugins,
  }: Props = $props();

  let isExpanded = $state(false);
  let confirmingAction = $state<'block' | 'ban' | 'delete' | null>(null);
  let showReportForm = $state(false);
  let reportReason = $state('');
  let reportSubmitted = $state(false);
  let isEditing = $state(false);
  let editText = $derived(message.text);
  let localEditText = $state<string | null>(null);
  const currentEditText = $derived(localEditText !== null ? localEditText : editText);
  let isReplying = $state(false);
  let replyText = $state('');

  const isOwnMessage = $derived(currentUser && message.userId === currentUser.id);
  const MAX_CHAT_LENGTH = 500;

  const parsedContent = $derived(renderMarkdown(message.text, {
    allowLinks: true,
    enableAutoLinks: true,
    enableMentions: true,
    getUserProfile,
    plugins,
  }));

  function handleSaveEdit() {
    if (currentEditText.trim() && currentEditText !== message.text) {
      onEdit?.(message.id, currentEditText.trim());
    }
    isEditing = false;
    isExpanded = false;
    localEditText = null;
  }

  function handleCancelEdit() {
    localEditText = null;
    isEditing = false;
  }

  function handleEditTextChange(value: string) {
    localEditText = value;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && currentEditText.trim()) {
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }

  async function handleSendReply() {
    if (replyText.trim() && onReply) {
      await onReply(message.id, replyText.trim());
      replyText = '';
      isReplying = false;
      isExpanded = false;
    }
  }

  function handleReplyKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && replyText.trim()) {
      handleSendReply();
    }
    if (e.key === 'Escape') {
      isReplying = false;
      replyText = '';
    }
  }

  function toggleExpand() {
    isExpanded = !isExpanded;
  }
</script>

<div
    class="threadkit-chat-message"
    class:expanded={isExpanded}
    class:reply-message={!!message.replyReferenceId}
    style={depth > 0 ? `padding-left: ${depth * 20}px` : undefined}
    data-comment-id={message.id}
    onclick={() => {
      // Don't expand reference replies - they should only have the arrow action
      if (!message.replyReferenceId) {
        toggleExpand();
      }
    }}
    role="button"
    tabindex="0"
    onkeydown={(e) => {
      if (e.key === 'Enter' && !message.replyReferenceId) {
        toggleExpand();
      }
    }}
  >
    <div class="threadkit-chat-message-line">
      <span class="threadkit-chat-time">{formatTime(message.timestamp)}</span>
      <UserHoverCard
        userName={message.userName}
        userId={message.userId}
        {getUserProfile}
      >
        {#snippet children()}
          <span class="threadkit-chat-author">
            {message.userName}
            {#if message.edited}
              <span class="threadkit-edited">*</span>
            {/if}
          </span>
        {/snippet}
      </UserHoverCard>
      <span class="threadkit-chat-text">
        {@html parsedContent}
        {#if message.replyReferenceId}
          <button
            class="threadkit-chat-reply-ref"
            onclick={(e) => {
              e.stopPropagation();
              // Scroll to the original threaded message
              const element = document.querySelector(`[data-comment-id="${message.replyReferenceId}"]`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            title="View in thread"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.78 1.97a.75.75 0 010 1.06L3.81 6h6.44A4.75 4.75 0 0115 10.75v2.5a.75.75 0 01-1.5 0v-2.5a3.25 3.25 0 00-3.25-3.25H3.81l2.97 2.97a.75.75 0 11-1.06 1.06L1.47 7.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z"/>
            </svg>
          </button>
        {/if}
      </span>
    </div>

    {#if isExpanded && currentUser && !message.replyReferenceId}
      <div class="threadkit-chat-actions">
        <!-- Own message actions: edit, delete -->
        {#if isOwnMessage}
          {#if onEdit}
            <button
              class="threadkit-action-btn"
              onclick={(e) => {
                e.stopPropagation();
                isEditing = true;
                isExpanded = false;
              }}
            >
              {t('edit')}
            </button>
          {/if}

          {#if onDelete}
            {#if confirmingAction === 'delete'}
              <span class="threadkit-confirm-inline">
                {t('deleteConfirm')}
                <button
                  class="threadkit-confirm-btn threadkit-confirm-yes"
                  onclick={(e) => {
                    e.stopPropagation();
                    onDelete?.(message.id);
                    confirmingAction = null;
                  }}
                >
                  {t('yes')}
                </button>
                <button
                  class="threadkit-confirm-btn threadkit-confirm-no"
                  onclick={(e) => {
                    e.stopPropagation();
                    confirmingAction = null;
                  }}
                >
                  {t('no')}
                </button>
              </span>
            {:else}
              <button
                class="threadkit-action-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  confirmingAction = 'delete';
                }}
              >
                {t('delete')}
              </button>
            {/if}
          {/if}
        {:else}
          <!-- Other user's message actions: block, report, (mod: delete, ban) -->
          {#if onBlock}
            {#if confirmingAction === 'block'}
              <span class="threadkit-confirm-inline">
                {t('blockConfirm')}
                <button
                  class="threadkit-confirm-btn threadkit-confirm-yes"
                  onclick={(e) => {
                    e.stopPropagation();
                    onBlock?.(message.userId);
                    confirmingAction = null;
                  }}
                >
                  {t('yes')}
                </button>
                <button
                  class="threadkit-confirm-btn threadkit-confirm-no"
                  onclick={(e) => {
                    e.stopPropagation();
                    confirmingAction = null;
                  }}
                >
                  {t('no')}
                </button>
              </span>
            {:else}
              <button
                class="threadkit-action-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  confirmingAction = 'block';
                }}
              >
                {t('block')}
              </button>
            {/if}
          {/if}

          {#if onReport}
            {#if reportSubmitted}
              <span class="threadkit-report-thanks">{t('reportSubmitted')}</span>
            {:else if showReportForm}
              <span class="threadkit-report-inline" onclick={(e) => e.stopPropagation()}>
                <select
                  class="threadkit-report-select"
                  bind:value={reportReason}
                >
                  <option value="">{t('selectReason')}</option>
                  {#each REPORT_REASON_KEYS as reasonKey}
                    <option value={reasonKey}>{t(reasonKey)}</option>
                  {/each}
                </select>
                <button
                  class="threadkit-confirm-btn threadkit-confirm-yes"
                  disabled={!reportReason}
                  onclick={(e) => {
                    e.stopPropagation();
                    onReport?.(message.id);
                    showReportForm = false;
                    reportSubmitted = true;
                  }}
                >
                  {t('submit')}
                </button>
                <button
                  class="threadkit-confirm-btn threadkit-confirm-no"
                  onclick={(e) => {
                    e.stopPropagation();
                    showReportForm = false;
                    reportReason = '';
                  }}
                >
                  {t('cancel')}
                </button>
              </span>
            {:else}
              <button
                class="threadkit-action-btn"
                onclick={(e) => {
                  e.stopPropagation();
                  showReportForm = true;
                }}
              >
                {t('report')}
              </button>
            {/if}
          {/if}

          {#if isModOrAdmin && onDelete}
            {#if confirmingAction === 'delete'}
              <span class="threadkit-confirm-inline">
                {t('deleteConfirm')}
                <button
                  class="threadkit-confirm-btn threadkit-confirm-yes"
                  onclick={(e) => {
                    e.stopPropagation();
                    onDelete?.(message.id);
                    confirmingAction = null;
                  }}
                >
                  {t('yes')}
                </button>
                <button
                  class="threadkit-confirm-btn threadkit-confirm-no"
                  onclick={(e) => {
                    e.stopPropagation();
                    confirmingAction = null;
                  }}
                >
                  {t('no')}
                </button>
              </span>
            {:else}
              <button
                class="threadkit-action-btn threadkit-mod-action"
                onclick={(e) => {
                  e.stopPropagation();
                  confirmingAction = 'delete';
                }}
              >
                {t('delete')}
              </button>
            {/if}
          {/if}

          {#if isModOrAdmin && onBan}
            {#if confirmingAction === 'ban'}
              <span class="threadkit-confirm-inline">
                {t('banConfirm')}
                <button
                  class="threadkit-confirm-btn threadkit-confirm-yes"
                  onclick={(e) => {
                    e.stopPropagation();
                    onBan?.(message.userId);
                    confirmingAction = null;
                  }}
                >
                  {t('yes')}
                </button>
                <button
                  class="threadkit-confirm-btn threadkit-confirm-no"
                  onclick={(e) => {
                    e.stopPropagation();
                    confirmingAction = null;
                  }}
                >
                  {t('no')}
                </button>
              </span>
            {:else}
              <button
                class="threadkit-action-btn threadkit-mod-action"
                onclick={(e) => {
                  e.stopPropagation();
                  confirmingAction = 'ban';
                }}
              >
                {t('ban')}
              </button>
            {/if}
          {/if}
        {/if}

        <!-- Reply button - available for all messages -->
        {#if onReply}
          <button
            class="threadkit-action-btn"
            onclick={(e) => {
              e.stopPropagation();
              isReplying = true;
              isExpanded = false;
            }}
          >
            {t('reply')}
          </button>
        {/if}
      </div>
    {/if}

    <!-- Edit form - shown when editing -->
    {#if isEditing}
      <div class="threadkit-chat-reply-form">
        <input
          type="text"
          value={currentEditText}
          oninput={(e) => handleEditTextChange((e.target as HTMLInputElement).value)}
          onkeydown={handleKeydown}
          maxlength={MAX_CHAT_LENGTH}
          autofocus
        />
        <button
          class="threadkit-submit-btn"
          onclick={handleSaveEdit}
          disabled={!currentEditText.trim()}
        >
          {t('save')}
        </button>
        <button
          class="threadkit-cancel-btn"
          onclick={handleCancelEdit}
        >
          {t('cancel')}
        </button>
      </div>
    {/if}

    <!-- Reply form - shown when replying -->
    {#if isReplying}
      <div class="threadkit-chat-reply-form">
        <input
          type="text"
          value={replyText}
          oninput={(e) => replyText = (e.target as HTMLInputElement).value}
          placeholder={`${t('reply')} to ${message.userName}...`}
          onkeydown={handleReplyKeydown}
          maxlength={MAX_CHAT_LENGTH}
          autofocus
        />
        <button
          class="threadkit-submit-btn"
          onclick={handleSendReply}
          disabled={!replyText.trim()}
        >
          {t('send')}
        </button>
        <button
          class="threadkit-cancel-btn"
          onclick={() => {
            isReplying = false;
            replyText = '';
          }}
        >
          {t('cancel')}
        </button>
      </div>
    {/if}
  </div>
