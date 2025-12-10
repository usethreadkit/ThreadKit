import type { Meta, StoryObj } from '@storybook/react';
import { ChatView } from './ChatView';
import { TranslationProvider } from '../i18n';
import { AuthProvider } from '../auth';
import type { Comment, User } from '../types';

const meta = {
  title: 'Components/ChatView',
  component: ChatView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AuthProvider apiUrl="https://api.usethreadkit.com/v1" projectId="test-project">
        <TranslationProvider>
          <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Story />
          </div>
        </TranslationProvider>
      </AuthProvider>
    ),
  ],
} satisfies Meta<typeof ChatView>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockUser: User = {
  id: 'user-current',
  userName: 'currentuser',
  email: 'user@example.com',
  isAnonymous: false,
  isModerator: false,
  isAdmin: false,
};

const mockMessages: Comment[] = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'alice',
    text: 'Hey everyone! 👋',
    timestamp: Date.now() - 600000, // 10 min ago
    upvotes: 0,
    downvotes: 0,
    children: [],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com/chat',
  },
  {
    id: '2',
    userId: 'user-2',
    userName: 'bob',
    text: 'Welcome to the chat!',
    timestamp: Date.now() - 540000, // 9 min ago
    upvotes: 0,
    downvotes: 0,
    children: [],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com/chat',
  },
  {
    id: '3',
    userId: 'user-current',
    userName: 'currentuser',
    text: 'Thanks! Happy to be here',
    timestamp: Date.now() - 480000, // 8 min ago
    upvotes: 0,
    downvotes: 0,
    children: [],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com/chat',
  },
  {
    id: '4',
    userId: 'user-3',
    userName: 'charlie',
    text: 'Anyone watching the stream?',
    timestamp: Date.now() - 120000, // 2 min ago
    upvotes: 0,
    downvotes: 0,
    children: [],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com/chat',
  },
];

export const Default: Story = {
  args: {
    comments: mockMessages,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
    onTyping: () => console.log('User is typing'),
  },
};

export const WithPresence: Story = {
  args: {
    comments: mockMessages,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    showPresence: true,
    presenceCount: 42,
    wsConnected: true,
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
  },
};

export const WithTypingIndicator: Story = {
  args: {
    comments: mockMessages,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    typingUsers: [
      { userId: 'user-4', userName: 'david' },
    ],
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
    onTyping: () => console.log('User is typing'),
  },
};

export const Disconnected: Story = {
  args: {
    comments: mockMessages,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    wsConnected: false,
    showPresence: true,
    presenceCount: 0,
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
  },
};

export const EmptyChat: Story = {
  args: {
    comments: [],
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
  },
};

export const GuestView: Story = {
  args: {
    comments: mockMessages,
    currentUser: undefined,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
  },
};

export const ModeratorView: Story = {
  args: {
    comments: mockMessages,
    currentUser: {
      ...mockUser,
      isModerator: true,
    },
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    autoScroll: true,
    onSend: async (text) => console.log('Send message:', text),
    onDelete: (commentId) => console.log('Delete:', commentId),
    onBan: (userId) => console.log('Ban:', userId),
    onBlock: (userId) => console.log('Block:', userId),
    onReport: (commentId) => console.log('Report:', commentId),
  },
};
