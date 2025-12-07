<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { UserProfile } from '@threadkit/core';
  import { getTranslation } from '../i18n';
  import Avatar from './Avatar.svelte';

  const t = getTranslation();

  interface Props {
    userName: string;
    userId: string;
    getUserProfile?: (userId: string) => UserProfile | undefined;
    children: Snippet;
  }

  let { userName, userId, getUserProfile, children }: Props = $props();

  let isVisible = $state(false);
  let position = $state<{ bottom: number; left: number } | null>(null);
  let triggerEl: HTMLSpanElement | undefined = $state();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }

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
        // Fixed positioning relative to viewport
        position = {
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
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
    avatar: undefined,
    karma: Math.floor(Math.random() * 10000) + 100,
    totalComments: Math.floor(Math.random() * 500) + 10,
    joinDate: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
  });
</script>

<span
  bind:this={triggerEl}
  role="button"
  tabindex="0"
  onmouseenter={showCard}
  onmouseleave={hideCard}
  class="threadkit-username-trigger"
>
  {@render children()}
</span>

{#if isVisible && position}
  <div
    use:portal
    role="tooltip"
    class="threadkit-root threadkit-hover-card"
    style="position: fixed; bottom: {position.bottom}px; left: {position.left}px; z-index: 1000;"
    onmouseenter={keepCardVisible}
    onmouseleave={hideCard}
  >
    <div class="threadkit-hover-card-content">
      <div class="threadkit-hover-card-avatar">
        <Avatar src={displayProfile.avatar} alt={displayProfile.name} />
      </div>
              <div class="threadkit-hover-card-info">
                <div class="threadkit-hover-card-name">{displayProfile.name}</div>
                {#if displayProfile.socialLinks}
                  <div class="threadkit-hover-card-social-links">
                    {#if displayProfile.socialLinks.twitter}
                      <a href={`https://twitter.com/${displayProfile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" title="Twitter">
                        <span class="threadkit-social-icon">T</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.github}
                      <a href={`https://github.com/${displayProfile.socialLinks.github}`} target="_blank" rel="noopener noreferrer" title="GitHub">
                        <span class="threadkit-social-icon">G</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.facebook}
                      <a href={`https://facebook.com/${displayProfile.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" title="Facebook">
                        <span class="threadkit-social-icon">F</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.whatsapp}
                      <a href={`https://wa.me/${displayProfile.socialLinks.whatsapp}`} target="_blank" rel="noopener noreferrer" title="WhatsApp">
                        <span class="threadkit-social-icon">W</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.telegram}
                      <a href={`https://t.me/${displayProfile.socialLinks.telegram}`} target="_blank" rel="noopener noreferrer" title="Telegram">
                        <span class="threadkit-social-icon">Te</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.instagram}
                      <a href={`https://instagram.com/${displayProfile.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" title="Instagram">
                        <span class="threadkit-social-icon">I</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.tiktok}
                      <a href={`https://tiktok.com/@${displayProfile.socialLinks.tiktok}`} target="_blank" rel="noopener noreferrer" title="TikTok">
                        <span class="threadkit-social-icon">Tk</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.snapchat}
                      <a href={`https://snapchat.com/add/${displayProfile.socialLinks.snapchat}`} target="_blank" rel="noopener noreferrer" title="Snapchat">
                        <span class="threadkit-social-icon">S</span>
                      </a>
                    {/if}
                    {#if displayProfile.socialLinks.discord}
                      <a href={`https://discordapp.com/users/${displayProfile.socialLinks.discord}`} target="_blank" rel="noopener noreferrer" title="Discord">
                        <span class="threadkit-social-icon">D</span>
                      </a>
                    {/if}
                  </div>
                {/if}
                <div class="threadkit-hover-card-stats">          <div class="threadkit-hover-card-stat">
            <span class="threadkit-hover-card-stat-value">
              {formatNumber(displayProfile.karma)}
            </span>
            <span class="threadkit-hover-card-stat-label">{t('karma')}</span>
          </div>
          <div class="threadkit-hover-card-stat">
            <span class="threadkit-hover-card-stat-value">
              {formatNumber(displayProfile.totalComments)}
            </span>
            <span class="threadkit-hover-card-stat-label">{t('comments')}</span>
          </div>
        </div>
        <div class="threadkit-hover-card-joined">
          {t('joined')} {formatDate(displayProfile.joinDate)}
        </div>
      </div>
    </div>
  </div>
{/if}
