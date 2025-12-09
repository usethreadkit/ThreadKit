/**
 * All translatable strings for ThreadKit.
 * Pass a partial object to override specific strings while keeping defaults for the rest.
 */
export interface TranslationStrings {
  // Common actions
  post: string;
  cancel: string;
  save: string;
  edit: string;
  delete: string;
  reply: string;
  report: string;
  share: string;
  block: string;
  unblock: string;
  ban: string;
  send: string;
  verify: string;
  continue: string;
  close: string;
  submit: string;
  yes: string;
  no: string;
  prev: string;
  next: string;
  back: string;

  // Loading states
  loading: string;
  loadingComments: string;
  posting: string;
  signingInWith: string;

  // Empty states
  noComments: string;
  noNotifications: string;
  noBlockedUsers: string;

  // Sorting
  sortedBy: string;
  sortTop: string;
  sortNew: string;
  sortControversial: string;
  sortOld: string;

  // Comment form
  writeComment: string;
  writeReply: string;
  formattingHelp: string;
  markdownSupported: string;
  youType: string;
  youSee: string;

  // Voting
  upvote: string;
  downvote: string;
  point: string;
  points: string;

  // Threading
  expandComment: string;
  collapseComment: string;
  child: string;
  children: string;

  // Badges
  pinned: string;

  // Confirmations
  deleteConfirm: string;
  blockConfirm: string;
  banConfirm: string;

  // Report reasons
  reportSpam: string;
  reportHarassment: string;
  reportHateSpeech: string;
  reportMisinformation: string;
  reportOther: string;
  selectReason: string;
  reportSubmitted: string;

  // Chat
  typeMessage: string;
  signInToChat: string;
  personOnline: string;
  peopleOnline: string;
  personTyping: string;
  peopleTyping: string;

  // Settings
  settings: string;
  signIn: string;
  signOut: string;
  changeAvatar: string;
  theme: string;
  blockedUsers: string;
  notifications: string;
  emailOnReplies: string;
  emailOnMentions: string;
  weeklyDigest: string;
  deleteAccount: string;
  accountDeleted: string;
  holdToDelete: string;
  holdForSeconds: string;

  // Username
  usernameTaken: string;
  usernameAvailable: string;
  checking: string;
  chooseUsername: string;
  usernamePlaceholder: string;
  usernameHint: string;

  // Auth - general
  signInToVote: string;
  signInToPost: string;
  signInLabel: string;
  continueWith: string;
  chooseSignInMethod: string;

  // Auth - OTP (email/phone)
  enterEmail: string;
  enterPhone: string;
  sendCode: string;
  checkEmail: string;
  checkPhone: string;
  enterCode: string;
  codeSentTo: string;
  invalidCode: string;
  verificationFailed: string;
  weWillSendCode: string;
  emailPlaceholder: string;
  phonePlaceholder: string;
  otpPlaceholder: string;

  // Auth - name input
  welcome: string;
  chooseDisplayName: string;
  yourName: string;

  // Auth - OAuth
  popupShouldOpen: string;
  completingSignIn: string;

  // Auth - Web3
  connectingTo: string;

  // Auth - Anonymous
  guestNamePlaceholder: string;
  continueAsGuest: string;
  guest: string;

  // User profile
  karma: string;
  comments: string;
  joined: string;

  // Time formatting
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  daysAgo: string;

  // Notifications
  markAllRead: string;
  // Social Links
  socialLinks: string;
  saveSocialLinks: string;

  // Errors
  failedToPost: string;
  failedToVote: string;
  failedToDelete: string;
  failedToEdit: string;
  failedToBan: string;
  failedToBlock: string;
  failedToUnblock: string;
  failedToReport: string;
  failedToPin: string;
  failedToFetchAuthMethods: string;
  failedToStartLogin: string;
  failedToSendOtp: string;

  // Error pages
  siteNotConfigured: string;
  siteNotConfiguredMessage: string;
  invalidApiKey: string;
  invalidApiKeyMessage: string;
  rateLimited: string;
  rateLimitedMessage: string;
  failedToLoadComments: string;
  tryAgainLater: string;

  // Branding
  poweredByThreadKit: string;

  // Real-time updates
  loadNewComments: string;
  loadNewReplies: string;
  isTyping: string;
}

/**
 * Partial translations - allows overriding only specific strings
 */
export type PartialTranslations = Partial<TranslationStrings>;

/**
 * Supported locale codes
 */
export type LocaleCode =
  | 'ar'
  | 'bg'
  | 'ca'
  | 'cs'
  | 'da'
  | 'de'
  | 'el'
  | 'en'
  | 'es'
  | 'et'
  | 'fa'
  | 'fi'
  | 'fr'
  | 'he'
  | 'hr'
  | 'hu'
  | 'id'
  | 'it'
  | 'ja'
  | 'ko'
  | 'lt'
  | 'lv'
  | 'my'
  | 'nl'
  | 'no'
  | 'pl'
  | 'pt'
  | 'ro'
  | 'ru'
  | 'sk'
  | 'sl'
  | 'sr'
  | 'sv'
  | 'th'
  | 'tr'
  | 'uk'
  | 'vi'
  | 'zh';
