import { writable, type Readable } from 'svelte/store';
import {
  CommentStore,
  type Comment,
  type SortBy,
  type CommentStoreState,
  type ThreadKitError,
  type VoteResponse,
} from '@threadkit/core';

export interface CommentsStoreConfig {
  siteId: string;
  url: string;
  apiUrl: string;
  projectId: string;
  sortBy?: SortBy;
  /** Pre-fetched comments for SSR */
  initialComments?: Comment[];
}

export interface CommentsStore extends Readable<CommentStoreState> {
  post: (text: string, parentId?: string) => Promise<Comment>;
  delete: (commentId: string) => Promise<void>;
  vote: (commentId: string, type: 'up' | 'down') => Promise<VoteResponse>;
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
export function createCommentsStore(config: CommentsStoreConfig): CommentsStore {
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

  const { subscribe, set } = writable<CommentStoreState>(core.getState());

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

// Re-export types
export type { Comment, SortBy, CommentStoreState, ThreadKitError };
