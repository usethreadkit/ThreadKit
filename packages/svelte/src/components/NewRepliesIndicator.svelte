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
    t('loadNewReplies')
      .replace('{n}', String(count))
      .replace('{n, plural, one {reply} other {replies}}', count === 1 ? 'reply' : 'replies')
  );
</script>

{#if count > 0}
  <button
    class="threadkit-new-replies-indicator"
    onclick={onClick}
  >
    {text}
  </button>
{/if}
