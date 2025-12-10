import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { MentionInput } from './MentionInput';

const meta = {
  title: 'Components/MentionInput',
  component: MentionInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MentionInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockUsers = [
  { id: '1', name: 'johndoe', avatar: 'https://avatars.githubusercontent.com/u/1?v=4' },
  { id: '2', name: 'janedoe', avatar: 'https://avatars.githubusercontent.com/u/2?v=4' },
  { id: '3', name: 'bobsmith', avatar: 'https://avatars.githubusercontent.com/u/3?v=4' },
  { id: '4', name: 'alicejones', avatar: 'https://avatars.githubusercontent.com/u/4?v=4' },
  { id: '5', name: 'charliebrown' },
];

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <MentionInput
        value={value}
        onChange={setValue}
        placeholder="Type a comment..."
      />
    );
  },
};

export const WithMentions: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <MentionInput
        value={value}
        onChange={setValue}
        placeholder="Type @ to mention someone..."
        enableMentions={true}
        getMentionSuggestions={async (query) => {
          // Filter users by query
          return mockUsers.filter((user) =>
            user.name.toLowerCase().includes(query.toLowerCase())
          );
        }}
      />
    );
  },
};

export const WithInitialValue: Story = {
  render: () => {
    const [value, setValue] = useState('Hey @johndoe, what do you think?');
    return (
      <MentionInput
        value={value}
        onChange={setValue}
        enableMentions={true}
        getMentionSuggestions={async (query) => {
          return mockUsers.filter((user) =>
            user.name.toLowerCase().includes(query.toLowerCase())
          );
        }}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const [value, setValue] = useState('This input is disabled');
    return (
      <MentionInput
        value={value}
        onChange={setValue}
        disabled={true}
      />
    );
  },
};

export const AutoFocus: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <MentionInput
        value={value}
        onChange={setValue}
        placeholder="Auto-focused input..."
        autoFocus={true}
      />
    );
  },
};
