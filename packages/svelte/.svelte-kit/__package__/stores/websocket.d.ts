import { type Readable } from 'svelte/store';
import { type Comment, type WebSocketState } from '@threadkit/core';
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
export declare function createWebSocketStore(config: WebSocketStoreConfig): WebSocketStore;
export type { WebSocketState, Comment };
//# sourceMappingURL=websocket.d.ts.map