<script lang="ts">
  import { getTranslation } from '../i18n';

  const t = getTranslation();

  interface Props {
    count: number;
    onClick: () => void;
  }

  let { count, onClick }: Props = $props();

  // Simple interpolation for the translation string
  const text = $derived(
    t('loadNewComments')
      .replace('{n}', String(count))
      .replace('{n, plural, one {comment} other {comments}}', count === 1 ? 'comment' : 'comments')
  );
</script>

{#if count > 0}
  <button
    class="threadkit-new-comments-banner"
    onclick={onClick}
    aria-live="polite"
    aria-atomic="true"
  >
    {text}
  </button>
{/if}
