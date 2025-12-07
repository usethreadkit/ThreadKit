<script lang="ts">
  interface Props {
    src?: string;
    alt: string;
    class?: string;
  }

  let { src, alt, class: className = '' }: Props = $props();

  let error = $state(false);
  let currentSrc = $state(src);

  $effect(() => {
    currentSrc = src;
    error = false;
  });
</script>

{#if error || !currentSrc}
  <div
    class="{className} threadkit-avatar-placeholder"
    style="display: flex; align-items: center; justify-content: center; background-color: var(--threadkit-bg-secondary); color: var(--threadkit-text-secondary); border-radius: 50%;"
  >
    <svg width="60%" height="60%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  </div>
{:else}
  <img
    {src}
    {alt}
    class={className}
    onerror={() => error = true}
  />
{/if}
