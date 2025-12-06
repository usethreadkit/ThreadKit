import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  AuthState,
  AuthContextValue,
  AuthMethod,
  AuthPlugin,
  User,
  AuthMethodsResponse,
  AuthResponse,
} from './types';

const TOKEN_KEY = 'threadkit_token';
const REFRESH_TOKEN_KEY = 'threadkit_refresh_token';

const initialState: AuthState = {
  step: 'idle',
  user: null,
  token: null,
  refreshToken: null,
  error: null,
  availableMethods: [],
  selectedMethod: null,
  otpTarget: null,
  isNewAccount: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

interface AuthProviderProps {
  children: ReactNode;
  apiUrl: string;
  apiKey: string;
  onUserChange?: (user: User | null) => void;
}

export function AuthProvider({
  children,
  apiUrl,
  apiKey,
  onUserChange,
}: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);
  const [plugins, setPlugins] = useState<AuthPlugin[]>([]);

  // Load token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (token && refreshToken) {
      setState((s) => ({
        ...s,
        token,
        refreshToken,
        step: 'loading',
      }));

      // Validate token and get user info
      fetch(`${apiUrl}/v1/users/me`, {
        headers: {
          'X-API-Key': apiKey,
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (res) => {
          if (res.ok) {
            const user = await res.json();
            setState((s) => ({
              ...s,
              user,
              step: 'idle',
            }));
            onUserChange?.(user);
          } else if (res.status === 401) {
            // Token expired, try refresh
            return refreshTokens(refreshToken);
          } else {
            // Clear invalid tokens
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            setState(initialState);
          }
        })
        .catch(() => {
          setState(initialState);
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshTokens = useCallback(
    async (refreshToken: string) => {
      try {
        const res = await fetch(`${apiUrl}/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (res.ok) {
          const data: AuthResponse = await res.json();
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
          setState((s) => ({
            ...s,
            token: data.token,
            refreshToken: data.refresh_token,
            user: data.user,
            step: 'idle',
          }));
          onUserChange?.(data.user);
        } else {
          // Refresh failed, clear tokens
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          setState(initialState);
          onUserChange?.(null);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setState(initialState);
        onUserChange?.(null);
      }
    },
    [apiUrl, apiKey, onUserChange]
  );

  const login = useCallback(async () => {
    setState((s) => ({ ...s, step: 'loading', error: null }));

    try {
      // Fetch available auth methods from server
      const res = await fetch(`${apiUrl}/v1/auth/methods`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch auth methods');
      }

      const data: AuthMethodsResponse = await res.json();

      // Merge server methods with plugin methods
      const serverMethods = data.methods;
      const pluginMethods = plugins.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
      }));

      // Add plugin methods that aren't already from server
      const allMethods = [...serverMethods];
      for (const pm of pluginMethods) {
        if (!allMethods.find((m) => m.id === pm.id)) {
          allMethods.push(pm);
        }
      }

      setState((s) => ({
        ...s,
        step: 'methods',
        availableMethods: allMethods,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'idle',
        error: err instanceof Error ? err.message : 'Failed to start login',
      }));
    }
  }, [apiUrl, apiKey, plugins]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setState(initialState);
    onUserChange?.(null);
  }, [onUserChange]);

  const selectMethod = useCallback((method: AuthMethod) => {
    setState((s) => ({
      ...s,
      selectedMethod: method,
      step: method.type === 'otp' ? 'otp-input' :
            method.type === 'oauth' ? 'oauth-pending' :
            'web3-pending',
      error: null,
    }));
  }, []);

  const setOtpTarget = useCallback(async (target: string) => {
    setState((s) => ({ ...s, otpTarget: target, step: 'loading', error: null }));

    try {
      const isEmail = target.includes('@');
      const body = isEmail ? { email: target } : { phone: target };

      const res = await fetch(`${apiUrl}/v1/auth/send-otp`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to send OTP');
      }

      setState((s) => ({ ...s, step: 'otp-verify' }));
    } catch (err) {
      setState((s) => ({
        ...s,
        step: 'otp-input',
        error: err instanceof Error ? err.message : 'Failed to send OTP',
      }));
    }
  }, [apiUrl, apiKey]);

  const verifyOtp = useCallback(
    async (code: string, name?: string) => {
      setState((s) => ({ ...s, step: 'loading', error: null }));

      try {
        const isEmail = state.otpTarget?.includes('@');
        const body: Record<string, string> = {
          code,
          ...(isEmail ? { email: state.otpTarget! } : { phone: state.otpTarget! }),
          ...(name ? { name } : {}),
        };

        const res = await fetch(`${apiUrl}/v1/auth/verify-otp`, {
          method: 'POST',
          headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const error = await res.text();
          // Check if name is required
          if (error.includes('Name required')) {
            setState((s) => ({ ...s, step: 'otp-name', isNewAccount: true }));
            return;
          }
          throw new Error(error || 'Invalid code');
        }

        const data: AuthResponse = await res.json();

        // Store tokens
        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);

        setState({
          ...initialState,
          token: data.token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
        onUserChange?.(data.user);
      } catch (err) {
        setState((s) => ({
          ...s,
          step: state.isNewAccount ? 'otp-name' : 'otp-verify',
          error: err instanceof Error ? err.message : 'Verification failed',
        }));
      }
    },
    [apiUrl, apiKey, state.otpTarget, state.isNewAccount, onUserChange]
  );

  const handlePluginSuccess = useCallback(
    (token: string, refreshToken: string, user: User) => {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      setState({
        ...initialState,
        token,
        refreshToken,
        user,
      });
      onUserChange?.(user);
    },
    [onUserChange]
  );

  const handlePluginError = useCallback((error: string) => {
    setState((s) => ({
      ...s,
      step: 'methods',
      error,
    }));
  }, []);

  const handlePluginCancel = useCallback(() => {
    setState((s) => ({
      ...s,
      step: 'methods',
      selectedMethod: null,
      error: null,
    }));
  }, []);

  const registerPlugin = useCallback((plugin: AuthPlugin) => {
    setPlugins((prev) => {
      // Don't add duplicates
      if (prev.find((p) => p.id === plugin.id)) {
        return prev;
      }
      return [...prev, plugin];
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      logout,
      selectMethod,
      setOtpTarget,
      verifyOtp,
      registerPlugin,
      plugins,
    }),
    [state, login, logout, selectMethod, setOtpTarget, verifyOtp, registerPlugin, plugins]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Plugin renders when selected */}
      {state.step === 'web3-pending' && state.selectedMethod && (
        (() => {
          const plugin = plugins.find((p) => p.id === state.selectedMethod?.id);
          if (plugin) {
            return plugin.render({
              onSuccess: handlePluginSuccess,
              onError: handlePluginError,
              onCancel: handlePluginCancel,
              apiUrl,
              apiKey,
            });
          }
          return null;
        })()
      )}
    </AuthContext.Provider>
  );
}
