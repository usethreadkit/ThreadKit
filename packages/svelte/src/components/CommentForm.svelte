<script lang="ts">
  import { getTranslation } from '../i18n';

  const t = getTranslation();

  interface Props {
    parentId?: string;
    placeholder?: string;
    showCancel?: boolean;
    onSubmit?: (text: string, parentId?: string) => Promise<void>;
    onCancel?: () => void;
  }

  let { parentId, placeholder, showCancel = false, onSubmit, onCancel }: Props = $props();
  const placeholderText = placeholder ?? t('writeComment');

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
    if (!trimmedText || !onSubmit) return;

    isSubmitting = true;
    error = null;

    try {
      await onSubmit(trimmedText, parentId);
      text = '';
    } catch (err) {
      error = err instanceof Error ? err.message : t('failedToPost');
    } finally {
      isSubmitting = false;
    }
  }

  function handleCancel() {
    onCancel?.();
  }
</script>

<form class="threadkit-form" onsubmit={handleSubmit}>
  <textarea
    class="threadkit-textarea"
    bind:value={text}
    placeholder={placeholderText}
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
      {isSubmitting ? t('posting') : t('post')}
    </button>
    {#if showCancel}
      <button
        type="button"
        class="threadkit-cancel-btn"
        onclick={handleCancel}
        disabled={isSubmitting}
      >
        {t('cancel')}
      </button>
    {/if}
    <div class="threadkit-form-actions-spacer"></div>
    <button
      type="button"
      class="threadkit-formatting-help-toggle"
      onclick={() => showHelp = !showHelp}
    >
      {t('formattingHelp')}
    </button>
  </div>

  {#if showHelp}
    <div class="threadkit-formatting-help">
      <div class="threadkit-formatting-help-header">
        {t('markdownSupported')}
      </div>
      <table class="threadkit-formatting-help-table">
        <thead>
          <tr>
            <th>{t('youType')}</th>
            <th>{t('youSee')}</th>
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
