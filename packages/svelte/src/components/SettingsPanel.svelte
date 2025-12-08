<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { User, SocialLinks } from '@threadkit/core';
  import { getTranslation } from '../i18n';
  import Avatar from './Avatar.svelte';

  const t = getTranslation();

  export let currentUser: User | undefined;
  export let onLogin: () => void;
  export let onLogout: () => void;
  export let onUpdateSocialLinks: (socialLinks: SocialLinks) => void;
  export let onUpdateName: (name: string) => void; // Will add implementation later
  export let onThemeChange: (theme: 'light' | 'dark') => void; // Will add implementation later
  export let theme: 'light' | 'dark'; // Will add implementation later

  let isOpen = false;
  let activeSection: string | null = null;

  // State for social links
  let twitter: string = currentUser?.socialLinks?.twitter || '';
  let github: string = currentUser?.socialLinks?.github || '';
  let facebook: string = currentUser?.socialLinks?.facebook || '';
  let whatsapp: string = currentUser?.socialLinks?.whatsapp || '';
  let telegram: string = currentUser?.socialLinks?.telegram || '';
  let instagram: string = currentUser?.socialLinks?.instagram || '';
  let tiktok: string = currentUser?.socialLinks?.tiktok || '';
  let snapchat: string = currentUser?.socialLinks?.snapchat || '';
  let discord: string = currentUser?.socialLinks?.discord || '';

  let containerRef: HTMLDivElement;

  function handleToggle() {
    isOpen = !isOpen;
    activeSection = null;
    // Reset social link states when closing
    if (!isOpen) {
      twitter = currentUser?.socialLinks?.twitter || '';
      github = currentUser?.socialLinks?.github || '';
      facebook = currentUser?.socialLinks?.facebook || '';
      whatsapp = currentUser?.socialLinks?.whatsapp || '';
      telegram = currentUser?.socialLinks?.telegram || '';
      instagram = currentUser?.socialLinks?.instagram || '';
      tiktok = currentUser?.socialLinks?.tiktok || '';
      snapchat = currentUser?.socialLinks?.snapchat || '';
      discord = currentUser?.socialLinks?.discord || '';
    }
  }

  // Click outside to close
  function handleClickOutside(event: MouseEvent) {
    if (isOpen && containerRef && !containerRef.contains(event.target as Node)) {
      handleToggle();
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onDestroy(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  const renderSocialLinkInput = (
    label: string,
    value: string,
    setValue: (newValue: string) => void
  ) => `
    <div class="threadkit-social-link-input-group">
      <label>${label}</label>
      <input
        type="text"
        value="${value}"
        on:input={(e) => setValue(e.target.value)}
        class="threadkit-settings-name-input"
        placeholder="https://${label.toLowerCase()}.com/your-profile"
      />
    </div>
  `;

  function saveSocialLinks() {
    onUpdateSocialLinks({
      twitter: twitter || undefined,
      github: github || undefined,
      facebook: facebook || undefined,
      whatsapp: whatsapp || undefined,
      telegram: telegram || undefined,
      instagram: instagram || undefined,
      tiktok: tiktok || undefined,
      snapchat: snapchat || undefined,
      discord: discord || undefined,
    });
    activeSection = null; // Close section after saving
  }
</script>

<div class="threadkit-settings" bind:this={containerRef}>
  <button
    class="threadkit-settings-btn"
    on:click={handleToggle}
    aria-label={t('settings')}
    title={t('settings')}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  </button>

  {#if isOpen}
    <div class="threadkit-settings-dropdown">
      <div class="threadkit-mobile-header">
        <span class="threadkit-mobile-title">{t('settings')}</span>
        <button
          class="threadkit-mobile-close"
          on:click={handleToggle}
          aria-label={t('close')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {#if !currentUser}
        <div class="threadkit-settings-section">
          <button class="threadkit-settings-item" on:click={onLogin}>
            {t('signIn')}
          </button>
        </div>
      {:else}
        <!-- User Info -->
        <div class="threadkit-settings-user">
          <Avatar
            src={currentUser.avatar}
            alt={currentUser.name}
            seed={currentUser.name}
            className="threadkit-settings-avatar"
          />
          <div class="threadkit-settings-user-info">
            <span class="threadkit-settings-username">
              {currentUser.name}
              <!-- Edit name functionality will be added later -->
            </span>
          </div>
        </div>

        <!-- Theme Toggle (placeholder for now) -->
        <div class="threadkit-settings-section">
          <button
            class="threadkit-settings-item"
            on:click={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
          >
            {t('theme')}: {theme}
            <span class="threadkit-settings-value">{theme === 'light' ? '☀️' : '🌙'}</span>
          </button>
        </div>

        <!-- Social Links -->
        <div class="threadkit-settings-section">
          <button
            class="threadkit-settings-item"
            on:click={() => (activeSection = activeSection === 'social' ? null : 'social')}
          >
            {t('socialLinks')}
            <span class="threadkit-settings-arrow">{activeSection === 'social' ? '▲' : '▼'}</span>
          </button>
          {#if activeSection === 'social'}
            <div class="threadkit-social-links-settings">
              {@html renderSocialLinkInput('Twitter', twitter, (val) => (twitter = val))}
              {@html renderSocialLinkInput('GitHub', github, (val) => (github = val))}
              {@html renderSocialLinkInput('Facebook', facebook, (val) => (facebook = val))}
              {@html renderSocialLinkInput('WhatsApp', whatsapp, (val) => (whatsapp = val))}
              {@html renderSocialLinkInput('Telegram', telegram, (val) => (telegram = val))}
              {@html renderSocialLinkInput('Instagram', instagram, (val) => (instagram = val))}
              {@html renderSocialLinkInput('TikTok', tiktok, (val) => (tiktok = val))}
              {@html renderSocialLinkInput('Snapchat', snapchat, (val) => (snapchat = val))}
              {@html renderSocialLinkInput('Discord', discord, (val) => (discord = val))}

              <button class="threadkit-action-btn" on:click={saveSocialLinks}>
                {t('saveSocialLinks')}
              </button>
            </div>
          {/if}
        </div>

        <div class="threadkit-settings-divider" />

        <!-- Logout -->
        <div class="threadkit-settings-section">
          <button class="threadkit-settings-item" on:click={onLogout}>
            {t('signOut')}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>