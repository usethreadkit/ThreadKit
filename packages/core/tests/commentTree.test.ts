import { describe, it, expect } from 'vitest';
import {
  sortComments,
  buildCommentTree,
  findComment,
  addToTree,
  removeFromTree,
  updateInTree,
  countComments,
  flattenTree,
} from '../src/utils/commentTree';
import type { Comment } from '../src/types';

const createComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'comment-1',
  userId: 'user-1',
  userName: 'User',
  text: 'Test comment',
  timestamp: Date.now(),
  upvotes: 0,
  downvotes: 0,
  children: [],
  edited: false,
  pinned: false,
  ...overrides,
});

describe('commentTree', () => {
  describe('sortComments', () => {
    it('sorts by votes (highest first)', () => {
      const comments = [
        createComment({ id: '1', upvotes: 1, downvotes: 0 }),
        createComment({ id: '2', upvotes: 3, downvotes: 0 }),
        createComment({ id: '3', upvotes: 2, downvotes: 1 }),
      ];

      const sorted = sortComments(comments, 'votes');

      expect(sorted[0].id).toBe('2'); // 3 points
      expect(sorted[1].id).toBe('1'); // 1 point
      expect(sorted[2].id).toBe('3'); // 1 point
    });

    it('sorts by newest first', () => {
      const comments = [
        createComment({ id: '1', timestamp: 1000 }),
        createComment({ id: '2', timestamp: 3000 }),
        createComment({ id: '3', timestamp: 2000 }),
      ];

      const sorted = sortComments(comments, 'newest');

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('sorts by oldest first', () => {
      const comments = [
        createComment({ id: '1', timestamp: 3000 }),
        createComment({ id: '2', timestamp: 1000 }),
        createComment({ id: '3', timestamp: 2000 }),
      ];

      const sorted = sortComments(comments, 'oldest');

      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('sorts by controversial (high votes, close split)', () => {
      const comments = [
        createComment({ id: '1', upvotes: 1, downvotes: 0 }), // 1 vote, 0% controversy
        createComment({ id: '2', upvotes: 2, downvotes: 2 }), // 4 votes, 50% split
        createComment({ id: '3', upvotes: 3, downvotes: 0 }), // 3 votes, 0% controversy
      ];

      const sorted = sortComments(comments, 'controversial');

      expect(sorted[0].id).toBe('2'); // Most controversial (50/50 split with high votes)
    });

    it('recursively sorts children', () => {
      const comments = [
        createComment({
          id: '1',
          children: [
            createComment({ id: '1a', timestamp: 2000 }),
            createComment({ id: '1b', timestamp: 1000 }),
          ],
        }),
      ];

      const sorted = sortComments(comments, 'newest');

      expect(sorted[0].children[0].id).toBe('1a');
      expect(sorted[0].children[1].id).toBe('1b');
    });
  });

  describe('buildCommentTree', () => {
    it('builds tree from flat array with parentId', () => {
      const flat = [
        createComment({ id: '1' }),
        createComment({ id: '2', parentId: '1' }),
        createComment({ id: '3', parentId: '1' }),
        createComment({ id: '4', parentId: '2' }),
      ];

      const tree = buildCommentTree(flat);

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('1');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].id).toBe('2');
      expect(tree[0].children[0].children[0].id).toBe('4');
    });

    it('returns nested data as-is', () => {
      const nested = [
        createComment({
          id: '1',
          children: [createComment({ id: '2' })],
        }),
      ];

      const tree = buildCommentTree(nested);

      expect(tree).toHaveLength(1);
      expect(tree[0].children).toHaveLength(1);
    });

    it('handles orphaned comments (missing parent)', () => {
      const flat = [
        createComment({ id: '1', parentId: 'missing' }),
        createComment({ id: '2' }),
      ];

      const tree = buildCommentTree(flat);

      // Orphaned comments should be treated as roots
      expect(tree).toHaveLength(2);
    });
  });

  describe('findComment', () => {
    it('finds a root comment', () => {
      const comments = [
        createComment({ id: '1' }),
        createComment({ id: '2' }),
      ];

      const found = findComment(comments, '1');

      expect(found?.id).toBe('1');
    });

    it('finds a nested comment', () => {
      const comments = [
        createComment({
          id: '1',
          children: [
            createComment({
              id: '2',
              children: [createComment({ id: '3' })],
            }),
          ],
        }),
      ];

      const found = findComment(comments, '3');

      expect(found?.id).toBe('3');
    });

    it('returns null for non-existent comment', () => {
      const comments = [createComment({ id: '1' })];

      const found = findComment(comments, 'missing');

      expect(found).toBeNull();
    });
  });

  describe('addToTree', () => {
    it('adds a root comment', () => {
      const comments = [createComment({ id: '1' })];
      const newComment = createComment({ id: '2' });

      const result = addToTree(comments, newComment, 'oldest');

      expect(result).toHaveLength(2);
    });

    it('adds a reply to a parent', () => {
      const comments = [createComment({ id: '1' })];
      const reply = createComment({ id: '2', parentId: '1' });

      const result = addToTree(comments, reply, 'oldest');

      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('2');
    });

    it('adds a reply to a nested parent', () => {
      const comments = [
        createComment({
          id: '1',
          children: [createComment({ id: '2' })],
        }),
      ];
      const reply = createComment({ id: '3', parentId: '2' });

      const result = addToTree(comments, reply, 'oldest');

      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('3');
    });
  });

  describe('removeFromTree', () => {
    it('removes a root comment', () => {
      const comments = [
        createComment({ id: '1' }),
        createComment({ id: '2' }),
      ];

      const result = removeFromTree(comments, '1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('removes a nested comment', () => {
      const comments = [
        createComment({
          id: '1',
          children: [
            createComment({ id: '2' }),
            createComment({ id: '3' }),
          ],
        }),
      ];

      const result = removeFromTree(comments, '2');

      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe('3');
    });
  });

  describe('updateInTree', () => {
    it('updates a root comment', () => {
      const comments = [createComment({ id: '1', text: 'old' })];

      const result = updateInTree(comments, '1', { text: 'new' });

      expect(result[0].text).toBe('new');
    });

    it('updates a nested comment', () => {
      const comments = [
        createComment({
          id: '1',
          children: [createComment({ id: '2', text: 'old' })],
        }),
      ];

      const result = updateInTree(comments, '2', { text: 'new' });

      expect(result[0].children[0].text).toBe('new');
    });

    it('preserves other properties', () => {
      const comments = [createComment({ id: '1', text: 'original', edited: false })];

      const result = updateInTree(comments, '1', { edited: true });

      expect(result[0].text).toBe('original');
      expect(result[0].edited).toBe(true);
    });

    it('does not reorder comments when updating', () => {
      const comments = [
        createComment({ id: '1', upvotes: 10 }),
        createComment({ id: '2', upvotes: 5 }),
      ];

      // Even if we update comment 2 to have more upvotes (which would change order if sorted by votes),
      // it should stay in same position
      const result = updateInTree(comments, '2', { upvotes: 20 });

      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[1].upvotes).toBe(20);
    });
  });

  describe('countComments', () => {
    it('counts root comments', () => {
      const comments = [
        createComment({ id: '1' }),
        createComment({ id: '2' }),
      ];

      expect(countComments(comments)).toBe(2);
    });

    it('counts nested comments', () => {
      const comments = [
        createComment({
          id: '1',
          children: [
            createComment({ id: '2' }),
            createComment({
              id: '3',
              children: [createComment({ id: '4' })],
            }),
          ],
        }),
      ];

      expect(countComments(comments)).toBe(4);
    });

    it('returns 0 for empty array', () => {
      expect(countComments([])).toBe(0);
    });
  });

  describe('flattenTree', () => {
    it('flattens nested comments', () => {
      const comments = [
        createComment({
          id: '1',
          children: [
            createComment({ id: '2' }),
            createComment({
              id: '3',
              children: [createComment({ id: '4' })],
            }),
          ],
        }),
      ];

      const flat = flattenTree(comments);

      expect(flat).toHaveLength(4);
      expect(flat.map((c) => c.id)).toEqual(['1', '2', '3', '4']);
    });

    it('returns empty array for empty input', () => {
      expect(flattenTree([])).toEqual([]);
    });
  });
});
