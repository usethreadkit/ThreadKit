<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { UserProfile } from '@threadkit/core';

  interface Props {
    userName: string;
    userId: string;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    children: Snippet;
  }

  let { userName, userId, getUserProfile, children }: Props = $props();

  let isVisible = $state(false);
  let position = $state<{ top: number; left: number } | null>(null);
  let triggerEl: HTMLSpanElement | undefined = $state();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  function showCard() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (triggerEl) {
        const rect = triggerEl.getBoundingClientRect();
        const cardHeight = 100;
        position = {
          top: rect.top + window.scrollY - cardHeight - 8,
          left: rect.left + window.scrollX,
        };
        isVisible = true;
      }
    }, 300);
  }

  function hideCard() {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      isVisible = false;
    }, 150);
  }

  function keepCardVisible() {
    if (timeoutId) clearTimeout(timeoutId);
  }

  $effect(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });

  // Get profile or generate mock data
  const profile = $derived(getUserProfile?.(userId));
  const displayProfile = $derived<UserProfile>(profile || {
    id: userId,
    name: userName,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`,
    karma: Math.floor(Math.random() * 10000) + 100,
    totalComments: Math.floor(Math.random() * 500) + 10,
    joinDate: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
  });
</script>

<span
  bind:this={triggerEl}
  onmouseenter={showCard}
  onmouseleave={hideCard}
  class="threadkit-username-trigger"
>
  {@render children()}
</span>

{#if isVisible && position}
  <div
    class="threadkit-hover-card"
    style="position: absolute; top: {position.top}px; left: {position.left}px; z-index: 1000;"
    onmouseenter={keepCardVisible}
    onmouseleave={hideCard}
  >
    <div class="threadkit-hover-card-content">
      <div class="threadkit-hover-card-avatar">
        <img src={displayProfile.avatar} alt={displayProfile.name} />
      </div>
      <div class="threadkit-hover-card-info">
        <div class="threadkit-hover-card-name">{displayProfile.name}</div>
        <div class="threadkit-hover-card-stats">
          <div class="threadkit-hover-card-stat">
            <span class="threadkit-hover-card-stat-value">
              {formatNumber(displayProfile.karma)}
            </span>
            <span class="threadkit-hover-card-stat-label">karma</span>
          </div>
          <div class="threadkit-hover-card-stat">
            <span class="threadkit-hover-card-stat-value">
              {formatNumber(displayProfile.totalComments)}
            </span>
            <span class="threadkit-hover-card-stat-label">comments</span>
          </div>
        </div>
        <div class="threadkit-hover-card-joined">
          Joined {formatDate(displayProfile.joinDate)}
        </div>
      </div>
    </div>
  </div>
{/if}
