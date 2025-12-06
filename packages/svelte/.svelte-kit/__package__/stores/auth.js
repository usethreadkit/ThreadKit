import { writable } from 'svelte/store';
import { AuthManager, BrowserTokenStorage, } from '@threadkit/core';
/**
 * Create a Svelte store for authentication.
 * Thin wrapper around @threadkit/core AuthManager.
 */
export function createAuthStore(config) {
    const storage = new BrowserTokenStorage();
    const core = new AuthManager({
        ...config,
        storage,
    });
    const { subscribe, set } = writable(core.getState());
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
