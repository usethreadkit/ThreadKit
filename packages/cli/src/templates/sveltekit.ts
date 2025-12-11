import { type TemplateOptions } from './index.js';

export function sveltekitTemplate(options: TemplateOptions): string {
  const { projectId, plugins } = options;

  const hasI18n = plugins.includes('@threadkit/i18n');

  // Note: Svelte doesn't have the same plugin ecosystem as React yet
  // Show a simpler template with i18n support

  if (hasI18n) {
    return `<script lang="ts">
  import { ThreadKit } from '@threadkit/svelte';
  import '@threadkit/svelte/styles.css';
  import { locales, type LocaleCode } from '@threadkit/i18n';

  let locale = $state<LocaleCode>('en');

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Espanol' },
    { value: 'fr', label: 'Francais' },
    { value: 'de', label: 'Deutsch' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese' },
  ];
</script>

<div class="container">
  <h1>ThreadKit Demo</h1>
  <p>This is an example page with ThreadKit comments.</p>

  <div class="controls">
    <label>
      Language:
      <select bind:value={locale}>
        {#each languageOptions as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </label>
  </div>

  <ThreadKit
    projectId="${projectId}"
    url="/threadkit-demo"
    translations={locales[locale]}
  />
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }

  .controls {
    margin-bottom: 16px;
  }

  select {
    padding: 4px 8px;
  }
</style>
`;
  }

  return `<script lang="ts">
  import { ThreadKit } from '@threadkit/svelte';
  import '@threadkit/svelte/styles.css';
</script>

<div class="container">
  <h1>ThreadKit Demo</h1>
  <p>This is an example page with ThreadKit comments.</p>

  <ThreadKit
    projectId="${projectId}"
    url="/threadkit-demo"
  />
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }
</style>
`;
}
