import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { NotificationsPanel, type Notification } from '../src/components/NotificationsPanel';

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'reply',
    message: 'Someone replied to your comment',
    fromUser: 'user123',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    read: false,
  },
  {
    id: '2',
    type: 'mention',
    message: 'You were mentioned in a comment',
    fromUser: 'user456',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    read: false,
  },
  {
    id: '3',
    type: 'vote',
    message: 'Someone upvoted your comment',
    fromUser: 'user789',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    read: true,
  },
];

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders notification button', () => {
      render(
        <NotificationsPanel
          notifications={[]}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );
      expect(screen.getByTitle('Notifications')).toBeInTheDocument();
    });

    it('shows unread count badge when there are unread notifications', () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );
      // 2 unread notifications
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('does not show badge when all notifications are read', () => {
      const allRead = mockNotifications.map((n) => ({ ...n, read: true }));
      render(
        <NotificationsPanel
          notifications={allRead}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('shows 99+ when there are more than 99 unread notifications', () => {
      const manyNotifications = Array.from({ length: 100 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        read: false,
      }));
      render(
        <NotificationsPanel
          notifications={manyNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );
      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('includes unread count in aria-label', () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );
      expect(screen.getByLabelText('Notifications (2)')).toBeInTheDocument();
    });
  });

  describe('dropdown', () => {
    it('opens dropdown when button is clicked', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      // Check for dropdown being visible (mobile header has "Notifications" text)
      expect(screen.getByText('Someone replied to your comment')).toBeInTheDocument();
    });

    it('closes dropdown when button is clicked again', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('Someone replied to your comment')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.queryByText('Someone replied to your comment')).not.toBeInTheDocument();
    });

    it('shows empty state when no notifications', async () => {
      render(
        <NotificationsPanel
          notifications={[]}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    });

    it('shows "Mark all read" button when there are unread notifications', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('Mark all read')).toBeInTheDocument();
    });

    it('hides "Mark all read" button when all notifications are read', async () => {
      const allRead = mockNotifications.map((n) => ({ ...n, read: true }));
      render(
        <NotificationsPanel
          notifications={allRead}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.queryByText('Mark all read')).not.toBeInTheDocument();
    });
  });

  describe('notification items', () => {
    it('displays all notification types correctly', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('Someone replied to your comment')).toBeInTheDocument();
      expect(screen.getByText('You were mentioned in a comment')).toBeInTheDocument();
      expect(screen.getByText('Someone upvoted your comment')).toBeInTheDocument();
    });

    it('shows relative time for notifications', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('5m ago')).toBeInTheDocument();
      expect(screen.getByText('1h ago')).toBeInTheDocument();
      expect(screen.getByText('1d ago')).toBeInTheDocument();
    });

    it('marks unread notifications with unread class', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      const items = document.querySelectorAll('.threadkit-notification-item');
      expect(items[0]).toHaveClass('unread');
      expect(items[1]).toHaveClass('unread');
      expect(items[2]).not.toHaveClass('unread');
    });
  });

  describe('interactions', () => {
    it('calls onMarkRead when clicking unread notification', async () => {
      const onMarkRead = vi.fn();
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={onMarkRead}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Someone replied to your comment'));
      });

      expect(onMarkRead).toHaveBeenCalledWith('1');
    });

    it('does not call onMarkRead when clicking already read notification', async () => {
      const onMarkRead = vi.fn();
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={onMarkRead}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Someone upvoted your comment'));
      });

      expect(onMarkRead).not.toHaveBeenCalled();
    });

    it('calls onMarkAllRead when clicking mark all read button', async () => {
      const onMarkAllRead = vi.fn();
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={onMarkAllRead}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Mark all read'));
      });

      expect(onMarkAllRead).toHaveBeenCalled();
    });

    it('calls onNotificationClick when clicking notification', async () => {
      const onNotificationClick = vi.fn();
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
          onNotificationClick={onNotificationClick}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Someone replied to your comment'));
      });

      expect(onNotificationClick).toHaveBeenCalledWith(mockNotifications[0]);
    });

    it('closes dropdown when clicking notification', async () => {
      render(
        <NotificationsPanel
          notifications={mockNotifications}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('Someone replied to your comment')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByText('Someone replied to your comment'));
      });

      expect(screen.queryByText('Someone replied to your comment')).not.toBeInTheDocument();
    });
  });

  describe('click outside', () => {
    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <button data-testid="outside">Outside</button>
          <NotificationsPanel
            notifications={mockNotifications}
            onMarkRead={vi.fn()}
            onMarkAllRead={vi.fn()}
          />
        </div>
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('Someone replied to your comment')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseDown(screen.getByTestId('outside'));
      });

      expect(screen.queryByText('Someone replied to your comment')).not.toBeInTheDocument();
    });
  });

  describe('time formatting', () => {
    it('shows "just now" for recent notifications', async () => {
      const recentNotification: Notification = {
        id: 'recent',
        type: 'reply',
        message: 'Just happened',
        fromUser: 'user',
        timestamp: new Date(Date.now() - 1000 * 30), // 30 seconds ago
        read: false,
      };

      render(
        <NotificationsPanel
          notifications={[recentNotification]}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('shows days for notifications within a week', async () => {
      const notification: Notification = {
        id: 'days',
        type: 'reply',
        message: 'Days ago',
        fromUser: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
        read: false,
      };

      render(
        <NotificationsPanel
          notifications={[notification]}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('shows full date for old notifications', async () => {
      const oldNotification: Notification = {
        id: 'old',
        type: 'reply',
        message: 'Old notification',
        fromUser: 'user',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), // 30 days ago
        read: false,
      };

      render(
        <NotificationsPanel
          notifications={[oldNotification]}
          onMarkRead={vi.fn()}
          onMarkAllRead={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Notifications'));
      });

      // Should show a date format like "11/5/2024"
      const dateText = screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
      expect(dateText).toBeInTheDocument();
    });
  });
});
