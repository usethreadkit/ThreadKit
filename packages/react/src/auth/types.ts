import type { ReactNode } from 'react';

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
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  email_verified: boolean;
  phone_verified: boolean;
  /** Whether the user has explicitly chosen their username */
  username_set: boolean;
}

// ============================================================================
// Auth State Types
// ============================================================================

export type AuthStep =
  | 'idle'              // Not logging in
  | 'methods'           // Showing method selection
  | 'otp-input'         // Entering email/phone for OTP
  | 'otp-verify'        // Entering OTP code
  | 'otp-name'          // Entering name for new account
  | 'oauth-pending'     // Waiting for OAuth popup
  | 'web3-pending'      // Waiting for wallet signature
  | 'loading'           // Processing
  | 'username-required';  // User needs to set their username

export interface AuthState {
  step: AuthStep;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  error: string | null;
  availableMethods: AuthMethod[];
  selectedMethod: AuthMethod | null;
  otpTarget: string | null; // email or phone for OTP flow
  isNewAccount: boolean;
}

// ============================================================================
// Auth Plugin Types
// ============================================================================

export interface AuthPluginRenderProps {
  onSuccess: (token: string, refreshToken: string, user: User) => void;
  onError: (error: string) => void;
  onCancel: () => void;
  apiUrl: string;
  apiKey: string;
}

export interface AuthPlugin {
  /** Unique identifier for the auth method */
  id: string;
  /** Display name */
  name: string;
  /** Method type */
  type: AuthMethodType;
  /** Icon component */
  Icon: React.ComponentType<{ className?: string }>;
  /** Render the auth UI for this method */
  render: (props: AuthPluginRenderProps) => ReactNode;
}

// ============================================================================
// Auth Context Types
// ============================================================================

export interface AuthContextValue {
  state: AuthState;
  login: () => void;
  logout: () => void;
  selectMethod: (method: AuthMethod) => void;
  setOtpTarget: (target: string) => void;
  verifyOtp: (code: string, name?: string) => Promise<void>;
  registerPlugin: (plugin: AuthPlugin) => void;
  updateUsername: (username: string) => Promise<void>;
  plugins: AuthPlugin[];
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
  user: User;
}
