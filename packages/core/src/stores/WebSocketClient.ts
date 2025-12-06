import { EventEmitter } from '../EventEmitter';
import type { Comment, WebSocketMessage, WebSocketState } from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface WebSocketClientConfig {
  /** API base URL (will be converted to ws:// or wss://) */
  apiUrl: string;
  /** Site ID from ThreadKit dashboard */
  siteId: string;
  /** Page URL/identifier for this comment thread */
  url: string;
  /** Function to get the current auth token */
  getToken: () => string | null;
  /** Delay before reconnecting after disconnect (default: 3000ms) */
  reconnectDelay?: number;
  /** How long to show typing indicator before auto-removing (default: 3000ms) */
  typingTimeout?: number;
}

// ============================================================================
// Events
// ============================================================================

export interface WebSocketClientEvents {
  /** Emitted when connection state or typing/presence changes */
  stateChange: WebSocketState;
  /** Emitted when a new comment is received */
  commentAdded: Comment;
  /** Emitted when a comment is deleted */
  commentDeleted: { commentId: string };
  /** Emitted when a comment is edited */
  commentEdited: { commentId: string; text: string };
  /** Emitted when a comment is pinned/unpinned */
  commentPinned: { commentId: string; pinned: boolean };
  /** Emitted when a user is banned */
  userBanned: { userId: string };
}

// ============================================================================
// WebSocketClient Class
// ============================================================================

/**
 * Framework-agnostic WebSocket client for real-time updates.
 */
export class WebSocketClient extends EventEmitter<WebSocketClientEvents> {
  private config: WebSocketClientConfig;
  private state: WebSocketState;
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private typingTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private enabled = true;

  constructor(config: WebSocketClientConfig) {
    super();
    this.config = config;
    this.state = {
      connected: false,
      presenceCount: 0,
      typingUsers: [],
    };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getState(): WebSocketState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state.connected;
  }

  // ============================================================================
  // State Updates
  // ============================================================================

  private setState(updates: Partial<WebSocketState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.state);
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Establish WebSocket connection
   */
  connect(): void {
    if (!this.enabled) return;

    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    try {
      const { apiUrl, siteId, url } = this.config;
      const wsUrl = apiUrl.replace(/^http/, 'ws');
      const token = this.config.getToken();
      const wsUrlWithParams = `${wsUrl}/ws/${siteId}?url=${encodeURIComponent(url)}${token ? `&token=${token}` : ''}`;

      this.ws = new WebSocket(wsUrlWithParams);

      this.ws.onopen = () => {
        this.setState({ connected: true });
      };

      this.ws.onclose = () => {
        this.setState({ connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Close will be called after error, which will trigger reconnect
        this.ws?.close();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event);
      };
    } catch {
      // WebSocket connection failed, schedule reconnect
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.enabled = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState({ connected: false });
  }

  /**
   * Send typing indicator
   */
  sendTyping(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'typing' }));
    }
  }

  /**
   * Clean up all resources
   */
  destroy(): void {
    this.disconnect();

    // Clear all typing timers
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();

    this.removeAllListeners();
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private scheduleReconnect(): void {
    if (!this.enabled) return;

    const delay = this.config.reconnectDelay ?? 3000;
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'comment_added':
          this.emit('commentAdded', message.payload as Comment);
          break;

        case 'comment_deleted':
          this.emit('commentDeleted', message.payload as { commentId: string });
          break;

        case 'comment_edited':
          this.emit('commentEdited', message.payload as { commentId: string; text: string });
          break;

        case 'comment_pinned':
          this.emit('commentPinned', message.payload as { commentId: string; pinned: boolean });
          break;

        case 'user_banned':
          this.emit('userBanned', message.payload as { userId: string });
          break;

        case 'typing':
          this.handleTyping(message.payload as { userId: string; userName: string });
          break;

        case 'presence':
          this.handlePresence(message.payload as { count: number });
          break;
      }
    } catch {
      // Ignore invalid messages
    }
  }

  private handleTyping(typing: { userId: string; userName: string }): void {
    const timeout = this.config.typingTimeout ?? 3000;

    // Clear any existing timer for this user (fixes the timer leak bug)
    const existingTimer = this.typingTimers.get(typing.userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Check if user already in list
    const exists = this.state.typingUsers.some((u) => u.userId === typing.userId);

    if (!exists) {
      // Add user to typing list
      this.setState({
        typingUsers: [...this.state.typingUsers, typing],
      });
    }

    // Set timer to remove user after timeout
    const timer = setTimeout(() => {
      this.typingTimers.delete(typing.userId);
      this.setState({
        typingUsers: this.state.typingUsers.filter((u) => u.userId !== typing.userId),
      });
    }, timeout);

    this.typingTimers.set(typing.userId, timer);
  }

  private handlePresence(presence: { count: number }): void {
    this.setState({ presenceCount: presence.count });
  }
}
