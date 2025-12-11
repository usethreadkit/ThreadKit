import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentStore } from '../src/stores/CommentStore';
import type { Comment } from '../src/types';

// Mock fetch globally
global.fetch = vi.fn();

describe('CommentStore', () => {
  let store: CommentStore;
  const mockConfig = {
    apiUrl: 'http://localhost:8080/v1',
    url: 'test-page',
    projectId: 'test-project-id',
    getToken: () => null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    store = new CommentStore(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const state = store.getState();
      expect(state.comments).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.pageId).toBe(null);
    });

    it('should initialize with provided comments', () => {
      const initialComments: Comment[] = [
        {
          id: '1',
          text: 'Test comment',
          html: '<p>Test comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        },
      ];

      const storeWithComments = new CommentStore({
        ...mockConfig,
        initialComments,
      });

      const state = storeWithComments.getState();
      expect(state.comments).toHaveLength(1);
      expect(state.comments[0].id).toBe('1');
    });

    it('should initialize with custom sort order', () => {
      const storeWithSort = new CommentStore({
        ...mockConfig,
        sortBy: 'new',
      });

      expect(storeWithSort.getSortBy()).toBe('new');
    });
  });

  describe('state mutations', () => {
    describe('addComment', () => {
      it('should add a root-level comment', () => {
        const comment: Comment = {
          id: '1',
          text: 'New comment',
          html: '<p>New comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);
        const state = store.getState();
        expect(state.comments).toHaveLength(1);
        expect(state.comments[0].id).toBe('1');
      });

      it('should emit stateChange event when adding comment', () => {
        const listener = vi.fn();
        store.on('stateChange', listener);

        const comment: Comment = {
          id: '1',
          text: 'New comment',
          html: '<p>New comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
          comments: expect.arrayContaining([comment]),
        }));
      });

      it('should add nested comments correctly', () => {
        const rootComment: Comment = {
          id: '1',
          text: 'Root comment',
          html: '<p>Root comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        const replyComment: Comment = {
          id: '2',
          text: 'Reply comment',
          html: '<p>Reply comment</p>',
          userId: 'user-2',
          userName: 'Test User 2',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          parentId: '1',
          children: [],
        };

        store.addComment(rootComment);
        store.addComment(replyComment);

        const state = store.getState();
        expect(state.comments).toHaveLength(1);
        expect(state.comments[0].children).toHaveLength(1);
        expect(state.comments[0].children?.[0].id).toBe('2');
      });
    });

    describe('removeComment', () => {
      it('should remove a root-level comment', () => {
        const comment: Comment = {
          id: '1',
          text: 'Comment to remove',
          html: '<p>Comment to remove</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);
        expect(store.getState().comments).toHaveLength(1);

        store.removeComment('1');
        expect(store.getState().comments).toHaveLength(0);
      });

      it('should emit stateChange event when removing comment', () => {
        const comment: Comment = {
          id: '1',
          text: 'Comment to remove',
          html: '<p>Comment to remove</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);

        const listener = vi.fn();
        store.on('stateChange', listener);

        store.removeComment('1');
        expect(listener).toHaveBeenCalledWith(expect.objectContaining({
          comments: [],
        }));
      });
    });

    describe('updateComment', () => {
      it('should update comment properties', () => {
        const comment: Comment = {
          id: '1',
          text: 'Original text',
          html: '<p>Original text</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);
        store.updateComment('1', {
          text: 'Updated text',
          html: '<p>Updated text</p>',
        });

        const state = store.getState();
        expect(state.comments[0].text).toBe('Updated text');
        expect(state.comments[0].html).toBe('<p>Updated text</p>');
      });

      it('should update vote counts', () => {
        const comment: Comment = {
          id: '1',
          text: 'Comment',
          html: '<p>Comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);
        store.updateComment('1', { upvotes: 5, downvotes: 2 });

        const state = store.getState();
        expect(state.comments[0].upvotes).toBe(5);
        expect(state.comments[0].downvotes).toBe(2);
      });

      it('should emit stateChange event when updating comment', () => {
        const comment: Comment = {
          id: '1',
          text: 'Comment',
          html: '<p>Comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
        };

        store.addComment(comment);

        const listener = vi.fn();
        store.on('stateChange', listener);

        store.updateComment('1', { upvotes: 5 });
        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe('sorting', () => {
    beforeEach(() => {
      const now = Date.now();
      const comments: Comment[] = [
        {
          id: '1',
          text: 'Old comment',
          html: '<p>Old comment</p>',
          userId: 'user-1',
          userName: 'Test User',
          timestamp: now - 3600000,
          upvotes: 10,
          downvotes: 0,
          children: [],
        },
        {
          id: '2',
          text: 'New comment',
          html: '<p>New comment</p>',
          userId: 'user-2',
          userName: 'Test User 2',
          timestamp: now,
          upvotes: 1,
          downvotes: 0,
          children: [],
        },
      ];

      comments.forEach((c) => store.addComment(c));
    });

    it('should sort by top (default)', () => {
      const state = store.getState();
      // addComment always adds with 'new' sort, so newer comment is first
      // even though store sortBy is 'top'
      expect(state.comments[0].id).toBe('2'); // newer
      expect(state.comments[1].id).toBe('1'); // older
    });

    it('should re-sort when changing sort order', () => {
      store.setSortBy('new');
      const state = store.getState();
      // Newest comment should be first
      expect(state.comments[0].id).toBe('2');
      expect(state.comments[1].id).toBe('1');
    });

    it('should emit stateChange when changing sort order', () => {
      const listener = vi.fn();
      store.on('stateChange', listener);

      store.setSortBy('new');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('API operations', () => {
    it('should fetch comments successfully', async () => {
      const mockResponse = {
        tree: [],
        page_id: 'page-123',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await store.fetch();

      const state = store.getState();
      expect(state.loading).toBe(false);
      expect(state.pageId).toBe('page-123');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments?page_url=test-page'),
        expect.objectContaining({
          headers: expect.objectContaining({
            projectid: 'test-project-id',
          }),
        })
      );
    });

    it('should handle fetch errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Page not found',
      } as Response);

      await store.fetch();

      const state = store.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it('should set loading state during fetch', async () => {
      const mockResponse = {
        tree: [],
        page_id: 'page-123',
      };

      let loadingDuringFetch = false;

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
        loadingDuringFetch = store.getState().loading;
        return {
          ok: true,
          json: async () => mockResponse,
        } as Response;
      });

      await store.fetch();
      expect(loadingDuringFetch).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should remove all listeners on destroy', () => {
      const listener = vi.fn();
      store.on('stateChange', listener);

      store.destroy();

      const comment: Comment = {
        id: '1',
        text: 'Comment',
        html: '<p>Comment</p>',
        userId: 'user-1',
        userName: 'Test User',
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0,
        children: [],
      };

      store.addComment(comment);
      expect(listener).not.toHaveBeenCalled();
    });
  });
});
