import { writable, type Readable } from 'svelte/store';
import {
  AuthManager,
  BrowserTokenStorage,
  type AuthState,
  type AuthMethod,
  type AuthUser,
} from '@threadkit/core';

export interface AuthStoreConfig {
  apiUrl: string;
  projectId: string;
  /** Debug logging function (optional) */
  debug?: (...args: unknown[]) => void;
}

export interface AuthStore extends Readable<AuthState> {
  initialize: () => Promise<void>;
  startLogin: () => Promise<void>;
  selectMethod: (method: AuthMethod) => void;
  sendOtp: (target: string) => Promise<void>;
  verifyOtp: (code: string, name?: string) => Promise<void>;
  logout: () => void;
  destroy: () => void;
  getToken: () => string | null;
  getUser: () => AuthUser | null;
  /** Set up OAuth popup listeners (BroadcastChannel + postMessage) */
  setupOAuthListener: () => void;
  /** Clean up OAuth popup listeners */
  destroyOAuthListener: () => void;
}

/**
 * Create a Svelte store for authentication.
 * Thin wrapper around @threadkit/core AuthManager.
 */
export function createAuthStore(config: AuthStoreConfig): AuthStore {
  const storage = new BrowserTokenStorage();
  const core = new AuthManager({
    apiUrl: config.apiUrl,
    projectId: config.projectId,
    storage,
    debug: config.debug,
  });

  const { subscribe, set } = writable<AuthState>(core.getState());

  // Subscribe to core state changes
  core.on('stateChange', set);

  return {
    subscribe,
    initialize: () => core.initialize(),
    startLogin: () => core.startLogin(),
    selectMethod: (method) => core.selectMethod(method),
    sendOtp: (target) => core.sendOtp(target),
    verifyOtp: (code, name) => core.verifyOtp(code, name),
    logout: () => core.logout(),
    destroy: () => core.destroy(),
    getToken: () => core.getToken(),
    getUser: () => core.getUser(),
    setupOAuthListener: () => core.setupOAuthListener(),
    destroyOAuthListener: () => core.destroyOAuthListener(),
  };
}

// Re-export types
export type { AuthState, AuthMethod, AuthUser };
// Keep User alias for backwards compatibility
export type User = AuthUser;
