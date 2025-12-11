import type { Meta, StoryObj } from '@storybook/react-vite';
import { TypingIndicator } from './TypingIndicator';
import { TranslationProvider } from '../i18n';

const meta = {
  title: 'Components/TypingIndicator',
  component: TypingIndicator,
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
