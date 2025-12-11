<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getTranslation } from '../i18n';

  const t = getTranslation();

  export interface Notification {
    id: string;
    type: 'reply' | 'mention' | 'vote';
    message: string;
    commentId?: string;
    fromUser: string;
    timestamp: Date;
    read: boolean;
  }

  interface Props {
    notifications?: Notification[];
    onMarkRead?: (id: string) => void;
    onMarkAllRead?: () => void;
    onNotificationClick?: (notification: Notification) => void;
  }

  let {
    notifications = [],
    onMarkRead,
    onMarkAllRead,
    onNotificationClick,
  }: Props = $props();

  let isOpen = $state(false);
  let containerRef: HTMLDivElement | undefined = $state();

  const unreadCount = $derived(notifications.filter((n) => !n.read).length);

  function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return t('justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t('minutesAgo', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('daysAgo', { n: days });
    return date.toLocaleDateString();
  }

  function handleToggle() {
    isOpen = !isOpen;
  }

  function handleClickOutside(event: MouseEvent) {
    if (isOpen && containerRef && !containerRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.read && onMarkRead) {
      onMarkRead(notification.id);
    }
    onNotificationClick?.(notification);
    isOpen = false;
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  // Prevent body scroll when open on mobile
  $effect(() => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth <= 640) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  });
</script>

<div class="threadkit-notifications" bind:this={containerRef}>
  <button
    class="threadkit-notifications-btn"
    onclick={handleToggle}
    aria-label={`${t('notifications')}${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
    title={t('notifications')}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
    {#if unreadCount > 0}
      <span class="threadkit-notifications-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
    {/if}
  </button>

  {#if isOpen}
    <div class="threadkit-notifications-dropdown">
      <!-- Mobile header with close button -->
      <div class="threadkit-mobile-header">
        <span class="threadkit-mobile-title">{t('notifications')}</span>
        <button
          class="threadkit-mobile-close"
          onclick={handleToggle}
          aria-label={t('close')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="threadkit-notifications-header">
        <span class="threadkit-notifications-title">{t('notifications')}</span>
        {#if unreadCount > 0 && onMarkAllRead}
          <button
            class="threadkit-notifications-mark-all"
            onclick={onMarkAllRead}
          >
            {t('markAllRead')}
          </button>
        {/if}
      </div>

      <div class="threadkit-notifications-list">
        {#if notifications.length === 0}
          <div class="threadkit-notifications-empty">
            {t('noNotifications')}
          </div>
        {:else}
          {#each notifications as notification (notification.id)}
            <button
              class="threadkit-notification-item"
              class:unread={!notification.read}
              onclick={() => handleNotificationClick(notification)}
            >
              <div class="threadkit-notification-icon">
                {#if notification.type === 'reply'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                {:else if notification.type === 'mention'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                  </svg>
                {:else if notification.type === 'vote'}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                {/if}
              </div>
              <div class="threadkit-notification-content">
                <span class="threadkit-notification-message">{notification.message}</span>
                <span class="threadkit-notification-time">{formatTimeAgo(notification.timestamp)}</span>
              </div>
              {#if !notification.read}
                <span class="threadkit-notification-dot" />
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
