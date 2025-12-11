import type { Meta, StoryObj } from '@storybook/react-vite';
import { NotificationsPanel } from './NotificationsPanel';
import type { Notification } from './NotificationsPanel';
import { TranslationProvider } from '../i18n';

const meta = {
  title: 'Components/NotificationsPanel',
  component: NotificationsPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <div style={{ padding: '20px' }}>
          <Story />
        </div>
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof NotificationsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'reply',
    message: 'replied to your comment',
    commentId: 'comment-1',
    fromUser: 'johndoe',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    read: false,
  },
  {
    id: '2',
    type: 'mention',
    message: 'mentioned you in a comment',
    commentId: 'comment-2',
    fromUser: 'janedoe',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    read: false,
  },
  {
    id: '3',
    type: 'vote',
    message: 'upvoted your comment',
    commentId: 'comment-3',
    fromUser: 'bobsmith',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    read: true,
  },
  {
    id: '4',
    type: 'reply',
    message: 'replied to your comment',
    commentId: 'comment-4',
    fromUser: 'alicejones',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
  },
];

export const WithNotifications: Story = {
  args: {
    notifications: mockNotifications,
    onMarkRead: (id) => console.log('Mark read:', id),
    onMarkAllRead: () => console.log('Mark all read'),
    onNotificationClick: (notification) => console.log('Notification clicked:', notification),
  },
};

export const EmptyNotifications: Story = {
  args: {
    notifications: [],
    onMarkRead: (id) => console.log('Mark read:', id),
    onMarkAllRead: () => console.log('Mark all read'),
    onNotificationClick: (notification) => console.log('Notification clicked:', notification),
  },
};

export const AllUnread: Story = {
  args: {
    notifications: mockNotifications.map((n) => ({ ...n, read: false })),
    onMarkRead: (id) => console.log('Mark read:', id),
    onMarkAllRead: () => console.log('Mark all read'),
    onNotificationClick: (notification) => console.log('Notification clicked:', notification),
  },
};

export const AllRead: Story = {
  args: {
    notifications: mockNotifications.map((n) => ({ ...n, read: true })),
    onMarkRead: (id) => console.log('Mark read:', id),
    onMarkAllRead: () => console.log('Mark all read'),
    onNotificationClick: (notification) => console.log('Notification clicked:', notification),
  },
};

export const ManyNotifications: Story = {
  args: {
    notifications: [
      ...mockNotifications,
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `extra-${i}`,
        type: 'reply' as const,
        message: 'replied to your comment',
        commentId: `comment-extra-${i}`,
        fromUser: `user${i}`,
        timestamp: new Date(Date.now() - (i + 5) * 60 * 60 * 1000),
        read: i % 3 === 0,
      })),
    ],
    onMarkRead: (id) => console.log('Mark read:', id),
    onMarkAllRead: () => console.log('Mark all read'),
    onNotificationClick: (notification) => console.log('Notification clicked:', notification),
  },
};
