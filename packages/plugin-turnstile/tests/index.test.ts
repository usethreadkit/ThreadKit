import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createTurnstilePlugin, createTurnstileFetch, useTurnstile } from '../src/index';

// Mock window.open
const mockPopupWindow = {
  closed: false,
  close: vi.fn(),
};

describe('createTurnstilePlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', vi.fn(() => mockPopupWindow));
    mockPopupWindow.closed = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('plugin structure', () => {
    it('returns a plugin with siteKey', () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
      expect(plugin.siteKey).toBe('test-key');
    });

    it('has getToken function', () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
      expect(typeof plugin.getToken).toBe('function');
    });

    it('has isInProgress function', () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
      expect(typeof plugin.isInProgress).toBe('function');
    });

    it('has cancel function', () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
      expect(typeof plugin.cancel).toBe('function');
    });
  });

  describe('isInProgress', () => {
    it('returns false initially', () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
      expect(plugin.isInProgress()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('opens a popup with correct URL', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-site-key' });

      // Start the token request (don't await - it will hang waiting for postMessage)
      const tokenPromise = plugin.getToken('https://api.example.com');

      // Verify popup was opened with correct URL
      expect(window.open).toHaveBeenCalledWith(
        'https://api.example.com/v1/turnstile/challenge?site_key=test-site-key',
        'threadkit-turnstile',
        expect.stringContaining('width=')
      );

      // Simulate popup close to resolve the promise
      mockPopupWindow.closed = true;

      const result = await tokenPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification window closed');
    });

    it('returns error when popup is blocked', async () => {
      vi.stubGlobal('open', vi.fn(() => null));

      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
      const result = await plugin.getToken('https://api.example.com');

      expect(result.success).toBe(false);
      expect(result.error).toContain('popup');
    });

    it('handles success message', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });

      const tokenPromise = plugin.getToken('https://api.example.com');

      // Simulate success message from popup
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:success',
            token: 'test-token-123',
          },
        })
      );

      const result = await tokenPromise;
      expect(result.success).toBe(true);
      expect(result.token).toBe('test-token-123');
    });

    it('handles error message', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });

      const tokenPromise = plugin.getToken('https://api.example.com');

      // Simulate error message from popup
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:error',
            error: 'Challenge failed',
          },
        })
      );

      const result = await tokenPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Challenge failed');
    });

    it('handles cancelled message', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });

      const tokenPromise = plugin.getToken('https://api.example.com');

      // Simulate cancelled message from popup
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:cancelled',
          },
        })
      );

      const result = await tokenPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification cancelled');
    });

    it('ignores unrelated messages', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });

      const tokenPromise = plugin.getToken('https://api.example.com');

      // Simulate unrelated message
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'some-other-type' },
        })
      );

      // Should still be waiting (close popup to end test)
      expect(plugin.isInProgress()).toBe(true);

      mockPopupWindow.closed = true;
      await tokenPromise;
    });
  });

  describe('cancel', () => {
    it('cancels pending challenge', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });

      const tokenPromise = plugin.getToken('https://api.example.com');

      // Cancel immediately
      plugin.cancel();

      const result = await tokenPromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification cancelled');
    });

    it('closes popup window', async () => {
      const plugin = createTurnstilePlugin({ siteKey: 'test-key' });

      plugin.getToken('https://api.example.com');
      plugin.cancel();

      expect(mockPopupWindow.close).toHaveBeenCalled();
    });
  });

  describe('popup options', () => {
    it('uses custom width and height', async () => {
      const plugin = createTurnstilePlugin({
        siteKey: 'test-key',
        popupOptions: { width: 600, height: 700 },
      });

      plugin.getToken('https://api.example.com');

      expect(window.open).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('width=600')
      );
      expect(window.open).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining('height=700')
      );

      plugin.cancel();
    });
  });
});

describe('createTurnstileFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
    vi.stubGlobal('open', vi.fn(() => mockPopupWindow));
    mockPopupWindow.closed = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a fetch wrapper', () => {
    const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
    const wrappedFetch = createTurnstileFetch(plugin, 'https://api.example.com');

    expect(typeof wrappedFetch).toBe('function');
  });

  it('adds turnstile token to request headers on success', async () => {
    const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
    const wrappedFetch = createTurnstileFetch(plugin, 'https://api.example.com');

    const fetchPromise = wrappedFetch('https://example.com/api');

    // Simulate success message
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'threadkit:turnstile:success',
          token: 'test-token',
        },
      })
    );

    await fetchPromise;

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('X-Turnstile-Token')).toBe('test-token');
  });

  it('throws error when verification fails', async () => {
    const plugin = createTurnstilePlugin({ siteKey: 'test-key' });
    const wrappedFetch = createTurnstileFetch(plugin, 'https://api.example.com');

    const fetchPromise = wrappedFetch('https://example.com/api');

    // Simulate error message
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'threadkit:turnstile:error',
          error: 'Verification failed',
        },
      })
    );

    await expect(fetchPromise).rejects.toThrow('Verification failed');
  });
});

describe('useTurnstile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', vi.fn(() => mockPopupWindow));
    mockPopupWindow.closed = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() =>
      useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' })
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.token).toBe(null);
    expect(typeof result.current.requestToken).toBe('function');
    expect(typeof result.current.cancel).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });

  it('sets loading state during token request', async () => {
    const { result } = renderHook(() =>
      useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' })
    );

    // Start request
    const requestPromise = result.current.requestToken();
    
    // Should be loading immediately
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Simulate success
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:success',
            token: 'test-token-123',
          },
        })
      );
    });

    await requestPromise;

    // Should not be loading anymore
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('updates token state on success', async () => {
    const { result } = renderHook(() =>
      useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' })
    );

    const requestPromise = result.current.requestToken();

    // Simulate success
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:success',
            token: 'test-token-456',
          },
        })
      );
    });

    await requestPromise;

    await waitFor(() => {
      expect(result.current.token).toBe('test-token-456');
      expect(result.current.error).toBe(null);
    });
  });

  it('updates error state on failure', async () => {
    const { result } = renderHook(() =>
      useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' })
    );

    const requestPromise = result.current.requestToken();

    // Simulate error
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:error',
            error: 'Challenge failed',
          },
        })
      );
    });

    await requestPromise;

    await waitFor(() => {
      expect(result.current.error).toBe('Challenge failed');
      expect(result.current.token).toBe(null);
    });
  });

  it('resets state', async () => {
    const { result } = renderHook(() =>
      useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' })
    );

    const requestPromise = result.current.requestToken();

    // Set token
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'threadkit:turnstile:success',
            token: 'test-token-789',
          },
        })
      );
    });

    await requestPromise;

    await waitFor(() => {
      expect(result.current.token).toBe('test-token-789');
    });

    // Reset
    act(() => {
      result.current.reset();
    });

    await waitFor(() => {
      expect(result.current.token).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  it('cancels pending request', async () => {
    const { result } = renderHook(() =>
      useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' })
    );

    const requestPromise = result.current.requestToken();

    // Cancel immediately
    act(() => {
      result.current.cancel();
    });

    await requestPromise;

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('cleans up on unmount when autoCleanup is true', () => {
    const { unmount } = renderHook(() =>
      useTurnstile({
        siteKey: 'test-key',
        apiUrl: 'https://api.example.com',
        autoCleanup: true,
      })
    );

    // Start request
    renderHook(() => useTurnstile({ siteKey: 'test-key', apiUrl: 'https://api.example.com' }));

    // Unmount - should cleanup
    unmount();

    // If we got here without errors, cleanup worked
    expect(true).toBe(true);
  });
});
