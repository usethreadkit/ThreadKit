import type { Meta, StoryObj } from '@storybook/react';
import { NewRepliesIndicator } from './NewRepliesIndicator';
import { TranslationProvider } from '../i18n';

const meta = {
  title: 'Components/NewRepliesIndicator',
  component: NewRepliesIndicator,
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
} satisfies Meta<typeof NewRepliesIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleReply: Story = {
  args: {
    count: 1,
    onClick: () => console.log('Load new replies clicked'),
  },
};

export const MultipleReplies: Story = {
  args: {
    count: 3,
    onClick: () => console.log('Load new replies clicked'),
  },
};

export const ManyReplies: Story = {
  args: {
    count: 12,
    onClick: () => console.log('Load new replies clicked'),
  },
};

export const NoReplies: Story = {
  args: {
    count: 0,
    onClick: () => console.log('Load new replies clicked'),
  },
};
