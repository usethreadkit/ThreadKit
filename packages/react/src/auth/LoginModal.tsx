import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import type { AuthMethod } from './types';
import {
  LoadingSpinner,
  BackArrowIcon,
  CloseIcon,
  AUTH_ICONS,
} from './icons';

interface LoginModalProps {
  onClose: () => void;
  apiUrl: string;
  apiKey: string;
}

export function LoginModal({ onClose, apiUrl, apiKey: _apiKey }: LoginModalProps) {
  const { state, selectMethod, setOtpTarget, verifyOtp, plugins } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const oauthWindowRef = useRef<Window | null>(null);

  // Focus input when step changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [state.step]);

  // Handle OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (!event.origin.includes(new URL(apiUrl).host)) {
        return;
      }

      if (event.data?.type === 'threadkit:oauth:success') {
        const { token, refresh_token, user } = event.data;
        // Close popup
        oauthWindowRef.current?.close();
        // Handle success through auth context
        window.postMessage({ type: 'threadkit:auth:success', token, refresh_token, user }, '*');
      } else if (event.data?.type === 'threadkit:oauth:error') {
        oauthWindowRef.current?.close();
        // Handle error
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [apiUrl]);

  const handleMethodSelect = useCallback(
    (method: AuthMethod) => {
      if (method.type === 'oauth') {
        // Open OAuth popup
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        oauthWindowRef.current = window.open(
          `${apiUrl}/v1/auth/${method.id}`,
          'threadkit-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup close
        const pollTimer = setInterval(() => {
          if (oauthWindowRef.current?.closed) {
            clearInterval(pollTimer);
          }
        }, 500);
      }
      selectMethod(method);
    },
    [apiUrl, selectMethod]
  );

  const handleOtpSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        setOtpTarget(inputValue.trim());
      }
    },
    [inputValue, setOtpTarget]
  );

  const handleVerifySubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (otpCode.trim()) {
        verifyOtp(otpCode.trim());
      }
    },
    [otpCode, verifyOtp]
  );

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (name.trim()) {
        verifyOtp(otpCode.trim(), name.trim());
      }
    },
    [name, otpCode, verifyOtp]
  );

  const getMethodIcon = (method: AuthMethod) => {
    const CustomIcon = AUTH_ICONS[method.id];
    if (CustomIcon) {
      return <CustomIcon className="tk-auth-method-icon" />;
    }
    // Check plugins
    const plugin = plugins.find((p) => p.id === method.id);
    if (plugin?.Icon) {
      return <plugin.Icon className="tk-auth-method-icon" />;
    }
    return null;
  };

  const renderContent = () => {
    switch (state.step) {
      case 'loading':
        return (
          <div className="tk-auth-loading">
            <LoadingSpinner className="tk-auth-spinner" />
            <p>Loading...</p>
          </div>
        );

      case 'methods':
        return (
          <div className="tk-auth-methods">
            <h2 className="tk-auth-title">Sign in</h2>
            <p className="tk-auth-subtitle">Choose how you want to sign in</p>

            <div className="tk-auth-method-list">
              {state.availableMethods.map((method) => (
                <button
                  key={method.id}
                  className="tk-auth-method-btn"
                  onClick={() => handleMethodSelect(method)}
                >
                  {getMethodIcon(method)}
                  <span>Continue with {method.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'otp-input':
        const isEmail = state.selectedMethod?.id === 'email';
        return (
          <form className="tk-auth-form" onSubmit={handleOtpSubmit}>
            <h2 className="tk-auth-title">
              {isEmail ? 'Enter your email' : 'Enter your phone number'}
            </h2>
            <p className="tk-auth-subtitle">
              We'll send you a code to sign in
            </p>

            <input
              ref={inputRef}
              type={isEmail ? 'email' : 'tel'}
              className="tk-auth-input"
              placeholder={isEmail ? 'you@example.com' : '+1 234 567 8900'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoComplete={isEmail ? 'email' : 'tel'}
            />

            {state.error && (
              <p className="tk-auth-error">{state.error}</p>
            )}

            <button
              type="submit"
              className="tk-auth-submit-btn"
              disabled={!inputValue.trim()}
            >
              Send code
            </button>
          </form>
        );

      case 'otp-verify':
        return (
          <form className="tk-auth-form" onSubmit={handleVerifySubmit}>
            <h2 className="tk-auth-title">Check your {state.selectedMethod?.id === 'email' ? 'email' : 'phone'}</h2>
            <p className="tk-auth-subtitle">
              Enter the 6-digit code we sent to {state.otpTarget}
            </p>

            <input
              ref={inputRef}
              type="text"
              className="tk-auth-input tk-auth-otp-input"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
            />

            {state.error && (
              <p className="tk-auth-error">{state.error}</p>
            )}

            <button
              type="submit"
              className="tk-auth-submit-btn"
              disabled={otpCode.length !== 6}
            >
              Verify
            </button>
          </form>
        );

      case 'otp-name':
        return (
          <form className="tk-auth-form" onSubmit={handleNameSubmit}>
            <h2 className="tk-auth-title">Welcome!</h2>
            <p className="tk-auth-subtitle">
              Choose a display name for your account
            </p>

            <input
              ref={inputRef}
              type="text"
              className="tk-auth-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />

            {state.error && (
              <p className="tk-auth-error">{state.error}</p>
            )}

            <button
              type="submit"
              className="tk-auth-submit-btn"
              disabled={!name.trim()}
            >
              Continue
            </button>
          </form>
        );

      case 'oauth-pending':
        return (
          <div className="tk-auth-loading">
            <LoadingSpinner className="tk-auth-spinner" />
            <p>Completing sign in with {state.selectedMethod?.name}...</p>
            <p className="tk-auth-subtitle">A popup window should have opened</p>
          </div>
        );

      case 'web3-pending':
        // Handled by plugin render in AuthContext
        return (
          <div className="tk-auth-loading">
            <LoadingSpinner className="tk-auth-spinner" />
            <p>Connecting to {state.selectedMethod?.name}...</p>
          </div>
        );

      default:
        return null;
    }
  };

  const showBackButton = ['otp-input', 'otp-verify', 'otp-name', 'oauth-pending', 'web3-pending'].includes(state.step);

  return (
    <div className="tk-auth-overlay" onClick={onClose}>
      <div className="tk-auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tk-auth-header">
          {showBackButton && (
            <button
              className="tk-auth-back-btn"
              onClick={() => {
                // Go back to methods
                selectMethod(state.availableMethods[0]); // Reset
                window.location.reload(); // Simple reset for now
              }}
            >
              <BackArrowIcon className="tk-auth-icon-sm" />
            </button>
          )}
          <button className="tk-auth-close-btn" onClick={onClose}>
            <CloseIcon className="tk-auth-icon-sm" />
          </button>
        </div>

        <div className="tk-auth-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
