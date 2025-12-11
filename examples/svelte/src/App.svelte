<script lang="ts">
  import { ThreadKit } from '@threadkit/svelte';
  import '@threadkit/svelte/styles.css';

  type Theme = 'light' | 'dark';

  // Configuration for local development
  const LOCAL_PROJECT_ID = 'tk_pub_your_public_key';
  const API_URL = 'http://localhost:8080/v1';
  const WS_URL = 'ws://localhost:8081';

  let theme = $state<Theme>('light');
  let pageUrl = $state('/demo');
</script>

<div class="demo-container">
  <header style="margin-bottom: 32px;">
    <h1 style="margin-bottom: 8px;">ThreadKit - Local Server (Two Instances)</h1>
    <p style="color: #666; margin-bottom: 16px;">
      Testing chat and thread modes side-by-side at <code>localhost:8080</code>
    </p>

    <div
      style="
        background: #fffbe6;
        border: 1px solid #ffe58f;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      "
    >
      <strong>Setup:</strong>
      <ol style="margin: 8px 0 0; padding-left: 20px;">
        <li>
          Start Redis: <code>redis-server</code>
        </li>
        <li>
          Create site (first time only):
          <pre style="margin: 4px 0; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 12px; overflow: auto;">
cargo run --release --bin threadkit-http -- \
--create-site "My Site" example.com \
--enable-auth email,google,github,anonymous
          </pre>
        </li>
        <li>
          Start the server: <code>cd server && cargo run --release --bin threadkit-http</code>
        </li>
      </ol>
    </div>

    <div style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
      <label style="display: flex; align-items: center; gap: 8px;">
        Theme:
        <select
          bind:value={theme}
          style="padding: 4px 8px;"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>

      <label style="display: flex; align-items: center; gap: 8px;">
        Page:
        <input
          type="text"
          bind:value={pageUrl}
          style="padding: 4px 8px; width: 150px;"
          placeholder="/your-page-url"
        />
      </label>
    </div>
  </header>

  <div class="demo-grid">
    <main
      class="demo-main"
      style="background: {theme === 'dark' ? '#1a1a1a' : '#fff'};"
    >
      <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px;">Chat Mode</h2>
      <ThreadKit
        projectId={LOCAL_PROJECT_ID}
        url={pageUrl}
        mode="chat"
        {theme}
        sortBy="new"
        showPresence={true}
        showTyping={true}
        apiUrl={API_URL}
        wsUrl={WS_URL}
        debug={true}
        onError={(error) => console.error('ThreadKit chat error:', error)}
      />
    </main>

    <main
      class="demo-main"
      style="background: {theme === 'dark' ? '#1a1a1a' : '#fff'};"
    >
      <h2 style="margin-top: 0; margin-bottom: 16px; font-size: 18px;">Thread Mode</h2>
      <ThreadKit
        projectId={LOCAL_PROJECT_ID}
        url={pageUrl}
        mode="comments"
        {theme}
        sortBy="new"
        showPresence={false}
        showTyping={false}
        apiUrl={API_URL}
        wsUrl={WS_URL}
        debug={true}
        onError={(error) => console.error('ThreadKit thread error:', error)}
      />
    </main>
  </div>

  <footer style="margin-top: 32px; color: #666; font-size: 14px;">
    <p>
      API Endpoint: <code>{API_URL}</code>
    </p>
    <p>
      WebSocket: <code>{WS_URL}</code>
    </p>
    <p>
      View API docs:{' '}
      <a href="http://localhost:8080/docs" target="_blank" rel="noopener noreferrer">
        http://localhost:8080/docs
      </a>
    </p>
  </footer>
</div>

<style>
  .demo-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 24px;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }

  .demo-main {
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  @media (max-width: 768px) {
    .demo-container {
      padding: 0;
    }

    .demo-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .demo-main {
      border-radius: 0;
      padding: 16px;
      box-shadow: none;
    }
  }

  code {
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Fira Code', Monaco, Consolas, monospace;
    font-size: 13px;
  }

  pre {
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
