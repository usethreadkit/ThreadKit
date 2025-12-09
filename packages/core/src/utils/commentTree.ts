import type { Comment, SortBy } from '../types';

/**
 * Sort comments by the specified criteria, recursively sorting children.
 */
export function sortComments(comments: Comment[], sortBy: SortBy): Comment[] {
  const sorted = [...comments];

  switch (sortBy) {
    case 'votes':
      sorted.sort((a, b) => {
        const scoreA = a.upvotes - a.downvotes;
        const scoreB = b.upvotes - b.downvotes;
        return scoreB - scoreA;
      });
      break;
    case 'newest':
      sorted.sort((a, b) => b.timestamp - a.timestamp);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.timestamp - b.timestamp);
      break;
    case 'controversial':
      // Controversial = high total votes but close to 50/50 split
      sorted.sort((a, b) => {
        const totalA = a.upvotes + a.downvotes;
        const totalB = b.upvotes + b.downvotes;
        const ratioA = totalA > 0 ? Math.min(a.upvotes, a.downvotes) / totalA : 0;
        const ratioB = totalB > 0 ? Math.min(b.upvotes, b.downvotes) / totalB : 0;
        // Weight by total votes and closeness to 50/50
        const scoreA = totalA * ratioA;
        const scoreB = totalB * ratioB;
        return scoreB - scoreA;
      });
      break;
  }

  // Recursively sort children
  return sorted.map((comment) => ({
    ...comment,
    children: sortComments(comment.children, sortBy),
  }));
}

/**
 * Build a comment tree from a flat array of comments.
 * Handles both flat (parentId-based) and pre-nested formats.
 */
export function buildCommentTree(comments: Comment[]): Comment[] {
  // Check if data is already nested (has children populated)
  const hasNestedChildren = comments.some((c) => c.children && c.children.length > 0);
  if (hasNestedChildren) {
    // Data is already in tree format, just return root-level comments
    return comments.filter((c) => !c.parentId);
  }

  // Flat data - build tree from parentId references
  const commentMap = new Map<string, Comment>();
  const roots: Comment[] = [];

  // First pass: create a map of all comments with empty children arrays
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // Second pass: build the tree by attaching children to parents
  comments.forEach((comment) => {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // Parent not found, treat as root
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Find a comment by ID in a nested tree structure.
 */
export function findComment(comments: Comment[], id: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === id) {
      return comment;
    }
    const found = findComment(comment.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Add a comment to the tree, handling both root and reply cases.
 * @param sortBy - How to sort after insertion. Use 'newest' to always show at top (for user's own comments)
 */
export function addToTree(
  comments: Comment[],
  newComment: Comment,
  sortBy: SortBy
): Comment[] {
  // Check if comment already exists (prevent duplicates from WebSocket echo)
  const commentExists = (nodes: Comment[]): boolean => {
    for (const node of nodes) {
      if (node.id === newComment.id) return true;
      if (commentExists(node.children)) return true;
    }
    return false;
  };

  if (commentExists(comments)) {
    return comments; // Already exists, skip adding
  }

  if (newComment.parentId) {
    // Add as child to parent
    const addToParent = (nodes: Comment[]): Comment[] => {
      return nodes.map((c) => {
        if (c.id === newComment.parentId) {
          return { ...c, children: [...c.children, { ...newComment, children: [] }] };
        }
        return { ...c, children: addToParent(c.children) };
      });
    };
    return sortComments(addToParent(comments), sortBy);
  }
  // Add as root comment
  return sortComments([...comments, { ...newComment, children: [] }], sortBy);
}

/** Special user ID that indicates a deleted comment */
const DELETED_USER_ID = 'd0000000-0000-0000-0000-000000000000';

/**
 * Remove a comment from the tree by ID.
 * If the comment has children, it's marked as deleted instead of removed.
 */
export function removeFromTree(comments: Comment[], commentId: string): Comment[] {
  return comments
    .map((c) => {
      if (c.id === commentId) {
        // If this comment has children, mark it as deleted instead of removing
        if (c.children.length > 0) {
          return {
            ...c,
            text: '[deleted]',
            html: '<p>[deleted]</p>',
            userName: '[deleted]',
            userId: DELETED_USER_ID,
            userAvatar: undefined,
            status: 'deleted' as const,
          };
        }
        // No children, will be filtered out below
        return null;
      }
      // Recursively process children
      return { ...c, children: removeFromTree(c.children, commentId) };
    })
    .filter((c): c is Comment => c !== null);
}

/**
 * Update a comment in the tree by ID.
 */
export function updateInTree(
  comments: Comment[],
  commentId: string,
  updates: Partial<Comment>
): Comment[] {
  const update = (nodes: Comment[]): Comment[] => {
    return nodes.map((c) => {
      if (c.id === commentId) {
        return { ...c, ...updates };
      }
      return { ...c, children: update(c.children) };
    });
  };
  return update(comments);
}

/**
 * Count total comments in a tree (including children).
 */
export function countComments(comments: Comment[]): number {
  return comments.reduce(
    (count, comment) => count + 1 + countComments(comment.children),
    0
  );
}

/**
 * Flatten a comment tree into a single array.
 */
export function flattenTree(comments: Comment[]): Comment[] {
  const result: Comment[] = [];
  const traverse = (nodes: Comment[]) => {
    for (const node of nodes) {
      result.push(node);
      traverse(node.children);
    }
  };
  traverse(comments);
  return result;
}
