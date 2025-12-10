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
  /** Upvote count */
  upvotes: number;
  /** Downvote count */
  downvotes: number;
  /** Current user's vote on this comment */
  userVote?: 'up' | 'down' | null;
  parentId?: string;
  children: Comment[];
  edited?: boolean;
  pinned?: boolean;
  /** Author's karma score */
  karma?: number;
  /** Comment status: approved, pending, rejected, deleted */
  status?: 'approved' | 'pending' | 'rejected' | 'deleted';
  /** For chat mode: ID of the comment this references (when showing reply at top-level) */
  replyReferenceId?: string;
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  facebook?: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  discord?: string;
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
  socialLinks?: SocialLinks;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  karma: number;
  totalComments: number;
  joinDate: number; // Unix timestamp in milliseconds
  socialLinks?: SocialLinks;
}

// ============================================================================
// Enums
// ============================================================================

export type ThreadKitMode = 'comments' | 'chat';
export type SortBy = 'top' | 'new' | 'controversial' | 'old';

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
  | 'INVALID_ORIGIN'
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
  /** Page ID from the server (for WebSocket subscription) */
  pageId: string | null;
}

export interface TypingUser {
  userId: string;
  userName: string;
}

export interface WebSocketState {
  connected: boolean;
  presenceCount: number;
  /** All users typing (page-level, for backwards compatibility) */
  typingUsers: TypingUser[];
  /** Users typing by comment ID (null key = root-level typing) */
  typingByComment: Map<string | null, TypingUser[]>;
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
