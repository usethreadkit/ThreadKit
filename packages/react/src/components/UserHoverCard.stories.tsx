import type { Meta, StoryObj } from '@storybook/react';
import { UserHoverCard } from './UserHoverCard';
import { TranslationProvider } from '../i18n';
import type { UserProfile } from '../types';

const meta = {
  title: 'Components/UserHoverCard',
  component: UserHoverCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <div style={{ padding: '100px' }}>
          <Story />
        </div>
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof UserHoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockProfile: UserProfile = {
  id: '1',
  name: 'johndoe',
  avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
  karma: 1234,
  totalComments: 567,
  joinDate: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
  socialLinks: {
    twitter: 'johndoe',
    github: 'johndoe',
  },
};

const mockProfileWithoutSocial: UserProfile = {
  id: '2',
  name: 'janedoe',
  avatar: 'https://avatars.githubusercontent.com/u/2?v=4',
  karma: 5678,
  totalComments: 1234,
  joinDate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 6 months ago
};

export const WithSocialLinks: Story = {
  args: {
    userId: '1',
    getUserProfile: (userId: string) => (userId === '1' ? mockProfile : undefined),
    children: <span>Hover over this username</span>,
  },
};

export const WithoutSocialLinks: Story = {
  args: {
    userId: '2',
    getUserProfile: (userId: string) => (userId === '2' ? mockProfileWithoutSocial : undefined),
    children: <span>Hover over this username</span>,
  },
};

export const NoProfile: Story = {
  args: {
    userId: '3',
    getUserProfile: () => undefined,
    children: <span>No hover card (no profile)</span>,
  },
};
