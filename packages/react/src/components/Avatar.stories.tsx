import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    alt: 'User avatar',
  },
  render: (args) => (
    <Avatar {...args} className="threadkit-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
  ),
};

export const WithoutImage: Story = {
  args: {
    alt: 'User avatar',
  },
  render: (args) => (
    <Avatar {...args} className="threadkit-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
  ),
};

export const LargeAvatar: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    alt: 'User avatar',
  },
  render: (args) => (
    <Avatar {...args} className="threadkit-avatar" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
  ),
};
