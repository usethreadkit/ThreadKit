import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useComments } from '../src/hooks/useComments';
import type { Comment } from '../src/types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useComments', () => {
  const defaultOptions = {
    siteId: 'test-site',
    url: '/test-page',
    apiUrl: 'https://api.example.com',
    sortBy: 'newest' as const,
  };

  const mockComments: Comment[] = [
    {
      id: 'comment-1',
      userId: 'user-1',
      userName: 'User One',
      text: 'First comment',
      timestamp: 1000,
      upvotes: [],
      downvotes: [],
      children: [],
      edited: false,
      pinned: false,
    },
    {
      id: 'comment-2',
      userId: 'user-2',
      userName: 'User Two',
      text: 'Second comment',
      timestamp: 2000,
      upvotes: ['user-1'],
      downvotes: [],
      children: [],
      edited: false,
      pinned: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial fetch', () => {
    it('fetches comments on mount', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() => useComments(defaultOptions));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/sites/test-site/comments?url=%2Ftest-page',
        expect.objectContaining({ headers: expect.any(Object) })
      );
    });

    it('sets comments after successful fetch', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(2);
      });
    });

    it('sets error on fetch failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain('Request failed');
      });
    });

    it('handles network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Network error');
      });
    });
  });

  describe('sorting', () => {
    it('sorts by newest first', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'newest' })
      );

      await waitFor(() => {
        expect(result.current.comments[0].id).toBe('comment-2');
        expect(result.current.comments[1].id).toBe('comment-1');
      });
    });

    it('sorts by oldest first', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'oldest' })
      );

      await waitFor(() => {
        expect(result.current.comments[0].id).toBe('comment-1');
        expect(result.current.comments[1].id).toBe('comment-2');
      });
    });

    it('sorts by votes', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'votes' })
      );

      await waitFor(() => {
        // comment-2 has 1 upvote, comment-1 has 0
        expect(result.current.comments[0].id).toBe('comment-2');
        expect(result.current.comments[1].id).toBe('comment-1');
      });
    });
  });

  describe('building comment tree', () => {
    it('builds tree from flat comments with parentId', async () => {
      const flatComments = [
        { ...mockComments[0], children: [] },
        { ...mockComments[1], parentId: 'comment-1', children: [] },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: flatComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'oldest' })
      );

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].children).toHaveLength(1);
        expect(result.current.comments[0].children[0].id).toBe('comment-2');
      });
    });

    it('handles already nested comments', async () => {
      const nestedComments = [
        {
          ...mockComments[0],
          children: [mockComments[1]],
        },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: nestedComments }),
      });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(1);
        expect(result.current.comments[0].children).toHaveLength(1);
      });
    });
  });

  describe('postComment', () => {
    it('posts a new comment', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'new-comment', text: 'New' }),
        });

      localStorageMock.getItem.mockReturnValue('test-token');

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.postComment('New comment text');
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://api.example.com/sites/test-site/comments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
          body: JSON.stringify({
            url: '/test-page',
            text: 'New comment text',
            parentId: undefined,
          }),
        })
      );
    });

    it('posts a reply with parentId', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'reply', text: 'Reply' }),
        });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.postComment('Reply text', 'parent-id');
      });

      const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1);
      expect(JSON.parse(lastCall[1].body)).toEqual({
        url: '/test-page',
        text: 'Reply text',
        parentId: 'parent-id',
      });
    });

    it('throws error on post failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.postComment('Test');
        })
      ).rejects.toThrow('Request failed');
    });
  });

  describe('deleteComment', () => {
    it('deletes a comment', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      localStorageMock.getItem.mockReturnValue('test-token');

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteComment('comment-to-delete');
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://api.example.com/comments/comment-to-delete',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  describe('vote', () => {
    it('sends vote request', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.vote('comment-1', 'up');
      });

      expect(global.fetch).toHaveBeenLastCalledWith(
        'https://api.example.com/comments/comment-1/vote',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ type: 'up' }),
        })
      );
    });
  });

  describe('addComment', () => {
    it('adds a top-level comment', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'oldest' })
      );

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(2);
      });

      const newComment: Comment = {
        id: 'new-comment',
        userId: 'user-3',
        userName: 'User Three',
        text: 'New comment',
        timestamp: 3000,
        upvotes: [],
        downvotes: [],
        children: [],
        edited: false,
        pinned: false,
      };

      act(() => {
        result.current.addComment(newComment);
      });

      expect(result.current.comments).toHaveLength(3);
    });

    it('adds a reply to parent comment', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'oldest' })
      );

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(2);
      });

      const reply: Comment = {
        id: 'reply',
        userId: 'user-3',
        userName: 'User Three',
        text: 'Reply',
        timestamp: 3000,
        upvotes: [],
        downvotes: [],
        children: [],
        parentId: 'comment-1',
        edited: false,
        pinned: false,
      };

      act(() => {
        result.current.addComment(reply);
      });

      expect(result.current.comments[0].children).toHaveLength(1);
      expect(result.current.comments[0].children[0].id).toBe('reply');
    });
  });

  describe('removeComment', () => {
    it('removes a comment', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(2);
      });

      act(() => {
        result.current.removeComment('comment-1');
      });

      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0].id).toBe('comment-2');
    });
  });

  describe('updateComment', () => {
    it('updates a comment', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: mockComments }),
      });

      const { result } = renderHook(() =>
        useComments({ ...defaultOptions, sortBy: 'oldest' })
      );

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(2);
      });

      act(() => {
        result.current.updateComment('comment-1', { text: 'Updated text', edited: true });
      });

      expect(result.current.comments[0].text).toBe('Updated text');
      expect(result.current.comments[0].edited).toBe(true);
    });
  });

  describe('refresh', () => {
    it('refetches comments', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: [...mockComments, { ...mockComments[0], id: 'comment-3' }] }),
        });

      const { result } = renderHook(() => useComments(defaultOptions));

      await waitFor(() => {
        expect(result.current.comments).toHaveLength(2);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.comments).toHaveLength(3);
    });
  });
});
