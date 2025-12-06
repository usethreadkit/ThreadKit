import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage, Comment } from '../types';

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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [presenceCount, setPresenceCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);

  const wsUrl = apiUrl.replace(/^http/, 'ws');

  const connect = useCallback(() => {
    if (!enabled) return;

    try {
      const token = localStorage.getItem('threadkit_token');
      const wsUrlWithParams = `${wsUrl}/ws/${siteId}?url=${encodeURIComponent(url)}${token ? `&token=${token}` : ''}`;

      wsRef.current = new WebSocket(wsUrlWithParams);

      wsRef.current.onopen = () => {
        setConnected(true);
      };

      wsRef.current.onclose = () => {
        setConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'comment_added':
              onCommentAdded?.(message.payload as Comment);
              break;
            case 'comment_deleted':
              onCommentDeleted?.((message.payload as { commentId: string }).commentId);
              break;
            case 'comment_edited': {
              const edited = message.payload as { commentId: string; text: string };
              onCommentEdited?.(edited.commentId, edited.text);
              break;
            }
            case 'comment_pinned': {
              const pinned = message.payload as { commentId: string; pinned: boolean };
              onCommentPinned?.(pinned.commentId, pinned.pinned);
              break;
            }
            case 'user_banned':
              onUserBanned?.((message.payload as { userId: string }).userId);
              break;
            case 'typing': {
              const typing = message.payload as { userId: string; userName: string };
              onTyping?.(typing.userId, typing.userName);
              setTypingUsers((prev) => {
                const exists = prev.some((u) => u.userId === typing.userId);
                if (!exists) {
                  // Remove after 3 seconds
                  setTimeout(() => {
                    setTypingUsers((p) => p.filter((u) => u.userId !== typing.userId));
                  }, 3000);
                  return [...prev, typing];
                }
                return prev;
              });
              break;
            }
            case 'presence': {
              const count = (message.payload as { count: number }).count;
              setPresenceCount(count);
              onPresenceUpdate?.(count);
              break;
            }
          }
        } catch {
          // Ignore invalid messages
        }
      };
    } catch {
      // WebSocket connection failed, will retry
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [
    enabled,
    wsUrl,
    siteId,
    url,
    onCommentAdded,
    onCommentDeleted,
    onCommentEdited,
    onCommentPinned,
    onUserBanned,
    onTyping,
    onPresenceUpdate,
  ]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  }, []);

  return {
    connected,
    presenceCount,
    typingUsers,
    sendTyping,
  };
}
