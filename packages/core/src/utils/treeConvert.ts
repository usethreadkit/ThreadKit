/**
 * Conversion utilities between the API's compact TreeComment format
 * and the client's Comment format.
 *
 * TreeComment uses single-letter keys for bandwidth efficiency:
 * - i: id
 * - a: author_id
 * - n: name (author name)
 * - p: avatar (picture)
 * - k: karma
 * - t: text (markdown)
 * - h: html
 * - u: upvotes (count)
 * - d: downvotes (count)
 * - x: created_at (unix timestamp)
 * - m: modified_at (unix timestamp)
 * - r: replies (nested comments)
 * - s: status (only if not approved)
 */

import type { Comment } from '../types';
import type { TreeComment, PageTree } from '../api.types';

/** Map of comment ID to vote direction */
export type VotesMap = Record<string, 'up' | 'down'>;

/**
 * Convert a TreeComment from the API to our internal Comment format.
 * @param tc The TreeComment from the API
 * @param parentId The parent comment ID (for nested comments)
 * @param votes Optional map of user's votes to apply
 */
export function treeCommentToComment(tc: TreeComment, parentId?: string, votes?: VotesMap): Comment {
  // Use 'q' field if present (WebSocket messages), otherwise use passed parentId (nested tree)
  const resolvedParentId = tc.q ?? parentId;

  // Debug logging for WebSocket threading
  if (tc.q) {
    console.log('[treeConvert] WebSocket comment with parent_id:', {
      commentId: tc.i,
      parentId: tc.q,
      text: tc.t.substring(0, 50)
    });
  }

  return {
    id: tc.i,
    userId: tc.a,
    userName: tc.n,
    userAvatar: tc.p ?? undefined,
    text: tc.t,
    html: tc.h,
    timestamp: tc.x * 1000, // Convert seconds to milliseconds
    upvotes: tc.u,
    downvotes: tc.d,
    userVote: votes?.[tc.i] ?? null,
    parentId: resolvedParentId,
    children: (tc.r ?? []).map((child) => treeCommentToComment(child, tc.i, votes)),
    edited: tc.m !== tc.x, // If modified_at differs from created_at, it was edited
    karma: tc.k,
    status: tc.s ?? 'approved',
  };
}

/**
 * Convert a PageTree response to an array of Comments.
 * @param tree The PageTree from the API
 * @param votes Optional map of user's votes to apply
 */
export function pageTreeToComments(tree: PageTree, votes?: VotesMap): Comment[] {
  return (tree.c ?? []).map((tc) => treeCommentToComment(tc, undefined, votes));
}

/**
 * Convert our Comment format to TreeComment for API requests.
 * Note: This is mainly for creating new comments, not for full conversion.
 */
export function commentToTreeComment(comment: Comment): TreeComment {
  return {
    i: comment.id,
    a: comment.userId,
    n: comment.userName,
    p: comment.userAvatar ?? null,
    k: comment.karma ?? 0,
    t: comment.text,
    h: comment.html ?? comment.text, // Fallback to text if no HTML
    u: comment.upvotes,
    d: comment.downvotes,
    x: Math.floor(comment.timestamp / 1000), // Convert ms to seconds
    m: Math.floor(comment.timestamp / 1000), // Use same as created for new comments
    r: comment.children.map(commentToTreeComment),
    s: comment.status === 'approved' ? undefined : comment.status,
  };
}

/**
 * Get the path (array of IDs) from root to a comment.
 * Used for API operations that require the comment path.
 */
export function getCommentPath(comments: Comment[], targetId: string): string[] | null {
  for (const comment of comments) {
    if (comment.id === targetId) {
      return [comment.id];
    }
    const childPath = getCommentPath(comment.children, targetId);
    if (childPath) {
      return [comment.id, ...childPath];
    }
  }
  return null;
}

/**
 * Check if a comment is from a deleted user.
 */
export function isDeletedUser(userId: string): boolean {
  return userId === 'd0000000-0000-0000-0000-000000000000';
}

/**
 * Check if a comment is from an anonymous user.
 */
export function isAnonymousUser(userId: string): boolean {
  return userId === 'a0000000-0000-0000-0000-000000000000';
}
