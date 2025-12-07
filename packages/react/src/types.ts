import React from 'react';

// Re-export core types with explicit names to avoid conflicts with DOM types
import type {
  Comment as CoreComment,
  User as CoreUser,
  UserProfile as CoreUserProfile,
  ThreadKitMode as CoreThreadKitMode,
  SortBy as CoreSortBy,
  WebSocketMessage as CoreWebSocketMessage,
  ThreadKitErrorCode as CoreThreadKitErrorCode,
  PluginRenderInstruction,
  PluginSegment as CorePluginSegment,
  ThreadKitPlugin,
  PartialTranslations,
} from '@threadkit/core';

// Re-export with original names for backwards compatibility
export type Comment = CoreComment;
export type User = CoreUser;
export type UserProfile = CoreUserProfile;
export type ThreadKitMode = CoreThreadKitMode;
export type SortBy = CoreSortBy;
export type WebSocketMessage = CoreWebSocketMessage;
export type ThreadKitErrorCode = CoreThreadKitErrorCode;

// Re-export these as-is
export type { PluginRenderInstruction };
export type { CorePluginSegment };

export { ThreadKitError } from '@threadkit/core';

// ============================================================================
// Plugin Types (Re-export from core)
// ============================================================================

// Re-export the universal plugin type from core
export type { ThreadKitPlugin };

// ============================================================================
// CSS Variables
// ============================================================================

/** CSS variable overrides for customizing ThreadKit appearance */
export interface ThreadKitCSSVariables {
  /** Primary accent color (default: #ff4500) */
  primary?: string;
  /** Primary color on hover */
  primaryHover?: string;
  /** Upvote button color */
  upvote?: string;
  /** Downvote button color */
  downvote?: string;
  /** Link text color */
  link?: string;
  /** Link color on hover */
  linkHover?: string;
  /** Danger/error color */
  danger?: string;
  /** Success color */
  success?: string;
  /** Main background color */
  bg?: string;
  /** Secondary background color */
  bgSecondary?: string;
  /** Background color on hover */
  bgHover?: string;
  /** Border color */
  border?: string;
  /** Light border color */
  borderLight?: string;
  /** Primary text color */
  text?: string;
  /** Secondary text color */
  textSecondary?: string;
  /** Muted text color */
  textMuted?: string;
  /** Border radius (e.g., '4px', '8px') */
  radius?: string;
  /** Font family */
  fontFamily?: string;
  /** Base font size (e.g., '13px', '14px') */
  fontSize?: string;
  /** Line height */
  lineHeight?: string;
}

// ============================================================================
// ThreadKit Props
// ============================================================================

export interface ThreadKitProps {
  /** The URL/page identifier for this comment thread */
  url: string;
  /**
   * @deprecated siteId is no longer needed - site is derived from API key
   */
  siteId?: string;
  /** Display mode: 'comments' for threaded, 'chat' for live stream */
  mode?: ThreadKitMode;
  /** Theme: 'light' or 'dark' */
  theme?: 'light' | 'dark';

  // Styling customization
  /** Additional CSS class name(s) to apply to the root element */
  className?: string;
  /** Inline styles to apply to the root element */
  style?: React.CSSProperties;
  /** CSS variable overrides for customizing appearance */
  cssVariables?: ThreadKitCSSVariables;

  // Comments mode options
  /** Maximum nesting depth for replies (default: 5) */
  maxDepth?: number;
  /** Sort order for comments (default: 'votes') */
  sortBy?: SortBy;
  /** Enable upvote/downvote (default: true) */
  allowVoting?: boolean;

  // Chat mode options
  /** Number of messages to show in chat (default: 100) */
  showLastN?: number;
  /** Auto-scroll to new messages (default: true) */
  autoScroll?: boolean;
  /** Available reaction emojis */
  reactions?: string[];
  /** Show online presence count */
  showPresence?: boolean;
  /** Show typing indicators */
  showTyping?: boolean;

  // API configuration
  /** API base URL (default: https://api.usethreadkit.com) */
  apiUrl?: string;
  /** Your API key from ThreadKit dashboard (public key) */
  apiKey: string;

  // SSR support
  /** Pre-fetched comments for SSR - skips initial client fetch if provided */
  initialComments?: Comment[];

  // Branding
  /** Hide "Powered by ThreadKit" badge */
  hideBranding?: boolean;

  // Feature options
  /** Enable keyboard shortcuts (default: true) */
  enableKeyboardShortcuts?: boolean;
  /** Enable @mentions with autocomplete */
  enableMentions?: boolean;
  /** Enable auto-linking URLs (default: true) */
  enableAutoLinks?: boolean;
  /** Plugins to extend functionality */
  plugins?: ThreadKitPlugin[];
  /** Auth plugins for custom authentication methods (e.g., Ethereum, Solana) */
  authPlugins?: import('./auth/types').AuthPlugin[];
  /** Function to get additional headers before posting (e.g., for bot protection plugins like Turnstile) */
  getPostHeaders?: () => Promise<Record<string, string>>;
  /**
   * Custom translations to override default English strings.
   * Use with @threadkit/i18n for pre-made translations:
   * @example
   * import { es } from '@threadkit/i18n';
   * <ThreadKit translations={es} ... />
   *
   * Or provide partial overrides:
   * @example
   * <ThreadKit translations={{ post: 'Submit', cancel: 'Nevermind' }} ... />
   */
  translations?: PartialTranslations;
  /** Callback to get users for @mention autocomplete */
  getMentionSuggestions?: (query: string) => Promise<Array<{ id: string; name: string; avatar?: string }>>;

  // Development
  /** Enable debug mode to log internal events to console (default: false) */
  debug?: boolean;

  // Callbacks
  /** Called when user successfully signs in */
  onSignIn?: (user: User) => void;
  /** Called when user signs out */
  onSignOut?: () => void;
  /** Called when a comment is posted by the current user */
  onCommentPosted?: (comment: Comment) => void;
  /** Called when a new comment is received via WebSocket (from any user) - useful for sound effects */
  onCommentReceived?: (comment: Comment) => void;
  /** Called when current user votes on a comment */
  onVote?: (commentId: string, voteType: 'up' | 'down') => void;
  /** Called when current user starts replying to a comment */
  onReplyStart?: (parentId: string) => void;
  /** Called when a comment is deleted */
  onCommentDeleted?: (commentId: string) => void;
  /** Called when a comment is edited */
  onCommentEdited?: (commentId: string, newText: string) => void;
  /** Called on errors */
  onError?: (error: Error) => void;
}

// ============================================================================
// ThreadKit Ref
// ============================================================================

/**
 * Imperative handle for controlling ThreadKit from parent components
 */
export interface ThreadKitRef {
  /** Scroll to a specific comment and highlight it */
  scrollToComment: (commentId: string) => void;
  /** Highlight a comment without scrolling */
  highlightComment: (commentId: string, duration?: number) => void;
  /** Clear any highlighted comment */
  clearHighlight: () => void;
  /** Get current comments data */
  getComments: () => Comment[];
  /** Force refresh comments from server */
  refresh: () => Promise<void>;
  /** Collapse a comment thread */
  collapseThread: (commentId: string) => void;
  /** Expand a comment thread */
  expandThread: (commentId: string) => void;
  /** Collapse all threads */
  collapseAll: () => void;
  /** Expand all threads */
  expandAll: () => void;
}

// ============================================================================
// Component Props
// ============================================================================

export interface CommentFormProps {
  parentId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onSubmit: (text: string, parentId?: string) => Promise<void>;
  onCancel?: () => void;
}

export interface CommentProps {
  comment: Comment;
  currentUser?: User;
  /** Whether the user needs to set their username before posting */
  needsUsername?: boolean;
  /** API URL for SignInPrompt (required if needsUsername can be true) */
  apiUrl?: string;
  /** API Key for SignInPrompt (required if needsUsername can be true) */
  apiKey?: string;
  depth?: number;
  maxDepth?: number;
  collapsed?: boolean;
  highlighted?: boolean;
  index?: number;
  totalSiblings?: number;
  /** ID of currently highlighted comment (for nested highlighting) */
  highlightedCommentId?: string | null;
  /** Set of collapsed thread IDs (for nested collapse state) */
  collapsedThreads?: Set<string>;
  /** Called to post a reply (text, parentId) */
  onPost?: (text: string, parentId?: string) => Promise<void>;
  onReply?: (parentId: string) => void;
  onVote?: (commentId: string, voteType: 'up' | 'down') => void;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newText: string) => void;
  onBan?: (userId: string) => void;
  onPin?: (commentId: string) => void;
  onBlock?: (userId: string) => void;
  onReport?: (commentId: string) => void;
  onPermalink?: (commentId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onCollapse?: (commentId: string) => void;
  getUserProfile?: (userId: string) => UserProfile | undefined;
  /** Plugins for extending content rendering */
  plugins?: ThreadKitPlugin[];
}
