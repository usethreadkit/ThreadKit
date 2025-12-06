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
 * - v: upvoters (array of user IDs)
 * - w: downvoters (array of user IDs)
 * - r: replies (nested comments)
 * - s: status (only if not approved)
 */

import type { Comment } from '../types';
import type { TreeComment, PageTree } from '../api.types';

/**
 * Convert a TreeComment from the API to our internal Comment format.
 */
export function treeCommentToComment(tc: TreeComment, parentId?: string): Comment {
  return {
    id: tc.i,
    userId: tc.a,
    userName: tc.n,
    userAvatar: tc.p ?? undefined,
    text: tc.t,
    html: tc.h,
    timestamp: tc.x * 1000, // Convert seconds to milliseconds
    upvotes: tc.v ?? [],
    downvotes: tc.w ?? [],
    upvoteCount: tc.u,
    downvoteCount: tc.d,
    parentId,
    children: (tc.r ?? []).map((child) => treeCommentToComment(child, tc.i)),
    edited: tc.m !== tc.x, // If modified_at differs from created_at, it was edited
    karma: tc.k,
    status: tc.s ?? 'approved',
  };
}

/**
 * Convert a PageTree response to an array of Comments.
 */
export function pageTreeToComments(tree: PageTree): Comment[] {
  return (tree.c ?? []).map((tc) => treeCommentToComment(tc));
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
    u: comment.upvoteCount ?? comment.upvotes.length,
    d: comment.downvoteCount ?? comment.downvotes.length,
    x: Math.floor(comment.timestamp / 1000), // Convert ms to seconds
    m: Math.floor(comment.timestamp / 1000), // Use same as created for new comments
    v: comment.upvotes,
    w: comment.downvotes,
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
