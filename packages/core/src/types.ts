// ============================================================================
// Data Models
// ============================================================================

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  /** Rendered HTML content */
  html?: string;
  timestamp: number;
  /** Array of user IDs who upvoted (for tracking user's vote) */
  upvotes: string[];
  /** Array of user IDs who downvoted (for tracking user's vote) */
  downvotes: string[];
  /** Total upvote count (from server) */
  upvoteCount?: number;
  /** Total downvote count (from server) */
  downvoteCount?: number;
  parentId?: string;
  children: Comment[];
  edited?: boolean;
  pinned?: boolean;
  /** Author's karma score */
  karma?: number;
  /** Comment status: approved, pending, rejected, deleted */
  status?: 'approved' | 'pending' | 'rejected' | 'deleted';
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  isModerator?: boolean;
  isAdmin?: boolean;
  karma?: number;
  totalComments?: number;
  joinDate?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  karma: number;
  totalComments: number;
  joinDate: number;
}

// ============================================================================
// Enums
// ============================================================================

export type ThreadKitMode = 'comments' | 'chat';
export type SortBy = 'votes' | 'newest' | 'oldest' | 'controversial';

// ============================================================================
// WebSocket
// ============================================================================

export type WebSocketMessageType =
  | 'comment_added'
  | 'comment_deleted'
  | 'comment_edited'
  | 'comment_pinned'
  | 'user_banned'
  | 'typing'
  | 'presence';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: unknown;
}

// ============================================================================
// Plugin System (Universal)
// ============================================================================

/**
 * Render instructions that plugins return.
 * Framework adapters interpret these to render the appropriate UI.
 */
export interface PluginRenderInstruction {
  /** Type identifier for the renderer (e.g., 'latex', 'code-block', 'media-embed') */
  type: string;
  /** Props to pass to the renderer component */
  props: Record<string, unknown>;
}

/**
 * A segment of text that a plugin wants to render specially
 */
export interface PluginSegment {
  /** Start position in the text */
  start: number;
  /** End position in the text */
  end: number;
  /** Render instructions for this segment */
  instruction: PluginRenderInstruction;
}

/**
 * Universal plugin interface (framework-agnostic)
 */
export interface ThreadKitPlugin {
  /** Unique name for the plugin */
  name: string;
  /** Transform text content before rendering (e.g., emoji shortcodes) */
  transformText?: (text: string) => string;
  /** Find segments to render specially and return render instructions */
  findSegments?: (text: string) => PluginSegment[];
  /** CSS styles to inject */
  styles?: string;
}

// ============================================================================
// Error Handling
// ============================================================================

export type ThreadKitErrorCode =
  | 'SITE_NOT_FOUND'
  | 'INVALID_API_KEY'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class ThreadKitError extends Error {
  code: ThreadKitErrorCode;
  status?: number;

  constructor(message: string, code: ThreadKitErrorCode, status?: number) {
    super(message);
    this.name = 'ThreadKitError';
    this.code = code;
    this.status = status;
  }
}

// ============================================================================
// Auth Types
// ============================================================================

export type AuthMethodType = 'otp' | 'oauth' | 'web3';

export interface AuthMethod {
  id: string;
  type: AuthMethodType;
  name: string;
  enabled: boolean;
  provider?: string;
}

export type AuthStep =
  | 'idle'
  | 'loading'
  | 'methods'
  | 'otp-input'
  | 'otp-verify'
  | 'otp-name'
  | 'oauth-pending'
  | 'web3-pending';

export interface AuthState {
  step: AuthStep;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  error: string | null;
  availableMethods: AuthMethod[];
  selectedMethod: AuthMethod | null;
  otpTarget: string | null;
  isNewAccount: boolean;
}

// ============================================================================
// Store State Types
// ============================================================================

export interface CommentStoreState {
  comments: Comment[];
  loading: boolean;
  error: ThreadKitError | null;
}

export interface WebSocketState {
  connected: boolean;
  presenceCount: number;
  typingUsers: Array<{ userId: string; userName: string }>;
}

// ============================================================================
// Token Storage Interface
// ============================================================================

export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clear(): void;
}
