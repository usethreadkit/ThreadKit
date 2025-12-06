import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../src/hooks/useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0; // CONNECTING

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  send = vi.fn();

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  simulateError() {
    this.onerror?.();
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('connection', () => {
    it('connects to WebSocket on mount', () => {
      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      expect(MockWebSocket.instances).toHaveLength(1);
      expect(MockWebSocket.instances[0].url).toBe(
        'ws://localhost:3000/ws/test-site?url=%2Ftest-page'
      );
    });

    it('includes token in URL when available', () => {
      localStorageMock.getItem.mockReturnValue('test-token');

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      expect(MockWebSocket.instances[0].url).toContain('&token=test-token');
    });

    it('converts https to wss', () => {
      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'https://api.example.com',
        })
      );

      expect(MockWebSocket.instances[0].url).toMatch(/^wss:/);
    });

    it('returns connected: true when WebSocket opens', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      expect(result.current.connected).toBe(false);

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      expect(result.current.connected).toBe(true);
    });

    it('returns connected: false when WebSocket closes', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
      });

      expect(result.current.connected).toBe(true);

      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      expect(result.current.connected).toBe(false);
    });
  });

  describe('reconnection', () => {
    it('reconnects after 3 seconds when connection closes', async () => {
      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      expect(MockWebSocket.instances).toHaveLength(1);

      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(MockWebSocket.instances).toHaveLength(2);
    });

    it('closes WebSocket on error and triggers reconnect', async () => {
      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      const ws = MockWebSocket.instances[0];

      act(() => {
        ws.simulateError();
      });

      expect(ws.close).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('does not connect when enabled is false', () => {
      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          enabled: false,
        })
      );

      expect(MockWebSocket.instances).toHaveLength(0);
    });
  });

  describe('message handling', () => {
    it('calls onCommentAdded for comment_added messages', () => {
      const onCommentAdded = vi.fn();
      const comment = { id: 'comment-1', text: 'Hello' };

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onCommentAdded,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'comment_added',
          payload: comment,
        });
      });

      expect(onCommentAdded).toHaveBeenCalledWith(comment);
    });

    it('calls onCommentDeleted for comment_deleted messages', () => {
      const onCommentDeleted = vi.fn();

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onCommentDeleted,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'comment_deleted',
          payload: { commentId: 'comment-1' },
        });
      });

      expect(onCommentDeleted).toHaveBeenCalledWith('comment-1');
    });

    it('calls onCommentEdited for comment_edited messages', () => {
      const onCommentEdited = vi.fn();

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onCommentEdited,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'comment_edited',
          payload: { commentId: 'comment-1', text: 'Updated text' },
        });
      });

      expect(onCommentEdited).toHaveBeenCalledWith('comment-1', 'Updated text');
    });

    it('calls onCommentPinned for comment_pinned messages', () => {
      const onCommentPinned = vi.fn();

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onCommentPinned,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'comment_pinned',
          payload: { commentId: 'comment-1', pinned: true },
        });
      });

      expect(onCommentPinned).toHaveBeenCalledWith('comment-1', true);
    });

    it('calls onUserBanned for user_banned messages', () => {
      const onUserBanned = vi.fn();

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onUserBanned,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'user_banned',
          payload: { userId: 'user-1' },
        });
      });

      expect(onUserBanned).toHaveBeenCalledWith('user-1');
    });

    it('handles typing messages and updates typingUsers', async () => {
      const onTyping = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onTyping,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'typing',
          payload: { userId: 'user-1', userName: 'Alice' },
        });
      });

      expect(onTyping).toHaveBeenCalledWith('user-1', 'Alice');
      expect(result.current.typingUsers).toContainEqual({
        userId: 'user-1',
        userName: 'Alice',
      });
    });

    it('removes typing user after 3 seconds', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'typing',
          payload: { userId: 'user-1', userName: 'Alice' },
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.typingUsers).toHaveLength(0);
    });

    it('does not duplicate typing users', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'typing',
          payload: { userId: 'user-1', userName: 'Alice' },
        });
        MockWebSocket.instances[0].simulateMessage({
          type: 'typing',
          payload: { userId: 'user-1', userName: 'Alice' },
        });
      });

      expect(result.current.typingUsers).toHaveLength(1);
    });

    it('handles presence messages and updates presenceCount', async () => {
      const onPresenceUpdate = vi.fn();

      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onPresenceUpdate,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].simulateMessage({
          type: 'presence',
          payload: { count: 42 },
        });
      });

      expect(onPresenceUpdate).toHaveBeenCalledWith(42);
      expect(result.current.presenceCount).toBe(42);
    });

    it('ignores invalid JSON messages', () => {
      const onCommentAdded = vi.fn();

      renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
          onCommentAdded,
        })
      );

      act(() => {
        MockWebSocket.instances[0].simulateOpen();
        MockWebSocket.instances[0].onmessage?.({ data: 'invalid json' });
      });

      expect(onCommentAdded).not.toHaveBeenCalled();
    });
  });

  describe('sendTyping', () => {
    it('sends typing message when connected', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      const ws = MockWebSocket.instances[0];

      act(() => {
        ws.simulateOpen();
      });

      act(() => {
        result.current.sendTyping();
      });

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'typing' }));
    });

    it('does not send typing when not connected', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      const ws = MockWebSocket.instances[0];

      act(() => {
        result.current.sendTyping();
      });

      expect(ws.send).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('closes WebSocket on unmount', () => {
      const { unmount } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      const ws = MockWebSocket.instances[0];

      unmount();

      expect(ws.close).toHaveBeenCalled();
    });

    it('clears reconnect timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() =>
        useWebSocket({
          siteId: 'test-site',
          url: '/test-page',
          apiUrl: 'http://localhost:3000',
        })
      );

      // Trigger reconnect
      act(() => {
        MockWebSocket.instances[0].simulateClose();
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});
