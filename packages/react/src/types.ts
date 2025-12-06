import React from 'react';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
  upvotes: string[];
  downvotes: string[];
  parentId?: string;
  children: Comment[];
  edited?: boolean;
  pinned?: boolean;
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

export type ThreadKitMode = 'comments' | 'chat';

export type SortBy = 'votes' | 'newest' | 'oldest' | 'controversial';

/**
 * Callback to register a rendered segment
 */
export type PluginSegmentCallback = (start: number, end: number, rendered: React.ReactNode) => void;

/**
 * Plugin interface for extending ThreadKit functionality
 */
export interface ThreadKitPlugin {
  /** Unique name for the plugin */
  name: string;
  /** Transform text content before rendering */
  transformText?: (text: string) => string;
  /**
   * Render custom React nodes from text patterns.
   * Use the callback to register segments that the plugin handles.
   * Return null to allow other plugins and default markdown to process remaining text.
   */
  renderTokens?: (text: string, registerSegment?: PluginSegmentCallback) => React.ReactNode | null;
  /** CSS styles to inject */
  styles?: string;
}

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

export interface ThreadKitProps {
  /** Your site ID from ThreadKit dashboard */
  siteId: string;
  /** The URL/page identifier for this comment thread */
  url: string;
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
  /** Callback to get users for @mention autocomplete */
  getMentionSuggestions?: (query: string) => Promise<Array<{ id: string; name: string; avatar?: string }>>;

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

export interface CommentFormProps {
  parentId?: string;
  placeholder?: string;
  onSubmit: (text: string, parentId?: string) => Promise<void>;
  onCancel?: () => void;
}

export interface CommentProps {
  comment: Comment;
  currentUser?: User;
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

export interface WebSocketMessage {
  type: 'comment_added' | 'comment_deleted' | 'comment_edited' | 'comment_pinned' | 'user_banned' | 'typing' | 'presence';
  payload: unknown;
}
