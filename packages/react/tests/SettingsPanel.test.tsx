import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsPanel } from '../src/components/SettingsPanel';
import type { User } from '../src/types';

const mockUser: User = {
  id: 'user-1',
  name: 'TestUser',
  avatar: 'https://example.com/avatar.png',
  isModerator: false,
  isAdmin: false,
};

const mockBlockedUsers = [
  { id: 'blocked-1', name: 'BlockedUser1' },
  { id: 'blocked-2', name: 'BlockedUser2' },
];

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('rendering', () => {
    it('renders settings button', () => {
      render(
        <SettingsPanel
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );
      expect(screen.getByTitle('Settings')).toBeInTheDocument();
    });

    it('shows sign in button when no user', async () => {
      render(
        <SettingsPanel
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    it('shows user info when logged in', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      expect(screen.getByText('TestUser')).toBeInTheDocument();
      expect(screen.getByAltText('TestUser')).toBeInTheDocument();
    });
  });

  describe('login/logout', () => {
    it('calls onLogin when sign in is clicked', async () => {
      const onLogin = vi.fn();
      render(
        <SettingsPanel
          theme="light"
          blockedUsers={[]}
          onLogin={onLogin}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Sign in'));
      });

      expect(onLogin).toHaveBeenCalled();
    });

    it('calls onLogout when sign out is clicked', async () => {
      const onLogout = vi.fn();
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={onLogout}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Sign out'));
      });

      expect(onLogout).toHaveBeenCalled();
    });
  });

  describe('theme toggle', () => {
    it('shows current theme as active button', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      // Light theme button should be marked as pressed
      const lightThemeBtn = screen.getByLabelText('Light theme');
      expect(lightThemeBtn).toHaveAttribute('aria-pressed', 'true');
    });

    it('calls onThemeChange when dark theme button is clicked', async () => {
      const onThemeChange = vi.fn();
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={onThemeChange}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Dark theme'));
      });

      expect(onThemeChange).toHaveBeenCalledWith('dark');
    });
  });



  describe('name editing', () => {
    it('enters edit mode when edit button is clicked', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Edit name'));
      });

      expect(screen.getByDisplayValue('TestUser')).toBeInTheDocument();
      expect(screen.getByText(/save/i)).toBeInTheDocument();
    });

    it('calls onUpdateName when name is saved', async () => {
      const onUpdateName = vi.fn();
      // Mock the username check API
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ available: true }),
      });

      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={onUpdateName}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Edit name'));
      });

      const input = screen.getByDisplayValue('TestUser');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'NewName' } });
      });

      // Wait for the 500ms debounce and API call to complete
      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      await act(async () => {
        await Promise.resolve();
      });

      await act(async () => {
        fireEvent.click(screen.getByText(/save/i));
      });

      expect(onUpdateName).toHaveBeenCalledWith('newname');
    });

    it('saves name on Enter key', async () => {
      const onUpdateName = vi.fn();
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={onUpdateName}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Edit name'));
      });

      const input = screen.getByDisplayValue('TestUser');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'NewName' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });

      expect(onUpdateName).toHaveBeenCalledWith('newname');
    });

    it('cancels edit on Escape key', async () => {
      const onUpdateName = vi.fn();
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={onUpdateName}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTitle('Edit name'));
      });

      const input = screen.getByDisplayValue('TestUser');
      await act(async () => {
        fireEvent.change(input, { target: { value: 'NewName' } });
        fireEvent.keyDown(input, { key: 'Escape' });
      });

      expect(onUpdateName).not.toHaveBeenCalled();
      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });
  });

  describe('blocked users', () => {
    it('shows blocked users count', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={mockBlockedUsers}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      expect(screen.getByText('Blocked users (2)')).toBeInTheDocument();
    });

    it('shows blocked users list when expanded', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={mockBlockedUsers}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Blocked users (2)'));
      });

      expect(screen.getByText('BlockedUser1')).toBeInTheDocument();
      expect(screen.getByText('BlockedUser2')).toBeInTheDocument();
    });

    it('shows empty state when no blocked users', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Blocked users (0)'));
      });

      expect(screen.getByText('No blocked users')).toBeInTheDocument();
    });

    it('calls onUnblock when unblock is clicked', async () => {
      const onUnblock = vi.fn();
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={mockBlockedUsers}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={onUnblock}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Blocked users (2)'));
      });

      const unblockButtons = screen.getAllByText(/unblock/i);
      await act(async () => {
        fireEvent.click(unblockButtons[0]);
      });

      expect(onUnblock).toHaveBeenCalledWith('blocked-1');
    });
  });

  describe('notifications settings', () => {
    it('shows notification settings when expanded', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      // Find and click the Notifications button (not the component)
      const notificationsButton = screen.getByRole('button', { name: /Notifications/ });
      await act(async () => {
        fireEvent.click(notificationsButton);
      });

      expect(screen.getByText('Email on replies')).toBeInTheDocument();
      expect(screen.getByText('Email on mentions')).toBeInTheDocument();
      expect(screen.getByText('Weekly digest')).toBeInTheDocument();
    });
  });

  describe('delete account', () => {
    it('shows delete account button', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      expect(screen.getByText('Delete account')).toBeInTheDocument();
    });

    it('enters delete mode when delete is clicked', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete account'));
      });

      expect(screen.getByText('Hold to delete account (15s)')).toBeInTheDocument();
    });

    it('shows countdown when holding delete button', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete account'));
      });

      const holdButton = screen.getByText('Hold to delete account (15s)');

      await act(async () => {
        fireEvent.mouseDown(holdButton);
      });

      // Advance timer by 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText('Hold for 14 more seconds...')).toBeInTheDocument();
    });

    it('resets countdown when mouse is released', async () => {
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={vi.fn()}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete account'));
      });

      const holdButton = screen.getByText('Hold to delete account (15s)');

      await act(async () => {
        fireEvent.mouseDown(holdButton);
      });

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      await act(async () => {
        fireEvent.mouseUp(holdButton);
      });

      expect(screen.getByText('Hold to delete account (15s)')).toBeInTheDocument();
    });

    it('calls onDeleteAccount after holding for 15 seconds', async () => {
      const onDeleteAccount = vi.fn();
      render(
        <SettingsPanel
          currentUser={mockUser}
          theme="light"
          blockedUsers={[]}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
          onUpdateAvatar={vi.fn()}
          onUpdateName={vi.fn()}
          onUnblock={vi.fn()}
          onThemeChange={vi.fn()}
          onDeleteAccount={onDeleteAccount}
        />
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      await act(async () => {
        fireEvent.click(screen.getByText('Delete account'));
      });

      const holdButton = screen.getByText('Hold to delete account (15s)');

      await act(async () => {
        fireEvent.mouseDown(holdButton);
      });

      // Advance timer by 15 seconds
      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      expect(onDeleteAccount).toHaveBeenCalled();
      expect(screen.getByText('Account deleted')).toBeInTheDocument();
    });
  });

  describe('click outside', () => {
    it('closes dropdown when clicking outside', async () => {
      render(
        <div>
          <button data-testid="outside">Outside</button>
          <SettingsPanel
            currentUser={mockUser}
            theme="light"
            blockedUsers={[]}
            onLogin={vi.fn()}
            onLogout={vi.fn()}
            onUpdateAvatar={vi.fn()}
            onUpdateName={vi.fn()}
            onUnblock={vi.fn()}
            onThemeChange={vi.fn()}
            onDeleteAccount={vi.fn()}
          />
        </div>
      );

      await act(async () => {
        fireEvent.click(screen.getByTitle('Settings'));
      });

      expect(screen.getByText('TestUser')).toBeInTheDocument();

      await act(async () => {
        fireEvent.mouseDown(screen.getByTestId('outside'));
      });

      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });
  });
});
