import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient, type Comment, type WebSocketState } from '@threadkit/core';

interface UseWebSocketOptions {
  siteId: string;
  url: string;
  apiUrl: string;
  enabled?: boolean;
  onCommentAdded?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
  onCommentEdited?: (commentId: string, text: string) => void;
  onCommentPinned?: (commentId: string, pinned: boolean) => void;
  onUserBanned?: (userId: string) => void;
  onTyping?: (userId: string, userName: string) => void;
  onPresenceUpdate?: (count: number) => void;
}

interface UseWebSocketReturn {
  connected: boolean;
  presenceCount: number;
  typingUsers: Array<{ userId: string; userName: string }>;
  sendTyping: () => void;
}

/**
 * React hook for WebSocket real-time updates.
 * Thin wrapper around @threadkit/core WebSocketClient.
 */
export function useWebSocket({
  siteId,
  url,
  apiUrl,
  enabled = true,
  onCommentAdded,
  onCommentDeleted,
  onCommentEdited,
  onCommentPinned,
  onUserBanned,
  onTyping,
  onPresenceUpdate,
}: UseWebSocketOptions): UseWebSocketReturn {
  // Create client once using ref
  const clientRef = useRef<WebSocketClient | null>(null);

  if (!clientRef.current) {
    clientRef.current = new WebSocketClient({
      apiUrl,
      siteId,
      url,
      getToken: () => localStorage.getItem('threadkit_token'),
    });
  }

  const client = clientRef.current;

  // Subscribe to state changes
  const [state, setState] = useState<WebSocketState>(client.getState());

  // Store callbacks in refs to avoid reconnection on callback changes
  const callbacksRef = useRef({
    onCommentAdded,
    onCommentDeleted,
    onCommentEdited,
    onCommentPinned,
    onUserBanned,
    onTyping,
    onPresenceUpdate,
  });

  // Update refs when callbacks change
  useEffect(() => {
    callbacksRef.current = {
      onCommentAdded,
      onCommentDeleted,
      onCommentEdited,
      onCommentPinned,
      onUserBanned,
      onTyping,
      onPresenceUpdate,
    };
  });

  useEffect(() => {
    if (!enabled) {
      client.disconnect();
      return;
    }

    // Subscribe to state changes
    const unsubState = client.on('stateChange', setState);

    // Subscribe to events and forward to callbacks
    const unsubAdded = client.on('commentAdded', (comment) => {
      callbacksRef.current.onCommentAdded?.(comment);
    });

    const unsubDeleted = client.on('commentDeleted', ({ commentId }) => {
      callbacksRef.current.onCommentDeleted?.(commentId);
    });

    const unsubEdited = client.on('commentEdited', ({ commentId, text }) => {
      callbacksRef.current.onCommentEdited?.(commentId, text);
    });

    const unsubPinned = client.on('commentPinned', ({ commentId, pinned }) => {
      callbacksRef.current.onCommentPinned?.(commentId, pinned);
    });

    const unsubBanned = client.on('userBanned', ({ userId }) => {
      callbacksRef.current.onUserBanned?.(userId);
    });

    // Connect
    client.connect();

    return () => {
      unsubState();
      unsubAdded();
      unsubDeleted();
      unsubEdited();
      unsubPinned();
      unsubBanned();
    };
  }, [client, enabled]);

  // Forward typing events (includes both state update and callback)
  useEffect(() => {
    // The state already includes typingUsers, so we just need to call the callback
    if (onTyping && state.typingUsers.length > 0) {
      const lastUser = state.typingUsers[state.typingUsers.length - 1];
      onTyping(lastUser.userId, lastUser.userName);
    }
  }, [state.typingUsers, onTyping]);

  // Forward presence updates
  useEffect(() => {
    onPresenceUpdate?.(state.presenceCount);
  }, [state.presenceCount, onPresenceUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.destroy();
    };
  }, []);

  const sendTyping = useCallback(() => {
    client.sendTyping();
  }, [client]);

  return {
    connected: state.connected,
    presenceCount: state.presenceCount,
    typingUsers: state.typingUsers,
    sendTyping,
  };
}
