import { EventEmitter } from '../EventEmitter';
import type { TokenStorage } from '../types';
import type {
  AuthState,
  AuthStep,
  AuthMethod,
  AuthUser,
  AuthMethodsResponse,
  AuthResponse,
  AuthPluginCore,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

export interface AuthManagerConfig {
  /** API base URL */
  apiUrl: string;
  /** API key (public key) */
  apiKey: string;
  /** Token storage implementation */
  storage: TokenStorage;
  /** Callback when user changes (login/logout) */
  onUserChange?: (user: AuthUser | null) => void;
  /** Debug logging function (optional) */
  debug?: (...args: unknown[]) => void;
}

// ============================================================================
// Events
// ============================================================================

export interface AuthManagerEvents {
  stateChange: AuthState;
}

// ============================================================================
// Initial State
// ============================================================================

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

// ============================================================================
// AuthManager Class
// ============================================================================

/**
 * Framework-agnostic authentication state manager.
 * Handles login flows, token management, and plugin integration.
 */
export class AuthManager extends EventEmitter<AuthManagerEvents> {
  private config: AuthManagerConfig;
  private state: AuthState;
  private plugins: AuthPluginCore[] = [];
  private oauthChannel: BroadcastChannel | null = null;
  private oauthWindowHandler: ((event: MessageEvent) => void) | null = null;

  constructor(config: AuthManagerConfig) {
    super();
    this.config = config;
    this.state = { ...initialState };
  }

  // ============================================================================
  // Debug Logging
  // ============================================================================

  private log(...args: unknown[]): void {
    this.config.debug?.(...args);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getState(): AuthState {
    return this.state;
  }

  getToken(): string | null {
    return this.state.token;
  }

  getUser(): AuthUser | null {
    return this.state.user;
  }

  isAuthenticated(): boolean {
    return this.state.user !== null && this.state.token !== null;
  }

  getPlugins(): AuthPluginCore[] {
    return this.plugins;
  }

  // ============================================================================
  // State Updates
  // ============================================================================

  private setState(updates: Partial<AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.emit('stateChange', this.state);
  }

  private setStep(step: AuthStep, error: string | null = null): void {
    this.setState({ step, error });
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize auth manager - load and validate stored tokens
   */
  async initialize(): Promise<void> {
    const { storage, apiUrl, apiKey, onUserChange } = this.config;
    const token = storage.getToken();
    const refreshToken = storage.getRefreshToken();

    if (!token || !refreshToken) {
      return;
    }

    // Store tokens in state
    this.setState({
      token,
      refreshToken,
      step: 'loading',
    });

    try {
      // Validate token and get user info
      const res = await fetch(`${apiUrl}/users/me`, {
        headers: {
          'X-API-Key': apiKey,
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const user: AuthUser = await res.json();
        this.setState({ user, step: 'idle' });
        onUserChange?.(user);
      } else if (res.status === 401) {
        // Token expired, try refresh
        await this.refreshTokens(refreshToken);
      } else {
        // Clear invalid tokens
        storage.clear();
        this.setState({ ...initialState });
      }
    } catch {
      this.setState({ ...initialState });
    }
  }

  // ============================================================================
  // Login Flow
  // ============================================================================

  /**
   * Start login - fetch available methods and show selection
   */
  async startLogin(): Promise<void> {
    const { apiUrl, apiKey } = this.config;
    this.setStep('loading');

    try {
      const res = await fetch(`${apiUrl}/auth/methods`, {
        headers: { 'X-API-Key': apiKey },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch auth methods');
      }

      const data: AuthMethodsResponse = await res.json();

      // Merge server methods with plugin methods
      const serverMethods = data.methods;
      const pluginMethods = this.plugins.map((p) => ({
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

      this.setState({
        step: 'methods',
        availableMethods: allMethods,
        error: null,
      });
    } catch (err) {
      this.setState({
        step: 'idle',
        error: err instanceof Error ? err.message : 'Failed to start login',
      });
    }
  }

  /**
   * Select an auth method
   */
  selectMethod(method: AuthMethod): void {
    const step: AuthStep =
      method.type === 'otp' ? 'otp-input' :
      method.type === 'oauth' ? 'oauth-pending' :
      'web3-pending';

    this.setState({
      selectedMethod: method,
      step,
      error: null,
    });
  }

  /**
   * Send OTP to email/phone
   */
  async sendOtp(target: string): Promise<void> {
    const { apiUrl, apiKey } = this.config;
    this.setState({ otpTarget: target, step: 'loading', error: null });

    try {
      const isEmail = target.includes('@');
      const body = isEmail ? { email: target } : { phone: target };

      const res = await fetch(`${apiUrl}/auth/send-otp`, {
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

      this.setStep('otp-verify');
    } catch (err) {
      this.setState({
        step: 'otp-input',
        error: err instanceof Error ? err.message : 'Failed to send OTP',
      });
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(code: string, name?: string): Promise<void> {
    const { apiUrl, apiKey, storage, onUserChange } = this.config;
    this.setStep('loading');

    try {
      const isEmail = this.state.otpTarget?.includes('@');
      const body: Record<string, string> = {
        code,
        ...(isEmail
          ? { email: this.state.otpTarget! }
          : { phone: this.state.otpTarget! }),
        ...(name ? { name } : {}),
      };

      const res = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.text();
        // Check if name is required (new account)
        if (error.includes('Name required')) {
          this.setState({ step: 'otp-name', isNewAccount: true });
          return;
        }
        throw new Error(error || 'Invalid code');
      }

      const data: AuthResponse = await res.json();

      // Store tokens
      storage.setToken(data.token);
      storage.setRefreshToken(data.refresh_token);

      this.setState({
        ...initialState,
        token: data.token,
        refreshToken: data.refresh_token,
        user: data.user,
      });
      onUserChange?.(data.user);
    } catch (err) {
      this.setState({
        step: this.state.isNewAccount ? 'otp-name' : 'otp-verify',
        error: err instanceof Error ? err.message : 'Verification failed',
      });
    }
  }

  // ============================================================================
  // Plugin Integration
  // ============================================================================

  /**
   * Register an auth plugin
   */
  registerPlugin(plugin: AuthPluginCore): void {
    // Don't add duplicates
    if (this.plugins.find((p) => p.id === plugin.id)) {
      return;
    }
    this.plugins.push(plugin);
  }

  /**
   * Handle successful plugin authentication
   */
  handlePluginSuccess(token: string, refreshToken: string, user: AuthUser): void {
    const { storage, onUserChange } = this.config;

    storage.setToken(token);
    storage.setRefreshToken(refreshToken);

    this.setState({
      ...initialState,
      token,
      refreshToken,
      user,
    });
    onUserChange?.(user);
  }

  /**
   * Handle plugin authentication error
   */
  handlePluginError(error: string): void {
    this.setState({
      step: 'methods',
      error,
    });
  }

  /**
   * Handle plugin authentication cancel
   */
  handlePluginCancel(): void {
    this.setState({
      step: 'methods',
      selectedMethod: null,
      error: null,
    });
  }

  // ============================================================================
  // OAuth Listener
  // ============================================================================

  /**
   * Set up listeners for OAuth popup success messages.
   * Uses BroadcastChannel (primary) and window.postMessage (fallback).
   * Call this when mounting your auth component.
   */
  setupOAuthListener(): void {
    // Skip if already set up or not in browser
    if (this.oauthChannel || typeof window === 'undefined') {
      return;
    }

    this.log('[ThreadKit AuthManager] Setting up OAuth listeners');

    // Process OAuth success data
    const processOAuthSuccess = (data: { token: string; refresh_token: string; user: AuthUser }) => {
      const { token, refresh_token, user } = data;
      if (token && user) {
        this.log('[ThreadKit AuthManager] Processing OAuth success for user:', user);
        this.handlePluginSuccess(token, refresh_token, user);
      } else {
        this.log('[ThreadKit AuthManager] Missing token or user in OAuth message');
      }
    };

    // BroadcastChannel listener (primary method - works across tabs with COOP)
    try {
      this.oauthChannel = new BroadcastChannel('threadkit-auth');
      this.oauthChannel.addEventListener('message', (event: MessageEvent) => {
        this.log('[ThreadKit AuthManager] BroadcastChannel message received:', event.data);
        if (event.data?.type === 'threadkit:oauth:success') {
          this.log('[ThreadKit AuthManager] OAuth success via BroadcastChannel!');
          processOAuthSuccess(event.data);
        }
      });
    } catch {
      this.log('[ThreadKit AuthManager] BroadcastChannel not supported');
    }

    // Window postMessage listener (fallback for older browsers)
    this.oauthWindowHandler = (event: MessageEvent) => {
      this.log('[ThreadKit AuthManager] Window message received:', event.data);
      if (event.data?.type === 'threadkit:auth:success' || event.data?.type === 'threadkit:oauth:success') {
        this.log('[ThreadKit AuthManager] OAuth success via postMessage!');
        processOAuthSuccess(event.data);
      }
    };
    window.addEventListener('message', this.oauthWindowHandler);
  }

  /**
   * Clean up OAuth listeners.
   * Call this when unmounting your auth component.
   */
  destroyOAuthListener(): void {
    this.log('[ThreadKit AuthManager] Cleaning up OAuth listeners');

    if (this.oauthChannel) {
      this.oauthChannel.close();
      this.oauthChannel = null;
    }

    if (this.oauthWindowHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.oauthWindowHandler);
      this.oauthWindowHandler = null;
    }
  }

  // ============================================================================
  // Logout
  // ============================================================================

  /**
   * Log out the current user
   */
  logout(): void {
    const { storage, onUserChange } = this.config;
    storage.clear();
    this.setState({ ...initialState });
    onUserChange?.(null);
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Refresh tokens
   */
  private async refreshTokens(refreshToken: string): Promise<void> {
    const { apiUrl, apiKey, storage, onUserChange } = this.config;

    try {
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (res.ok) {
        const data: AuthResponse = await res.json();
        storage.setToken(data.token);
        storage.setRefreshToken(data.refresh_token);
        this.setState({
          token: data.token,
          refreshToken: data.refresh_token,
          user: data.user,
          step: 'idle',
        });
        onUserChange?.(data.user);
      } else {
        // Refresh failed, clear tokens
        storage.clear();
        this.setState({ ...initialState });
        onUserChange?.(null);
      }
    } catch {
      storage.clear();
      this.setState({ ...initialState });
      onUserChange?.(null);
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clean up resources
   */
  destroy(): void {
    this.destroyOAuthListener();
    this.removeAllListeners();
  }
}
