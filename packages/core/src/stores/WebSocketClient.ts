import { EventEmitter } from '../EventEmitter';
import type { Comment, WebSocketState } from '../types';
import type { TreeComment } from '../api.types';
import { treeCommentToComment } from '../utils/treeConvert';

// ============================================================================
// Configuration
// ============================================================================

export interface WebSocketClientConfig {
  /** WebSocket server URL (e.g., "wss://api.usethreadkit.com") */
  wsUrl: string;
  /** API key for authentication */
  projectId: string;
  /** Page ID (UUID) for this comment thread */
  pageId: string;
  /** Function to get the current auth token */
  getToken: () => string | null;
  /** Delay before reconnecting after disconnect (default: 3000ms) */
  reconnectDelay?: number;
  /** How long to show typing indicator before auto-removing (default: 3000ms) */
  typingTimeout?: number;
  /**
   * @deprecated Use wsUrl and projectId instead
   */
  apiUrl?: string;
  /**
   * @deprecated Use pageId instead
   */
  url?: string;
  /**
   * @deprecated siteId is no longer needed - site is derived from API key/token
   */
  siteId?: string;
}

// ============================================================================
// Events
// ============================================================================

/** User info from server */
export interface WsUser {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface WebSocketClientEvents {
  /** Emitted when connection state or typing/presence changes */
  stateChange: WebSocketState;
  /** Emitted when a new comment is received */
  commentAdded: { pageId: string; comment: Comment };
  /** Emitted when a comment is deleted */
  commentDeleted: { pageId: string; commentId: string };
  /** Emitted when a comment is edited */
  commentEdited: { pageId: string; commentId: string; text: string; textHtml: string };
  /** Emitted when a comment vote is updated */
  voteUpdated: { pageId: string; commentId: string; upvotes: number; downvotes: number };
  /** Emitted when a comment pin status is updated */
  pinUpdated: { pageId: string; commentId: string; pinned: boolean; pinned_at: number | null };
  /** Emitted when presence list is received */
  presenceList: { pageId: string; users: WsUser[] };
  /** Emitted when a user joins the page */
  userJoined: { pageId: string; user: WsUser };
  /** Emitted when a user leaves the page */
  userLeft: { pageId: string; userId: string };
  /** Emitted when a user is typing */
  userTyping: { pageId: string; user: WsUser; replyTo?: string };
  /** Emitted when a notification is received */
  notification: { type: string; commentId: string; fromUser: WsUser };
  /** Emitted on connection errors */
  error: { code: string; message: string };
}

// ============================================================================
// WebSocketClient Class
// ============================================================================

/** JSON-RPC 2.0 message from server */
interface ServerRpcMessage {
  jsonrpc: '2.0';
  method: string;
  params: Record<string, unknown>;
}

/**
 * Framework-agnostic WebSocket client for real-time updates.
 * Uses JSON-RPC 2.0 protocol.
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
      typingByComment: new Map(),
    };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Get the current WebSocket state.
   * @returns State object including connection status, presence count, and typing users
   * @example
   * ```ts
   * const state = wsClient.getState();
   * console.log(`Connected: ${state.connected}`);
   * console.log(`${state.presenceCount} users online`);
   * console.log(`${state.typingUsers.length} users typing`);
   * ```
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if the WebSocket connection is currently open.
   * @returns True if connected, false otherwise
   * @example
   * ```ts
   * if (wsClient.isConnected()) {
   *   console.log('Real-time updates active');
   * }
   * ```
   */
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
   * Establish WebSocket connection to the server.
   * Automatically subscribes to the configured page and handles reconnection on failure.
   * Emits 'stateChange' event when connection status changes.
   *
   * @example
   * ```ts
   * const wsClient = new WebSocketClient({ wsUrl, projectId, pageId, getToken });
   *
   * // Listen for connection changes
   * wsClient.on('stateChange', (state) => {
   *   if (state.connected) {
   *     console.log('Connected to real-time updates');
   *   }
   * });
   *
   * wsClient.connect();
   * ```
   */
  connect(): void {
    if (!this.enabled) return;

    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    try {
      // Build WebSocket URL with project_id and optional token
      const wsUrl = this.config.wsUrl || this.config.apiUrl?.replace(/^http/, 'ws') || '';
      const token = this.config.getToken();
      const params = new URLSearchParams();
      params.set('project_id', this.config.projectId);
      if (token) {
        params.set('token', token);
      }
      const wsUrlWithParams = `${wsUrl}/ws?${params.toString()}`;

      this.ws = new WebSocket(wsUrlWithParams);

      this.ws.onopen = () => {
        this.setState({ connected: true });
        // Auto-subscribe to the configured page
        this.subscribe(this.config.pageId);
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
   * Subscribe to a page's real-time events
   */
  subscribe(pageId: string): void {
    this.sendRpc('subscribe', { page_id: pageId });
  }

  /**
   * Unsubscribe from a page
   */
  unsubscribe(pageId: string): void {
    this.sendRpc('unsubscribe', { page_id: pageId });
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
   * Send a typing indicator to other users on the page.
   * The indicator will automatically expire after the configured timeout (default 3 seconds).
   *
   * @param replyTo - Optional comment ID to indicate which comment is being replied to
   * @example
   * ```ts
   * // Show typing indicator when user starts typing
   * textarea.addEventListener('input', () => {
   *   wsClient.sendTyping();
   * });
   *
   * // Show typing indicator for a reply
   * replyTextarea.addEventListener('input', () => {
   *   wsClient.sendTyping(parentCommentId);
   * });
   * ```
   */
  sendTyping(replyTo?: string): void {
    this.sendRpc('typing', {
      page_id: this.config.pageId,
      reply_to: replyTo,
    });
  }

  /**
   * Send a ping to keep connection alive
   */
  sendPing(): void {
    this.sendRpc('ping', {});
  }

  /**
   * Send a JSON-RPC 2.0 message
   */
  private sendRpc(method: string, params: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
      }));
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
      const message: ServerRpcMessage = JSON.parse(event.data);

      // Debug logging
      if (typeof console !== 'undefined' && message.method !== 'pong' && message.method !== 'presence' && message.method !== 'typing') {
        console.log('[WebSocketClient] Received message:', message.method, message.params);
      }

      if (message.jsonrpc !== '2.0') return;

      const params = message.params;

      switch (message.method) {
        case 'connected':
          // Connection confirmed
          break;

        case 'error':
          this.emit('error', {
            code: params.code as string,
            message: params.message as string,
          });
          break;

        case 'pong':
          // Heartbeat response, nothing to do
          break;

        case 'presence':
          this.handlePresence(params);
          break;

        case 'user_joined':
          this.handleUserJoined(params);
          break;

        case 'user_left':
          this.handleUserLeft(params);
          break;

        case 'typing':
          this.handleTyping(params);
          break;

        case 'new_comment': {
          // Server sends TreeComment format (single-letter keys), convert to Comment
          const treeComment = params.comment as TreeComment;
          const comment = treeCommentToComment(treeComment);
          this.emit('commentAdded', {
            pageId: params.page_id as string,
            comment,
          });
          break;
        }

        case 'edit_comment':
          this.emit('commentEdited', {
            pageId: params.page_id as string,
            commentId: params.comment_id as string,
            text: params.content as string,
            textHtml: params.content_html as string,
          });
          break;

        case 'delete_comment':
          this.emit('commentDeleted', {
            pageId: params.page_id as string,
            commentId: params.comment_id as string,
          });
          break;

        case 'vote_update':
          this.emit('voteUpdated', {
            pageId: params.page_id as string,
            commentId: params.comment_id as string,
            upvotes: params.upvotes as number,
            downvotes: params.downvotes as number,
          });
          break;

        case 'pin_update':
          this.emit('pinUpdated', {
            pageId: params.page_id as string,
            commentId: params.comment_id as string,
            pinned: params.pinned as boolean,
            pinned_at: params.pinned_at as number | null,
          });
          break;

        case 'notification':
          this.emit('notification', {
            type: params.type as string,
            commentId: params.comment_id as string,
            fromUser: params.from_user as WsUser,
          });
          break;
      }
    } catch {
      // Ignore invalid messages
    }
  }

  private handlePresence(params: Record<string, unknown>): void {
    const users = params.users as WsUser[];
    this.setState({ presenceCount: users.length });
    this.emit('presenceList', {
      pageId: params.page_id as string,
      users,
    });
  }

  private handleUserJoined(params: Record<string, unknown>): void {
    this.setState({ presenceCount: this.state.presenceCount + 1 });
    this.emit('userJoined', {
      pageId: params.page_id as string,
      user: params.user as WsUser,
    });
  }

  private handleUserLeft(params: Record<string, unknown>): void {
    this.setState({ presenceCount: Math.max(0, this.state.presenceCount - 1) });
    this.emit('userLeft', {
      pageId: params.page_id as string,
      userId: params.user_id as string,
    });
  }

  private handleTyping(params: Record<string, unknown>): void {
    const user = params.user as WsUser;
    const pageId = params.page_id as string;
    const replyTo = params.reply_to as string | undefined;
    const timeout = this.config.typingTimeout ?? 3000;
    // Use null for root-level typing (no replyTo means typing at page level)
    const commentKey = replyTo ?? null;
    // Unique timer key includes the comment context
    const timerKey = `${user.id}:${commentKey ?? 'root'}`;

    // Emit event
    this.emit('userTyping', { pageId, user, replyTo });

    // Clear any existing timer for this user+comment
    const existingTimer = this.typingTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const typingUser = { userId: user.id, userName: user.name };

    // Check if user already in page-level list
    const existsInPageList = this.state.typingUsers.some((u) => u.userId === user.id);

    // Update typingByComment map
    const newTypingByComment = new Map(this.state.typingByComment);
    const currentList = newTypingByComment.get(commentKey) || [];
    const existsInCommentList = currentList.some((u) => u.userId === user.id);

    if (!existsInCommentList) {
      newTypingByComment.set(commentKey, [...currentList, typingUser]);
    }

    // Update state
    this.setState({
      typingUsers: existsInPageList ? this.state.typingUsers : [...this.state.typingUsers, typingUser],
      typingByComment: newTypingByComment,
    });

    // Set timer to remove user after timeout
    const timer = setTimeout(() => {
      this.typingTimers.delete(timerKey);

      // Remove from typingByComment
      const updatedMap = new Map(this.state.typingByComment);
      const list = updatedMap.get(commentKey) || [];
      const filtered = list.filter((u) => u.userId !== user.id);
      if (filtered.length === 0) {
        updatedMap.delete(commentKey);
      } else {
        updatedMap.set(commentKey, filtered);
      }

      // Remove from page-level typingUsers
      this.setState({
        typingUsers: this.state.typingUsers.filter((u) => u.userId !== user.id),
        typingByComment: updatedMap,
      });
    }, timeout);

    this.typingTimers.set(timerKey, timer);
  }
}
