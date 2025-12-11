import { useState, useEffect, useRef } from 'react';
import { CommentStore, type Comment, type SortBy, type CommentStoreState, iperf, PerformanceMonitor } from '@threadkit/core';
import { updateDevTools } from '../devtools';

// Re-export for backwards compatibility
export { ThreadKitError, type ThreadKitErrorCode } from '@threadkit/core';

interface UseCommentsOptions {
  url: string;
  apiUrl: string;
  projectId: string;
  sortBy: SortBy;
  /** Pre-fetched comments for SSR */
  initialComments?: Comment[];
  /** Function to get additional headers before posting (e.g., Turnstile token) */
  getPostHeaders?: () => Promise<Record<string, string>>;
  /** Enable performance monitoring */
  debug?: boolean;
  /**
   * @deprecated siteId is no longer needed - site is derived from API key
   */
  siteId?: string;
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: Error | null;
  /** Page ID from the server (for WebSocket subscription) */
  pageId: string | null;
  /** List of pinned comment IDs with their pinned timestamps */
  pinnedIds: Array<[string, number]>;
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
  projectId,
  sortBy,
  initialComments,
  getPostHeaders,
  debug = false,
}: UseCommentsOptions): UseCommentsReturn {
  // Create store once using ref (not recreated on re-renders)
  const storeRef = useRef<CommentStore | null>(null);
  const perfMonitorRef = useRef<PerformanceMonitor | null>(null);

  if (!storeRef.current) {
    const store = new CommentStore({
      apiUrl,
      url,
      projectId,
      sortBy,
      initialComments,
      getToken: () => localStorage.getItem('threadkit_token'),
      getPostHeaders,
    });

    // Auto-instrument store methods if debug is enabled
    if (debug) {
      perfMonitorRef.current = new PerformanceMonitor({
        enabled: true,
        onMetric: (metric) => {
          // Update DevTools with performance metrics
          if (perfMonitorRef.current) {
            updateDevTools({
              performance: {
                metrics: perfMonitorRef.current.getMetrics(),
                summary: perfMonitorRef.current.getSummary(),
              },
            });
          }
        },
      });

      storeRef.current = iperf(store, {
        methods: ['fetch', 'post', 'delete', 'edit', 'vote'],
        monitor: perfMonitorRef.current,
        prefix: 'CommentStore',
      });
    } else {
      storeRef.current = store;
    }
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
    pageId: state.pageId,
    pinnedIds: state.pinnedIds,
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
