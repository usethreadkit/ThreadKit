import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type Comment, type WebSocketState, type WsUser, type TypingUser } from '@threadkit/core';

interface UseWebSocketOptions {
  /** WebSocket server URL */
  wsUrl: string;
  /** API key for authentication */
  projectId: string;
  /** Page ID to subscribe to */
  pageId: string;
  /** Whether WebSocket is enabled */
  enabled?: boolean;
  /** Callback when a new comment is received */
  onCommentAdded?: (pageId: string, comment: Comment) => void;
  /** Callback when a comment is deleted */
  onCommentDeleted?: (pageId: string, commentId: string) => void;
  /** Callback when a comment is edited */
  onCommentEdited?: (pageId: string, commentId: string, text: string, textHtml: string) => void;
  /** Callback when a comment's votes are updated */
  onVoteUpdated?: (pageId: string, commentId: string, upvotes: number, downvotes: number) => void;
  /** Callback when presence list is received */
  onPresenceList?: (pageId: string, users: WsUser[]) => void;
  /** Callback when a user joins */
  onUserJoined?: (pageId: string, user: WsUser) => void;
  /** Callback when a user leaves */
  onUserLeft?: (pageId: string, userId: string) => void;
  /** Callback when a user is typing */
  onTyping?: (pageId: string, user: WsUser, replyTo?: string) => void;
  /** Callback when a notification is received */
  onNotification?: (type: string, commentId: string, fromUser: WsUser) => void;
  /** Callback when an error occurs */
  onError?: (code: string, message: string) => void;
  /**
   * @deprecated Use wsUrl instead
   */
  apiUrl?: string;
  /**
   * @deprecated Use pageId instead
   */
  url?: string;
  /**
   * @deprecated siteId is no longer needed
   */
  siteId?: string;
}

interface UseWebSocketReturn {
  /** Whether connected to WebSocket server */
  connected: boolean;
  /** Number of users currently viewing the page */
  presenceCount: number;
  /** List of users currently typing (page-level, for backwards compatibility) */
  typingUsers: TypingUser[];
  /** Users typing organized by comment ID (null key = root-level typing) */
  typingByComment: Map<string | null, TypingUser[]>;
  /** Send a typing indicator */
  sendTyping: (replyTo?: string) => void;
  /** Send a ping to keep connection alive */
  sendPing: () => void;
}

/**
 * React hook for WebSocket real-time updates.
 * Thin wrapper around @threadkit/core WebSocketClient.
 */
export function useWebSocket({
  wsUrl,
  projectId,
  pageId,
  enabled = true,
  onCommentAdded,
  onCommentDeleted,
  onCommentEdited,
  onVoteUpdated,
  onPresenceList,
  onUserJoined,
  onUserLeft,
  onTyping,
  onNotification,
  onError,
  // Deprecated props for backwards compatibility
  apiUrl,
  url,
}: UseWebSocketOptions): UseWebSocketReturn {
  // Create client once using ref
  const clientRef = useRef<WebSocketClient | null>(null);

  // Compute effective wsUrl (support deprecated apiUrl)
  const effectiveWsUrl = wsUrl || apiUrl?.replace(/^http/, 'ws') || '';
  const effectivePageId = pageId || url || '';

  if (!clientRef.current && effectiveWsUrl && projectId && effectivePageId) {
    clientRef.current = new WebSocketClient({
      wsUrl: effectiveWsUrl,
      projectId,
      pageId: effectivePageId,
      getToken: () => localStorage.getItem('threadkit_token'),
    });
  }

  const client = clientRef.current;

  // Subscribe to state changes
  const [state, setState] = useState<WebSocketState>(
    client?.getState() ?? { connected: false, presenceCount: 0, typingUsers: [], typingByComment: new Map() }
  );

  // Store callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef({
    onCommentAdded,
    onCommentDeleted,
    onCommentEdited,
    onVoteUpdated,
    onPresenceList,
    onUserJoined,
    onUserLeft,
    onTyping,
    onNotification,
    onError,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onCommentAdded,
      onCommentDeleted,
      onCommentEdited,
      onVoteUpdated,
      onPresenceList,
      onUserJoined,
      onUserLeft,
      onTyping,
      onNotification,
      onError,
    };
  });

  useEffect(() => {
    if (!enabled || !client) {
      client?.disconnect();
      return;
    }

    // Subscribe to state changes
    const unsubState = client.on('stateChange', setState);

    // Subscribe to events and forward to callbacks
    const unsubAdded = client.on('commentAdded', ({ pageId, comment }) => {
      callbacksRef.current.onCommentAdded?.(pageId, comment);
    });

    const unsubDeleted = client.on('commentDeleted', ({ pageId, commentId }) => {
      callbacksRef.current.onCommentDeleted?.(pageId, commentId);
    });

    const unsubEdited = client.on('commentEdited', ({ pageId, commentId, text, textHtml }) => {
      callbacksRef.current.onCommentEdited?.(pageId, commentId, text, textHtml);
    });

    const unsubVote = client.on('voteUpdated', ({ pageId, commentId, upvotes, downvotes }) => {
      callbacksRef.current.onVoteUpdated?.(pageId, commentId, upvotes, downvotes);
    });

    const unsubPresence = client.on('presenceList', ({ pageId, users }) => {
      callbacksRef.current.onPresenceList?.(pageId, users);
    });

    const unsubJoined = client.on('userJoined', ({ pageId, user }) => {
      callbacksRef.current.onUserJoined?.(pageId, user);
    });

    const unsubLeft = client.on('userLeft', ({ pageId, userId }) => {
      callbacksRef.current.onUserLeft?.(pageId, userId);
    });

    const unsubTyping = client.on('userTyping', ({ pageId, user, replyTo }) => {
      callbacksRef.current.onTyping?.(pageId, user, replyTo);
    });

    const unsubNotification = client.on('notification', ({ type, commentId, fromUser }) => {
      callbacksRef.current.onNotification?.(type, commentId, fromUser);
    });

    const unsubError = client.on('error', ({ code, message }) => {
      callbacksRef.current.onError?.(code, message);
    });

    // Connect
    client.connect();

    return () => {
      unsubState();
      unsubAdded();
      unsubDeleted();
      unsubEdited();
      unsubVote();
      unsubPresence();
      unsubJoined();
      unsubLeft();
      unsubTyping();
      unsubNotification();
      unsubError();
    };
  }, [client, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.destroy();
    };
  }, []);

  const sendTyping = useCallback(
    (replyTo?: string) => {
      client?.sendTyping(replyTo);
    },
    [client]
  );

  const sendPing = useCallback(() => {
    client?.sendPing();
  }, [client]);

  return {
    connected: state.connected,
    presenceCount: state.presenceCount,
    typingUsers: state.typingUsers,
    typingByComment: state.typingByComment,
    sendTyping,
    sendPing,
  };
}
