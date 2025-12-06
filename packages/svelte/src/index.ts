// Stores
export {
  createCommentsStore,
  type CommentsStore,
  type CommentsStoreConfig,
  type Comment,
  type SortBy,
  type CommentStoreState,
} from './stores/comments';

export {
  createWebSocketStore,
  type WebSocketStore,
  type WebSocketStoreConfig,
  type WebSocketState,
} from './stores/websocket';

export {
  createAuthStore,
  type AuthStore,
  type AuthStoreConfig,
  type AuthState,
  type AuthMethod,
  type User,
} from './stores/auth';

// Re-export core types
export type {
  ThreadKitPlugin,
  PluginRenderInstruction,
  PluginSegment,
  ThreadKitError,
  ThreadKitErrorCode,
  UserProfile,
  ThreadKitMode,
  WebSocketMessage,
} from '@threadkit/core';

// Main component
export { default as ThreadKit } from './components/ThreadKit.svelte';

// Sub-components for custom usage
export { default as Comment } from './components/Comment.svelte';
export { default as CommentForm } from './components/CommentForm.svelte';
export { default as CommentsView } from './components/CommentsView.svelte';
export { default as ChatView } from './components/ChatView.svelte';
export { default as ChatMessage } from './components/ChatMessage.svelte';
export { default as UserHoverCard } from './components/UserHoverCard.svelte';

// Utilities
export { renderMarkdown, formatTimestamp, formatTime } from './utils/markdown';
export type { MarkdownOptions } from './utils/markdown';
