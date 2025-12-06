import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThreadKit } from './ThreadKit';
import type { ThreadKitProps } from './types';

// Main component
export { ThreadKit } from './ThreadKit';

// Sub-components for custom usage
export { Comment } from './components/Comment';
export { CommentForm } from './components/CommentForm';
export { CommentsView } from './components/CommentsView';
export { ChatView } from './components/ChatView';
export { UserHoverCard } from './components/UserHoverCard';
export { SettingsPanel } from './components/SettingsPanel';
export { NotificationsPanel } from './components/NotificationsPanel';
export { MentionInput } from './components/MentionInput';
export type { Notification } from './components/NotificationsPanel';

// Hooks
export { useComments, ThreadKitError } from './hooks/useComments';
export type { ThreadKitErrorCode } from './hooks/useComments';
export { useWebSocket } from './hooks/useWebSocket';
export { useKeyboardShortcuts, getDefaultShortcuts } from './hooks/useKeyboardShortcuts';
export type { KeyboardShortcut } from './hooks/useKeyboardShortcuts';

// Auth
export {
  AuthProvider,
  useAuth,
  LoginModal,
  UserMenu,
  OAuthCallback,
  injectAuthStyles,
  // Icons
  EmailIcon,
  PhoneIcon,
  GoogleIcon,
  GitHubIcon,
  EthereumIcon,
  SolanaIcon,
  LoadingSpinner,
} from './auth';
export type {
  AuthPlugin,
  AuthPluginRenderProps,
  AuthMethod,
  AuthMethodType,
  AuthState,
  AuthStep,
  User as AuthUser,
} from './auth/types';

// Types
export type {
  ThreadKitProps,
  ThreadKitRef,
  ThreadKitCSSVariables,
  ThreadKitPlugin,
  Comment as CommentData, // Type for comment data (Comment component name takes precedence)
  Comment as CommentType, // Alias for backwards compatibility
  User,
  UserProfile,
  ThreadKitMode,
  SortBy,
  CommentProps,
  CommentFormProps,
  WebSocketMessage,
} from './types';

// Plugin renderers (for custom plugins)
export {
  pluginRenderers,
  renderPluginInstruction,
  registerPluginRenderer,
  LatexRenderer,
  CodeBlockRenderer,
  VideoEmbedRenderer,
  SpotifyEmbedRenderer,
  SoundCloudEmbedRenderer,
  GiphyEmbedRenderer,
  CoubEmbedRenderer,
  ImagePreviewRenderer,
  VideoPreviewRenderer,
  AudioPreviewRenderer,
} from './renderers';

/**
 * Render ThreadKit into a DOM element (for vanilla JS usage)
 * @param element - DOM element or selector string
 * @param props - ThreadKit props
 * @returns Object with unmount function
 */
export function render(
  element: HTMLElement | string,
  props: ThreadKitProps
): { unmount: () => void } {
  const container = typeof element === 'string'
    ? document.querySelector(element)
    : element;

  if (!container) {
    throw new Error(`ThreadKit: Could not find element "${element}"`);
  }

  const root: Root = createRoot(container);
  root.render(createElement(ThreadKit, props));

  return {
    unmount: () => root.unmount(),
  };
}
