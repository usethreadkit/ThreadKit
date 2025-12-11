import type { Meta, StoryObj } from '@storybook/react-vite';
import { SignInPrompt } from './SignInPrompt';
import { TranslationProvider } from '../i18n';
import { AuthProvider } from '../auth/AuthContext';

const meta = {
  title: 'Components/SignInPrompt',
  component: SignInPrompt,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <AuthProvider
          apiUrl="https://api.usethreadkit.com/v1"
          projectId="test-project"
        >
          <Story />
        </AuthProvider>
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof SignInPrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    placeholder: 'Write a comment...',
  },
};

export const WithCustomPlaceholder: Story = {
  args: {
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    placeholder: 'Share your thoughts...',
  },
};

export const InReplyContext: Story = {
  args: {
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
    placeholder: 'Write a reply...',
  },
};

// Note: The actual auth flow states (loading, methods, otp-input, etc.) are
// managed internally by the AuthContext and will be displayed dynamically
// when the user interacts with the component in Storybook.
//
// To see different states:
// 1. Default: Shows sign-in methods (or loading)
// 2. Click an auth method to see that flow
// 3. OTP flow: enter email -> enter code -> choose username
// 4. OAuth flow: opens popup window
// 5. Anonymous: enter optional name
