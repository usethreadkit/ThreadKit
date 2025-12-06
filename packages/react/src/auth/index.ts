// Auth Context and Provider
export { AuthProvider, useAuth } from './AuthContext';

// Components
export { LoginModal } from './LoginModal';
export { UserMenu } from './UserMenu';
export { OAuthCallback } from './OAuthCallback';

// Icons
export {
  EmailIcon,
  PhoneIcon,
  GoogleIcon,
  GitHubIcon,
  EthereumIcon,
  SolanaIcon,
  LoadingSpinner,
  BackArrowIcon,
  CloseIcon,
  AUTH_ICONS,
} from './icons';

// Styles
export { injectAuthStyles, AUTH_STYLES } from './styles';

// Types
export type {
  AuthMethod,
  AuthMethodType,
  AuthPlugin,
  AuthPluginRenderProps,
  AuthState,
  AuthStep,
  AuthContextValue,
  User,
  AuthMethodsResponse,
  AuthResponse,
} from './types';
