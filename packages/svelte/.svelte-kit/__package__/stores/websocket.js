import { writable } from 'svelte/store';
import { WebSocketClient, } from '@threadkit/core';
/**
 * Create a Svelte store for WebSocket real-time updates.
 * Thin wrapper around @threadkit/core WebSocketClient.
 */
export function createWebSocketStore(config) {
    const core = new WebSocketClient({
        ...config,
        getToken: () => {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem('threadkit_token');
            }
            return null;
        },
    });
    const { subscribe, set } = writable(core.getState());
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
        onCommentDeleted: (callback) => core.on('commentDeleted', ({ commentId }) => callback(commentId)),
        onCommentEdited: (callback) => core.on('commentEdited', ({ commentId, text }) => callback(commentId, text)),
        onCommentPinned: (callback) => core.on('commentPinned', ({ commentId, pinned }) => callback(commentId, pinned)),
        onUserBanned: (callback) => core.on('userBanned', ({ userId }) => callback(userId)),
    };
}
