import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth, AUTH_ICONS, LoadingSpinner } from '../auth';
import type { AuthMethod } from '../auth/types';
import { useTranslation } from '../i18n';
import { normalizeUsername, validateUsername, MAX_USERNAME_LENGTH } from '@threadkit/core';

interface SignInPromptProps {
  apiUrl: string;
  apiKey: string;
  placeholder?: string;
}

export function SignInPrompt({ apiUrl, apiKey, placeholder }: SignInPromptProps) {
  const t = useTranslation();
  const { state, login, selectMethod, setOtpTarget, verifyOtp, updateUsername, plugins } = useAuth();
  const placeholderText = placeholder ?? t('writeComment');
  const [text, setText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const [isSubmittingUsername, setIsSubmittingUsername] = useState(false);
  const [showAuthMethods, setShowAuthMethods] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const oauthWindowRef = useRef<Window | null>(null);
  const hasInitialized = useRef(false);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(state.step);
  stepRef.current = state.step; // Keep ref in sync with state
  const hasShownUsernameSuggestion = useRef(false);

  // Fetch auth methods when user clicks sign in
  const handleSignInClick = useCallback(() => {
    setShowAuthMethods(true);
    if (!hasInitialized.current && state.step === 'idle') {
      hasInitialized.current = true;
      login();
    }
  }, [state.step, login]);

  // Focus input when step changes to OTP input or username-required
  useEffect(() => {
    if (state.step === 'otp-input' || state.step === 'otp-verify' || state.step === 'otp-name' || state.step === 'username-required') {
      inputRef.current?.focus();
    }
  }, [state.step]);

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
          try {
            if (oauthWindowRef.current?.closed) {
              clearInterval(pollTimer);
              // Reset to method selection if popup closed without auth completing
              if (stepRef.current === 'oauth-pending') {
                handleBack();
              }
            }
          } catch (e) {
            // COOP may block access to window.closed - stop polling
            clearInterval(pollTimer);
          }
        }, 500);
      }
      selectMethod(method);
    },
    [apiUrl, apiKey, selectMethod, handleBack]
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

  // Check username availability with debouncing
  const checkUsernameAvailability = useCallback(async (value: string) => {
    // First validate format
    const validationError = validateUsername(value);
    if (validationError) {
      setUsernameError(validationError);
      setIsUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    try {
      const headers: Record<string, string> = {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      };
      // Include auth token so server can exclude current user from check
      if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
      }
      const res = await fetch(`${apiUrl}/users/check-username`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ username: value }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          setUsernameError(data.error);
          setIsUsernameAvailable(false);
        } else {
          setUsernameError(null);
          setIsUsernameAvailable(data.available);
        }
      }
    } catch {
      // Ignore errors, user can still try to submit
    } finally {
      setIsCheckingUsername(false);
    }
  }, [apiUrl, apiKey, state.token]);

  // Initialize username from user's email or name when username-required step is shown (only once)
  useEffect(() => {
    if (state.step === 'username-required' && !hasShownUsernameSuggestion.current) {
      hasShownUsernameSuggestion.current = true;
      let suggestion = '';

      // For email users, use the part before @ as the suggestion
      const email = state.user?.email || state.otpTarget;
      if (email && email.includes('@')) {
        const emailPrefix = email.split('@')[0];
        suggestion = normalizeUsername(emailPrefix);
      }

      // Fall back to user's name if no email or email prefix is too short
      if (suggestion.length < 2 && state.user?.name) {
        suggestion = normalizeUsername(state.user.name);
      }

      if (suggestion) {
        setUsername(suggestion);
        // Immediately check availability of the suggested username
        if (suggestion.length >= 2) {
          checkUsernameAvailability(suggestion);
        }
      }
    }
  }, [state.step, state.user?.name, state.user?.email, state.otpTarget, checkUsernameAvailability]);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Normalize on input: lowercase, replace spaces with hyphens, remove invalid chars
    value = value.toLowerCase();
    value = value.replace(/\s+/g, '-'); // Replace spaces with hyphens
    value = value.replace(/[^a-z0-9\-_]/g, ''); // Remove invalid characters
    value = value.slice(0, MAX_USERNAME_LENGTH); // Enforce max length

    setUsername(value);
    setUsernameError(null);
    setIsUsernameAvailable(null);

    // Debounce the availability check
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    if (value.length >= 2) {
      usernameCheckTimeout.current = setTimeout(() => {
        checkUsernameAvailability(value);
      }, 300);
    }
  }, [checkUsernameAvailability]);

  const handleUsernameSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (username.trim() && isUsernameAvailable && !usernameError && !isSubmittingUsername) {
        setIsSubmittingUsername(true);
        try {
          await updateUsername(username.trim());
        } finally {
          setIsSubmittingUsername(false);
        }
      }
    },
    [username, isUsernameAvailable, usernameError, isSubmittingUsername, updateUsername]
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
            ← {t('back')}
          </button>
          <input
            ref={inputRef}
            type={isEmail ? 'email' : 'tel'}
            className="threadkit-signin-input"
            placeholder={isEmail ? t('enterEmail') : t('enterPhone')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoComplete={isEmail ? 'email' : 'tel'}
          />
          <button
            type="submit"
            className="threadkit-submit-btn"
            disabled={!inputValue.trim()}
          >
            {t('sendCode')}
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
            ← {t('back')}
          </button>
          <span className="threadkit-signin-hint">{t('codeSentTo')} {state.otpTarget}</span>
          <input
            ref={inputRef}
            type="text"
            className="threadkit-signin-input threadkit-signin-code"
            placeholder={t('otpPlaceholder')}
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
            {t('verify')}
          </button>
        </form>
        {state.error && <p className="threadkit-signin-error">{state.error}</p>}
      </div>
    );
  }

  // Name input for new OTP accounts
  if (state.step === 'otp-name') {
    return (
      <div className="threadkit-form">
        <form onSubmit={handleNameSubmit} className="threadkit-signin-otp-form">
          <span className="threadkit-signin-hint">{t('chooseDisplayName')}</span>
          <input
            ref={inputRef}
            type="text"
            className="threadkit-signin-input"
            placeholder={t('yourName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <button
            type="submit"
            className="threadkit-submit-btn"
            disabled={!name.trim()}
          >
            {t('continue')}
          </button>
        </form>
        {state.error && <p className="threadkit-signin-error">{state.error}</p>}
      </div>
    );
  }

  // Username selection for new users (after OAuth/OTP login)
  // Show textarea with inline username input where the reply button would be
  if (state.step === 'username-required') {
    const canSubmit = username.trim().length >= 2 && isUsernameAvailable === true && !usernameError;
    return (
      <div className="threadkit-form">
        <textarea
          className="threadkit-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholderText}
          rows={3}
        />

        <div className="threadkit-form-actions">
          <form onSubmit={handleUsernameSubmit} className="threadkit-username-inline-form">
            <span className="threadkit-username-inline-label">{t('chooseUsername')}:</span>
            <div className="threadkit-username-inline-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                className="threadkit-username-inline-input"
                placeholder={t('usernamePlaceholder')}
                value={username}
                onChange={handleUsernameChange}
                autoComplete="username"
                maxLength={MAX_USERNAME_LENGTH}
              />
              {isCheckingUsername && (
                <span className="threadkit-username-status threadkit-username-checking">{t('checking')}</span>
              )}
              {!isCheckingUsername && isUsernameAvailable === true && !usernameError && (
                <span className="threadkit-username-status threadkit-username-available">✓</span>
              )}
              {!isCheckingUsername && (isUsernameAvailable === false || usernameError) && (
                <span className="threadkit-username-status threadkit-username-taken">
                  {usernameError || t('usernameTaken')}
                </span>
              )}
            </div>
            <button
              type="submit"
              className="threadkit-submit-btn"
              disabled={!canSubmit || isSubmittingUsername}
            >
              {isSubmittingUsername ? t('loading') : t('save')}
            </button>
          </form>
        </div>
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
          placeholder={placeholderText}
          rows={3}
        />

        <div className="threadkit-form-actions">
          <div className="threadkit-signin-loading-inline">
            <LoadingSpinner className="threadkit-signin-spinner-small" />
            <span>{t('signingInWith')} {state.selectedMethod?.name}...</span>
            <button type="button" className="threadkit-signin-cancel-inline" onClick={handleBack}>
              {t('cancel')}
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
        placeholder={placeholderText}
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
            {t('signInToPost')}
          </button>
        ) : state.step === 'loading' ? (
          // Loading auth methods
          <div className="threadkit-signin-loading-inline">
            <LoadingSpinner className="threadkit-signin-spinner-small" />
          </div>
        ) : (
          // Show auth method buttons
          <div className="threadkit-signin-methods-inline">
            <span className="threadkit-signin-label-inline">{t('signInLabel')}</span>
            {state.availableMethods.map((method) => (
              <button
                key={method.id}
                className="threadkit-signin-method-btn"
                onClick={() => handleMethodSelect(method)}
                title={`${t('continueWith')} ${method.name}`}
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
