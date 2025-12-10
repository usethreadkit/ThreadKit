import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPanel } from './SettingsPanel';
import { I18nProvider } from '../i18n';
import type { User } from '../types';

const meta = {
  title: 'Components/SettingsPanel',
  component: SettingsPanel,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <I18nProvider>
        <div style={{ padding: '20px' }}>
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof SettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockUser: User = {
  id: 'user-1',
  userName: 'johndoe',
  email: 'john@example.com',
  isAnonymous: false,
  isModerator: false,
  isAdmin: false,
  avatar: 'https://avatars.githubusercontent.com/u/1?v=4',
  socialLinks: {
    twitter: 'johndoe',
    github: 'johndoe',
  },
};

export const LoggedIn: Story = {
  args: {
    currentUser: mockUser,
    theme: 'light',
    blockedUsers: [],
    onLogin: () => console.log('Login clicked'),
    onLogout: () => console.log('Logout clicked'),
    onUpdateAvatar: (avatar) => console.log('Update avatar:', avatar),
    onUpdateName: (name) => console.log('Update name:', name),
    onUpdateSocialLinks: (links) => console.log('Update social links:', links),
    onUnblock: (userId) => console.log('Unblock user:', userId),
    onThemeChange: (theme) => console.log('Theme change:', theme),
    onDeleteAccount: () => console.log('Delete account'),
  },
};

export const LoggedOut: Story = {
  args: {
    currentUser: undefined,
    theme: 'light',
    blockedUsers: [],
    onLogin: () => console.log('Login clicked'),
    onLogout: () => console.log('Logout clicked'),
    onUpdateAvatar: (avatar) => console.log('Update avatar:', avatar),
    onUpdateName: (name) => console.log('Update name:', name),
    onUpdateSocialLinks: (links) => console.log('Update social links:', links),
    onUnblock: (userId) => console.log('Unblock user:', userId),
    onThemeChange: (theme) => console.log('Theme change:', theme),
    onDeleteAccount: () => console.log('Delete account'),
  },
};

export const DarkTheme: Story = {
  args: {
    currentUser: mockUser,
    theme: 'dark',
    blockedUsers: [],
    onLogin: () => console.log('Login clicked'),
    onLogout: () => console.log('Logout clicked'),
    onUpdateAvatar: (avatar) => console.log('Update avatar:', avatar),
    onUpdateName: (name) => console.log('Update name:', name),
    onUpdateSocialLinks: (links) => console.log('Update social links:', links),
    onUnblock: (userId) => console.log('Unblock user:', userId),
    onThemeChange: (theme) => console.log('Theme change:', theme),
    onDeleteAccount: () => console.log('Delete account'),
  },
};

export const WithBlockedUsers: Story = {
  args: {
    currentUser: mockUser,
    theme: 'light',
    blockedUsers: [
      { id: 'user-2', name: 'spammer123' },
      { id: 'user-3', name: 'troll456' },
      { id: 'user-4', name: 'baduser789' },
    ],
    onLogin: () => console.log('Login clicked'),
    onLogout: () => console.log('Logout clicked'),
    onUpdateAvatar: (avatar) => console.log('Update avatar:', avatar),
    onUpdateName: (name) => console.log('Update name:', name),
    onUpdateSocialLinks: (links) => console.log('Update social links:', links),
    onUnblock: (userId) => console.log('Unblock user:', userId),
    onThemeChange: (theme) => console.log('Theme change:', theme),
    onDeleteAccount: () => console.log('Delete account'),
  },
};
