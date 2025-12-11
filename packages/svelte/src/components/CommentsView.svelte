<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { Comment as CommentType, User, UserProfile, SortBy, ThreadKitPlugin } from '@threadkit/core';
  import { getTranslation } from '../i18n';
  import Comment from './Comment.svelte';
  import CommentForm from './CommentForm.svelte';

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
    maxDepth?: number;
    allowVoting?: boolean;
    sortBy?: SortBy;
    highlightedCommentId?: string | null;
    collapsedThreads?: Set<string>;
    onSortChange?: (sort: SortBy) => void;
    onPost: (text: string, parentId?: string) => Promise<void>;
    onVote?: (commentId: string, voteType: 'up' | 'down') => void;
    onDelete?: (commentId: string) => void;
    onEdit?: (commentId: string, newText: string) => void;
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
  }

  let {
    comments,
    currentUser,
    maxDepth = 5,
    allowVoting = true,
    sortBy = 'top',
    highlightedCommentId,
    collapsedThreads,
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
  }: Props = $props();

  function handleReply(parentId: string) {
    onReplyStart?.(parentId);
  }
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
    {#if toolbarEnd}
      {@render toolbarEnd()}
    {/if}
  </div>
  <div class="threadkit-comments-header">
    <CommentForm
      placeholder={currentUser ? t('writeComment') : t('signInToPost')}
      onSubmit={onPost}
    />
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
          {getUserProfile}
          {plugins}
          {highlightedCommentId}
          {collapsedThreads}
        />
      {/each}
    </div>
  {/if}
</div>
