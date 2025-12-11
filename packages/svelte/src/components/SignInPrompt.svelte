<script lang="ts">
  import { onMount } from 'svelte';
  import type { AuthStore } from '../stores/auth';
  import { getTranslation } from '../i18n';
  import { AUTH_ICONS, LoadingSpinner } from '../auth/icons';

  const t = getTranslation();

  interface Props {
    authStore: AuthStore;
    apiUrl?: string;
    projectId?: string;
    placeholder?: string;
  }

  let {
    authStore,
    apiUrl,
    projectId,
    placeholder = undefined,
  }: Props = $props();

  const placeholderText = placeholder ?? t('writeComment');
  let text = $state('');
  let hasInitialized = false;

  const authState = $derived($authStore);

  // Fetch auth methods on mount (only if not already authenticated)
  onMount(() => {
    if (!hasInitialized && authState.step === 'idle' && !authState.user && !authState.token) {
      hasInitialized = true;
      authStore.startLogin();
    }
  });

  function handleMethodSelect(method: any) {
    // For OAuth methods, open popup
    if (method.type === 'oauth' && apiUrl && projectId) {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
      const oauthUrl = `${baseUrl}/auth/${method.id}?project_id=${encodeURIComponent(projectId)}`;

      window.open(
        oauthUrl,
        'threadkit-oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    }

    authStore.selectMethod(method);
  }

  function getMethodIcon(methodId: string) {
    const iconFn = AUTH_ICONS[methodId];
    if (iconFn) {
      return iconFn();
    }
    // Fallback to first letter of method name
    return null;
  }
</script>

<div class="threadkit-form">
  <textarea
    class="threadkit-textarea"
    bind:value={text}
    placeholder={placeholderText}
    rows={3}
  />

  <div class="threadkit-form-actions">
    {#if authState.step === 'loading'}
      <!-- Loading auth methods -->
      <div class="threadkit-signin-loading-inline" aria-busy="true" aria-live="polite">
        <span class="threadkit-signin-spinner-small">
          {@html LoadingSpinner()}
        </span>
      </div>
    {:else}
      <!-- Show auth method buttons -->
      <div class="threadkit-signin-methods-inline">
        <span class="threadkit-signin-label-inline">{t('signInLabel')}</span>
        {#each authState.availableMethods as method (method.id)}
          <button
            class="threadkit-signin-method-btn"
            onclick={() => handleMethodSelect(method)}
            title={`${t('continueWith')} ${method.name}`}
          >
            {#if getMethodIcon(method.id)}
              <span class="threadkit-signin-method-icon">
                {@html getMethodIcon(method.id)}
              </span>
            {:else}
              <span class="threadkit-signin-method-icon">{method.name[0]}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
