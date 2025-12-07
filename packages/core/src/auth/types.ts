// ============================================================================
// Auth Method Types
// ============================================================================

export type AuthMethodType = 'otp' | 'oauth' | 'web3';

export interface AuthMethod {
  /** Method identifier (email, phone, google, github, ethereum, solana) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Method type */
  type: AuthMethodType;
  /** Whether this method is enabled */
  enabled?: boolean;
  /** OAuth provider name (if oauth type) */
  provider?: string;
}

// ============================================================================
// Auth User (from API)
// ============================================================================

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  /** Whether the user has explicitly chosen their username */
  username_set?: boolean;
}

// ============================================================================
// Auth State
// ============================================================================

export type AuthStep =
  | 'idle'              // Not logging in
  | 'loading'           // Processing
  | 'methods'           // Showing method selection
  | 'otp-input'         // Entering email/phone for OTP
  | 'otp-verify'        // Entering OTP code
  | 'otp-name'          // Entering name for new account
  | 'oauth-pending'     // Waiting for OAuth popup
  | 'web3-pending'      // Waiting for wallet signature
  | 'username-required';  // User needs to set their username

export interface AuthState {
  step: AuthStep;
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
  error: string | null;
  availableMethods: AuthMethod[];
  selectedMethod: AuthMethod | null;
  otpTarget: string | null;
  isNewAccount: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AuthMethodsResponse {
  methods: AuthMethod[];
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
}

// ============================================================================
// Auth Plugin Types (framework-specific rendering handled by adapters)
// ============================================================================

/**
 * Core auth plugin interface.
 * The render function returns a framework-specific component.
 */
export interface AuthPluginCore {
  /** Unique identifier for the auth method */
  id: string;
  /** Display name */
  name: string;
  /** Method type */
  type: AuthMethodType;
}

export interface AuthPluginCallbacks {
  onSuccess: (token: string, refreshToken: string, user: AuthUser) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  apiUrl: string;
  apiKey: string;
}
