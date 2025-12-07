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
    currentUser?: User;
    isModOrAdmin: boolean;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    plugins?: ThreadKitPlugin[];
  }

  let {
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

  const isOwnMessage = $derived(currentUser && message.userId === currentUser.id);

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

  function toggleExpand() {
    isExpanded = !isExpanded;
  }
</script>

{#if isEditing}
  <div class="threadkit-chat-message editing">
    <div class="threadkit-chat-edit-form">
      <input
        type="text"
        value={currentEditText}
        oninput={(e) => handleEditTextChange((e.target as HTMLInputElement).value)}
        onkeydown={handleKeydown}
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
  </div>
{:else}
  <div
    class="threadkit-chat-message"
    class:expanded={isExpanded}
    onclick={toggleExpand}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && toggleExpand()}
  >
    <div class="threadkit-chat-message-line">
      <span class="threadkit-chat-time">{formatTime(message.timestamp)}</span>
      <UserHoverCard
        userName={message.userName}
        userId={message.userId}
        {getUserProfile}
      >
        {#snippet children()}
          <span class="threadkit-chat-author">{message.userName}</span>
        {/snippet}
      </UserHoverCard>
      <span class="threadkit-chat-text">
        {@html parsedContent}
        {#if message.edited}
          <span class="threadkit-edited">*</span>
        {/if}
      </span>
    </div>

    {#if isExpanded && currentUser}
      <div class="threadkit-chat-actions">
        <!-- Own message actions: edit, delete -->
        {#if isOwnMessage}
          {#if onEdit}
            <button
              class="threadkit-action-btn"
              onclick={(e) => {
                e.stopPropagation();
                isEditing = true;
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
      </div>
    {/if}
  </div>
{/if}
