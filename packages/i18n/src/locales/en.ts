import type { TranslationStrings } from '@threadkit/core';

/**
 * English translations (default)
 */
export const en: TranslationStrings = {
  // Common actions
  post: 'Post',
  cancel: 'Cancel',
  save: 'Save',
  edit: 'Edit',
  delete: 'Delete',
  reply: 'Reply',
  report: 'Report',
  share: 'Share',
  block: 'Block',
  unblock: 'Unblock',
  ban: 'Ban',
  send: 'Send',
  verify: 'Verify',
  continue: 'Continue',
  close: 'Close',
  submit: 'Submit',
  yes: 'Yes',
  no: 'No',
  prev: 'Prev',
  next: 'Next',
  back: 'Back',

  // Loading states
  loading: 'Loading...',
  loadingComments: 'Loading comments...',
  posting: 'Posting...',
  signingInWith: 'Signing in with',

  // Empty states
  noComments: 'No comments yet. Be the first to comment!',
  noNotifications: 'No notifications yet',
  noBlockedUsers: 'No blocked users',

  // Sorting
  sortedBy: 'Sorted by:',
  sortTop: 'Top',
  sortNew: 'New',
  sortControversial: 'Controversial',
  sortOld: 'Old',

  // Comment form
  writeComment: 'Write a comment...',
  writeReply: 'Write a reply...',
  formattingHelp: 'Formatting help',
  markdownSupported: 'Markdown formatting is supported',
  youType: 'You type:',
  youSee: 'You see:',

  // Voting
  upvote: 'Upvote',
  downvote: 'Downvote',
  point: 'point',
  points: 'points',

  // Threading
  expandComment: 'Expand comment',
  collapseComment: 'Collapse comment',
  child: 'child',
  children: 'children',

  // Badges
  pinned: 'Pinned',

  // Confirmations
  deleteConfirm: 'Delete?',
  blockConfirm: 'Block user?',
  banConfirm: 'Ban user?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Harassment',
  reportHateSpeech: 'Hate speech',
  reportMisinformation: 'Misinformation',
  reportOther: 'Other',
  selectReason: 'Select reason...',
  reportSubmitted: 'Thanks!',

  // Chat
  typeMessage: 'Type a message...',
  signInToChat: 'Sign in to chat',
  personOnline: 'person online',
  peopleOnline: 'people online',
  personTyping: 'person is typing...',
  peopleTyping: 'people are typing...',

  // Settings
  settings: 'Settings',
  signIn: 'Sign in',
  signOut: 'Sign out',
  changeAvatar: 'Change avatar',
  theme: 'Theme',
  blockedUsers: 'Blocked users',
  notifications: 'Notifications',
  emailOnReplies: 'Email on replies',
  emailOnMentions: 'Email on mentions',
  weeklyDigest: 'Weekly digest',
  deleteAccount: 'Delete account',
  accountDeleted: 'Account deleted',
  holdToDelete: 'Hold to delete account (15s)',
  holdForSeconds: 'Hold for {seconds} more seconds...',

  // Username
  usernameTaken: 'Taken',
  usernameAvailable: 'Available',
  checking: '...',

  // Auth - general
  signInToPost: 'Sign in to post',
  signInLabel: 'Sign in:',
  continueWith: 'Continue with',
  chooseSignInMethod: 'Choose how you want to sign in',

  // Auth - OTP (email/phone)
  enterEmail: 'Enter your email',
  enterPhone: 'Enter your phone number',
  sendCode: 'Send code',
  checkEmail: 'Check your email',
  checkPhone: 'Check your phone',
  enterCode: 'Enter the 6-digit code we sent to',
  codeSentTo: 'Code sent to',
  invalidCode: 'Invalid code',
  verificationFailed: 'Verification failed',
  weWillSendCode: "We'll send you a code to sign in",
  emailPlaceholder: 'you@example.com',
  phonePlaceholder: '+1 234 567 8900',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Welcome!',
  chooseDisplayName: 'Choose a display name for your account',
  yourName: 'Your name',

  // Auth - OAuth
  popupShouldOpen: 'A popup window should have opened',
  completingSignIn: 'Completing sign in with',

  // Auth - Web3
  connectingTo: 'Connecting to',

  // User profile
  karma: 'Karma',
  comments: 'Comments',
  joined: 'Joined',

  // Time formatting
  justNow: 'just now',
  minutesAgo: '{n}m ago',
  hoursAgo: '{n}h ago',
  daysAgo: '{n}d ago',

  // Notifications
  markAllRead: 'Mark all read',

  // Errors
  failedToPost: 'Failed to post comment',
  failedToVote: 'Failed to vote',
  failedToDelete: 'Failed to delete',
  failedToEdit: 'Failed to edit',
  failedToBan: 'Failed to ban user',
  failedToBlock: 'Failed to block user',
  failedToUnblock: 'Failed to unblock user',
  failedToReport: 'Failed to report',
  failedToPin: 'Failed to pin',
  failedToFetchAuthMethods: 'Failed to fetch auth methods',
  failedToStartLogin: 'Failed to start login',
  failedToSendOtp: 'Failed to send OTP',

  // Error pages
  siteNotConfigured: 'Site not configured',
  siteNotConfiguredMessage:
    'This API key is not associated with a configured site. Visit usethreadkit.com/dashboard to complete your setup.',
  invalidApiKey: 'Invalid API key',
  invalidApiKeyMessage:
    'The API key provided is invalid or has been revoked. Check your dashboard for the correct key.',
  rateLimited: 'Rate limited',
  rateLimitedMessage: 'Too many requests. Please wait a moment and try again.',
  failedToLoadComments: 'Failed to load comments',
  tryAgainLater: 'Please try again later.',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',
};
