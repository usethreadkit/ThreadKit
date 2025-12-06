import { writable, type Readable } from 'svelte/store';
import {
  WebSocketClient,
  type Comment,
  type WebSocketState,
} from '@threadkit/core';

export interface WebSocketStoreConfig {
  siteId: string;
  url: string;
  apiUrl: string;
  enabled?: boolean;
}

export interface WebSocketStore extends Readable<WebSocketState> {
  sendTyping: () => void;
  connect: () => void;
  disconnect: () => void;
  destroy: () => void;
  /** Subscribe to new comments */
  onCommentAdded: (callback: (comment: Comment) => void) => () => void;
  /** Subscribe to deleted comments */
  onCommentDeleted: (callback: (commentId: string) => void) => () => void;
  /** Subscribe to edited comments */
  onCommentEdited: (callback: (commentId: string, text: string) => void) => () => void;
  /** Subscribe to pinned comments */
  onCommentPinned: (callback: (commentId: string, pinned: boolean) => void) => () => void;
  /** Subscribe to banned users */
  onUserBanned: (callback: (userId: string) => void) => () => void;
}

/**
 * Create a Svelte store for WebSocket real-time updates.
 * Thin wrapper around @threadkit/core WebSocketClient.
 */
export function createWebSocketStore(config: WebSocketStoreConfig): WebSocketStore {
  const core = new WebSocketClient({
    ...config,
    getToken: () => {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('threadkit_token');
      }
      return null;
    },
  });

  const { subscribe, set } = writable<WebSocketState>(core.getState());

  // Subscribe to core state changes
  core.on('stateChange', set);

  // Connect if enabled (default true)
  if (config.enabled !== false) {
    core.connect();
  }

  return {
    subscribe,
    sendTyping: () => core.sendTyping(),
    connect: () => core.connect(),
    disconnect: () => core.disconnect(),
    destroy: () => core.destroy(),
    onCommentAdded: (callback) => core.on('commentAdded', callback),
    onCommentDeleted: (callback) =>
      core.on('commentDeleted', ({ commentId }) => callback(commentId)),
    onCommentEdited: (callback) =>
      core.on('commentEdited', ({ commentId, text }) => callback(commentId, text)),
    onCommentPinned: (callback) =>
      core.on('commentPinned', ({ commentId, pinned }) => callback(commentId, pinned)),
    onUserBanned: (callback) =>
      core.on('userBanned', ({ userId }) => callback(userId)),
  };
}

// Re-export types
export type { WebSocketState, Comment };
