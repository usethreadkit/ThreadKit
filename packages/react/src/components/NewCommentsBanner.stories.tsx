import type { Meta, StoryObj } from '@storybook/react';
import { NewCommentsBanner } from './NewCommentsBanner';
import { TranslationProvider } from '../i18n';

const meta = {
  title: 'Components/NewCommentsBanner',
  component: NewCommentsBanner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <Story />
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof NewCommentsBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleComment: Story = {
  args: {
    count: 1,
    onClick: () => console.log('Load new comments clicked'),
  },
};

export const MultipleComments: Story = {
  args: {
    count: 5,
    onClick: () => console.log('Load new comments clicked'),
  },
};

export const ManyComments: Story = {
  args: {
    count: 42,
    onClick: () => console.log('Load new comments clicked'),
  },
};

export const NoComments: Story = {
  args: {
    count: 0,
    onClick: () => console.log('Load new comments clicked'),
  },
};
