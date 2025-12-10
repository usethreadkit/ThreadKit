import type { Meta, StoryObj } from '@storybook/react';
import { TypingIndicator } from './TypingIndicator';
import { I18nProvider } from '../i18n';

const meta = {
  title: 'Components/TypingIndicator',
  component: TypingIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <I18nProvider>
        <Story />
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof TypingIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleUser: Story = {
  args: {
    typingUsers: [
      {
        userId: '1',
        userName: 'johndoe',
        contextType: 'page',
        contextId: 'test',
      },
    ],
  },
};

export const MultipleUsers: Story = {
  args: {
    typingUsers: [
      {
        userId: '1',
        userName: 'johndoe',
        contextType: 'page',
        contextId: 'test',
      },
      {
        userId: '2',
        userName: 'janedoe',
        contextType: 'page',
        contextId: 'test',
      },
    ],
  },
};

export const NoUsers: Story = {
  args: {
    typingUsers: [],
  },
};
