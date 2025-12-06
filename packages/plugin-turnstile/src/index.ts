/**
 * @threadkit/plugin-turnstile
 *
 * Cloudflare Turnstile bot protection plugin for ThreadKit.
 *
 * This plugin opens a popup to complete the Turnstile challenge and returns
 * a token that can be used with the ThreadKit API. This approach allows a single
 * Turnstile widget configuration to work across all sites using ThreadKit.
 *
 * @example
 * ```tsx
 * import { createTurnstilePlugin } from '@threadkit/plugin-turnstile';
 *
 * const turnstile = createTurnstilePlugin({
 *   siteKey: 'your-turnstile-site-key',
 * });
 *
 * // Later, when submitting a comment:
 * const token = await turnstile.getToken(apiUrl);
 * // Include token in X-Turnstile-Token header
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface TurnstilePluginConfig {
  /** Cloudflare Turnstile site key */
  siteKey: string;
  /** Popup window options */
  popupOptions?: {
    width?: number;
    height?: number;
  };
  /** Timeout for waiting for challenge completion (ms) */
  timeout?: number;
}

export interface TurnstileResult {
  success: boolean;
  token?: string;
  error?: string;
}

export type TurnstileMessageType =
  | 'threadkit:turnstile:success'
  | 'threadkit:turnstile:error'
  | 'threadkit:turnstile:cancelled';

export interface TurnstileMessage {
  type: TurnstileMessageType;
  token?: string;
  error?: string;
}

// ============================================================================
// Plugin Implementation
// ============================================================================

export function createTurnstilePlugin(config: TurnstilePluginConfig) {
  const { siteKey, popupOptions = {}, timeout = 120000 } = config;
  const { width = 450, height = 500 } = popupOptions;

  let pendingPromise: {
    resolve: (result: TurnstileResult) => void;
    reject: (error: Error) => void;
  } | null = null;

  let popupWindow: Window | null = null;

  // Handle messages from the popup window
  function handleMessage(event: MessageEvent<TurnstileMessage>) {
    // Only process our messages
    if (
      !event.data?.type ||
      !event.data.type.startsWith('threadkit:turnstile:')
    ) {
      return;
    }

    const { type, token, error } = event.data;

    if (!pendingPromise) return;

    switch (type) {
      case 'threadkit:turnstile:success':
        if (token) {
          pendingPromise.resolve({ success: true, token });
        } else {
          pendingPromise.resolve({
            success: false,
            error: 'No token received',
          });
        }
        break;

      case 'threadkit:turnstile:error':
        pendingPromise.resolve({
          success: false,
          error: error || 'Verification failed',
        });
        break;

      case 'threadkit:turnstile:cancelled':
        pendingPromise.resolve({
          success: false,
          error: 'Verification cancelled',
        });
        break;
    }

    pendingPromise = null;
    cleanup();
  }

  function cleanup() {
    window.removeEventListener('message', handleMessage);
    if (popupWindow && !popupWindow.closed) {
      popupWindow.close();
    }
    popupWindow = null;
  }

  /**
   * Request a Turnstile token by opening a popup challenge.
   *
   * @param apiUrl - The ThreadKit API URL (e.g., https://api.usethreadkit.com)
   * @returns Promise resolving to the verification result
   */
  async function getToken(apiUrl: string): Promise<TurnstileResult> {
    // Clean up any existing state
    cleanup();

    return new Promise((resolve, reject) => {
      pendingPromise = { resolve, reject };

      // Set up message listener
      window.addEventListener('message', handleMessage);

      // Calculate popup position (centered)
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Build challenge URL
      const challengeUrl = `${apiUrl}/v1/turnstile/challenge?site_key=${encodeURIComponent(siteKey)}`;

      // Open popup
      popupWindow = window.open(
        challengeUrl,
        'threadkit-turnstile',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popupWindow) {
        pendingPromise = null;
        cleanup();
        resolve({
          success: false,
          error: 'Failed to open verification popup. Please allow popups.',
        });
        return;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (pendingPromise) {
          pendingPromise.resolve({
            success: false,
            error: 'Verification timed out',
          });
          pendingPromise = null;
          cleanup();
        }
      }, timeout);

      // Poll to detect popup close (backup for if postMessage fails)
      const pollInterval = setInterval(() => {
        if (popupWindow?.closed) {
          clearInterval(pollInterval);
          clearTimeout(timeoutId);
          if (pendingPromise) {
            // Give a small delay for postMessage to arrive
            setTimeout(() => {
              if (pendingPromise) {
                pendingPromise.resolve({
                  success: false,
                  error: 'Verification window closed',
                });
                pendingPromise = null;
                cleanup();
              }
            }, 100);
          }
        }
      }, 500);
    });
  }

  /**
   * Check if a challenge is currently in progress
   */
  function isInProgress(): boolean {
    return pendingPromise !== null;
  }

  /**
   * Cancel any pending challenge
   */
  function cancel(): void {
    if (pendingPromise) {
      pendingPromise.resolve({
        success: false,
        error: 'Verification cancelled',
      });
      pendingPromise = null;
    }
    cleanup();
  }

  return {
    siteKey,
    getToken,
    isInProgress,
    cancel,
  };
}

export type TurnstilePlugin = ReturnType<typeof createTurnstilePlugin>;

// ============================================================================
// React Hook
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseTurnstileOptions {
  /** Cloudflare Turnstile site key */
  siteKey: string;
  /** ThreadKit API URL */
  apiUrl: string;
  /** Auto-cleanup on unmount */
  autoCleanup?: boolean;
}

export interface UseTurnstileReturn {
  /** Request a Turnstile token */
  requestToken: () => Promise<TurnstileResult>;
  /** Whether a challenge is in progress */
  isLoading: boolean;
  /** Last error message */
  error: string | null;
  /** Last successful token */
  token: string | null;
  /** Cancel any pending challenge */
  cancel: () => void;
  /** Clear the current token/error state */
  reset: () => void;
}

export function useTurnstile(options: UseTurnstileOptions): UseTurnstileReturn {
  const { siteKey, apiUrl, autoCleanup = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const pluginRef = useRef<TurnstilePlugin | null>(null);

  // Create plugin instance
  if (!pluginRef.current || pluginRef.current.siteKey !== siteKey) {
    pluginRef.current = createTurnstilePlugin({ siteKey });
  }

  const requestToken = useCallback(async (): Promise<TurnstileResult> => {
    if (!pluginRef.current) {
      return { success: false, error: 'Plugin not initialized' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await pluginRef.current.getToken(apiUrl);

      if (result.success && result.token) {
        setToken(result.token);
      } else {
        setError(result.error || 'Verification failed');
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);

  const cancel = useCallback(() => {
    pluginRef.current?.cancel();
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setToken(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup) {
        pluginRef.current?.cancel();
      }
    };
  }, [autoCleanup]);

  return {
    requestToken,
    isLoading,
    error,
    token,
    cancel,
    reset,
  };
}

// ============================================================================
// Utility: Wrap fetch with Turnstile
// ============================================================================

/**
 * Create a fetch wrapper that automatically includes Turnstile token
 * when required.
 */
export function createTurnstileFetch(
  plugin: TurnstilePlugin,
  apiUrl: string
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    // Get a fresh token
    const result = await plugin.getToken(apiUrl);

    if (!result.success) {
      throw new Error(result.error || 'Turnstile verification failed');
    }

    // Add token to headers
    const headers = new Headers(init?.headers);
    headers.set('X-Turnstile-Token', result.token!);

    return fetch(input, {
      ...init,
      headers,
    });
  };
}
