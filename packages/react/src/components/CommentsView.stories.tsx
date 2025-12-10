import type { Meta, StoryObj } from '@storybook/react';
import { CommentsView } from './CommentsView';
import { TranslationProvider } from '../i18n';
import { AuthProvider } from '../auth';
import type { Comment, User } from '../types';

const meta = {
  title: 'Components/CommentsView',
  component: CommentsView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <AuthProvider apiUrl="https://api.usethreadkit.com/v1" projectId="test-project">
        <TranslationProvider>
          <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
            <Story />
          </div>
        </TranslationProvider>
      </AuthProvider>
    ),
  ],
} satisfies Meta<typeof CommentsView>;

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

const mockComments: Comment[] = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'alice',
    text: 'This is a great article! Thanks for sharing.',
    timestamp: Date.now() - 7200000, // 2 hours ago
    upvotes: 15,
    downvotes: 2,
    children: [
      {
        id: '2',
        userId: 'user-2',
        userName: 'bob',
        text: 'I agree! Very informative.',
        timestamp: Date.now() - 5400000,
        upvotes: 8,
        downvotes: 0,
        children: [],
        depth: 1,
        status: 'approved',
        pageUrl: 'https://example.com',
      },
    ],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com',
  },
  {
    id: '3',
    userId: 'user-3',
    userName: 'charlie',
    text: 'Has anyone tried implementing this? What were your results?',
    timestamp: Date.now() - 3600000, // 1 hour ago
    upvotes: 5,
    downvotes: 1,
    children: [],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com',
  },
  {
    id: '4',
    userId: 'user-current',
    userName: 'currentuser',
    text: 'I tried it last week and got amazing results!',
    timestamp: Date.now() - 1800000, // 30 min ago
    upvotes: 3,
    downvotes: 0,
    children: [],
    depth: 0,
    status: 'approved',
    pageUrl: 'https://example.com',
  },
];

export const Default: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    maxDepth: 5,
    onPost: async (text, parentId) => console.log('Post:', text, parentId),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onSortChange: (sort) => console.log('Sort changed:', sort),
  },
};

export const EmptyComments: Story = {
  args: {
    comments: [],
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    onPost: async (text) => console.log('Post:', text),
  },
};

export const GuestView: Story = {
  args: {
    comments: mockComments,
    currentUser: undefined,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote (disabled):', commentId, voteType),
  },
};

export const SortedByNew: Story = {
  args: {
    comments: [...mockComments].sort((a, b) => b.timestamp - a.timestamp),
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'new',
    allowVoting: true,
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onSortChange: (sort) => console.log('Sort changed:', sort),
  },
};

export const WithPendingComments: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    pendingRootCount: 3,
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onLoadPendingComments: () => console.log('Load pending comments'),
  },
};

export const ModeratorView: Story = {
  args: {
    comments: mockComments,
    currentUser: {
      ...mockUser,
      isModerator: true,
    },
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onDelete: (commentId) => console.log('Delete:', commentId),
    onBan: (userId) => console.log('Ban:', userId),
    onBlock: (userId) => console.log('Block:', userId),
    onReport: (commentId) => console.log('Report:', commentId),
  },
};

export const WithTypingIndicators: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    typingByComment: new Map([
      [null, [{ userId: 'user-5', userName: 'david', contextType: 'page' as const, contextId: 'test' }]],
    ]),
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const NoVoting: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'new',
    allowVoting: false,
    onPost: async (text) => console.log('Post:', text),
    onSortChange: (sort) => console.log('Sort changed:', sort),
  },
};

export const WithCollapsedThreads: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    collapsedThreads: new Set(['1']),
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onCollapse: (commentId) => console.log('Collapse toggled:', commentId),
  },
};

export const WithHighlightedComment: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    highlightedCommentId: '2',
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const WithPendingReplies: Story = {
  args: {
    comments: mockComments,
    currentUser: mockUser,
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    sortBy: 'top',
    allowVoting: true,
    pendingReplies: new Map([
      ['1', [
        {
          id: 'pending-1',
          userId: 'user-5',
          userName: 'emma',
          text: 'This is a pending reply',
          timestamp: Date.now(),
          upvotes: 0,
          downvotes: 0,
          children: [],
          depth: 1,
          status: 'approved',
          pageUrl: 'https://example.com',
        },
      ]],
    ]),
    onPost: async (text) => console.log('Post:', text),
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onLoadPendingReplies: (parentId) => console.log('Load pending replies for:', parentId),
  },
};
