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
  projectId: string;
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
  private authSyncChannel: BroadcastChannel | null = null;

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

  /**
   * Get the current authentication state.
   * @returns State object including current step, user info, tokens, and error messages
   * @example
   * ```ts
   * const state = authManager.getState();
   * if (state.step === 'otp-verify') {
   *   console.log('Waiting for OTP verification');
   * } else if (state.error) {
   *   console.error('Auth error:', state.error);
   * }
   * ```
   */
  getState(): AuthState {
    return this.state;
  }

  /**
   * Get the current authentication token (JWT).
   * @returns The auth token if logged in, null otherwise
   * @example
   * ```ts
   * const token = authManager.getToken();
   * if (token) {
   *   // Include in API requests
   *   fetch(url, {
   *     headers: { Authorization: `Bearer ${token}` }
   *   });
   * }
   * ```
   */
  getToken(): string | null {
    return this.state.token;
  }

  /**
   * Get the current logged-in user.
   * @returns The user object if logged in, null otherwise
   * @example
   * ```ts
   * const user = authManager.getUser();
   * if (user) {
   *   console.log(`Welcome, ${user.name}!`);
   *   if (user.is_guest) {
   *     console.log('(Guest user)');
   *   }
   * }
   * ```
   */
  getUser(): AuthUser | null {
    return this.state.user;
  }

  /**
   * Check if a user is currently authenticated.
   * @returns True if user is logged in with a valid token, false otherwise
   * @example
   * ```ts
   * if (authManager.isAuthenticated()) {
   *   // Show post comment button
   * } else {
   *   // Show sign in prompt
   * }
   * ```
   */
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
   * Initialize the auth manager by loading and validating stored tokens.
   * Call this on app startup to restore the user's session.
   * Emits 'stateChange' event when complete.
   *
   * @example
   * ```ts
   * const authManager = new AuthManager({ apiUrl, projectId, storage });
   *
   * // Initialize on app startup
   * await authManager.initialize();
   *
   * if (authManager.isAuthenticated()) {
   *   console.log(`Welcome back, ${authManager.getUser()?.name}!`);
   * }
   * ```
   */
  async initialize(): Promise<void> {
    const { storage, apiUrl, projectId, onUserChange } = this.config;
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
          'projectid': projectId,
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const user: AuthUser = await res.json();
        // Check if user needs to set their username
        if (user.username_set === false) {
          this.setState({ user, step: 'username-required' });
        } else {
          this.setState({ user, step: 'idle' });
        }
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
   * Start the login process by fetching available authentication methods.
   * Updates state to 'methods' step with available auth options.
   * Emits 'stateChange' event when complete.
   *
   * @throws {Error} If the request fails
   * @example
   * ```ts
   * await authManager.startLogin();
   *
   * const state = authManager.getState();
   * state.availableMethods.forEach(method => {
   *   console.log(`${method.name}: ${method.type}`);
   *   // e.g., "Google: oauth", "Email: otp", "Anonymous: anonymous"
   * });
   * ```
   */
  async startLogin(): Promise<void> {
    const { apiUrl, projectId } = this.config;
    this.setStep('loading');

    try {
      const res = await fetch(`${apiUrl}/auth/methods`, {
        headers: { 'projectid': projectId },
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
      method.type === 'anonymous' ? 'anonymous-input' :
      'web3-pending';

    this.setState({
      selectedMethod: method,
      step,
      error: null,
    });
  }

  /**
   * Login anonymously with optional name
   */
  async loginAnonymous(name?: string): Promise<void> {
    const { apiUrl, projectId, storage, onUserChange } = this.config;
    this.setStep('loading');

    try {
      const res = await fetch(`${apiUrl}/auth/anonymous`, {
        method: 'POST',
        headers: {
          'projectid': projectId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name || null }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Anonymous login failed');
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

      // Broadcast login to other instances
      if (this.authSyncChannel) {
        this.log('[ThreadKit AuthManager] Broadcasting login after anonymous');
        this.authSyncChannel.postMessage({ type: 'threadkit:login' });
      }
    } catch (err) {
      this.setState({
        step: 'anonymous-input',
        error: err instanceof Error ? err.message : 'Anonymous login failed',
      });
    }
  }

  /**
   * Send a one-time password (OTP) code to an email address or phone number.
   * Updates state to 'otp-verify' step on success.
   * Emits 'stateChange' event when complete.
   *
   * @param target - Email address or phone number to send OTP to
   * @throws {Error} If the request fails or target is invalid
   * @example
   * ```ts
   * // Send OTP to email
   * await authManager.sendOtp('user@example.com');
   *
   * // Send OTP to phone
   * await authManager.sendOtp('+1234567890');
   *
   * // Check if OTP was sent successfully
   * if (authManager.getState().step === 'otp-verify') {
   *   console.log('OTP sent! Check your inbox/messages');
   * }
   * ```
   */
  async sendOtp(target: string): Promise<void> {
    const { apiUrl, projectId } = this.config;
    this.setState({ otpTarget: target, step: 'loading', error: null });

    try {
      const isEmail = target.includes('@');
      const body = isEmail ? { email: target } : { phone: target };

      const res = await fetch(`${apiUrl}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'projectid': projectId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to send OTP');
      }

      this.setStep('otp-verify');

      // Broadcast OTP request to other instances
      if (this.authSyncChannel) {
        this.log('[ThreadKit AuthManager] Broadcasting OTP request');
        this.authSyncChannel.postMessage({
          type: 'threadkit:otp-requested',
          otpTarget: target
        });
      }
    } catch (err) {
      this.setState({
        step: 'otp-input',
        error: err instanceof Error ? err.message : 'Failed to send OTP',
      });
    }
  }

  /**
   * Verify the OTP code received by the user.
   * On success, logs the user in and stores authentication tokens.
   * For new accounts, may require providing a name.
   * Emits 'stateChange' event when complete.
   *
   * @param code - The OTP code received via email/SMS
   * @param name - Optional display name for new accounts
   * @throws {Error} If verification fails or code is invalid
   * @example
   * ```ts
   * // Verify OTP code
   * try {
   *   await authManager.verifyOtp('123456');
   *   console.log('Logged in successfully!');
   * } catch (error) {
   *   console.error('Invalid code');
   * }
   *
   * // Verify with name for new account
   * await authManager.verifyOtp('123456', 'John Doe');
   * ```
   */
  async verifyOtp(code: string, name?: string): Promise<void> {
    const { apiUrl, projectId, storage, onUserChange } = this.config;
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
          'projectid': projectId,
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

      // Check if user needs to set their username
      if (data.user.username_set === false) {
        this.setState({
          ...initialState,
          token: data.token,
          refreshToken: data.refresh_token,
          user: data.user,
          step: 'username-required',
        });
      } else {
        this.setState({
          ...initialState,
          token: data.token,
          refreshToken: data.refresh_token,
          user: data.user,
        });
      }
      onUserChange?.(data.user);

      // Broadcast login to other instances
      if (this.authSyncChannel) {
        this.log('[ThreadKit AuthManager] Broadcasting login after OTP verify');
        this.authSyncChannel.postMessage({ type: 'threadkit:login' });
      }
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
  handlePluginSuccess(token: string, refreshToken: string, user: AuthUser, broadcast = true): void {
    const { storage, onUserChange } = this.config;

    storage.setToken(token);
    storage.setRefreshToken(refreshToken);

    // Check if user needs to set their username
    if (user.username_set === false) {
      this.setState({
        ...initialState,
        token,
        refreshToken,
        user,
        step: 'username-required',
      });
    } else {
      this.setState({
        ...initialState,
        token,
        refreshToken,
        user,
      });
    }
    onUserChange?.(user);

    // Broadcast login to other instances
    if (broadcast && this.authSyncChannel) {
      this.log('[ThreadKit AuthManager] Broadcasting login');
      this.authSyncChannel.postMessage({ type: 'threadkit:login' });
    }
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
  // Username Update
  // ============================================================================

  /**
   * Update the user's username (for users who haven't set one yet)
   */
  async updateUsername(username: string): Promise<void> {
    const { apiUrl, projectId, onUserChange } = this.config;
    const token = this.state.token;

    if (!token) {
      this.setState({ error: 'Not authenticated' });
      return;
    }

    this.setStep('loading');

    try {
      const res = await fetch(`${apiUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'projectid': projectId,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: username }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to update username');
      }

      const updatedUser: AuthUser = await res.json();

      this.setState({
        user: updatedUser,
        step: 'idle',
        error: null,
      });
      onUserChange?.(updatedUser);

      // Broadcast username update to other instances
      if (this.authSyncChannel) {
        this.log('[ThreadKit AuthManager] Broadcasting username update');
        this.authSyncChannel.postMessage({ type: 'threadkit:login' });
      }
    } catch (err) {
      this.setState({
        step: 'username-required',
        error: err instanceof Error ? err.message : 'Failed to update username',
      });
    }
  }

  /**
   * Update avatar for the current user
   */
  async updateAvatar(avatarUrl: string): Promise<void> {
    const { apiUrl, projectId, onUserChange } = this.config;
    const token = this.state.token;

    if (!token) {
      this.setState({ error: 'Not authenticated' });
      return;
    }

    this.setStep('loading');

    try {
      const res = await fetch(`${apiUrl}/users/me`, {
        method: 'PUT',
        headers: {
          'projectid': projectId,
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || 'Failed to update avatar');
      }

      const updatedUser: AuthUser = await res.json();

      this.setState({
        user: updatedUser,
        step: 'idle',
        error: null,
      });
      onUserChange?.(updatedUser);

      // Broadcast avatar update to other instances
      if (this.authSyncChannel) {
        this.log('[ThreadKit AuthManager] Broadcasting avatar update');
        this.authSyncChannel.postMessage({ type: 'threadkit:login' });
      }
    } catch (err) {
      this.setState({
        step: 'idle',
        error: err instanceof Error ? err.message : 'Failed to update avatar',
      });
      throw err;
    }
  }

  // ============================================================================
  // OAuth Listener
  // ============================================================================

  /**
   * Set up listeners for OAuth popup success messages and auth sync across instances.
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

    // Auth sync channel for logout/login sync across same-page instances
    try {
      this.authSyncChannel = new BroadcastChannel('threadkit-auth-sync');
      this.authSyncChannel.addEventListener('message', (event: MessageEvent) => {
        this.log('[ThreadKit AuthManager] Auth sync message received:', event.data);
        if (event.data?.type === 'threadkit:logout') {
          this.log('[ThreadKit AuthManager] Logout sync received');
          // Perform local logout without broadcasting again
          this.logoutLocal();
        } else if (event.data?.type === 'threadkit:login') {
          this.log('[ThreadKit AuthManager] Login sync received');
          // Re-initialize to pick up the new tokens from storage
          this.initialize();
        } else if (event.data?.type === 'threadkit:otp-requested') {
          this.log('[ThreadKit AuthManager] OTP request sync received');
          // Update local state to show OTP input with the same target
          this.setState({
            step: 'otp-verify',
            otpTarget: event.data.otpTarget,
            error: null,
          });
        }
      });
    } catch {
      this.log('[ThreadKit AuthManager] BroadcastChannel not supported for auth sync');
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
   * Clean up OAuth listeners and auth sync channel.
   * Call this when unmounting your auth component.
   */
  destroyOAuthListener(): void {
    this.log('[ThreadKit AuthManager] Cleaning up OAuth listeners');

    if (this.oauthChannel) {
      this.oauthChannel.close();
      this.oauthChannel = null;
    }

    if (this.authSyncChannel) {
      this.authSyncChannel.close();
      this.authSyncChannel = null;
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
   * Log out the current user.
   * Clears stored tokens and broadcasts the logout to other instances via BroadcastChannel.
   * Emits 'stateChange' event and calls onUserChange callback with null.
   *
   * @example
   * ```ts
   * authManager.logout();
   * console.log('Logged out');
   *
   * // Listen for logout
   * authManager.on('stateChange', (state) => {
   *   if (!state.user) {
   *     console.log('User logged out');
   *   }
   * });
   * ```
   */
  logout(): void {
    this.logoutLocal();

    // Broadcast logout to other instances
    if (this.authSyncChannel) {
      this.log('[ThreadKit AuthManager] Broadcasting logout');
      this.authSyncChannel.postMessage({ type: 'threadkit:logout' });
    }
  }

  /**
   * Log out locally without broadcasting (used when receiving broadcast)
   */
  private logoutLocal(): void {
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
    const { apiUrl, projectId, storage, onUserChange } = this.config;

    try {
      const res = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'projectid': projectId,
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
