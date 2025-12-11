import type { Meta, StoryObj } from '@storybook/react-vite';
import { Comment } from './Comment';
import { TranslationProvider } from '../i18n';
import { ScoreDisplayProvider } from '../contexts/ScoreDisplayContext';
import type { Comment as CommentType, User } from '../types';

const meta = {
  title: 'Components/Comment',
  component: Comment,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <ScoreDisplayProvider>
          <Story />
        </ScoreDisplayProvider>
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof Comment>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockComment: CommentType = {
  id: '1',
  userId: 'user-1',
  userName: 'johndoe',
  text: 'This is a **sample comment** with some [markdown](https://example.com) formatting!',
  timestamp: Date.now() - 3600000, // 1 hour ago
  upvotes: 15,
  downvotes: 2,
  children: [],
  depth: 0,
  status: 'approved',
  pageUrl: 'https://example.com',
};

const mockUser: User = {
  id: 'user-current',
  userName: 'currentuser',
  email: 'user@example.com',
  isAnonymous: false,
  isModerator: false,
  isAdmin: false,
};

export const Default: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onPost: async (text, parentId) => console.log('Post reply:', text, parentId),
  },
};

export const WithUpvote: Story = {
  args: {
    comment: {
      ...mockComment,
      userVote: 'up',
      upvotes: 16,
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const WithDownvote: Story = {
  args: {
    comment: {
      ...mockComment,
      userVote: 'down',
      downvotes: 3,
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const WithReplies: Story = {
  args: {
    comment: {
      ...mockComment,
      children: [
        {
          id: '2',
          userId: 'user-2',
          userName: 'janedoe',
          text: 'Great point! I totally agree.',
          timestamp: Date.now() - 1800000,
          upvotes: 5,
          downvotes: 0,
          children: [],
          depth: 1,
          status: 'approved',
          pageUrl: 'https://example.com',
        },
        {
          id: '3',
          userId: 'user-3',
          userName: 'bobsmith',
          text: 'Thanks for sharing this!',
          timestamp: Date.now() - 900000,
          upvotes: 3,
          downvotes: 1,
          children: [],
          depth: 1,
          status: 'approved',
          pageUrl: 'https://example.com',
        },
      ],
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onPost: async (text, parentId) => console.log('Post reply:', text, parentId),
  },
};

export const Collapsed: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    collapsed: true,
    onCollapse: (commentId) => console.log('Collapsed:', commentId),
  },
};

export const Highlighted: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    highlighted: true,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const OwnComment: Story = {
  args: {
    comment: {
      ...mockComment,
      userId: 'user-current',
      userName: 'currentuser',
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onEdit: (commentId, newText) => console.log('Edit:', commentId, newText),
    onDelete: (commentId) => console.log('Delete:', commentId),
  },
};

export const DeletedComment: Story = {
  args: {
    comment: {
      ...mockComment,
      status: 'deleted',
      text: '[deleted]',
      userName: '[deleted]',
    },
    currentUser: mockUser,
  },
};

export const ModeratorView: Story = {
  args: {
    comment: mockComment,
    currentUser: {
      ...mockUser,
      isModerator: true,
    },
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onDelete: (commentId) => console.log('Delete:', commentId),
    onBan: (userId) => console.log('Ban user:', userId),
    onBlock: (userId) => console.log('Block user:', userId),
    onReport: (commentId) => console.log('Report:', commentId),
  },
};

export const GuestView: Story = {
  args: {
    comment: mockComment,
    currentUser: undefined,
    onVote: (commentId, voteType) => console.log('Vote (disabled):', commentId, voteType),
  },
};

export const LongComment: Story = {
  args: {
    comment: {
      ...mockComment,
      text: `This is a much longer comment that contains multiple paragraphs and various markdown formatting.

## Here's a heading

And here's a list:
- Item one
- Item two
- Item three

Plus some **bold text** and *italic text* and even some \`inline code\`.

> And a quote for good measure

[And a link to something](https://example.com)`,
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const Focused: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    focusedCommentId: '1',
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onCommentClick: (commentId) => console.log('Comment clicked:', commentId),
  },
};

export const WithKeyboardNavigation: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    index: 2,
    totalSiblings: 5,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onPrev: () => console.log('Navigate to previous comment'),
    onNext: () => console.log('Navigate to next comment'),
    onCommentClick: (commentId) => console.log('Comment clicked:', commentId),
  },
};

export const WithPendingReplies: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    pendingRepliesCount: 5,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    onLoadPendingReplies: (parentId) => console.log('Load pending replies for:', parentId),
  },
};

export const WithUserProfile: Story = {
  args: {
    comment: mockComment,
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
    getUserProfile: (userId) => ({
      id: userId,
      name: 'johndoe',
      avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      bio: 'Software developer and open source enthusiast',
      social_links: {
        twitter: 'johndoe',
        github: 'johndoe',
      },
      comment_count: 42,
      joined_at: Date.now() - 86400000 * 365, // 1 year ago
    }),
    fetchUserProfile: (userId) => {
      console.log('Fetch user profile:', userId);
      return Promise.resolve();
    },
  },
};

export const WithImage: Story = {
  args: {
    comment: {
      ...mockComment,
      text: 'Check out this awesome image I found!\n\n![Sample image](https://picsum.photos/600/400)',
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};

export const WithMultipleImages: Story = {
  args: {
    comment: {
      ...mockComment,
      text: 'Here are some cool images:\n\n![First image](https://picsum.photos/400/300)\n\n![Second image](https://picsum.photos/500/350)\n\nWhat do you think?',
    },
    currentUser: mockUser,
    onVote: (commentId, voteType) => console.log('Vote:', commentId, voteType),
  },
};
