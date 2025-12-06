import { writable } from 'svelte/store';
import { CommentStore, } from '@threadkit/core';
/**
 * Create a Svelte store for comment management.
 * Thin wrapper around @threadkit/core CommentStore.
 */
export function createCommentsStore(config) {
    const core = new CommentStore({
        ...config,
        sortBy: config.sortBy || 'votes',
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
    // Initial fetch if no SSR data
    if (!config.initialComments || config.initialComments.length === 0) {
        core.fetch();
    }
    return {
        subscribe,
        post: core.post.bind(core),
        delete: core.delete.bind(core),
        vote: core.vote.bind(core),
        refresh: core.fetch.bind(core),
        setSortBy: core.setSortBy.bind(core),
        addComment: core.addComment.bind(core),
        removeComment: core.removeComment.bind(core),
        updateComment: core.updateComment.bind(core),
        destroy: () => core.destroy(),
    };
}
