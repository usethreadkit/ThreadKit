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
    className: 'w-10 h-10 rounded-full',
  },
};

export const WithoutImage: Story = {
  args: {
    alt: 'User avatar',
    className: 'w-10 h-10 rounded-full',
  },
};

export const LargeAvatar: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/1?v=4',
    alt: 'User avatar',
    className: 'w-20 h-20 rounded-full',
  },
};
