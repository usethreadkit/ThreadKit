import type { Meta, StoryObj } from '@storybook/react';
import { PinnedMessage } from './PinnedMessage';
import { TranslationProvider } from '../i18n';
import type { Comment } from '../types';

const meta = {
  title: 'Components/PinnedMessage',
  component: PinnedMessage,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <Story />
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof PinnedMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockComment: Comment = {
  id: 'pinned-1',
  userId: 'user-1',
  userName: 'moderator',
  text: 'Welcome to the discussion! Please keep comments respectful and on-topic.',
  timestamp: Date.now() - 86400000, // 1 day ago
  upvotes: 42,
  downvotes: 1,
  children: [],
  depth: 0,
  status: 'approved',
  pageUrl: 'https://example.com',
  pinned: true,
};

export const Default: Story = {
  args: {
    comment: mockComment,
    onNavigate: (commentId) => console.log('Navigate to comment:', commentId),
  },
};

export const WithMarkdown: Story = {
  args: {
    comment: {
      ...mockComment,
      text: '**Important:** Please read our [community guidelines](https://example.com/guidelines) before posting.\n\n- Be respectful\n- Stay on topic\n- No spam or self-promotion',
    },
    onNavigate: (commentId) => console.log('Navigate to comment:', commentId),
  },
};

export const Announcement: Story = {
  args: {
    comment: {
      ...mockComment,
      userName: 'admin',
      text: '🎉 We just launched a new feature! Check out the announcement post for details.',
    },
    onNavigate: (commentId) => console.log('Navigate to comment:', commentId),
  },
};

export const LongMessage: Story = {
  args: {
    comment: {
      ...mockComment,
      text: `This is a longer pinned message that contains multiple paragraphs and provides important information to all users.

Here's some additional context that explains the rules and guidelines in more detail. You can include **bold text**, *italic text*, and even \`code snippets\`.

> Important: Make sure to follow all community guidelines.

Thank you for participating in our community!`,
    },
    onNavigate: (commentId) => console.log('Navigate to comment:', commentId),
  },
};

export const EditedMessage: Story = {
  args: {
    comment: {
      ...mockComment,
      text: 'Updated rules: Please follow our new posting guidelines.',
      edited: true,
    },
    onNavigate: (commentId) => console.log('Navigate to comment:', commentId),
  },
};

export const WithLink: Story = {
  args: {
    comment: {
      ...mockComment,
      text: 'Check out our [FAQ](https://example.com/faq) for common questions and answers.',
    },
    onNavigate: (commentId) => console.log('Navigate to comment:', commentId),
  },
};
