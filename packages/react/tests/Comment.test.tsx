import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Comment } from '../src/components/Comment';
import type { Comment as CommentType, User } from '../src/types';

// Mock WebSocket
vi.stubGlobal('WebSocket', class {
  onopen: (() => void) | null = null;
  close() {}
  send() {}
});

const mockComment: CommentType = {
  id: 'comment-1',
  userId: 'user-1',
  userName: 'TestUser',
  text: 'This is a test comment',
  timestamp: Date.now() - 60000, // 1 minute ago
  upvotes: 2,
  downvotes: 1,
  children: [],
  edited: false,
  pinned: false,
};

const mockUser: User = {
  id: 'user-1',
  name: 'TestUser',
  isModerator: false,
  isAdmin: false,
};

const mockModUser: User = {
  id: 'mod-1',
  name: 'Moderator',
  isModerator: true,
  isAdmin: false,
};

describe('Comment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders comment text', () => {
      render(<Comment comment={mockComment} />);
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });

    it('renders author name', () => {
      render(<Comment comment={mockComment} />);
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    it('displays correct score', () => {
      render(<Comment comment={mockComment} />);
      // 2 upvotes - 1 downvote = 1 point
      expect(screen.getByText(/1 point/)).toBeInTheDocument();
    });

    it('pluralizes points correctly', () => {
      const multiPointComment = {
        ...mockComment,
        upvotes: 3,
        downvotes: 0,
      };
      render(<Comment comment={multiPointComment} />);
      const scoreElement = screen.getByTestId('comment-meta-score');
      // Use a regular expression to match "3 points" within the text content,
      // as there might be other text (like timestamp) in the same span.
      expect(scoreElement).toHaveTextContent(/3 points/);
    });

    it('shows edited indicator when comment was edited', () => {
      const editedComment = { ...mockComment, edited: true };
      render(<Comment comment={editedComment} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('shows pinned indicator when comment is pinned', () => {
      const pinnedComment = { ...mockComment, pinned: true };
      render(<Comment comment={pinnedComment} />);
      expect(screen.getByText('Pinned')).toBeInTheDocument();
    });

    it('renders share button', () => {
      render(<Comment comment={mockComment} />);
      expect(screen.getByText('Share')).toBeInTheDocument();
    });
  });

  describe('timestamp formatting', () => {
    it('shows "just now" for very recent comments', () => {
      const recentComment = { ...mockComment, timestamp: Date.now() - 5000 };
      render(<Comment comment={recentComment} />);
      expect(screen.getByText(/just now/)).toBeInTheDocument();
    });

    it('shows minutes ago', () => {
      const minutesAgo = { ...mockComment, timestamp: Date.now() - 5 * 60 * 1000 };
      render(<Comment comment={minutesAgo} />);
      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    });

    it('shows "1 minute ago" singular', () => {
      const oneMinuteAgo = { ...mockComment, timestamp: Date.now() - 60 * 1000 };
      render(<Comment comment={oneMinuteAgo} />);
      expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
    });

    it('shows hours ago', () => {
      const hoursAgo = { ...mockComment, timestamp: Date.now() - 3 * 60 * 60 * 1000 };
      render(<Comment comment={hoursAgo} />);
      expect(screen.getByText(/3 hours ago/)).toBeInTheDocument();
    });

    it('shows days ago', () => {
      const daysAgo = { ...mockComment, timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000 };
      render(<Comment comment={daysAgo} />);
      expect(screen.getByText(/2 days ago/)).toBeInTheDocument();
    });
  });

  describe('voting', () => {
    it('renders vote buttons when onVote is provided', () => {
      const onVote = vi.fn();
      render(<Comment comment={mockComment} onVote={onVote} />);
      expect(screen.getByLabelText('Upvote')).toBeInTheDocument();
      expect(screen.getByLabelText('Downvote')).toBeInTheDocument();
    });

    it('does not render vote buttons when onVote is not provided', () => {
      render(<Comment comment={mockComment} />);
      expect(screen.queryByLabelText('Upvote')).not.toBeInTheDocument();
    });

    it('calls onVote with up when upvote clicked', () => {
      const onVote = vi.fn();
      render(<Comment comment={mockComment} onVote={onVote} />);
      fireEvent.click(screen.getByLabelText('Upvote'));
      expect(onVote).toHaveBeenCalledWith('comment-1', 'up');
    });

    it('calls onVote with down when downvote clicked', () => {
      const onVote = vi.fn();
      render(<Comment comment={mockComment} onVote={onVote} />);
      fireEvent.click(screen.getByLabelText('Downvote'));
      expect(onVote).toHaveBeenCalledWith('comment-1', 'down');
    });

    it('highlights upvote button when user has upvoted', () => {
      const upvotedComment = {
        ...mockComment,
        userVote: 'up',
      };
      const currentUser = { id: 'current-user', name: 'Me' };
      render(<Comment comment={upvotedComment} currentUser={currentUser} onVote={vi.fn()} />);
      expect(screen.getByLabelText('Upvote')).toHaveClass('active');
    });
  });

  describe('collapse/expand', () => {
    it('renders collapsed state when initialCollapsed is true', () => {
      render(<Comment comment={mockComment} collapsed={true} />);
      expect(screen.getByText('[+]')).toBeInTheDocument();
    });

    it('can toggle collapse state', () => {
      render(<Comment comment={mockComment} />);

      // Click collapse button
      fireEvent.click(screen.getByText('[–]'));
      expect(screen.getByText('[+]')).toBeInTheDocument();

      // Click expand button
      fireEvent.click(screen.getByText('[+]'));
      expect(screen.getByText('[–]')).toBeInTheDocument();
    });

    it('shows child count in collapsed state', () => {
      const commentWithChildren = {
        ...mockComment,
        children: [
          { ...mockComment, id: 'child-1' },
          { ...mockComment, id: 'child-2' },
        ],
      };
      render(<Comment comment={commentWithChildren} collapsed={true} />);
      expect(screen.getByText(/2 children/)).toBeInTheDocument();
    });
  });

  describe('own comment actions', () => {
    it('shows edit button for own comment', () => {
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onEdit={vi.fn()}
        />
      );
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('shows delete button for own comment', () => {
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('shows delete confirmation dialog', () => {
      const onDelete = vi.fn();
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));
      expect(screen.getByText('Delete?')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('calls onDelete when confirmed', () => {
      const onDelete = vi.fn();
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('Yes'));
      expect(onDelete).toHaveBeenCalledWith('comment-1');
    });

    it('cancels delete when no is clicked', () => {
      const onDelete = vi.fn();
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onDelete={onDelete}
        />
      );

      fireEvent.click(screen.getByText('Delete'));
      fireEvent.click(screen.getByText('No'));
      expect(onDelete).not.toHaveBeenCalled();
      expect(screen.queryByText('delete?')).not.toBeInTheDocument();
    });
  });

  describe('other user comment actions', () => {
    const otherUserComment = { ...mockComment, userId: 'other-user' };

    it('shows block button for other users comments', () => {
      render(
        <Comment
          comment={otherUserComment}
          currentUser={mockUser}
          onBlock={vi.fn()}
        />
      );
      expect(screen.getByText('Block')).toBeInTheDocument();
    });

    it('shows report button for other users comments', () => {
      render(
        <Comment
          comment={otherUserComment}
          currentUser={mockUser}
          onReport={vi.fn()}
        />
      );
      expect(screen.getByText('Report')).toBeInTheDocument();
    });

    it('does not show edit button for other users comments', () => {
      render(
        <Comment
          comment={otherUserComment}
          currentUser={mockUser}
          onEdit={vi.fn()}
        />
      );
      expect(screen.queryByText('edit')).not.toBeInTheDocument();
    });
  });

  describe('moderator actions', () => {
    const otherUserComment = { ...mockComment, userId: 'other-user' };

    it('shows delete button for moderator on any comment', () => {
      render(
        <Comment
          comment={otherUserComment}
          currentUser={mockModUser}
          onDelete={vi.fn()}
        />
      );
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('shows ban button for moderator', () => {
      render(
        <Comment
          comment={otherUserComment}
          currentUser={mockModUser}
          onBan={vi.fn()}
        />
      );
      expect(screen.getByText('Ban')).toBeInTheDocument();
    });
  });

  describe('reply functionality', () => {
    it('shows reply button when depth is less than maxDepth', () => {
      render(
        <Comment
          comment={mockComment}
          depth={0}
          maxDepth={5}
        />
      );
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('hides reply button when depth equals maxDepth', () => {
      render(
        <Comment
          comment={mockComment}
          depth={5}
          maxDepth={5}
        />
      );
      expect(screen.queryByText('reply')).not.toBeInTheDocument();
    });

    it('toggles reply form when reply clicked', () => {
      render(
        <Comment
          comment={mockComment}
          onReply={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Reply'));
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });
  });

  describe('editing', () => {
    it('enters edit mode when edit clicked', () => {
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onEdit={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('calls onEdit with new text when saved', () => {
      const onEdit = vi.fn();
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onEdit={onEdit}
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'Updated comment' } });
      fireEvent.click(screen.getByText('Save'));

      expect(onEdit).toHaveBeenCalledWith('comment-1', 'Updated comment');
    });

    it('cancels edit and reverts text', () => {
      const onEdit = vi.fn();
      render(
        <Comment
          comment={mockComment}
          currentUser={mockUser}
          onEdit={onEdit}
        />
      );

      fireEvent.click(screen.getByText('Edit'));
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'Updated comment' } });
      fireEvent.click(screen.getByText('Cancel'));

      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });
  });

  describe('nested comments', () => {
    it('renders child comments', () => {
      const commentWithChildren = {
        ...mockComment,
        children: [
          { ...mockComment, id: 'child-1', text: 'Child comment 1' },
          { ...mockComment, id: 'child-2', text: 'Child comment 2' },
        ],
      };

      render(<Comment comment={commentWithChildren} />);
      expect(screen.getByText('Child comment 1')).toBeInTheDocument();
      expect(screen.getByText('Child comment 2')).toBeInTheDocument();
    });
  });
});
