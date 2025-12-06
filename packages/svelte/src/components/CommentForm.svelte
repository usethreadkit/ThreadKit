<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    submit: { text: string; parentId?: string };
    cancel: void;
  }>();

  interface Props {
    parentId?: string;
    placeholder?: string;
    showCancel?: boolean;
  }

  let { parentId, placeholder = 'Write a comment...', showCancel = false }: Props = $props();

  let text = $state('');
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);
  let showHelp = $state(false);

  const FORMATTING_HELP = [
    { input: '*italics*', output: 'italics', style: 'italic' },
    { input: '**bold**', output: 'bold', style: 'bold' },
    { input: '[link](https://example.com)', output: 'link', style: 'link' },
    { input: '~~strikethrough~~', output: 'strikethrough', style: 'strikethrough' },
    { input: '`inline code`', output: 'inline code', style: 'code' },
    { input: '> quoted text', output: 'quoted text', style: 'quote' },
  ];

  async function handleSubmit(e: Event) {
    e.preventDefault();

    const trimmedText = text.trim();
    if (!trimmedText) return;

    isSubmitting = true;
    error = null;

    try {
      dispatch('submit', { text: trimmedText, parentId });
      text = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to post comment';
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    dispatch('cancel');
  }
</script>

<form class="threadkit-form" onsubmit={handleSubmit}>
  <textarea
    class="threadkit-textarea"
    bind:value={text}
    {placeholder}
    disabled={isSubmitting}
    rows={3}
  ></textarea>

  {#if error}
    <div class="threadkit-error">{error}</div>
  {/if}

  <div class="threadkit-form-actions">
    <button
      type="submit"
      class="threadkit-submit-btn"
      disabled={isSubmitting || !text.trim()}
    >
      {isSubmitting ? 'Posting...' : 'Post'}
    </button>
    {#if showCancel}
      <button
        type="button"
        class="threadkit-cancel-btn"
        onclick={handleCancel}
        disabled={isSubmitting}
      >
        Cancel
      </button>
    {/if}
    <div class="threadkit-form-actions-spacer"></div>
    <button
      type="button"
      class="threadkit-formatting-help-toggle"
      onclick={() => showHelp = !showHelp}
    >
      formatting help
    </button>
  </div>

  {#if showHelp}
    <div class="threadkit-formatting-help">
      <div class="threadkit-formatting-help-header">
        Markdown formatting is supported
      </div>
      <table class="threadkit-formatting-help-table">
        <thead>
          <tr>
            <th>you type:</th>
            <th>you see:</th>
          </tr>
        </thead>
        <tbody>
          {#each FORMATTING_HELP as item}
            <tr>
              <td><code>{item.input}</code></td>
              <td>
                <span class="threadkit-format-{item.style}">
                  {item.output}
                </span>
              </td>
            </tr>
          {/each}
          <tr>
            <td>
              <code>* item 1</code><br>
              <code>* item 2</code><br>
              <code>* item 3</code>
            </td>
            <td>
              <ul class="threadkit-format-list">
                <li>item 1</li>
                <li>item 2</li>
                <li>item 3</li>
              </ul>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  {/if}
</form>
