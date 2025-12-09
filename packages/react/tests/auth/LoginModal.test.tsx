import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginModal } from '../../src/auth/LoginModal';
import { AuthProvider, useAuth } from '../../src/auth/AuthContext';

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

// Mock window.open for OAuth
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

function renderLoginModal(onClose = vi.fn()) {
  // Mock auth methods response
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      methods: [
        { id: 'email', name: 'Email', type: 'otp' },
        { id: 'phone', name: 'Phone', type: 'otp' },
        { id: 'google', name: 'Google', type: 'oauth' },
        { id: 'github', name: 'GitHub', type: 'oauth' },
      ],
    }),
  });

  return render(
    <AuthProvider apiUrl="http://test.com" apiKey="test-key">
      <LoginModalTrigger onClose={onClose} />
    </AuthProvider>
  );
}

// Helper component to trigger login and show modal
function LoginModalTrigger({ onClose }: { onClose: () => void }) {
  const { state, login } = useAuth();

  return (
    <>
      <button onClick={login}>Open Login</button>
      {state.step !== 'idle' && (
        <LoginModal onClose={onClose} apiUrl="http://test.com" apiKey="test-key" />
      )}
    </>
  );
}

describe('LoginModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders method selection after login is triggered', async () => {
    renderLoginModal();

    await userEvent.click(screen.getByText('Open Login'));

    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    expect(screen.getByText('Continue with Email')).toBeInTheDocument();
    expect(screen.getByText('Continue with Phone')).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument();
  });

  it('shows email input when email method is selected', async () => {
    renderLoginModal();

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Continue with Email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Continue with Email'));

    expect(screen.getByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByText('Send code')).toBeInTheDocument();
  });

  it('shows phone input when phone method is selected', async () => {
    renderLoginModal();

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Continue with Phone')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Continue with Phone'));

    expect(screen.getByText('Enter your phone number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('+1 234 567 8900')).toBeInTheDocument();
  });

  it('sends OTP when email is submitted', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true }); // send-otp response

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Continue with Email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Continue with Email'));

    const emailInput = screen.getByPlaceholderText('you@example.com');
    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => {
      expect(screen.getByText(/Check your email/)).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://test.com/auth/send-otp',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    );
  });

  it('shows OTP verification screen after sending code', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Continue with Email')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    });
  });

  it('limits OTP input to 6 digits', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => expect(screen.getByText('Continue with Email')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());

    const otpInput = screen.getByPlaceholderText('000000');
    await userEvent.type(otpInput, '12345678901234');

    expect(otpInput).toHaveValue('123456');
  });

  it('only allows numeric input for OTP', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => expect(screen.getByText('Continue with Email')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());

    const otpInput = screen.getByPlaceholderText('000000');
    await userEvent.type(otpInput, 'abc123def456');

    expect(otpInput).toHaveValue('123456');
  });

  it('disables verify button until 6 digits entered', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => expect(screen.getByText('Continue with Email')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());

    const verifyButton = screen.getByText('Verify');
    expect(verifyButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('000000'), '12345');
    expect(verifyButton).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('000000'), '6');
    expect(verifyButton).not.toBeDisabled();
  });

  it('opens OAuth popup for Google', async () => {
    renderLoginModal();

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Continue with Google'));

    expect(mockWindowOpen).toHaveBeenCalledWith(
      'http://test.com/auth/google?project_id=test-key',
      'threadkit-oauth',
      expect.stringContaining('width=500')
    );
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    renderLoginModal(onClose);

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    // Find close button by its class
    const closeButton = document.querySelector('.tk-auth-close-btn');
    expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking overlay', async () => {
    const onClose = vi.fn();
    renderLoginModal(onClose);

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    // Click the overlay
    const overlay = document.querySelector('.tk-auth-overlay');
    expect(overlay).toBeInTheDocument();
    await userEvent.click(overlay!);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when clicking modal content', async () => {
    const onClose = vi.fn();
    renderLoginModal(onClose);

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });

    // Click the modal content
    const modal = document.querySelector('.tk-auth-modal');
    expect(modal).toBeInTheDocument();
    await userEvent.click(modal!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows name input for new accounts', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Name required for new accounts'),
      });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => expect(screen.getByText('Continue with Email')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'new@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText('000000'), '123456');
    await userEvent.click(screen.getByText('Verify'));

    await waitFor(() => {
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    });
  });

  it('shows error message on OTP send failure', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Too many OTP requests'),
      });

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => expect(screen.getByText('Continue with Email')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    await waitFor(() => {
      expect(screen.getByText('Too many OTP requests')).toBeInTheDocument();
    });
  });

  it('shows loading state while sending OTP', async () => {
    let resolveOtp: (value: any) => void;
    const otpPromise = new Promise((resolve) => {
      resolveOtp = resolve;
    });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          methods: [{ id: 'email', name: 'Email', type: 'otp' }],
        }),
      })
      .mockImplementationOnce(() => otpPromise);

    render(
      <AuthProvider apiUrl="http://test.com" apiKey="test-key">
        <LoginModalTrigger onClose={vi.fn()} />
      </AuthProvider>
    );

    await userEvent.click(screen.getByText('Open Login'));
    await waitFor(() => expect(screen.getByText('Continue with Email')).toBeInTheDocument());

    await userEvent.click(screen.getByText('Continue with Email'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com');
    await userEvent.click(screen.getByText('Send code'));

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    resolveOtp!({ ok: true });

    await waitFor(() => {
      expect(screen.getByText('Check your email')).toBeInTheDocument();
    });
  });
});
