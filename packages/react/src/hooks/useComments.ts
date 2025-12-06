import { useState, useEffect, useCallback } from 'react';
import type { Comment, SortBy } from '../types';

/** Error codes returned by the ThreadKit API */
export type ThreadKitErrorCode =
  | 'SITE_NOT_FOUND'
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

/** Extended error class with additional context */
export class ThreadKitError extends Error {
  code: ThreadKitErrorCode;
  status?: number;

  constructor(message: string, code: ThreadKitErrorCode, status?: number) {
    super(message);
    this.name = 'ThreadKitError';
    this.code = code;
    this.status = status;
  }
}

interface UseCommentsOptions {
  siteId: string;
  url: string;
  apiUrl: string;
  sortBy: SortBy;
  /** Pre-fetched comments for SSR */
  initialComments?: Comment[];
}

interface UseCommentsReturn {
  comments: Comment[];
  loading: boolean;
  error: Error | null;
  postComment: (text: string, parentId?: string) => Promise<Comment>;
  deleteComment: (commentId: string) => Promise<void>;
  vote: (commentId: string, voteType: 'up' | 'down') => Promise<void>;
  refresh: () => Promise<void>;
  addComment: (comment: Comment) => void;
  removeComment: (commentId: string) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
}

function sortComments(comments: Comment[], sortBy: SortBy): Comment[] {
  const sorted = [...comments];

  switch (sortBy) {
    case 'votes':
      sorted.sort((a, b) => {
        const scoreA = a.upvotes.length - a.downvotes.length;
        const scoreB = b.upvotes.length - b.downvotes.length;
        return scoreB - scoreA;
      });
      break;
    case 'newest':
      sorted.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.timestamp - b.timestamp);
      break;
  }

  // Recursively sort children
  return sorted.map((comment) => ({
    ...comment,
    children: sortComments(comment.children, sortBy),
  }));
}

function buildCommentTree(comments: Comment[]): Comment[] {
  // Check if data is already nested (has children populated)
  const hasNestedChildren = comments.some(c => c.children && c.children.length > 0);
  if (hasNestedChildren) {
    // Data is already in tree format, just return root-level comments
    return comments.filter(c => !c.parentId);
  }

  // Flat data - build tree from parentId references
  const commentMap = new Map<string, Comment>();
  const roots: Comment[] = [];

  // First pass: create a map of all comments
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // Second pass: build the tree
  comments.forEach((comment) => {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function useComments({
  siteId,
  url,
  apiUrl,
  sortBy,
  initialComments,
}: UseCommentsOptions): UseCommentsReturn {
  // Use initial comments if provided (SSR), otherwise start empty
  const [comments, setComments] = useState<Comment[]>(() => {
    if (initialComments && initialComments.length > 0) {
      const tree = buildCommentTree(initialComments);
      return sortComments(tree, sortBy);
    }
    return [];
  });
  const [loading, setLoading] = useState(!initialComments);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${apiUrl}/sites/${siteId}/comments?url=${encodeURIComponent(url)}`
      );

      if (!response.ok) {
        // Try to parse error response for more details
        let errorCode: ThreadKitErrorCode = 'UNKNOWN';
        let errorMessage = `Failed to fetch comments: ${response.statusText}`;

        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          // Map HTTP status codes to error codes
          if (response.status === 404) {
            errorCode = 'SITE_NOT_FOUND';
            errorMessage = errorData.error || 'Site not found. Please check your siteId configuration.';
          } else if (response.status === 401 || response.status === 403) {
            errorCode = errorData.error?.includes('API key') ? 'INVALID_API_KEY' : 'UNAUTHORIZED';
          } else if (response.status === 429) {
            errorCode = 'RATE_LIMITED';
          }
        } catch {
          // Could not parse JSON error response
        }

        throw new ThreadKitError(errorMessage, errorCode, response.status);
      }

      const data = await response.json();
      const tree = buildCommentTree(data.comments || []);
      setComments(sortComments(tree, sortBy));
    } catch (err) {
      if (err instanceof ThreadKitError) {
        setError(err);
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch comments'));
      }
    } finally {
      setLoading(false);
    }
  }, [siteId, url, apiUrl, sortBy]);

  useEffect(() => {
    // Skip initial fetch if we have SSR data
    if (initialComments && initialComments.length > 0) {
      return;
    }
    fetchComments();
  }, [fetchComments, initialComments]);

  const postComment = useCallback(
    async (text: string, parentId?: string): Promise<Comment> => {
      const token = localStorage.getItem('threadkit_token');

      const response = await fetch(`${apiUrl}/sites/${siteId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url,
          text,
          parentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to post comment: ${response.statusText}`);
      }

      const comment = await response.json();
      return comment;
    },
    [siteId, url, apiUrl]
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      const token = localStorage.getItem('threadkit_token');

      const response = await fetch(`${apiUrl}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete comment: ${response.statusText}`);
      }
    },
    [apiUrl]
  );

  const vote = useCallback(
    async (commentId: string, voteType: 'up' | 'down'): Promise<void> => {
      const token = localStorage.getItem('threadkit_token');

      const response = await fetch(`${apiUrl}/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ type: voteType }),
      });

      if (!response.ok) {
        throw new Error(`Failed to vote: ${response.statusText}`);
      }
    },
    [apiUrl]
  );

  const addComment = useCallback(
    (comment: Comment) => {
      setComments((prev) => {
        if (comment.parentId) {
          // Add as child to parent
          const addToParent = (comments: Comment[]): Comment[] => {
            return comments.map((c) => {
              if (c.id === comment.parentId) {
                return { ...c, children: [...c.children, comment] };
              }
              return { ...c, children: addToParent(c.children) };
            });
          };
          return sortComments(addToParent(prev), sortBy);
        }
        return sortComments([...prev, { ...comment, children: [] }], sortBy);
      });
    },
    [sortBy]
  );

  const removeComment = useCallback((commentId: string) => {
    setComments((prev) => {
      const remove = (comments: Comment[]): Comment[] => {
        return comments
          .filter((c) => c.id !== commentId)
          .map((c) => ({ ...c, children: remove(c.children) }));
      };
      return remove(prev);
    });
  }, []);

  const updateComment = useCallback(
    (commentId: string, updates: Partial<Comment>) => {
      setComments((prev) => {
        const update = (comments: Comment[]): Comment[] => {
          return comments.map((c) => {
            if (c.id === commentId) {
              return { ...c, ...updates };
            }
            return { ...c, children: update(c.children) };
          });
        };
        return sortComments(update(prev), sortBy);
      });
    },
    [sortBy]
  );

  return {
    comments,
    loading,
    error,
    postComment,
    deleteComment,
    vote,
    refresh: fetchComments,
    addComment,
    removeComment,
    updateComment,
  };
}
