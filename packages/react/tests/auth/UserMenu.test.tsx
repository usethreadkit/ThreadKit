import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from '../../src/auth/UserMenu';
import { AuthProvider } from '../../src/auth/AuthContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('shows sign in button when not logged in', () => {
    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('calls onLogin when sign in button is clicked', async () => {
    const onLogin = vi.fn();

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={onLogin} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Sign in'));

    expect(onLogin).toHaveBeenCalled();
  });

  it('shows user name and avatar when logged in', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const avatar = screen.getByAltText('John Doe');
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows initials placeholder when no avatar', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'Jane Smith',
        email: 'jane@example.com',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Should show initials JS
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('opens dropdown when user button is clicked', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('John Doe'));

    // Dropdown should show user info and sign out
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });
  });

  it('logs out when sign out is clicked', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('John Doe'));
    await userEvent.click(screen.getByText('Sign out'));

    // Should show sign in button again
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('threadkit_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('threadkit_refresh_token');
  });

  it('closes dropdown when clicking outside', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
      }),
    });

    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AuthProvider apiUrl="http://test.com" apiKey="test-key">
          <UserMenu onLogin={vi.fn()} />
        </AuthProvider>
      </div>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Open dropdown
    await userEvent.click(screen.getByText('John Doe'));
    await waitFor(() => {
      expect(screen.getByText('Sign out')).toBeInTheDocument();
    });

    // Click outside
    await userEvent.click(screen.getByTestId('outside'));

    // Dropdown should be closed
    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });
  });

  it('handles single word name for initials', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'Alice',
        email: 'alice@example.com',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Should show single initial A
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('shows only email in dropdown if no name', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'threadkit_token') return 'valid-token';
      if (key === 'threadkit_refresh_token') return 'valid-refresh';
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'Test User',
        // No email
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <UserMenu onLogin={vi.fn()} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Test User'));

    // Email line should not be shown
    const dropdown = document.querySelector('.tk-user-dropdown');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown?.querySelector('.tk-user-dropdown-email')).not.toBeInTheDocument();
  });
});
