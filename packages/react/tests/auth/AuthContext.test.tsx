import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that uses auth context
function TestComponent() {
  const { state, login, logout, selectMethod, setOtpTarget, verifyOtp } = useAuth();

  return (
    <div>
      <div data-testid="step">{state.step}</div>
      <div data-testid="user">{state.user?.name || 'none'}</div>
      <div data-testid="error">{state.error || 'none'}</div>
      <div data-testid="methods">{state.availableMethods.map(m => m.id).join(',')}</div>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => selectMethod({ id: 'email', name: 'Email', type: 'otp' })}>
        Select Email
      </button>
      <button onClick={() => setOtpTarget('test@example.com')}>Send OTP</button>
      <button onClick={() => verifyOtp('123456')}>Verify OTP</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provides initial state', () => {
    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('step')).toHaveTextContent('idle');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('throws error when useAuth is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');

    consoleSpy.mockRestore();
  });

  it('fetches auth methods on login', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        methods: [
          { id: 'email', name: 'Email', type: 'otp' },
          { id: 'google', name: 'Google', type: 'oauth' },
        ],
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('step')).toHaveTextContent('methods');
    });

    expect(screen.getByTestId('methods')).toHaveTextContent('email,google');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test.com/v1/auth/methods',
      expect.objectContaining({
        headers: { 'X-API-Key': 'test-key' },
      })
    );
  });

  it('handles login error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(screen.getByTestId('step')).toHaveTextContent('idle');
    });

    expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch auth methods');
  });

  it('selects OTP method and transitions to otp-input', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ methods: [{ id: 'email', name: 'Email', type: 'otp' }] }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));
    await waitFor(() => {
      expect(screen.getByTestId('step')).toHaveTextContent('methods');
    });

    await userEvent.click(screen.getByText('Select Email'));

    expect(screen.getByTestId('step')).toHaveTextContent('otp-input');
  });

  it('sends OTP and transitions to otp-verify', async () => {
    // First call: fetch methods
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ methods: [{ id: 'email', name: 'Email', type: 'otp' }] }),
    });
    // Second call: send OTP
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('methods'));

    await userEvent.click(screen.getByText('Select Email'));
    await userEvent.click(screen.getByText('Send OTP'));

    await waitFor(() => {
      expect(screen.getByTestId('step')).toHaveTextContent('otp-verify');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test.com/v1/auth/send-otp',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    );
  });

  it('verifies OTP and logs in user', async () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      email_verified: true,
      phone_verified: false,
    };

    // Setup: fetch methods, send OTP, verify OTP
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ methods: [{ id: 'email', name: 'Email', type: 'otp' }] }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: 'jwt-token',
          refresh_token: 'refresh-token',
          user: mockUser,
        }),
      });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('methods'));

    await userEvent.click(screen.getByText('Select Email'));
    await userEvent.click(screen.getByText('Send OTP'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('otp-verify'));

    await userEvent.click(screen.getByText('Verify OTP'));

    await waitFor(() => {
      expect(screen.getByTestId('step')).toHaveTextContent('idle');
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('threadkit_token', 'jwt-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('threadkit_refresh_token', 'refresh-token');
  });

  it('handles OTP verification requiring name for new account', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ methods: [{ id: 'email', name: 'Email', type: 'otp' }] }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Name required for new accounts'),
      });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('methods'));

    await userEvent.click(screen.getByText('Select Email'));
    await userEvent.click(screen.getByText('Send OTP'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('otp-verify'));

    await userEvent.click(screen.getByText('Verify OTP'));

    await waitFor(() => {
      expect(screen.getByTestId('step')).toHaveTextContent('otp-name');
    });
  });

  it('logs out user and clears tokens', async () => {
    // Set up logged in state
    localStorageMock.setItem('threadkit_token', 'existing-token');
    localStorageMock.setItem('threadkit_refresh_token', 'existing-refresh');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'Test User',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    // Wait for user to be loaded from token
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test User');
    });

    await userEvent.click(screen.getByText('Logout'));

    expect(screen.getByTestId('user')).toHaveTextContent('none');
    expect(screen.getByTestId('step')).toHaveTextContent('idle');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('threadkit_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('threadkit_refresh_token');
  });

  it('loads user from stored token on mount', async () => {
    localStorageMock.setItem('threadkit_token', 'stored-token');
    localStorageMock.setItem('threadkit_refresh_token', 'stored-refresh');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        id: 'user-123',
        name: 'Stored User',
        email: 'stored@example.com',
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Stored User');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test.com/v1/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer stored-token',
        }),
      })
    );
  });

  it('refreshes token when current token is expired', async () => {
    localStorageMock.setItem('threadkit_token', 'expired-token');
    localStorageMock.setItem('threadkit_refresh_token', 'valid-refresh');

    // First call returns 401 (expired)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    // Refresh call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        token: 'new-token',
        refresh_token: 'new-refresh',
        user: { id: 'user-123', name: 'Refreshed User' },
      }),
    });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Refreshed User');
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith('threadkit_token', 'new-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('threadkit_refresh_token', 'new-refresh');
  });

  it('calls onUserChange callback when user changes', async () => {
    const onUserChange = vi.fn();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ methods: [{ id: 'email', name: 'Email', type: 'otp' }] }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          token: 'jwt-token',
          refresh_token: 'refresh-token',
          user: { id: 'user-123', name: 'New User' },
        }),
      });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key" onUserChange={onUserChange}>
        <TestComponent />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Login'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('methods'));

    await userEvent.click(screen.getByText('Select Email'));
    await userEvent.click(screen.getByText('Send OTP'));
    await waitFor(() => expect(screen.getByTestId('step')).toHaveTextContent('otp-verify'));

    await userEvent.click(screen.getByText('Verify OTP'));

    await waitFor(() => {
      expect(onUserChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123', name: 'New User' })
      );
    });
  });
});
