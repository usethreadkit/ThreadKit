import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoginModal } from './LoginModal';
import { AuthProvider } from './AuthContext';
import { TranslationProvider } from '../i18n';

const meta = {
  title: 'Auth/LoginModal',
  component: LoginModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TranslationProvider>
        <AuthProvider apiUrl="https://api.usethreadkit.com/v1" projectId="test-project">
          <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
            <Story />
          </div>
        </AuthProvider>
      </TranslationProvider>
    ),
  ],
} satisfies Meta<typeof LoginModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClose: () => console.log('Close modal'),
    apiUrl: 'https://api.usethreadkit.com/v1',
    projectId: 'test-project',
  },
};

export const WithCustomApiUrl: Story = {
  args: {
    onClose: () => console.log('Close modal'),
    apiUrl: 'https://custom-api.example.com/v1',
    projectId: 'custom-project-id',
  },
};
