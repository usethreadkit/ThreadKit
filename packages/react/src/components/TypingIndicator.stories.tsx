import type { Meta, StoryObj } from '@storybook/react';
import { TypingIndicator } from './TypingIndicator';
import { ThreadKitProvider } from '../ThreadKit';

const meta = {
  title: 'Components/TypingIndicator',
  component: TypingIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThreadKitProvider
        siteId="example-site"
        apiKey="tk_pub_example"
        apiUrl="https://api.usethreadkit.com/v1"
      >
        <Story />
      </ThreadKitProvider>
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
        userName: 'alice',
        timestamp: Date.now(),
      },
    ],
  },
};

export const NoUsers: Story = {
  args: {
    typingUsers: [],
  },
};
