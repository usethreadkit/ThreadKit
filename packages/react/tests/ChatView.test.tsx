import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ChatView } from '../src/components/ChatView';
import type { Comment, User } from '../src/types';

const mockMessages: Comment[] = [
  {
    id: 'msg-1',
    userId: 'user-1',
    userName: 'User One',
    text: 'Hello everyone',
    timestamp: Date.now() - 60000,
    upvotes: [],
    downvotes: [],
    children: [],
    edited: false,
    pinned: false,
  },
  {
    id: 'msg-2',
    userId: 'user-2',
    userName: 'User Two',
    text: 'Hi there!',
    timestamp: Date.now() - 30000,
    upvotes: [],
    downvotes: [],
    children: [],
    edited: true,
    pinned: false,
  },
];

const mockCurrentUser: User = {
  id: 'user-1',
  name: 'User One',
  isModerator: false,
  isAdmin: false,
};

const mockModUser: User = {
  id: 'mod-1',
  name: 'Moderator',
  isModerator: true,
  isAdmin: false,
};

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders chat messages', () => {
      render(<ChatView comments={mockMessages} onSend={vi.fn()} />);
      expect(screen.getByText('Hello everyone')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('renders user names', () => {
      render(<ChatView comments={mockMessages} onSend={vi.fn()} />);
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });

    it('shows edited indicator for edited messages', () => {
      render(<ChatView comments={mockMessages} onSend={vi.fn()} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders time for each message', () => {
      render(<ChatView comments={mockMessages} onSend={vi.fn()} />);
      const times = document.querySelectorAll('.threadkit-chat-time');
      expect(times.length).toBe(2);
    });

    it('renders toolbar when provided', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          toolbarEnd={<button>Settings</button>}
        />
      );
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('input', () => {
    it('renders input with placeholder for logged in user', () => {
      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
        />
      );
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('shows sign in placeholder when no user', () => {
      render(<ChatView comments={mockMessages} onSend={vi.fn()} />);
      expect(screen.getByPlaceholderText('Sign in to chat')).toBeInTheDocument();
    });

    it('disables input when no user', () => {
      render(<ChatView comments={mockMessages} onSend={vi.fn()} />);
      expect(screen.getByPlaceholderText('Sign in to chat')).toBeDisabled();
    });

    it('enables input for logged in user', () => {
      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
        />
      );
      expect(screen.getByPlaceholderText('Type a message...')).not.toBeDisabled();
    });
  });

  describe('sending messages', () => {
    it('calls onSend when form is submitted', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={onSend}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New message' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Send'));
      });

      expect(onSend).toHaveBeenCalledWith('New message');
    });

    it('clears input after successful send', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined);

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={onSend}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New message' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Send'));
      });

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('disables send button when input is empty', () => {
      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
        />
      );
      expect(screen.getByText('Send')).toBeDisabled();
    });

    it('calls onTyping when typing', () => {
      const onTyping = vi.fn();

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onTyping={onTyping}
        />
      );

      const input = screen.getByPlaceholderText('Type a message...');
      fireEvent.change(input, { target: { value: 'H' } });

      expect(onTyping).toHaveBeenCalled();
    });
  });

  describe('presence', () => {
    it('shows presence count when enabled', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          showPresence={true}
          presenceCount={5}
        />
      );
      expect(screen.getByText('5 people online')).toBeInTheDocument();
    });

    it('uses singular form for 1 person', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          showPresence={true}
          presenceCount={1}
        />
      );
      expect(screen.getByText('1 person online')).toBeInTheDocument();
    });

    it('hides presence when disabled', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          showPresence={false}
          presenceCount={5}
        />
      );
      expect(screen.queryByText('5 people online')).not.toBeInTheDocument();
    });
  });

  describe('typing indicator', () => {
    it('shows typing indicator when users are typing', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          typingUsers={[{ userId: 'user-3', userName: 'User Three' }]}
        />
      );
      expect(screen.getByText('1 person is typing...')).toBeInTheDocument();
    });

    it('uses plural form for multiple typing users', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          typingUsers={[
            { userId: 'user-3', userName: 'User Three' },
            { userId: 'user-4', userName: 'User Four' },
          ]}
        />
      );
      expect(screen.getByText('2 people are typing...')).toBeInTheDocument();
    });

    it('hides typing indicator when no one is typing', () => {
      render(
        <ChatView
          comments={mockMessages}
          onSend={vi.fn()}
          typingUsers={[]}
        />
      );
      expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
    });
  });

  describe('message actions', () => {
    it('expands message on click to show actions', async () => {
      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Click on own message to expand
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      expect(screen.getByText('edit')).toBeInTheDocument();
      expect(screen.getByText('delete')).toBeInTheDocument();
    });

    it('shows block and report for other user messages', async () => {
      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onBlock={vi.fn()}
          onReport={vi.fn()}
        />
      );

      // Click on other user's message
      const message = screen.getByText('Hi there!').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      expect(screen.getByText('block')).toBeInTheDocument();
      expect(screen.getByText('report')).toBeInTheDocument();
    });

    it('calls onDelete when delete confirmed', async () => {
      const onDelete = vi.fn();

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onDelete={onDelete}
        />
      );

      // Expand own message
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      // Click delete
      await act(async () => {
        fireEvent.click(screen.getByText('delete'));
      });

      // Confirm
      await act(async () => {
        fireEvent.click(screen.getByText('yes'));
      });

      expect(onDelete).toHaveBeenCalledWith('msg-1');
    });

    it('calls onEdit when edit saved', async () => {
      const onEdit = vi.fn();

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onEdit={onEdit}
        />
      );

      // Expand own message
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      // Click edit
      await act(async () => {
        fireEvent.click(screen.getByText('edit'));
      });

      // Change text
      const input = screen.getByDisplayValue('Hello everyone');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Updated message' } });
      });

      // Save
      await act(async () => {
        fireEvent.click(screen.getByText('save'));
      });

      expect(onEdit).toHaveBeenCalledWith('msg-1', 'Updated message');
    });

    it('cancels edit on Escape key', async () => {
      const onEdit = vi.fn();

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onEdit={onEdit}
        />
      );

      // Expand and edit
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      await act(async () => {
        fireEvent.click(screen.getByText('edit'));
      });

      const input = screen.getByDisplayValue('Hello everyone');
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      expect(onEdit).not.toHaveBeenCalled();
      expect(screen.getByText('Hello everyone')).toBeInTheDocument();
    });

    it('submits edit on Enter key', async () => {
      const onEdit = vi.fn();

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockCurrentUser}
          onSend={vi.fn()}
          onEdit={onEdit}
        />
      );

      // Expand and edit
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      await act(async () => {
        fireEvent.click(screen.getByText('edit'));
      });

      const input = screen.getByDisplayValue('Hello everyone');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New text' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(onEdit).toHaveBeenCalledWith('msg-1', 'New text');
    });
  });

  describe('moderator actions', () => {
    it('shows ban button for moderators on other user messages', async () => {
      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockModUser}
          onSend={vi.fn()}
          onBan={vi.fn()}
        />
      );

      // Click on other user's message
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      expect(screen.getByText('ban')).toBeInTheDocument();
    });

    it('calls onBan when ban confirmed', async () => {
      const onBan = vi.fn();

      render(
        <ChatView
          comments={mockMessages}
          currentUser={mockModUser}
          onSend={vi.fn()}
          onBan={onBan}
        />
      );

      // Click on other user's message
      const message = screen.getByText('Hello everyone').closest('.threadkit-chat-message');
      await act(async () => {
        fireEvent.click(message!);
      });

      // Click ban
      await act(async () => {
        fireEvent.click(screen.getByText('ban'));
      });

      // Confirm
      await act(async () => {
        fireEvent.click(screen.getByText('yes'));
      });

      expect(onBan).toHaveBeenCalledWith('user-1');
    });
  });

  describe('showLastN', () => {
    it('limits messages to showLastN', () => {
      const manyMessages = Array.from({ length: 10 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        text: `Message ${i}`,
      }));

      render(
        <ChatView
          comments={manyMessages}
          onSend={vi.fn()}
          showLastN={3}
        />
      );

      // Should only show last 3 messages
      expect(screen.queryByText('Message 0')).not.toBeInTheDocument();
      expect(screen.getByText('Message 7')).toBeInTheDocument();
      expect(screen.getByText('Message 8')).toBeInTheDocument();
      expect(screen.getByText('Message 9')).toBeInTheDocument();
    });
  });
});
