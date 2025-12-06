// ============================================================================
// @threadkit/core
// Framework-agnostic core for ThreadKit commenting system
// ============================================================================

// Types
export type {
  Comment,
  User,
  UserProfile,
  ThreadKitMode,
  SortBy,
  WebSocketMessage,
  WebSocketMessageType,
  WebSocketState,
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
export type { WebSocketClientConfig, WebSocketClientEvents } from './stores/WebSocketClient';

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
} from './utils/format';
