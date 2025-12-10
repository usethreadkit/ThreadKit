import type { LocaleMetadata } from '@threadkit/core';

/**
 * Danish translations
 */
export const da: LocaleMetadata = {
  code: 'da',
  rtl: false,
  translations: {
  // Common actions
  post: 'Send',
  cancel: 'Annuller',
  save: 'Gem',
  edit: 'Rediger',
  delete: 'Slet',
  reply: 'Svar',
  report: 'Rapporter',
  share: 'Del',
  block: 'Bloker',
  unblock: 'Fjern blokering',
  ban: 'Ban',
  send: 'Send',
  verify: 'Bekræft',
  continue: 'Fortsæt',
  close: 'Luk',
  submit: 'Indsend',
  yes: 'Ja',
  no: 'Nej',
  prev: 'Forrige',
  next: 'Næste',
  back: 'Tilbage',

  // Loading states
  loading: 'Indlæser...',
  loadingComments: 'Indlæser kommentarer...',
  posting: 'Sender...',
  signingInWith: 'Logger ind med',

  // Empty states
  noComments: 'Ingen kommentarer endnu. Vær den første til at kommentere!',
  noNotifications: 'Ingen notifikationer',
  noBlockedUsers: 'Ingen blokerede brugere',

  // Sorting
  sortedBy: 'Sorter efter:',
  sortTop: 'Top',
  sortNew: 'Ny',
  sortControversial: 'Kontroversiel',
  sortOld: 'Ældste',

  // Comment form
  writeComment: 'Skriv en kommentar...',
  writeReply: 'Skriv et svar...',
  formattingHelp: 'Formateringshjælp',
  markdownSupported: 'Markdown-formatering understøttes',
  youType: 'Du skriver:',
  youSee: 'Du ser:',

  // Voting
  upvote: 'Opstem',
  downvote: 'Nedstem',
  point: 'point',
  points: 'point',

  // Threading
  expandComment: 'Udvid kommentar',
  collapseComment: 'Skjul kommentar',
  child: 'svar',
  children: 'svar',

  // Badges
  pinned: 'Fastgjort',

  // Confirmations
  deleteConfirm: 'Slet?',
  blockConfirm: 'Bloker bruger?',
  banConfirm: 'Ban bruger?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Chikane',
  reportHateSpeech: 'Hadefuld tale',
  reportMisinformation: 'Misinformation',
  reportOther: 'Andet',
  selectReason: 'Vælg årsag...',
  reportSubmitted: 'Tak!',

  // Chat
  typeMessage: 'Skriv en besked...',
  signInToChat: 'Log ind for at chatte',
  personOnline: 'person online',
  peopleOnline: 'personer online',
  personTyping: 'person skriver...',
  peopleTyping: 'personer skriver...',

  // Settings
  settings: 'Indstillinger',
  signIn: 'Log ind',
  signOut: 'Log ud',
  changeAvatar: 'Skift avatar',
  theme: 'Tema',
  blockedUsers: 'Blokerede brugere',
  notifications: 'Notifikationer',
  emailOnReplies: 'E-mail ved svar',
  emailOnMentions: 'E-mail ved omtale',
  weeklyDigest: 'Ugentlig oversigt',
  deleteAccount: 'Slet konto',
  accountDeleted: 'Konto slettet',
  holdToDelete: 'Hold nede for at slette konto (15s)',
  holdForSeconds: 'Hold nede i {seconds} sekunder endnu...',

  // Keyboard navigation
  keyboardNavigation: 'Tastaturnavigation',
  enableKeyboardShortcuts: 'Aktiver tastaturgenveje',
  key: 'Tast',
  action: 'Handling',
  nextComment: 'Næste kommentar',
  previousComment: 'Forrige kommentar',
  focusCommentInput: 'Fokuser input',
  editFocusedComment: 'Rediger kommentar',
  replyToFocusedComment: 'Svar',
  deleteFocusedComment: 'Slet kommentar',
  upvoteFocusedComment: 'Stem op',
  downvoteFocusedComment: 'Stem ned',
  toggleCollapseFocusedComment: 'Skift fold sammen',
  confirmYesNo: 'Bekræft ja/nej',
  cancelClose: 'Annuller/luk',

  // Username
  usernameTaken: 'Optaget',
  usernameAvailable: 'Tilgængelig',
  checking: 'Kontrollerer...',
  chooseUsername: 'Vælg et brugernavn',
  usernamePlaceholder: 'dit-brugernavn',
  usernameHint: 'Kun bogstaver, tal, bindestreger og underscores (2-24 tegn)',

  // Auth - general
  signInToVote: 'Log ind for at stemme',
  signInToPost: 'Log ind for at skrive',
  signInLabel: 'Log ind:',
  continueWith: 'Fortsæt med',
  chooseSignInMethod: 'Vælg hvordan du vil logge ind',

  // Auth - OTP (email/phone)
  enterEmail: 'Indtast din e-mail',
  sendCode: 'Send kode',
  checkEmail: 'Tjek din e-mail',
  enterCode: 'Indtast den 6-cifrede kode sendt til',
  codeSentTo: 'Kode sendt til',
  invalidCode: 'Ugyldig kode',
  verificationFailed: 'Bekræftelse mislykkedes',
  weWillSendCode: 'Vi sender dig en kode til at logge ind',
  emailPlaceholder: 'dig@eksempel.dk',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Velkommen!',
  chooseDisplayName: 'Vælg et visningsnavn til din konto',
  yourName: 'Dit navn',

  // Auth - OAuth
  popupShouldOpen: 'Et popup-vindue burde være åbnet',
  completingSignIn: 'Afslutter login med',

  // Auth - Web3
  connectingTo: 'Forbinder til',

  // Auth - Anonymous
  guestNamePlaceholder: 'Gæst',
  continueAsGuest: 'Fortsæt som gæst',
  guest: 'Gæst',
  anonymous: 'Anonym',

  // User profile
  karma: 'Karma',
  comments: 'Kommentarer',
  joined: 'Tilmeldt',

  // Time formatting
  justNow: 'lige nu',
  minutesAgo: '{n}m siden',
  hoursAgo: '{n}t siden',
  daysAgo: '{n}d siden',

  // Notifications
  markAllRead: 'Marker alle som læst',

  // Social Links
  socialLinks: 'Sociale links',
  saveSocialLinks: 'Gem sociale links',

  // Errors
  failedToPost: 'Kunne ikke sende kommentar',
  failedToVote: 'Kunne ikke stemme',
  failedToDelete: 'Kunne ikke slette',
  failedToEdit: 'Kunne ikke redigere',
  failedToBan: 'Kunne ikke banne bruger',
  failedToBlock: 'Kunne ikke blokere bruger',
  failedToUnblock: 'Kunne ikke fjerne blokering',
  failedToReport: 'Kunne ikke rapportere',
  failedToPin: 'Kunne ikke fastgøre',
  failedToFetchAuthMethods: 'Kunne ikke hente godkendelsesmetoder',
  failedToStartLogin: 'Kunne ikke starte login',
  failedToSendOtp: 'Kunne ikke sende OTP',

  // Error pages
  siteNotConfigured: 'Side ikke konfigureret',
  siteNotConfiguredMessage:
    'Denne API-nøgle er ikke tilknyttet en konfigureret side. Besøg usethreadkit.com/sites for at fuldføre din opsætning.',
  invalidApiKey: 'Ugyldig API-nøgle',
  invalidApiKeyMessage:
    'Den angivne API-nøgle er ugyldig eller er blevet tilbagekaldt. Tjek dit dashboard for den korrekte nøgle.',
  rateLimited: 'Begrænsning nået',
  rateLimitedMessage: 'For mange anmodninger. Vent venligst et øjeblik og prøv igen.',
  failedToLoadComments: 'Kunne ikke indlæse kommentarer',
  tryAgainLater: 'Prøv venligst igen senere.',

  // Branding
  poweredByThreadKit: 'Drevet af ThreadKit',

  // Real-time updates
  loadNewComments: 'Indlæs nye kommentarer',
  loadNewReplies: 'Indlæs nye svar',
  isTyping: 'skriver...',
  },
};
