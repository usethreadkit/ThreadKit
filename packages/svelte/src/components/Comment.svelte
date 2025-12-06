<script lang="ts">
  import type { Comment as CommentType, User, UserProfile, ThreadKitPlugin } from '@threadkit/core';
  import { renderMarkdown, formatTimestamp } from '../utils/markdown';
  import CommentForm from './CommentForm.svelte';
  import UserHoverCard from './UserHoverCard.svelte';
  // Self-import for recursive rendering
  import Comment from './Comment.svelte';

  const REPORT_REASONS = [
    'Spam',
    'Harassment',
    'Hate speech',
    'Misinformation',
    'Other',
  ] as const;

  interface Props {
    comment: CommentType;
    currentUser?: User;
    depth?: number;
    maxDepth?: number;
    collapsed?: boolean;
    highlighted?: boolean;
    index?: number;
    totalSiblings?: number;
    highlightedCommentId?: string | null;
    collapsedThreads?: Set<string>;
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
    getUserProfile?: (userId: string) => UserProfile | undefined;
    plugins?: ThreadKitPlugin[];
  }

  let {
    comment,
    currentUser,
    depth = 0,
    maxDepth = 5,
    collapsed: initialCollapsed = false,
    highlighted = false,
    index = 0,
    totalSiblings = 1,
    highlightedCommentId,
    collapsedThreads,
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

  const upvotes = $derived(comment.upvotes.length);
  const downvotes = $derived(comment.downvotes.length);
  const score = $derived(upvotes - downvotes);
  const hasUpvoted = $derived(currentUser && comment.upvotes.includes(currentUser.id));
  const hasDownvoted = $derived(currentUser && comment.downvotes.includes(currentUser.id));
  const isModOrAdmin = $derived(currentUser?.isModerator || currentUser?.isAdmin);
  const isOwnComment = $derived(currentUser && comment.userId === currentUser.id);

  const parsedContent = $derived(renderMarkdown(comment.text, {
    allowLinks: true,
    enableAutoLinks: true,
    enableMentions: true,
    getUserProfile,
    plugins,
  }));

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

  function handleFormSubmit(e: CustomEvent<{ text: string; parentId?: string }>) {
    handleReply();
  }

  function handleFormCancel() {
    showReplyForm = false;
  }
</script>

{#if isCollapsed}
  <div
    class="threadkit-comment threadkit-comment-collapsed"
    class:threadkit-highlighted={highlighted}
    data-comment-id={comment.id}
  >
    <button
      class="threadkit-expand-btn"
      onclick={handleCollapse}
      title="Expand comment"
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
      {score} point{score !== 1 ? 's' : ''} &middot; {formatTimestamp(comment.timestamp)}
      {#if comment.children.length > 0}
        &middot; {comment.children.length} {comment.children.length === 1 ? 'child' : 'children'}
      {/if}
    </span>
  </div>
{:else}
  <div
    class="threadkit-comment"
    class:threadkit-highlighted={highlighted}
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
            aria-label="Upvote"
          >
            &#9650;
          </button>
          <button
            class="threadkit-vote-btn threadkit-vote-down"
            class:active={hasDownvoted}
            onclick={() => onVote?.(comment.id, 'down')}
            aria-label="Downvote"
          >
            &#9660;
          </button>
        </div>
      {/if}

      <!-- Content column -->
      <div class="threadkit-comment-content">
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
            {score} point{score !== 1 ? 's' : ''}
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
            <span class="threadkit-pinned">pinned</span>
          {/if}

          <span class="threadkit-header-divider">|</span>

          {#if index > 0 && onPrev}
            <button class="threadkit-nav-btn" onclick={onPrev}>
              prev
            </button>
          {/if}

          {#if index < totalSiblings - 1 && onNext}
            <button class="threadkit-nav-btn" onclick={onNext}>
              next
            </button>
          {/if}

          <button
            class="threadkit-collapse-btn"
            onclick={handleCollapse}
            title="Collapse comment"
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
                  save
                </button>
                <button
                  class="threadkit-cancel-btn"
                  onclick={handleCancelEdit}
                >
                  cancel
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
              share
            </button>

            <!-- Own comment actions: edit, reply, delete -->
            {#if isOwnComment}
              {#if onEdit}
                <button
                  class="threadkit-action-btn"
                  onclick={() => isEditing = true}
                >
                  edit
                </button>
              {/if}

              {#if depth < maxDepth}
                <button
                  class="threadkit-action-btn"
                  onclick={() => showReplyForm = !showReplyForm}
                >
                  reply
                </button>
              {/if}

              {#if onDelete}
                {#if confirmingAction === 'delete'}
                  <span class="threadkit-confirm-inline">
                    delete?
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onDelete?.(comment.id);
                        confirmingAction = null;
                      }}
                    >
                      yes
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      no
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn"
                    onclick={() => confirmingAction = 'delete'}
                  >
                    delete
                  </button>
                {/if}
              {/if}
            {:else}
              <!-- Other user's comment actions: block, report, reply, (mod: delete, ban) -->
              {#if currentUser && onBlock}
                {#if confirmingAction === 'block'}
                  <span class="threadkit-confirm-inline">
                    block user?
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onBlock?.(comment.userId);
                        confirmingAction = null;
                      }}
                    >
                      yes
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      no
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn"
                    onclick={() => confirmingAction = 'block'}
                  >
                    block
                  </button>
                {/if}
              {/if}

              {#if currentUser && onReport}
                {#if reportSubmitted}
                  <span class="threadkit-report-thanks">thanks!</span>
                {:else if showReportForm}
                  <span class="threadkit-report-inline">
                    <select
                      class="threadkit-report-select"
                      bind:value={reportReason}
                    >
                      <option value="">select reason...</option>
                      {#each REPORT_REASONS as reason}
                        <option value={reason}>{reason}</option>
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
                      submit
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => {
                        showReportForm = false;
                        reportReason = '';
                      }}
                    >
                      cancel
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn"
                    onclick={() => showReportForm = true}
                  >
                    report
                  </button>
                {/if}
              {/if}

              {#if depth < maxDepth}
                <button
                  class="threadkit-action-btn"
                  onclick={() => showReplyForm = !showReplyForm}
                >
                  reply
                </button>
              {/if}

              {#if isModOrAdmin && onDelete}
                {#if confirmingAction === 'delete'}
                  <span class="threadkit-confirm-inline">
                    delete?
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onDelete?.(comment.id);
                        confirmingAction = null;
                      }}
                    >
                      yes
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      no
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn threadkit-mod-action"
                    onclick={() => confirmingAction = 'delete'}
                  >
                    delete
                  </button>
                {/if}
              {/if}

              {#if isModOrAdmin && onBan}
                {#if confirmingAction === 'ban'}
                  <span class="threadkit-confirm-inline">
                    ban user?
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-yes"
                      onclick={() => {
                        onBan?.(comment.userId);
                        confirmingAction = null;
                      }}
                    >
                      yes
                    </button>
                    <button
                      class="threadkit-confirm-btn threadkit-confirm-no"
                      onclick={() => confirmingAction = null}
                    >
                      no
                    </button>
                  </span>
                {:else}
                  <button
                    class="threadkit-action-btn threadkit-mod-action"
                    onclick={() => confirmingAction = 'ban'}
                  >
                    ban
                  </button>
                {/if}
              {/if}
            {/if}
          </div>
        {/if}

        <!-- Reply form -->
        {#if showReplyForm}
          <div class="threadkit-reply-form">
            <CommentForm
              parentId={comment.id}
              placeholder="Write a reply..."
              showCancel={true}
              on:submit={handleFormSubmit}
              on:cancel={handleFormCancel}
            />
          </div>
        {/if}

        <!-- Child comments -->
        {#if comment.children.length > 0}
          <div class="threadkit-replies">
            {#each comment.children as child, childIndex (child.id)}
              <Comment
                comment={child}
                {currentUser}
                depth={depth + 1}
                {maxDepth}
                index={childIndex}
                totalSiblings={comment.children.length}
                highlighted={highlightedCommentId === child.id}
                collapsed={collapsedThreads?.has(child.id)}
                {highlightedCommentId}
                {collapsedThreads}
                {onReply}
                {onVote}
                {onDelete}
                {onEdit}
                {onBan}
                {onBlock}
                {onReport}
                {onPermalink}
                {onCollapse}
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
