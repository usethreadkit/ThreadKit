<script lang="ts">
  import type { Comment, User } from '@threadkit/core';

  const dev = import.meta.env.DEV;

  interface Props {
    comments: Comment[];
    loading: boolean;
    error: Error | null;
    pageId: string | null;
    currentUser: User | null;
    connected: boolean;
    presenceCount: number;
    config: {
      apiUrl: string;
      projectId: string;
      url: string;
      mode: 'comments' | 'chat';
      theme: 'light' | 'dark';
      sortBy: string;
    };
  }

  let {
    comments,
    loading,
    error,
    pageId,
    currentUser,
    connected,
    presenceCount,
    config,
  }: Props = $props();

  let isExpanded = $state(false);
  let selectedTab = $state<'state' | 'config' | 'comments'>('state');

  // Expose to window for console access
  $effect(() => {
    if (dev && typeof window !== 'undefined') {
      (window as any).__THREADKIT_DEVTOOLS__ = {
        state: {
          comments,
          loading,
          error,
          pageId,
          currentUser,
          connected,
          presenceCount,
        },
        config,
      };
    }
  });
</script>

{#if dev}
  <div class="threadkit-debug-panel" class:expanded={isExpanded}>
    <button
      class="threadkit-debug-toggle"
      onclick={() => isExpanded = !isExpanded}
      title="Toggle ThreadKit Debug Panel"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" />
      </svg>
      {isExpanded ? 'Hide' : 'Debug'}
    </button>

    {#if isExpanded}
      <div class="threadkit-debug-content">
        <div class="threadkit-debug-tabs">
          <button
            class="threadkit-debug-tab"
            class:active={selectedTab === 'state'}
            onclick={() => selectedTab = 'state'}
          >
            State
          </button>
          <button
            class="threadkit-debug-tab"
            class:active={selectedTab === 'config'}
            onclick={() => selectedTab = 'config'}
          >
            Config
          </button>
          <button
            class="threadkit-debug-tab"
            class:active={selectedTab === 'comments'}
            onclick={() => selectedTab = 'comments'}
          >
            Comments ({comments.length})
          </button>
        </div>

        <div class="threadkit-debug-body">
          {#if selectedTab === 'state'}
            <pre>{JSON.stringify(
              {
                loading,
                error: error?.message,
                pageId,
                currentUser,
                connected,
                presenceCount,
                commentCount: comments.length,
              },
              null,
              2
            )}</pre>
          {:else if selectedTab === 'config'}
            <pre>{JSON.stringify(config, null, 2)}</pre>
          {:else if selectedTab === 'comments'}
            <pre>{JSON.stringify(comments, null, 2)}</pre>
          {/if}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .threadkit-debug-panel {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 10000;
    font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
    font-size: 12px;
  }

  .threadkit-debug-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: #1a1a1a;
    color: #fff;
    border: 1px solid #333;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transition: all 0.2s;
  }

  .threadkit-debug-toggle:hover {
    background: #2a2a2a;
    border-color: #444;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }

  .threadkit-debug-toggle svg {
    width: 14px;
    height: 14px;
  }

  .threadkit-debug-panel.expanded .threadkit-debug-toggle {
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    border-bottom-color: transparent;
  }

  .threadkit-debug-content {
    background: #1a1a1a;
    border: 1px solid #333;
    border-top: none;
    border-radius: 6px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    max-height: 500px;
    display: flex;
    flex-direction: column;
  }

  .threadkit-debug-tabs {
    display: flex;
    gap: 0;
    background: #0a0a0a;
    border-bottom: 1px solid #333;
    padding: 0;
  }

  .threadkit-debug-tab {
    flex: 1;
    padding: 8px 16px;
    background: transparent;
    color: #888;
    border: none;
    border-right: 1px solid #333;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    transition: all 0.15s;
  }

  .threadkit-debug-tab:last-child {
    border-right: none;
  }

  .threadkit-debug-tab:hover {
    background: #1a1a1a;
    color: #aaa;
  }

  .threadkit-debug-tab.active {
    background: #1a1a1a;
    color: #fff;
    border-bottom: 2px solid #4a9eff;
  }

  .threadkit-debug-body {
    padding: 12px;
    overflow: auto;
    flex: 1;
  }

  .threadkit-debug-body pre {
    margin: 0;
    padding: 0;
    color: #e0e0e0;
    font-size: 11px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
