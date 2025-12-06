import { type Readable } from 'svelte/store';
import { type AuthState, type AuthMethod, type User } from '@threadkit/core';
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
export declare function createAuthStore(config: AuthStoreConfig): AuthStore;
export type { AuthState, AuthMethod, User };
//# sourceMappingURL=auth.d.ts.map