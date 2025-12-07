import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth, AUTH_ICONS, LoadingSpinner } from '../auth';
import type { AuthMethod } from '../auth/types';

interface SignInPromptProps {
  apiUrl: string;
  apiKey: string;
  placeholder?: string;
}

export function SignInPrompt({ apiUrl, apiKey, placeholder = 'Write a comment...' }: SignInPromptProps) {
  const { state, login, selectMethod, setOtpTarget, verifyOtp, plugins } = useAuth();
  const [text, setText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [showAuthMethods, setShowAuthMethods] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const oauthWindowRef = useRef<Window | null>(null);
  const hasInitialized = useRef(false);

  // Fetch auth methods when user clicks sign in
  const handleSignInClick = useCallback(() => {
    setShowAuthMethods(true);
    if (!hasInitialized.current && state.step === 'idle') {
      hasInitialized.current = true;
      login();
    }
  }, [state.step, login]);

  // Focus input when step changes to OTP input
  useEffect(() => {
    if (state.step === 'otp-input' || state.step === 'otp-verify' || state.step === 'otp-name') {
      inputRef.current?.focus();
    }
  }, [state.step]);

  // Handle OAuth popup message
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin (use base URL without /v1)
      const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
      if (!event.origin.includes(new URL(baseUrl).host)) {
        return;
      }

      if (event.data?.type === 'threadkit:oauth:success') {
        const { token, refresh_token, user } = event.data;
        oauthWindowRef.current?.close();
        window.postMessage({ type: 'threadkit:auth:success', token, refresh_token, user }, '*');
      } else if (event.data?.type === 'threadkit:oauth:error') {
        oauthWindowRef.current?.close();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [apiUrl]);

  const handleBack = useCallback(() => {
    setShowAuthMethods(true);
    login(); // Reset to methods
  }, [login]);

  const handleMethodSelect = useCallback(
    (method: AuthMethod) => {
      if (method.type === 'oauth') {
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        // OAuth routes are at root level (not under /v1)
        const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
        oauthWindowRef.current = window.open(
          `${baseUrl}/auth/${method.id}?api_key=${encodeURIComponent(apiKey)}`,
          'threadkit-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup close - reset state if user closes without completing
        const pollTimer = setInterval(() => {
          if (oauthWindowRef.current?.closed) {
            clearInterval(pollTimer);
            // Reset to method selection if popup closed without auth completing
            if (state.step === 'oauth-pending') {
              handleBack();
            }
          }
        }, 500);
      }
      selectMethod(method);
    },
    [apiUrl, selectMethod, state.step, handleBack]
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
      return <CustomIcon className="threadkit-signin-method-icon" />;
    }
    const plugin = plugins.find((p) => p.id === method.id);
    if (plugin?.Icon) {
      return <plugin.Icon className="threadkit-signin-method-icon" />;
    }
    // Fallback to method name initial if no icon
    return <span className="threadkit-signin-method-icon">{method.name[0]}</span>;
  };

  // OTP input (email/phone) - show as overlay/inline form
  if (state.step === 'otp-input') {
    const isEmail = state.selectedMethod?.id === 'email';
    return (
      <div className="threadkit-form">
        <form onSubmit={handleOtpSubmit} className="threadkit-signin-otp-form">
          <button type="button" className="threadkit-signin-back" onClick={handleBack}>
            ← Back
          </button>
          <input
            ref={inputRef}
            type={isEmail ? 'email' : 'tel'}
            className="threadkit-signin-input"
            placeholder={isEmail ? 'Enter your email' : 'Enter your phone number'}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoComplete={isEmail ? 'email' : 'tel'}
          />
          <button
            type="submit"
            className="threadkit-submit-btn"
            disabled={!inputValue.trim()}
          >
            Send code
          </button>
        </form>
        {state.error && <p className="threadkit-signin-error">{state.error}</p>}
      </div>
    );
  }

  // OTP verify
  if (state.step === 'otp-verify') {
    return (
      <div className="threadkit-form">
        <form onSubmit={handleVerifySubmit} className="threadkit-signin-otp-form">
          <button type="button" className="threadkit-signin-back" onClick={handleBack}>
            ← Back
          </button>
          <span className="threadkit-signin-hint">Code sent to {state.otpTarget}</span>
          <input
            ref={inputRef}
            type="text"
            className="threadkit-signin-input threadkit-signin-code"
            placeholder="000000"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
          />
          <button
            type="submit"
            className="threadkit-submit-btn"
            disabled={otpCode.length !== 6}
          >
            Verify
          </button>
        </form>
        {state.error && <p className="threadkit-signin-error">{state.error}</p>}
      </div>
    );
  }

  // Name input for new accounts
  if (state.step === 'otp-name') {
    return (
      <div className="threadkit-form">
        <form onSubmit={handleNameSubmit} className="threadkit-signin-otp-form">
          <span className="threadkit-signin-hint">Choose a display name</span>
          <input
            ref={inputRef}
            type="text"
            className="threadkit-signin-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <button
            type="submit"
            className="threadkit-submit-btn"
            disabled={!name.trim()}
          >
            Continue
          </button>
        </form>
        {state.error && <p className="threadkit-signin-error">{state.error}</p>}
      </div>
    );
  }

  // OAuth/Web3 pending - show textarea with inline loading status
  if (state.step === 'oauth-pending' || state.step === 'web3-pending') {
    return (
      <div className="threadkit-form">
        <textarea
          className="threadkit-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />

        <div className="threadkit-form-actions">
          <div className="threadkit-signin-loading-inline">
            <LoadingSpinner className="threadkit-signin-spinner-small" />
            <span>Signing in with {state.selectedMethod?.name}...</span>
            <button type="button" className="threadkit-signin-cancel-inline" onClick={handleBack}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default view: textarea with Sign In button that reveals auth methods
  return (
    <div className="threadkit-form">
      <textarea
        className="threadkit-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
      />

      <div className="threadkit-form-actions">
        {!showAuthMethods ? (
          // Show "Sign in to post" button
          <button
            type="button"
            className="threadkit-submit-btn"
            onClick={handleSignInClick}
          >
            Sign in to post
          </button>
        ) : state.step === 'loading' ? (
          // Loading auth methods
          <div className="threadkit-signin-loading-inline">
            <LoadingSpinner className="threadkit-signin-spinner-small" />
          </div>
        ) : (
          // Show auth method buttons
          <div className="threadkit-signin-methods-inline">
            <span className="threadkit-signin-label-inline">Sign in:</span>
            {state.availableMethods.map((method) => (
              <button
                key={method.id}
                className="threadkit-signin-method-btn"
                onClick={() => handleMethodSelect(method)}
                title={`Sign in with ${method.name}`}
              >
                {getMethodIcon(method)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
