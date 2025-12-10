import type { Meta, StoryObj } from '@storybook/react';
import { CommentForm } from './CommentForm';
import { TranslationProvider } from '../i18n';

const meta = {
  title: 'Components/CommentForm',
  component: CommentForm,
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
} satisfies Meta<typeof CommentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Write a comment...',
    onSubmit: async (text) => {
      console.log('Submitted:', text);
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
  },
};

export const WithAutoFocus: Story = {
  args: {
    placeholder: 'Write a comment...',
    autoFocus: true,
    onSubmit: async (text) => {
      console.log('Submitted:', text);
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
  },
};

export const ReplyForm: Story = {
  args: {
    placeholder: 'Write a reply...',
    parentId: '123',
    onSubmit: async (text, parentId) => {
      console.log('Reply submitted:', { text, parentId });
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
    onCancel: () => console.log('Cancelled'),
  },
};

export const WithCustomPlaceholder: Story = {
  args: {
    placeholder: 'Share your thoughts...',
    onSubmit: async (text) => {
      console.log('Submitted:', text);
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
  },
};
