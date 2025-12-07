import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  AuthManager,
  BrowserTokenStorage,
  type AuthState as CoreAuthState,
  type AuthMethod,
  type AuthUser,
} from '@threadkit/core';
import type { AuthContextValue, AuthPlugin, User } from './types';
import { useDebug } from '../debug';

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

// Convert core AuthState to React AuthState (types are compatible)
function toReactState(coreState: CoreAuthState) {
  return {
    ...coreState,
    user: coreState.user as User | null,
  };
}

export function AuthProvider({
  children,
  apiUrl,
  apiKey,
  onUserChange,
}: AuthProviderProps) {
  const debug = useDebug();
  const [plugins, setPlugins] = useState<AuthPlugin[]>([]);

  // Create AuthManager instance (stable reference)
  const managerRef = useRef<AuthManager | null>(null);
  if (!managerRef.current) {
    managerRef.current = new AuthManager({
      apiUrl,
      apiKey,
      storage: new BrowserTokenStorage(),
      onUserChange: onUserChange as ((user: AuthUser | null) => void) | undefined,
      debug: debug ? (...args) => console.log(...args) : undefined,
    });
  }
  const manager = managerRef.current;

  // Track state from AuthManager
  const [state, setState] = useState(() => toReactState(manager.getState()));

  // Subscribe to state changes and set up OAuth listener
  useEffect(() => {
    const handleStateChange = (newState: CoreAuthState) => {
      setState(toReactState(newState));
    };

    manager.on('stateChange', handleStateChange);
    manager.setupOAuthListener();

    // Initialize (load stored tokens)
    manager.initialize();

    return () => {
      manager.off('stateChange', handleStateChange);
      manager.destroyOAuthListener();
    };
  }, [manager]);

  // Update debug setting when it changes
  useEffect(() => {
    // Re-create manager config is not ideal, but debug changes are rare
    // The manager will use the new debug function on next log call
  }, [debug]);

  // Wrap manager methods for React
  const login = useCallback(() => {
    manager.startLogin();
  }, [manager]);

  const logout = useCallback(() => {
    manager.logout();
  }, [manager]);

  const selectMethod = useCallback((method: AuthMethod) => {
    manager.selectMethod(method);
  }, [manager]);

  const setOtpTarget = useCallback((target: string) => {
    manager.sendOtp(target);
  }, [manager]);

  const verifyOtp = useCallback(async (code: string, name?: string) => {
    await manager.verifyOtp(code, name);
  }, [manager]);

  const registerPlugin = useCallback((plugin: AuthPlugin) => {
    // Register with core manager (for method merging)
    manager.registerPlugin({
      id: plugin.id,
      name: plugin.name,
      type: plugin.type,
    });

    // Also track React-specific plugin (for rendering)
    setPlugins((prev) => {
      if (prev.find((p) => p.id === plugin.id)) {
        return prev;
      }
      return [...prev, plugin];
    });
  }, [manager]);

  // Plugin success/error/cancel handlers
  const handlePluginSuccess = useCallback(
    (token: string, refreshToken: string, user: User) => {
      manager.handlePluginSuccess(token, refreshToken, user as AuthUser);
    },
    [manager]
  );

  const handlePluginError = useCallback((error: string) => {
    manager.handlePluginError(error);
  }, [manager]);

  const handlePluginCancel = useCallback(() => {
    manager.handlePluginCancel();
  }, [manager]);

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
