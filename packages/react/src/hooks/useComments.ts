import { useState, useEffect, useRef } from 'react';
import { CommentStore, type Comment, type SortBy, type CommentStoreState } from '@threadkit/core';

// Re-export for backwards compatibility
export { ThreadKitError, type ThreadKitErrorCode } from '@threadkit/core';

interface UseCommentsOptions {
  url: string;
  apiUrl: string;
  apiKey: string;
  sortBy: SortBy;
  /** Pre-fetched comments for SSR */
  initialComments?: Comment[];
  /** Function to get additional headers before posting (e.g., Turnstile token) */
  getPostHeaders?: () => Promise<Record<string, string>>;
  /**
   * @deprecated siteId is no longer needed - site is derived from API key
   */
  siteId?: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: Error | null;
  postComment: (text: string, parentId?: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  editComment: (commentId: string, newText: string) => Promise<void>;
  vote: (commentId: string, voteType: 'up' | 'down') => Promise<{ upvotes: number; downvotes: number; user_vote?: 'up' | 'down' | null }>;
  refresh: () => Promise<void>;
  addComment: (comment: Comment) => void;
  removeComment: (commentId: string) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
}

/**
 * React hook for comment management.
 * Thin wrapper around @threadkit/core CommentStore.
 */
export function useComments({
  url,
  apiUrl,
  apiKey,
  sortBy,
  initialComments,
  getPostHeaders,
}: UseCommentsOptions): UseCommentsReturn {
  // Create store once using ref (not recreated on re-renders)
  const storeRef = useRef<CommentStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = new CommentStore({
      apiUrl,
      url,
      apiKey,
      sortBy,
      initialComments,
      getToken: () => localStorage.getItem('threadkit_token'),
      getPostHeaders,
    });
  }

  const store = storeRef.current;

  // Subscribe to state changes
  const [state, setState] = useState<CommentStoreState>(store.getState());

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = store.on('stateChange', setState);

    // Initial fetch if no SSR data
    if (!initialComments || initialComments.length === 0) {
      store.fetch();
    }

    return () => {
      unsubscribe();
    };
  }, [store, initialComments]);

  // Update sort when it changes
  useEffect(() => {
    if (store.getSortBy() !== sortBy) {
      store.setSortBy(sortBy);
    }
  }, [store, sortBy]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      storeRef.current?.destroy();
    };
  }, []);

  return {
    comments: state.comments,
    loading: state.loading,
    error: state.error,
    postComment: store.post.bind(store),
    deleteComment: store.delete.bind(store),
    editComment: store.edit.bind(store),
    vote: store.vote.bind(store),
    refresh: store.fetch.bind(store),
    addComment: store.addComment.bind(store),
    removeComment: store.removeComment.bind(store),
    updateComment: store.updateComment.bind(store),
  };
}
