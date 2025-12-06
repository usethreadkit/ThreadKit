import { type Readable } from 'svelte/store';
import { type Comment, type SortBy, type CommentStoreState, type ThreadKitError } from '@threadkit/core';
export interface CommentsStoreConfig {
    siteId: string;
    url: string;
    apiUrl: string;
    apiKey?: string;
    sortBy?: SortBy;
    /** Pre-fetched comments for SSR */
    initialComments?: Comment[];
}
export interface CommentsStore extends Readable<CommentStoreState> {
    post: (text: string, parentId?: string) => Promise<Comment>;
    delete: (commentId: string) => Promise<void>;
    vote: (commentId: string, type: 'up' | 'down') => Promise<void>;
    refresh: () => Promise<void>;
    setSortBy: (sortBy: SortBy) => void;
    addComment: (comment: Comment) => void;
    removeComment: (commentId: string) => void;
    updateComment: (commentId: string, updates: Partial<Comment>) => void;
    destroy: () => void;
}
/**
 * Create a Svelte store for comment management.
 * Thin wrapper around @threadkit/core CommentStore.
 */
export declare function createCommentsStore(config: CommentsStoreConfig): CommentsStore;
export type { Comment, SortBy, CommentStoreState, ThreadKitError };
//# sourceMappingURL=comments.d.ts.map