import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThreadKit } from '../src/ThreadKit';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock WebSocket
vi.stubGlobal('WebSocket', class {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  close() {}
  send() {}
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

const mockComments = [
  {
    id: 'comment-1',
    userId: 'user-1',
    userName: 'User One',
    text: 'First comment',
    timestamp: Date.now(),
    upvotes: ['user-2'],
    downvotes: [],
    children: [],
    edited: false,
    pinned: false,
  },
  {
    id: 'comment-2',
    userId: 'demo-user',
    userName: 'Demo User',
    text: 'My comment',
    timestamp: Date.now(),
    upvotes: [],
    downvotes: [],
    children: [],
    edited: false,
    pinned: false,
  },
];

describe('ThreadKit Comprehensive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: mockComments }),
    });
    localStorageMock.getItem.mockReturnValue('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('modes', () => {
    it('renders in comments mode by default', async () => {
      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      expect(document.querySelector('.threadkit-comments')).toBeInTheDocument();
    });

    it('renders in chat mode when mode="chat"', async () => {
      render(<ThreadKit siteId="test" url="/test" mode="chat" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      expect(document.querySelector('.threadkit-chat')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('displays error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load comments. Please try again later.')).toBeInTheDocument();
      });
    });
  });

  describe('theme', () => {
    it('applies light theme by default', async () => {
      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      expect(document.querySelector('.threadkit-root')).toHaveAttribute('data-theme', 'light');
    });

    it('applies dark theme when specified', async () => {
      render(<ThreadKit siteId="test" url="/test" theme="dark" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      expect(document.querySelector('.threadkit-root')).toHaveAttribute('data-theme', 'dark');
    });
  });

  describe('voting', () => {
    it('calls vote API when upvote clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: true });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      const upvoteButtons = screen.getAllByLabelText('Upvote');
      await act(async () => {
        fireEvent.click(upvoteButtons[0]);
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments/comment-1/vote'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('handles vote error', async () => {
      const onError = vi.fn();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: false, statusText: 'Forbidden' });

      render(<ThreadKit siteId="test" url="/test" onError={onError} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      const upvoteButtons = screen.getAllByLabelText('Upvote');
      await act(async () => {
        fireEvent.click(upvoteButtons[0]);
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('delete comment', () => {
    it('calls delete API when delete confirmed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: true });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Find delete button for own comment
      const deleteButtons = screen.getAllByText('delete');
      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      // Confirm deletion
      await act(async () => {
        fireEvent.click(screen.getByText('yes'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('edit comment', () => {
    it('calls edit API when edit saved', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: true });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Find edit button for own comment
      const editButtons = screen.getAllByText('edit');
      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      // Edit the text
      const textarea = screen.getByDisplayValue('My comment');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Updated comment' } });
      });

      // Save
      await act(async () => {
        fireEvent.click(screen.getByText('save'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments/comment-2'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ text: 'Updated comment' }),
        })
      );
    });
  });

  describe('report comment', () => {
    it('calls report API when report submitted', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: true });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Find report button (on other user's comment)
      const reportButton = screen.getByText('report');
      await act(async () => {
        fireEvent.click(reportButton);
      });

      // Select reason and submit
      const select = screen.getByRole('combobox');
      await act(async () => {
        fireEvent.change(select, { target: { value: 'Spam' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('submit'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/comments/comment-1/report'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('block user', () => {
    it('calls block API when block confirmed', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: true });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Find block button (on other user's comment)
      const blockButton = screen.getByText('block');
      await act(async () => {
        fireEvent.click(blockButton);
      });

      // Confirm block
      await act(async () => {
        fireEvent.click(screen.getByText('yes'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-1/block'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('ban user (moderator)', () => {
    it('shows ban button and calls ban API', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({ ok: true });

      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Current user is moderator by default in demo mode
      const banButton = screen.getByText('ban');
      await act(async () => {
        fireEvent.click(banButton);
      });

      // Confirm ban
      await act(async () => {
        fireEvent.click(screen.getByText('yes'));
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/user-1/ban'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('post comment', () => {
    it('posts new comment and calls onCommentPosted callback', async () => {
      const onCommentPosted = vi.fn();
      const newComment = {
        id: 'new-comment',
        userId: 'demo-user',
        userName: 'Demo User',
        text: 'New comment',
        timestamp: Date.now(),
        upvotes: [],
        downvotes: [],
        children: [],
        edited: false,
        pinned: false,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newComment),
        });

      render(<ThreadKit siteId="test" url="/test" onCommentPosted={onCommentPosted} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Type in the comment form
      const textarea = screen.getByPlaceholderText('Write a comment...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'New comment' } });
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByText('Post'));
      });

      await waitFor(() => {
        expect(onCommentPosted).toHaveBeenCalledWith(newComment);
      });
    });

    it('calls onError on post failure', async () => {
      const onError = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ comments: mockComments }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Unauthorized',
        });

      render(<ThreadKit siteId="test" url="/test" onError={onError} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Write a comment...');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'New comment' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Post'));
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe('sorting', () => {
    it('changes sort order', async () => {
      render(<ThreadKit siteId="test" url="/test" sortBy="votes" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      // Sort UI uses buttons, click "new" to change sort
      const newSortButton = screen.getByText('new');
      await act(async () => {
        fireEvent.click(newSortButton);
      });

      // Button should now be active
      expect(newSortButton).toHaveClass('active');
    });
  });

  describe('branding', () => {
    it('shows branding by default', async () => {
      render(<ThreadKit siteId="test" url="/test" />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Powered by ThreadKit')).toBeInTheDocument();
    });

    it('hides branding when hideBranding is true', async () => {
      render(<ThreadKit siteId="test" url="/test" hideBranding />);

      await waitFor(() => {
        expect(screen.queryByText('Loading comments...')).not.toBeInTheDocument();
      });

      expect(screen.queryByText('Powered by ThreadKit')).not.toBeInTheDocument();
    });
  });
});
