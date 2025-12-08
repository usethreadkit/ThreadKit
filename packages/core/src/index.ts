// ============================================================================
// @threadkit/core
// Framework-agnostic core for ThreadKit commenting system
// ============================================================================

// Types
export type {
  Comment,
  User,
  UserProfile,
  SocialLinks,
  ThreadKitMode,
  SortBy,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketState,
  TypingUser,
  PluginRenderInstruction,
  PluginSegment,
  ThreadKitPlugin,
  ThreadKitErrorCode,
  CommentStoreState,
  TokenStorage,
} from './types';

export { ThreadKitError } from './types';

// Auth Types
export type {
  AuthMethodType,
  AuthMethod,
  AuthUser,
  AuthStep,
  AuthState,
  AuthMethodsResponse,
  AuthResponse,
  AuthPluginCore,
  AuthPluginCallbacks,
} from './auth/types';

// Event Emitter
export { EventEmitter } from './EventEmitter';

// Stores
export { CommentStore } from './stores/CommentStore';
export type { CommentStoreConfig, CommentStoreEvents } from './stores/CommentStore';

export { WebSocketClient } from './stores/WebSocketClient';
export type { WebSocketClientConfig, WebSocketClientEvents, WsUser } from './stores/WebSocketClient';

// Auth
export { AuthManager } from './auth/AuthManager';
export type { AuthManagerConfig, AuthManagerEvents } from './auth/AuthManager';

export { BrowserTokenStorage, MemoryTokenStorage } from './auth/TokenStorage';

// Comment Tree Utilities
export {
  sortComments,
  buildCommentTree,
  findComment,
  addToTree,
  removeFromTree,
  updateInTree,
  countComments,
  flattenTree,
} from './utils/commentTree';

// Tree Conversion Utilities (API <-> Client format)
export {
  treeCommentToComment,
  pageTreeToComments,
  commentToTreeComment,
  getCommentPath,
  isDeletedUser,
  isAnonymousUser,
} from './utils/treeConvert';

// Markdown Tokenizer
export {
  tokenizeLine,
  parseBlocks,
  isSafeUrl,
} from './markdown/tokenizer';

export type {
  TokenType,
  Token,
  TokenizerOptions,
  BlockType,
  Block,
} from './markdown/tokenizer';

// Markdown HTML Renderer (for vanilla JS)
export {
  renderMarkdownToHtml,
  renderMarkdownLineToHtml,
} from './markdown/htmlRenderer';

export type { RenderOptions } from './markdown/htmlRenderer';

// Markdown Composer (Plugin Integration)
export {
  composeSegments,
  splitBySegments,
  applyPluginTransforms,
  collectPluginSegments,
  processWithPlugins,
} from './markdown/composer';

export type {
  ComposedSegment,
  SplitPart,
} from './markdown/composer';

// Formatting Utilities
export {
  formatTimestamp,
  formatTime,
  formatDate,
  escapeHtml,
  normalizeUsername,
  validateUsername,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
} from './utils/format';

// Internationalization (i18n)
export type {
  TranslationStrings,
  PartialTranslations,
  LocaleCode,
} from './i18n/types';

export { defaultTranslations } from './i18n/defaults';

export { createTranslator, interpolate } from './i18n/translator';
export type { TranslatorFunction } from './i18n/translator';

// ============================================================================
// Generated API Types (from OpenAPI spec)
// ============================================================================

// Re-export convenience types from the server schema
export type {
  // Comment types
  TreeComment,
  PageTree,
  GetCommentsResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  UpdateCommentRequest,
  DeleteRequest,
  VoteRequest,
  VoteResponse,
  VoteDirection,
  CommentStatus,
  SortOrder,
  ReportReason,
  ReportRequest,
  // User types
  UserPublic,
  UserResponse,
  MeResponse,
  UpdateMeRequest,
  CheckUsernameRequest,
  CheckUsernameResponse,
  // Auth types (server schema)
  AuthMethodsResponse as ServerAuthMethodsResponse,
  AuthResponse as ServerAuthResponse,
  AuthMethod as ServerAuthMethod,
  RegisterRequest,
  LoginRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  RefreshRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  VerifyRequest,
  // Notification types
  Notification as ServerNotification,
  NotificationWithDetails,
  NotificationType,
  NotificationsResponse,
  // Moderation types
  QueueItem,
  QueueResponse,
  ReportItem,
  ReportsResponse,
  ModerateCommentRequest,
  BanUserRequest,
  BanUserResponse,
  // Admin types
  RoleListResponse,
  AddUserRequest,
  PostingStatusResponse,
  SetPostingRequest,
  BlockedUsersResponse,
  DeletedAccountStats,
  // Full paths/components for advanced usage
  paths,
  components,
} from './api.types';

export { DELETED_USER_ID, ANONYMOUS_USER_ID } from './api.types';
