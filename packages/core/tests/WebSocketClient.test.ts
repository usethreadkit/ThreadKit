import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from '../src/stores/WebSocketClient';
import type { WsUser } from '../src/stores/WebSocketClient';

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = WebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  simulateMessage(data: unknown): void {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this.onmessage?.(event);
  }

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

// Override global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  const mockConfig = {
    wsUrl: 'ws://localhost:8080',
    projectId: 'test-project-id',
    pageId: 'test-page-id',
    getToken: () => null,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    client = new WebSocketClient(mockConfig);
  });

  afterEach(() => {
    client.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with disconnected state', () => {
      const state = client.getState();
      expect(state.connected).toBe(false);
      expect(state.presenceCount).toBe(0);
      expect(state.typingUsers).toEqual([]);
    });

    it('should not be connected initially', () => {
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connection management', () => {
    it('should connect to WebSocket server', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      expect(client.isConnected()).toBe(true);
    });

    it('should emit stateChange when connected', async () => {
      const listener = vi.fn();
      client.on('stateChange', listener);

      client.connect();
      await vi.runAllTimersAsync();

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ connected: true })
      );
    });

    it('should include project_id in WebSocket URL', () => {
      client.connect();
      const ws = (client as any).ws as MockWebSocket;
      expect(ws.url).toContain('project_id=test-project-id');
    });

    it('should include token in WebSocket URL when available', () => {
      const clientWithToken = new WebSocketClient({
        ...mockConfig,
        getToken: () => 'test-token',
      });

      clientWithToken.connect();
      const ws = (clientWithToken as any).ws as MockWebSocket;
      expect(ws.url).toContain('token=test-token');

      clientWithToken.destroy();
    });

    it('should auto-subscribe to page on connect', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const ws = (client as any).ws as MockWebSocket;
      const subscribeMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'subscribe';
      });

      expect(subscribeMessage).toBeTruthy();
    });

    it('should disconnect cleanly', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      expect(client.isConnected()).toBe(true);

      client.disconnect();
      expect(client.isConnected()).toBe(false);
    });

    it('should emit stateChange when disconnected', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const listener = vi.fn();
      client.on('stateChange', listener);

      client.disconnect();
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ connected: false })
      );
    });
  });

  describe('reconnection', () => {
    it('should schedule reconnection after disconnect', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const ws = (client as any).ws as MockWebSocket;
      ws.close();

      // Should schedule reconnection
      const timeout = (client as any).reconnectTimeout;
      expect(timeout).toBeDefined();
    });

    it('should respect custom reconnect delay', async () => {
      const clientWithDelay = new WebSocketClient({
        ...mockConfig,
        reconnectDelay: 5000,
      });

      clientWithDelay.connect();
      await vi.runAllTimersAsync();

      const ws = (clientWithDelay as any).ws as MockWebSocket;
      ws.close();

      // Advance timers by less than reconnect delay
      await vi.advanceTimersByTimeAsync(3000);
      expect(clientWithDelay.isConnected()).toBe(false);

      // Advance past reconnect delay
      await vi.advanceTimersByTimeAsync(3000);
      expect(clientWithDelay.isConnected()).toBe(true);

      clientWithDelay.destroy();
    });

    it('should not reconnect after explicit disconnect', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      client.disconnect();

      // Advance timers past default reconnect delay
      await vi.advanceTimersByTimeAsync(5000);

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      client.connect();
      await vi.runAllTimersAsync();
    });

    it('should handle presence message', () => {
      const listener = vi.fn();
      client.on('presenceList', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'presence',
        params: {
          page_id: 'test-page-id',
          users: [
            { id: 'user-1', name: 'User 1' },
            { id: 'user-2', name: 'User 2' },
          ],
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        users: [
          { id: 'user-1', name: 'User 1' },
          { id: 'user-2', name: 'User 2' },
        ],
      });

      const state = client.getState();
      expect(state.presenceCount).toBe(2);
    });

    it('should handle user joined message', () => {
      const listener = vi.fn();
      client.on('userJoined', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'user_joined',
        params: {
          page_id: 'test-page-id',
          user: { id: 'user-1', name: 'User 1' },
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        user: { id: 'user-1', name: 'User 1' },
      });

      const state = client.getState();
      expect(state.presenceCount).toBe(1);
    });

    it('should handle user left message', () => {
      const ws = (client as any).ws as MockWebSocket;

      // First simulate user joined
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'user_joined',
        params: {
          page_id: 'test-page-id',
          user: { id: 'user-1', name: 'User 1' },
        },
      });

      const listener = vi.fn();
      client.on('userLeft', listener);

      // Then simulate user left
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'user_left',
        params: {
          page_id: 'test-page-id',
          user_id: 'user-1',
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        userId: 'user-1',
      });

      const state = client.getState();
      expect(state.presenceCount).toBe(0);
    });

    it('should handle typing indicator', async () => {
      const listener = vi.fn();
      client.on('userTyping', listener);

      const ws = (client as any).ws as MockWebSocket;
      const user: WsUser = { id: 'user-1', name: 'User 1' };

      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'typing',
        params: {
          page_id: 'test-page-id',
          user,
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        user,
        replyTo: undefined,
      });

      const state = client.getState();
      expect(state.typingUsers).toHaveLength(1);
      expect(state.typingUsers[0].userId).toBe('user-1');
    });

    it('should auto-remove typing indicator after timeout', async () => {
      const ws = (client as any).ws as MockWebSocket;
      const user: WsUser = { id: 'user-1', name: 'User 1' };

      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'typing',
        params: {
          page_id: 'test-page-id',
          user,
        },
      });

      expect(client.getState().typingUsers).toHaveLength(1);

      // Advance past typing timeout (default 3000ms)
      await vi.advanceTimersByTimeAsync(3500);

      expect(client.getState().typingUsers).toHaveLength(0);
    });

    it('should handle new comment message', () => {
      const listener = vi.fn();
      client.on('commentAdded', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'new_comment',
        params: {
          page_id: 'test-page-id',
          comment: {
            i: 'comment-1',
            t: 'Test comment',
            h: '<p>Test comment</p>',
            a: 'user-1',
            n: 'User 1',
            c: Date.now(),
            u: 0,
            d: 0,
          },
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        comment: expect.objectContaining({
          id: 'comment-1',
          text: 'Test comment',
        }),
      });
    });

    it('should handle comment edited message', () => {
      const listener = vi.fn();
      client.on('commentEdited', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'edit_comment',
        params: {
          page_id: 'test-page-id',
          comment_id: 'comment-1',
          content: 'Updated text',
          content_html: '<p>Updated text</p>',
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        commentId: 'comment-1',
        text: 'Updated text',
        textHtml: '<p>Updated text</p>',
      });
    });

    it('should handle comment deleted message', () => {
      const listener = vi.fn();
      client.on('commentDeleted', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'delete_comment',
        params: {
          page_id: 'test-page-id',
          comment_id: 'comment-1',
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        commentId: 'comment-1',
      });
    });

    it('should handle vote update message', () => {
      const listener = vi.fn();
      client.on('voteUpdated', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'vote_update',
        params: {
          page_id: 'test-page-id',
          comment_id: 'comment-1',
          upvotes: 10,
          downvotes: 2,
        },
      });

      expect(listener).toHaveBeenCalledWith({
        pageId: 'test-page-id',
        commentId: 'comment-1',
        upvotes: 10,
        downvotes: 2,
      });
    });

    it('should handle error message', () => {
      const listener = vi.fn();
      client.on('error', listener);

      const ws = (client as any).ws as MockWebSocket;
      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'error',
        params: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      });

      expect(listener).toHaveBeenCalledWith({
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      });
    });

    it('should ignore invalid messages', () => {
      const ws = (client as any).ws as MockWebSocket;

      // Should not throw
      expect(() => {
        ws.simulateMessage({ invalid: 'message' });
      }).not.toThrow();
    });
  });

  describe('sending messages', () => {
    beforeEach(async () => {
      client.connect();
      await vi.runAllTimersAsync();
    });

    it('should send subscribe message', () => {
      client.subscribe('page-123');

      const ws = (client as any).ws as MockWebSocket;
      const subscribeMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'subscribe' && parsed.params.page_id === 'page-123';
      });

      expect(subscribeMessage).toBeTruthy();
    });

    it('should send unsubscribe message', () => {
      client.unsubscribe('page-123');

      const ws = (client as any).ws as MockWebSocket;
      const unsubscribeMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'unsubscribe' && parsed.params.page_id === 'page-123';
      });

      expect(unsubscribeMessage).toBeTruthy();
    });

    it('should send typing indicator', () => {
      client.sendTyping();

      const ws = (client as any).ws as MockWebSocket;
      const typingMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'typing';
      });

      expect(typingMessage).toBeTruthy();
    });

    it('should send typing indicator with replyTo', () => {
      client.sendTyping('comment-123');

      const ws = (client as any).ws as MockWebSocket;
      const typingMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'typing' && parsed.params.reply_to === 'comment-123';
      });

      expect(typingMessage).toBeTruthy();
    });

    it('should send ping message', () => {
      client.sendPing();

      const ws = (client as any).ws as MockWebSocket;
      const pingMessage = ws.sentMessages.find((msg) => {
        const parsed = JSON.parse(msg);
        return parsed.method === 'ping';
      });

      expect(pingMessage).toBeTruthy();
    });
  });

  describe('cleanup', () => {
    it('should clean up all resources on destroy', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const listener = vi.fn();
      client.on('stateChange', listener);

      client.destroy();

      expect(client.isConnected()).toBe(false);

      // Should not emit events after destroy
      const ws = (client as any).ws;
      expect(ws).toBeNull();
    });

    it('should clear typing timers on destroy', async () => {
      client.connect();
      await vi.runAllTimersAsync();

      const ws = (client as any).ws as MockWebSocket;
      const user: WsUser = { id: 'user-1', name: 'User 1' };

      ws.simulateMessage({
        jsonrpc: '2.0',
        method: 'typing',
        params: {
          page_id: 'test-page-id',
          user,
        },
      });

      client.destroy();

      const typingTimers = (client as any).typingTimers;
      expect(typingTimers.size).toBe(0);
    });
  });
});
