<script lang="ts">
  import type { Comment as CommentType, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
  import type { AuthStore } from '../stores/auth';
  import { renderMarkdown, formatTimestamp } from '../utils/markdown';
  import { getTranslation } from '../i18n';
  import CommentForm from './CommentForm.svelte';
  import SignInPrompt from './SignInPrompt.svelte';
  import UserHoverCard from './UserHoverCard.svelte';
  // Self-import for recursive rendering
  import Comment from './Comment.svelte';

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
    comment: CommentType;
    currentUser?: User;
    authStore?: AuthStore;
    apiUrl?: string;
    projectId?: string;
    depth?: number;
    maxDepth?: number;
    collapsed?: boolean;
    highlighted?: boolean;
    index?: number;
    totalSiblings?: number;
    highlightedCommentId?: string | null;
    collapsedThreads?: Set<string>;
    focusedCommentId?: string | null;
    onReply?: (commentId: string) => void;
    onVote?: (commentId: string, voteType: 'up' | 'down') => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
    onBan?: (userId: string) => void;
    onBlock?: (userId: string) => void;
    onReport?: (commentId: string) => void;
    onPermalink?: (commentId: string) => void;
    onPrev?: () => void;
    onNext?: () => void;
    onCollapse?: (commentId: string) => void;
    onLogin?: () => void;
    onPost?: (text: string, parentId?: string) => Promise<void>;
    onCommentClick?: (commentId: string) => void;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    plugins?: ThreadKitPlugin[];
  }

  let {
    comment,
    currentUser,
    authStore,
    apiUrl,
    projectId,
    depth = 0,
    maxDepth = 5,
    collapsed: initialCollapsed = false,
    highlighted = false,
    index = 0,
    totalSiblings = 1,
    highlightedCommentId,
    collapsedThreads,
    focusedCommentId,
    onReply,
    onVote,
    onDelete,
    onEdit,
    onBan,
    onBlock,
    onReport,
    onPermalink,
    onPrev,
    onNext,
    onCollapse,
    onLogin,
    onPost,
    onCommentClick,
    getUserProfile,
    plugins,
  }: Props = $props();

  let showReplyForm = $state(false);
  let collapsed = $derived(initialCollapsed);
  let localCollapsed = $state<boolean | null>(null);
  let confirmingAction = $state<'block' | 'delete' | 'ban' | null>(null);
  let showReportForm = $state(false);
  let reportReason = $state('');
  let reportSubmitted = $state(false);
  let isEditing = $state(false);
  let editText = $derived(comment.text);
  let localEditText = $state<string | null>(null);

  // Use local state if set, otherwise use prop
  const isCollapsed = $derived(localCollapsed !== null ? localCollapsed : collapsed);
  const currentEditText = $derived(localEditText !== null ? localEditText : editText);

  const upvotes = $derived(comment.upvotes);
  const downvotes = $derived(comment.downvotes);
  const score = $derived(upvotes - downvotes);
  const hasUpvoted = $derived(currentUser && comment.userVote === 'up');
  const hasDownvoted = $derived(currentUser && comment.userVote === 'down');
  const isModOrAdmin = $derived(currentUser?.isModerator || currentUser?.isAdmin);
  const isOwnComment = $derived(currentUser && comment.userId === currentUser.id);

  const parsedContent = $derived(renderMarkdown(comment.text, {
    allowLinks: true,
    enableAutoLinks: true,
    enableMentions: true,
    getUserProfile,
    plugins,
  }));

  const isFocused = $derived(focusedCommentId === comment.id);

  function handleReply() {
    onReply?.(comment.id);
    showReplyForm = false;
  }

  function handleCollapse() {
    localCollapsed = !isCollapsed;
    onCollapse?.(comment.id);
  }

  function handleSaveEdit() {
    if (currentEditText.trim() && currentEditText !== comment.text) {
      onEdit?.(comment.id, currentEditText.trim());
    }
    isEditing = false;
    localEditText = null;
  }

  function handleCancelEdit() {
    localEditText = null;
    isEditing = false;
  }

  function handleEditTextChange(value: string) {
    localEditText = value;
  }

  function handleFormCancel() {
    showReplyForm = false;
  }
</script>

{#if isCollapsed}
  <div
    class="threadkit-comment threadkit-comment-collapsed"
    class:threadkit-highlighted={highlighted}
    class:threadkit-focused={isFocused}
    data-comment-id={comment.id}
    onclick={(e) => {
      const target = e.target as HTMLElement;
      if (onCommentClick && !target.closest('button')) {
        e.stopPropagation();
        onCommentClick(comment.id);
      }
    }}
  >
    <button
      class="threadkit-expand-btn"
      onclick={handleCollapse}
      title={t('expandComment')}
    >
      [+]
    </button>
    <UserHoverCard
      userName={comment.userName}
      userId={comment.userId}
      {getUserProfile}
    >
      {#snippet children()}
        <span class="threadkit-author">{comment.userName}</span>
      {/snippet}
    </UserHoverCard>
    <span class="threadkit-collapsed-info">
      {score} {score !== 1 ? t('points') : t('point')} &middot; {formatTimestamp(comment.timestamp)}
      {#if comment.children.length > 0}
        &middot; {comment.children.length} {comment.children.length === 1 ? t('child') : t('children')}
      {/if}
    </span>
  </div>
{:else}
  <div
    class="threadkit-comment"
    class:threadkit-highlighted={highlighted}
    class:threadkit-focused={isFocused}
    data-comment-id={comment.id}
    id="threadkit-{comment.id}"
  >
    <div class="threadkit-comment-wrapper">
      <!-- Vote column -->
      {#if onVote}
        <div class="threadkit-vote-column">
          <button
            class="threadkit-vote-btn threadkit-vote-up"
            class:active={hasUpvoted}
            onclick={() => onVote?.(comment.id, 'up')}
            aria-label={t('upvote')}
            title={!currentUser ? t('signInToVote') : undefined}
            disabled={!currentUser}
          >
            &#9650;
          </button>
          <button
            class="threadkit-vote-btn threadkit-vote-down"
            class:active={hasDownvoted}
            onclick={() => onVote?.(comment.id, 'down')}
            aria-label={t('downvote')}
            title={!currentUser ? t('signInToVote') : undefined}
            disabled={!currentUser}
          >
            &#9660;
          </button>
        </div>
      {/if}

      <!-- Content column -->
      <div class="threadkit-comment-content">
        <!-- Main content (excluding replies) -->
        <div
          class="threadkit-comment-main"
          onclick={(e) => {
            const target = e.target as HTMLElement;
            if (onCommentClick && !target.closest('button, a, textarea, input')) {
              e.stopPropagation();
              onCommentClick(comment.id);
            }
          }}
        >
        <!-- Header line -->
        <div class="threadkit-comment-header">
          <UserHoverCard
            userName={comment.userName}
            userId={comment.userId}
            {getUserProfile}
          >
            {#snippet children()}
              <span class="threadkit-author">{comment.userName}</span>
            {/snippet}
          </UserHoverCard>

          <span class="threadkit-score">
            {score} {score !== 1 ? t('points') : t('point')}
            <span class="threadkit-score-breakdown">
              (+{upvotes}/-{downvotes})
            </span>
          </span>

          <span class="threadkit-timestamp">
            {formatTimestamp(comment.timestamp)}
          </span>

          {#if comment.edited}
            <span class="threadkit-edited">*</span>
          {/if}

          {#if comment.pinned}
            <span class="threadkit-pinned">{t('pinned')}</span>
          {/if}

          <span class="threadkit-header-divider">|</span>

          {#if index > 0 && onPrev}
            <button class="threadkit-nav-btn" onclick={onPrev}>
              {t('prev')}
            </button>
          {/if}

          {#if index < totalSiblings - 1 && onNext}
            <button class="threadkit-nav-btn" onclick={onNext}>
              {t('next')}
            </button>
          {/if}

          <button
            class="threadkit-collapse-btn"
            onclick={handleCollapse}
            title={t('collapseComment')}
          >
            [&ndash;]
          </button>
        </div>

        <!-- Comment body -->
        <div class="threadkit-comment-body">
          {#if isEditing}
            <div class="threadkit-edit-form">
              <textarea
                class="threadkit-textarea"
                value={currentEditText}
                oninput={(e) => handleEditTextChange((e.target as HTMLTextAreaElement).value)}
                rows={4}
              ></textarea>
              <div class="threadkit-edit-actions">
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
            {@html parsedContent}
          {/if}
        </div>

        <!-- Action row -->
        {#if !isEditing}
          <div class="threadkit-comment-actions">
            <!-- Share button - uses Web Share API when available, falls back to copy link -->
            <button
              class="threadkit-action-btn"
              onclick={async () => {
                const url = `${window.location.origin}${window.location.pathname}#threadkit-${comment.id}`;
                if (navigator.share) {
                  try {
                    await navigator.share({ url });
                  } catch {
                    // User cancelled or share failed, silently ignore
                  }
                } else {
                  await navigator.clipboard.writeText(url);
                }
              }}
            >
              {t('share')}
            </button>

            <!-- Own comment actions: edit, reply, delete -->
            {#if isOwnComment}
              {#if onEdit}
                <button
                  class="threadkit-action-btn"
                  onclick={() => isEditing = true}
                >
                  {t('edit')}
                </button>
              {/if}

              {#if depth < maxDepth}
                <button
                  class="threadkit-action-btn"
                  onclick={() => showReplyForm = !showReplyForm}
                >
                  {t('reply')}
                </button>
              {/if}

              {#if onDelete}
                {#if confirmingAction === 'delete'}
                  <span class="threadkit-confirm-inline">
                    {t('deleteConfirm')}
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onDelete?.(comment.id);
                        confirmingAction = null;
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      {t('no')}
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn"
                    onclick={() => confirmingAction = 'delete'}
                  >
                    {t('delete')}
                  </button>
                {/if}
              {/if}
            {:else}
              <!-- Other user's comment actions: block, report, reply, (mod: delete, ban) -->
              {#if currentUser && onBlock}
                {#if confirmingAction === 'block'}
                  <span class="threadkit-confirm-inline">
                    {t('blockConfirm')}
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onBlock?.(comment.userId);
                        confirmingAction = null;
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      {t('no')}
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn"
                    onclick={() => confirmingAction = 'block'}
                  >
                    {t('block')}
                  </button>
                {/if}
              {/if}

              {#if currentUser && onReport}
                {#if reportSubmitted}
                  <span class="threadkit-report-thanks">{t('reportSubmitted')}</span>
                {:else if showReportForm}
                  <span class="threadkit-report-inline">
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
                      onclick={() => {
                        onReport?.(comment.id);
                        showReportForm = false;
                        reportSubmitted = true;
                      }}
                    >
                      {t('submit')}
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => {
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
                    onclick={() => showReportForm = true}
                  >
                    {t('report')}
                  </button>
                {/if}
              {/if}

              {#if depth < maxDepth}
                <button
                  class="threadkit-action-btn"
                  onclick={() => showReplyForm = !showReplyForm}
                >
                  {t('reply')}
                </button>
              {/if}

              {#if isModOrAdmin && onDelete}
                {#if confirmingAction === 'delete'}
                  <span class="threadkit-confirm-inline">
                    {t('deleteConfirm')}
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onDelete?.(comment.id);
                        confirmingAction = null;
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      {t('no')}
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn threadkit-mod-action"
                    onclick={() => confirmingAction = 'delete'}
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
                      onclick={() => {
                        onBan?.(comment.userId);
                        confirmingAction = null;
                      }}
                    >
                      {t('yes')}
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      {t('no')}
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn threadkit-mod-action"
                    onclick={() => confirmingAction = 'ban'}
                  >
                    {t('ban')}
                  </button>
                {/if}
              {/if}
            {/if}
          </div>
        {/if}
        </div>
        <!-- End of comment main content -->

        <!-- Reply form -->
        {#if showReplyForm}
          <div class="threadkit-reply-form">
            {#if currentUser && onPost}
              <CommentForm
                parentId={comment.id}
                placeholder={t('writeReply')}
                showCancel={true}
                onSubmit={async (text, parentId) => {
                  await onPost(text, parentId);
                  handleReply();
                }}
                onCancel={handleFormCancel}
              />
            {:else if authStore}
              <SignInPrompt
                {authStore}
                {apiUrl}
                {projectId}
                placeholder={t('writeReply')}
              />
            {/if}
          </div>
        {/if}

        <!-- Child comments -->
        {#if comment.children.length > 0}
          <div class="threadkit-replies">
            {#each comment.children as child, childIndex (child.id)}
              <Comment
                comment={child}
                {currentUser}
                {authStore}
                {apiUrl}
                {projectId}
                depth={depth + 1}
                {maxDepth}
                index={childIndex}
                totalSiblings={comment.children.length}
                highlighted={highlightedCommentId === child.id}
                collapsed={collapsedThreads?.has(child.id)}
                {highlightedCommentId}
                {collapsedThreads}
                {focusedCommentId}
                {onReply}
                {onVote}
                {onDelete}
                {onEdit}
                {onBan}
                {onBlock}
                {onReport}
                {onPermalink}
                {onCollapse}
                {onLogin}
                {onPost}
                {onCommentClick}
                {getUserProfile}
                {plugins}
              />
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
