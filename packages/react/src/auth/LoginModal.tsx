import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import type { AuthMethod } from './types';
import {
  LoadingSpinner,
  BackArrowIcon,
  CloseIcon,
  AUTH_ICONS,
} from './icons';
import { useTranslation } from '../i18n';

interface LoginModalProps {
  onClose: () => void;
  apiUrl: string;
  projectId: string;
}

export function LoginModal({ onClose, apiUrl, projectId }: LoginModalProps) {
  const t = useTranslation();
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

  const handleMethodSelect = useCallback(
    (method: AuthMethod) => {
      if (method.type === 'oauth') {
        // Open OAuth popup
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        // OAuth routes are at root level (not under /v1)
        const baseUrl = apiUrl.replace(/\/v1\/?$/, '');
        oauthWindowRef.current = window.open(
          `${baseUrl}/auth/${method.id}?project_id=${encodeURIComponent(projectId)}`,
          'threadkit-oauth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup close - reset state if user closes without completing
        const pollTimer = setInterval(() => {
          try {
            if (oauthWindowRef.current?.closed) {
              clearInterval(pollTimer);
              // Reset to method selection if popup closed without auth completing
              if (state.step === 'oauth-pending') {
                selectMethod(state.availableMethods[0]);
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
    [apiUrl, selectMethod, state.step, state.availableMethods]
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
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (otpCode.trim() && otpCode.length === 6) {
        verifyOtp(otpCode.trim());
      }
    },
    [otpCode, verifyOtp]
  );

  // Handle OTP code input change with auto-submit
  const handleOtpCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
      setOtpCode(value);
      // Auto-submit when 6 digits entered
      if (value.length === 6) {
        verifyOtp(value);
      }
    },
    [verifyOtp]
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
            <p>{t('loading')}</p>
          </div>
        );

      case 'methods':
        return (
          <div className="tk-auth-methods">
            <h2 id="tk-auth-title" className="tk-auth-title">{t('signIn')}</h2>
            <p className="tk-auth-subtitle">{t('chooseSignInMethod')}</p>

            <div className="tk-auth-method-list">
              {state.availableMethods.map((method) => (
                <button
                  key={method.id}
                  className="tk-auth-method-btn"
                  onClick={() => handleMethodSelect(method)}
                >
                  {getMethodIcon(method)}
                  <span>{t('continueWith')} {method.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 'otp-input':
        return (
          <form className="tk-auth-form" onSubmit={handleOtpSubmit}>
            <h2 id="tk-auth-title" className="tk-auth-title">
              {t('enterEmail')}
            </h2>
            <p className="tk-auth-subtitle">
              {t('weWillSendCode')}
            </p>

            <input
              ref={inputRef}
              type="email"
              className="tk-auth-input"
              placeholder={t('emailPlaceholder')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoComplete="email"
              aria-describedby={state.error ? 'tk-auth-error-otp-input' : undefined}
              aria-invalid={state.error ? 'true' : 'false'}
            />

            {state.error && (
              <p id="tk-auth-error-otp-input" className="tk-auth-error" role="alert">{state.error}</p>
            )}

            <button
              type="submit"
              className="tk-auth-submit-btn"
              disabled={!inputValue.trim()}
            >
              {t('sendCode')}
            </button>
          </form>
        );

      case 'otp-verify':
        return (
          <form className="tk-auth-form" onSubmit={handleVerifySubmit}>
            <h2 id="tk-auth-title" className="tk-auth-title">{t('checkEmail')}</h2>
            <p className="tk-auth-subtitle">
              {t('enterCode')} {state.otpTarget}
            </p>

            <input
              ref={inputRef}
              type="text"
              className="tk-auth-input tk-auth-otp-input"
              placeholder={t('otpPlaceholder')}
              value={otpCode}
              onChange={handleOtpCodeChange}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              aria-describedby={state.error ? 'tk-auth-error-otp-verify' : undefined}
              aria-invalid={state.error ? 'true' : 'false'}
            />

            {state.error && (
              <p id="tk-auth-error-otp-verify" className="tk-auth-error" role="alert">{state.error}</p>
            )}

            <button
              type="submit"
              className="tk-auth-submit-btn"
              disabled={otpCode.length !== 6}
            >
              {t('verify')}
            </button>
          </form>
        );

      case 'otp-name':
        return (
          <form className="tk-auth-form" onSubmit={handleNameSubmit}>
            <h2 id="tk-auth-title" className="tk-auth-title">{t('welcome')}</h2>
            <p className="tk-auth-subtitle">
              {t('chooseUsername')}
            </p>

            <input
              ref={inputRef}
              type="text"
              className="tk-auth-input"
              placeholder={t('usernamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="username"
              aria-describedby={state.error ? 'tk-auth-error-otp-name' : undefined}
              aria-invalid={state.error ? 'true' : 'false'}
            />

            {state.error && (
              <p id="tk-auth-error-otp-name" className="tk-auth-error" role="alert">{state.error}</p>
            )}

            <button
              type="submit"
              className="tk-auth-submit-btn"
              disabled={!name.trim()}
            >
              {t('continue')}
            </button>
          </form>
        );

      case 'oauth-pending':
        return (
          <div className="tk-auth-loading">
            <LoadingSpinner className="tk-auth-spinner" />
            <p>{t('completingSignIn')} {state.selectedMethod?.name}...</p>
            <p className="tk-auth-subtitle">{t('popupShouldOpen')}</p>
          </div>
        );

      case 'web3-pending':
        // Handled by plugin render in AuthContext
        return (
          <div className="tk-auth-loading">
            <LoadingSpinner className="tk-auth-spinner" />
            <p>{t('connectingTo')} {state.selectedMethod?.name}...</p>
          </div>
        );

      default:
        return null;
    }
  };

  const showBackButton = ['otp-input', 'otp-verify', 'otp-name', 'oauth-pending', 'web3-pending'].includes(state.step);

  return (
    <div className="tk-auth-overlay" onClick={onClose}>
      <div className="tk-auth-modal" role="dialog" aria-modal="true" aria-labelledby="tk-auth-title" onClick={(e) => e.stopPropagation()}>
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
