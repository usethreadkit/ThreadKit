import type { Meta, StoryObj } from '@storybook/react';
import { ThreadKit } from './ThreadKit';
import type { Comment } from './types';

const meta = {
  title: 'ThreadKit/Main',
  component: ThreadKit,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ThreadKit>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockComments: Comment[] = [
  {
    id: '1',
    userId: 'user-1',
    userName: 'alice',
    text: 'This is a great discussion! I really enjoyed reading through the article.',
    timestamp: Date.now() - 7200000, // 2 hours ago
    upvotes: 15,
    downvotes: 2,
    children: [
      {
        id: '2',
        userId: 'user-2',
        userName: 'bob',
        text: 'I agree! The section about **real-time updates** was particularly interesting.',
        timestamp: Date.now() - 5400000,
        upvotes: 8,
        downvotes: 0,
        children: [
          {
            id: '3',
            userId: 'user-1',
            userName: 'alice',
            text: 'Yes! And the WebSocket implementation is very clean.',
            timestamp: Date.now() - 4800000,
            upvotes: 5,
            downvotes: 0,
            children: [],
            depth: 2,
            status: 'approved',
            pageUrl: 'https://example.com',
          },
        ],
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
    id: '4',
    userId: 'user-3',
    userName: 'charlie',
    text: 'Has anyone tried implementing this in production? Would love to hear about experiences.\n\n> Particularly interested in scaling considerations',
    timestamp: Date.now() - 3600000, // 1 hour ago
    upvotes: 12,
    downvotes: 1,
    children: [
      {
        id: '5',
        userId: 'user-4',
        userName: 'diana',
        text: 'We implemented it last month and it has been working great! Performance is excellent even with 10k+ comments.',
        timestamp: Date.now() - 2400000,
        upvotes: 7,
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
    id: '6',
    userId: 'user-5',
    userName: 'eve',
    text: 'Quick question: does this support markdown?\n\nTrying to format code like:\n```javascript\nconst example = "test";\n```',
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
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    initialComments: mockComments,
  },
};

export const DarkTheme: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    theme: 'dark',
    initialComments: mockComments,
  },
};

export const WithCustomColors: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    initialComments: mockComments,
    cssVariables: {
      primary: '#7c3aed',
      primaryHover: '#6d28d9',
      upvote: '#10b981',
      downvote: '#ef4444',
      link: '#7c3aed',
      linkHover: '#6d28d9',
    },
  },
};

export const NoVoting: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    allowVoting: false,
    initialComments: mockComments,
  },
};

export const ShallowNesting: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    maxDepth: 2,
    initialComments: mockComments,
  },
};

export const SortedByNew: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    sortBy: 'new',
    initialComments: mockComments,
  },
};

export const EmptyState: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    initialComments: [],
  },
};

export const WithEventCallbacks: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    initialComments: mockComments,
    onCommentPosted: (comment) => console.log('Comment posted:', comment),
    onCommentDeleted: (id) => console.log('Comment deleted:', id),
    onCommentEdited: (id, text) => console.log('Comment edited:', id, text),
    onVote: (id, type) => console.log('Vote:', id, type),
    onSignIn: (user) => console.log('User signed in:', user),
    onSignOut: () => console.log('User signed out'),
  },
};

export const NoBranding: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    hideBranding: true,
    initialComments: mockComments,
  },
};

export const CustomClassName: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    className: 'my-custom-threadkit',
    initialComments: mockComments,
  },
};

export const WithCustomStyles: Story = {
  args: {
    url: 'https://example.com/article',
    projectId: 'test-project',
    apiUrl: 'https://api.usethreadkit.com/v1',
    style: {
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      padding: '20px',
      backgroundColor: '#f9fafb',
    },
    initialComments: mockComments,
  },
};
