import { writable, type Readable } from 'svelte/store';
import {
  AuthManager,
  BrowserTokenStorage,
  type AuthState,
  type AuthMethod,
  type User,
} from '@threadkit/core';

export interface AuthStoreConfig {
  apiUrl: string;
  apiKey: string;
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
  getUser: () => User | null;
}

/**
 * Create a Svelte store for authentication.
 * Thin wrapper around @threadkit/core AuthManager.
 */
export function createAuthStore(config: AuthStoreConfig): AuthStore {
  const storage = new BrowserTokenStorage();
  const core = new AuthManager({
    ...config,
    storage,
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
  };
}

// Re-export types
export type { AuthState, AuthMethod, User };
