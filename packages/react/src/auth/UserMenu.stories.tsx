import type { Meta, StoryObj } from '@storybook/react';
import { UserMenu } from './UserMenu';
import { AuthProvider } from './AuthContext';
import { TranslationProvider } from '../i18n';
import { useEffect } from 'react';
import { useAuth } from './AuthContext';

const meta = {
  title: 'Auth/UserMenu',
  component: UserMenu,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <AuthProvider apiUrl="https://api.usethreadkit.com/v1" projectId="test-project">
          <div style={{ padding: '20px' }}>
            <Story />
          </div>
        </AuthProvider>
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof UserMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {
  args: {
    onLogin: () => console.log('Login clicked'),
  },
};

// Helper component to set mock user state
function LoggedInWrapper({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  useEffect(() => {
    // Mock a logged-in user by manipulating localStorage
    // Note: This is a simplified approach for Storybook demo
    if (!state.user) {
      localStorage.setItem('threadkit_token', 'mock-token');
      localStorage.setItem('threadkit_user', JSON.stringify({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
      }));
    }
  }, [state.user]);

  return <>{children}</>;
}

export const LoggedInWithAvatar: Story = {
  args: {
    onLogin: () => console.log('Login clicked'),
  },
  decorators: [
    (Story) => (
      <LoggedInWrapper>
        <Story />
      </LoggedInWrapper>
    ),
  ],
};

export const LoggedInNoAvatar: Story = {
  args: {
    onLogin: () => console.log('Login clicked'),
  },
  decorators: [
    (Story) => (
      <LoggedInWrapper>
        <Story />
      </LoggedInWrapper>
    ),
  ],
};
