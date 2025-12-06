<script lang="ts">
  import { ThreadKit } from '@threadkit/svelte';
  import '@threadkit/svelte/styles.css';

  let mode: 'comments' | 'chat' = $state('comments');
  let theme: 'light' | 'dark' = $state('light');

  const codeExample = `// Install
npm install @threadkit/svelte

// Import
import { ThreadKit } from '@threadkit/svelte';
import '@threadkit/svelte/styles.css';

// Use in your component
<ThreadKit
  siteId="your-site-id"
  url={window.location.pathname}
  mode="comments"
  theme="light"
/>`;
</script>

<div class="container">
  <header>
    <h1>ThreadKit - Svelte Example</h1>
    <p class="subtitle">
      A ThreadKit Svelte setup without any plugins.
    </p>

    <div class="controls">
      <label>
        Mode:
        <select bind:value={mode}>
          <option value="comments">Comments</option>
          <option value="chat">Chat</option>
        </select>
      </label>

      <label>
        Theme:
        <select bind:value={theme}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  </header>

  <main class:dark={theme === 'dark'}>
    <ThreadKit
      siteId="demo"
      url="/demo"
      {mode}
      {theme}
      sortBy="newest"
      showPresence={mode === 'chat'}
      showTyping={mode === 'chat'}
      apiUrl="/api"
    />
  </main>

  <div class="code-example">
    <pre><code>{codeExample}</code></pre>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }

  header {
    margin-bottom: 32px;
  }

  h1 {
    margin-bottom: 8px;
  }

  .subtitle {
    color: #666;
    margin-bottom: 16px;
  }

  .controls {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  select {
    padding: 4px 8px;
  }

  main {
    background: #fff;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  main.dark {
    background: #1a1a1a;
  }

  .code-example {
    margin-top: 32px;
    padding: 16px;
    background: #1a1a1a;
    border-radius: 8px;
    overflow: auto;
  }

  .code-example pre {
    margin: 0;
  }

  .code-example code {
    color: #e0e0e0;
    font-family: 'Fira Code', Monaco, Consolas, monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre;
  }
</style>
