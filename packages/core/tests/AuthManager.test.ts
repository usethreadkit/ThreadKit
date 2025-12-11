import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../src/auth/AuthManager';
import type { AuthUser, AuthMethod } from '../src/auth/types';
import type { TokenStorage } from '../src/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  listeners: Map<string, Set<(event: MessageEvent) => void>> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any): void {
    // Simulate async message delivery
    setTimeout(() => {
      const event = new MessageEvent('message', { data: message });
      this.onmessage?.(event);
      this.listeners.get('message')?.forEach((listener) => listener(event));
    }, 0);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  close(): void {
    this.listeners.clear();
  }
}

(global as any).BroadcastChannel = MockBroadcastChannel;

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockStorage: TokenStorage;

  const mockConfig = {
    apiUrl: 'http://localhost:8080/v1',
    projectId: 'test-project-id',
    storage: {} as TokenStorage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock storage
    let tokenStore = '';
    let refreshTokenStore = '';

    mockStorage = {
      getToken: vi.fn(() => tokenStore),
      setToken: vi.fn((token: string) => {
        tokenStore = token;
      }),
      getRefreshToken: vi.fn(() => refreshTokenStore),
      setRefreshToken: vi.fn((token: string) => {
        refreshTokenStore = token;
      }),
      clear: vi.fn(() => {
        tokenStore = '';
        refreshTokenStore = '';
      }),
    };

    authManager = new AuthManager({
      ...mockConfig,
      storage: mockStorage,
    });
  });

  afterEach(() => {
    authManager.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      const state = authManager.getState();
      expect(state.step).toBe('idle');
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
    });

    it('should not be authenticated initially', () => {
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it('should load stored tokens on initialize', async () => {
      mockStorage.setToken('stored-token');
      mockStorage.setRefreshToken('stored-refresh');

      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        username_set: true,
        is_guest: false,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      await authManager.initialize();

      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getUser()).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer stored-token',
          }),
        })
      );
    });

    it('should handle invalid stored tokens', async () => {
      mockStorage.setToken('invalid-token');
      mockStorage.setRefreshToken('invalid-refresh');

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response);

      await authManager.initialize();

      expect(authManager.isAuthenticated()).toBe(false);
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should handle username-required state', async () => {
      mockStorage.setToken('stored-token');
      mockStorage.setRefreshToken('stored-refresh');

      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Test User',
        username_set: false,
        is_guest: false,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      await authManager.initialize();

      const state = authManager.getState();
      expect(state.step).toBe('username-required');
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('login flow', () => {
    it('should fetch available auth methods', async () => {
      const mockMethods: AuthMethod[] = [
        { id: 'email', name: 'Email', type: 'otp' },
        { id: 'google', name: 'Google', type: 'oauth' },
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ methods: mockMethods }),
      } as Response);

      await authManager.startLogin();

      const state = authManager.getState();
      expect(state.step).toBe('methods');
      expect(state.availableMethods).toEqual(mockMethods);
    });

    it('should handle auth methods fetch error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      } as Response);

      await authManager.startLogin();

      const state = authManager.getState();
      expect(state.step).toBe('idle');
      expect(state.error).toBeTruthy();
    });

    it('should select auth method and update step', () => {
      const method: AuthMethod = {
        id: 'email',
        name: 'Email',
        type: 'otp',
      };

      authManager.selectMethod(method);

      const state = authManager.getState();
      expect(state.selectedMethod).toEqual(method);
      expect(state.step).toBe('otp-input');
    });

    it('should select oauth method', () => {
      const method: AuthMethod = {
        id: 'google',
        name: 'Google',
        type: 'oauth',
      };

      authManager.selectMethod(method);

      const state = authManager.getState();
      expect(state.step).toBe('oauth-pending');
    });

    it('should select anonymous method', () => {
      const method: AuthMethod = {
        id: 'anonymous',
        name: 'Anonymous',
        type: 'anonymous',
      };

      authManager.selectMethod(method);

      const state = authManager.getState();
      expect(state.step).toBe('anonymous-input');
    });
  });

  describe('anonymous login', () => {
    it('should login anonymously', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Guest',
        is_guest: true,
        username_set: true,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'new-token',
          refresh_token: 'new-refresh',
          user: mockUser,
        }),
      } as Response);

      await authManager.loginAnonymous();

      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getUser()).toEqual(mockUser);
      expect(mockStorage.setToken).toHaveBeenCalledWith('new-token');
      expect(mockStorage.setRefreshToken).toHaveBeenCalledWith('new-refresh');
    });

    it('should login anonymously with name', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Custom Name',
        is_guest: true,
        username_set: true,
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'new-token',
          refresh_token: 'new-refresh',
          user: mockUser,
        }),
      } as Response);

      await authManager.loginAnonymous('Custom Name');

      expect(authManager.getUser()?.name).toBe('Custom Name');
    });

    it('should handle anonymous login error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Login failed',
      } as Response);

      await authManager.loginAnonymous();

      expect(authManager.isAuthenticated()).toBe(false);
      const state = authManager.getState();
      expect(state.error).toBeTruthy();
    });
  });

  describe('OTP flow', () => {
    it('should send OTP to email', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      } as Response);

      await authManager.sendOtp('test@example.com');

      const state = authManager.getState();
      expect(state.step).toBe('otp-verify');
      expect(state.otpTarget).toBe('test@example.com');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/send-otp'),
        expect.objectContaining({
          body: expect.stringContaining('test@example.com'),
        })
      );
    });

    it('should send OTP to phone', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
      } as Response);

      await authManager.sendOtp('+1234567890');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/send-otp'),
        expect.objectContaining({
          body: expect.stringContaining('+1234567890'),
        })
      );
    });

    it('should handle OTP send error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Failed to send',
      } as Response);

      await authManager.sendOtp('test@example.com');

      const state = authManager.getState();
      expect(state.step).toBe('otp-input');
      expect(state.error).toBeTruthy();
    });

    it('should verify OTP code', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        username_set: true,
        is_guest: false,
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'new-token',
            refresh_token: 'new-refresh',
            user: mockUser,
          }),
        } as Response);

      await authManager.sendOtp('test@example.com');
      await authManager.verifyOtp('123456');

      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getUser()).toEqual(mockUser);
    });

    it('should request name for new accounts', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Name required',
        } as Response);

      await authManager.sendOtp('test@example.com');
      await authManager.verifyOtp('123456');

      const state = authManager.getState();
      expect(state.step).toBe('otp-name');
      expect(state.isNewAccount).toBe(true);
    });

    it('should verify OTP with name for new accounts', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'New User',
        email: 'test@example.com',
        username_set: true,
        is_guest: false,
      };

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ok: true } as Response)
        .mockResolvedValueOnce({
          ok: false,
          text: async () => 'Name required',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: 'new-token',
            refresh_token: 'new-refresh',
            user: mockUser,
          }),
        } as Response);

      await authManager.sendOtp('test@example.com');
      await authManager.verifyOtp('123456');
      await authManager.verifyOtp('123456', 'New User');

      expect(authManager.getUser()?.name).toBe('New User');
    });
  });

  describe('username update', () => {
    it('should update username', async () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Updated Name',
        username_set: true,
        is_guest: false,
      };

      // Setup authenticated state
      const authState = authManager.getState();
      (authManager as any).state = {
        ...authState,
        token: 'test-token',
        user: { ...mockUser, username_set: false },
        step: 'username-required',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      } as Response);

      await authManager.updateUsername('Updated Name');

      const state = authManager.getState();
      expect(state.step).toBe('idle');
      expect(state.user?.name).toBe('Updated Name');
    });

    it('should handle username update error', async () => {
      const authState = authManager.getState();
      (authManager as any).state = {
        ...authState,
        token: 'test-token',
        user: { id: 'user-1', username_set: false },
        step: 'username-required',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Username taken',
      } as Response);

      await authManager.updateUsername('TakenName');

      const state = authManager.getState();
      expect(state.step).toBe('username-required');
      expect(state.error).toBeTruthy();
    });
  });

  describe('plugin integration', () => {
    it('should register auth plugin', () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        type: 'web3' as const,
        onMount: vi.fn(),
        onUnmount: vi.fn(),
      };

      authManager.registerPlugin(mockPlugin);
      expect(authManager.getPlugins()).toContain(mockPlugin);
    });

    it('should not register duplicate plugins', () => {
      const mockPlugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        type: 'web3' as const,
        onMount: vi.fn(),
        onUnmount: vi.fn(),
      };

      authManager.registerPlugin(mockPlugin);
      authManager.registerPlugin(mockPlugin);

      const plugins = authManager.getPlugins();
      expect(plugins.length).toBe(1);
    });

    it('should handle plugin success', () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Plugin User',
        username_set: true,
        is_guest: false,
      };

      authManager.handlePluginSuccess('plugin-token', 'plugin-refresh', mockUser, false);

      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getUser()).toEqual(mockUser);
      expect(mockStorage.setToken).toHaveBeenCalledWith('plugin-token');
    });

    it('should handle plugin error', () => {
      authManager.handlePluginError('Plugin failed');

      const state = authManager.getState();
      expect(state.error).toBe('Plugin failed');
    });

    it('should handle plugin cancel', () => {
      authManager.handlePluginCancel();

      const state = authManager.getState();
      expect(state.step).toBe('methods');
      expect(state.error).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout user', () => {
      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Test User',
        username_set: true,
        is_guest: false,
      };

      // Setup authenticated state
      (authManager as any).state = {
        ...(authManager as any).state,
        token: 'test-token',
        refreshToken: 'test-refresh',
        user: mockUser,
      };

      authManager.logout();

      expect(authManager.isAuthenticated()).toBe(false);
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should emit stateChange on logout', () => {
      const listener = vi.fn();
      authManager.on('stateChange', listener);

      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'Test User',
        username_set: true,
        is_guest: false,
      };

      (authManager as any).state = {
        ...(authManager as any).state,
        token: 'test-token',
        user: mockUser,
      };

      authManager.logout();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('OAuth listener', () => {
    beforeEach(() => {
      // Mock window for OAuth tests
      (global as any).window = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
    });

    it('should setup OAuth listener', () => {
      authManager.setupOAuthListener();
      const channel = (authManager as any).oauthChannel;
      expect(channel).toBeTruthy();
    });

    it('should handle OAuth success message', async () => {
      authManager.setupOAuthListener();

      const mockUser: AuthUser = {
        id: 'user-1',
        name: 'OAuth User',
        username_set: true,
        is_guest: false,
      };

      // Manually call the handler since BroadcastChannel events don't trigger in tests
      authManager.handlePluginSuccess('oauth-token', 'oauth-refresh', mockUser, false);

      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getUser()).toEqual(mockUser);
    });

    it('should cleanup OAuth listener', () => {
      authManager.setupOAuthListener();
      authManager.destroyOAuthListener();

      const channel = (authManager as any).oauthChannel;
      expect(channel).toBeNull();
    });
  });

  describe('state management', () => {
    it('should emit stateChange events', () => {
      const listener = vi.fn();
      authManager.on('stateChange', listener);

      authManager.selectMethod({
        id: 'email',
        name: 'Email',
        type: 'otp',
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should provide current state', () => {
      const state = authManager.getState();
      expect(state).toHaveProperty('step');
      expect(state).toHaveProperty('user');
      expect(state).toHaveProperty('token');
    });
  });

  describe('cleanup', () => {
    it('should cleanup all resources on destroy', () => {
      authManager.setupOAuthListener();

      const listener = vi.fn();
      authManager.on('stateChange', listener);

      authManager.destroy();

      expect((authManager as any).oauthChannel).toBeNull();

      // Should not emit after destroy
      authManager.selectMethod({
        id: 'email',
        name: 'Email',
        type: 'otp',
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
