import type { LocaleMetadata } from '@threadkit/core';

/**
 * Swedish translations
 */
export const sv: LocaleMetadata = {
  code: 'sv',
  rtl: false,
  translations: {
  // Common actions
  post: 'Publicera',
  cancel: 'Avbryt',
  save: 'Spara',
  edit: 'Redigera',
  delete: 'Ta bort',
  reply: 'Svara',
  report: 'Rapportera',
  share: 'Dela',
  block: 'Blockera',
  unblock: 'Avblockera',
  ban: 'Banna',
  send: 'Skicka',
  verify: 'Verifiera',
  continue: 'Fortsätt',
  close: 'Stäng',
  submit: 'Skicka',
  yes: 'Ja',
  no: 'Nej',
  prev: 'Föreg',
  next: 'Nästa',
  back: 'Tillbaka',

  // Loading states
  loading: 'Laddar...',
  loadingComments: 'Laddar kommentarer...',
  posting: 'Publicerar...',
  signingInWith: 'Loggar in med',

  // Empty states
  noComments: 'Inga kommentarer än. Bli den första att kommentera!',
  noNotifications: 'Inga aviseringar',
  noBlockedUsers: 'Inga blockerade användare',

  // Sorting
  sortedBy: 'Sortera efter:',
  sortTop: 'Bästa',
  sortNew: 'Nya',
  sortControversial: 'Kontroversiella',
  sortOld: 'Äldsta',

  // Comment form
  writeComment: 'Skriv en kommentar...',
  writeReply: 'Skriv ett svar...',
  formattingHelp: 'Formateringshjälp',
  markdownSupported: 'Markdown-formatering stöds',
  youType: 'Du skriver:',
  youSee: 'Du ser:',

  // Voting
  upvote: 'Uppröst',
  downvote: 'Nedröst',
  point: 'poäng',
  points: 'poäng',

  // Threading
  expandComment: 'Visa kommentar',
  collapseComment: 'Dölj kommentar',
  child: 'svar',
  children: 'svar',

  // Badges
  pinned: 'Fäst',

  // Confirmations
  deleteConfirm: 'Ta bort?',
  blockConfirm: 'Blockera användare?',
  banConfirm: 'Banna användare?',

  // Report reasons
  reportSpam: 'Skräppost',
  reportHarassment: 'Trakasserier',
  reportHateSpeech: 'Hatspråk',
  reportMisinformation: 'Desinformation',
  reportOther: 'Annat',
  selectReason: 'Välj anledning...',
  reportSubmitted: 'Tack!',

  // Chat
  typeMessage: 'Skriv ett meddelande...',
  signInToChat: 'Logga in för att chatta',
  personOnline: 'person online',
  peopleOnline: 'personer online',
  personTyping: 'person skriver...',
  peopleTyping: 'personer skriver...',

  // Settings
  settings: 'Inställningar',
  signIn: 'Logga in',
  signOut: 'Logga ut',
  changeAvatar: 'Ändra avatar',
  theme: 'Tema',
  blockedUsers: 'Blockerade användare',
  notifications: 'Aviseringar',
  emailOnReplies: 'E-post vid svar',
  emailOnMentions: 'E-post vid omnämnanden',
  weeklyDigest: 'Veckosammanfattning',
  deleteAccount: 'Ta bort konto',
  accountDeleted: 'Konto borttaget',
  holdToDelete: 'Håll för att ta bort konto (15s)',
  holdForSeconds: 'Håll i {seconds} sekunder till...',

  // Keyboard navigation
  keyboardNavigation: 'Tangentbordsnavigering',
  enableKeyboardShortcuts: 'Aktivera kortkommandon',
  key: 'Tangent',
  action: 'Åtgärd',
  nextComment: 'Nästa kommentar',
  previousComment: 'Föregående kommentar',
  focusCommentInput: 'Fokusera inmatning',
  editFocusedComment: 'Redigera kommentar',
  replyToFocusedComment: 'Svara',
  deleteFocusedComment: 'Ta bort kommentar',
  upvoteFocusedComment: 'Rösta upp',
  downvoteFocusedComment: 'Rösta ner',
  toggleCollapseFocusedComment: 'Växla kollaps',
  confirmYesNo: 'Bekräfta ja/nej',
  cancelClose: 'Avbryt/stäng',

  // Username
  usernameTaken: 'Upptaget',
  usernameAvailable: 'Tillgängligt',
  checking: 'Kontrollerar...',
  chooseUsername: 'Välj ett användarnamn',
  usernamePlaceholder: 'ditt-användarnamn',
  usernameHint: 'Endast bokstäver, siffror, bindestreck, understreck (2-24 tecken)',

  // Auth - general
  signInToVote: 'Logga in för att rösta',
  signInToPost: 'Logga in för att publicera',
  signInLabel: 'Logga in:',
  continueWith: 'Fortsätt med',
  chooseSignInMethod: 'Välj inloggningsmetod',

  // Auth - OTP (email/phone)
  enterEmail: 'Ange din e-post',
  sendCode: 'Skicka kod',
  checkEmail: 'Kontrollera din e-post',
  enterCode: 'Ange den 6-siffriga koden vi skickade till',
  codeSentTo: 'Kod skickad till',
  invalidCode: 'Ogiltig kod',
  verificationFailed: 'Verifiering misslyckades',
  weWillSendCode: 'Vi skickar en kod för att logga in',
  emailPlaceholder: 'du@exempel.se',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Välkommen!',
  chooseDisplayName: 'Välj ett visningsnamn för ditt konto',
  yourName: 'Ditt namn',

  // Auth - OAuth
  popupShouldOpen: 'Ett popup-fönster borde ha öppnats',
  completingSignIn: 'Slutför inloggning med',

  // Auth - Web3
  connectingTo: 'Ansluter till',

  // Auth - Anonymous
  guestNamePlaceholder: 'Gäst',
  continueAsGuest: 'Fortsätt som gäst',
  guest: 'Gäst',
  anonymous: 'Anonym',

  // User profile
  karma: 'Karma',
  comments: 'Kommentarer',
  joined: 'Gick med',

  // Time formatting
  justNow: 'precis nu',
  minutesAgo: '{n}m sedan',
  hoursAgo: '{n}h sedan',
  daysAgo: '{n}d sedan',

  // Notifications
  markAllRead: 'Markera alla som lästa',

  // Social Links
  socialLinks: 'Sociala länkar',
  saveSocialLinks: 'Spara sociala länkar',

  // Errors
  failedToPost: 'Misslyckades med att publicera kommentar',
  failedToVote: 'Misslyckades med att rösta',
  failedToDelete: 'Misslyckades med att ta bort',
  failedToEdit: 'Misslyckades med att redigera',
  failedToBan: 'Misslyckades med att banna användare',
  failedToBlock: 'Misslyckades med att blockera användare',
  failedToUnblock: 'Misslyckades med att avblockera användare',
  failedToReport: 'Misslyckades med att rapportera',
  failedToPin: 'Misslyckades med att fästa',
  failedToFetchAuthMethods: 'Misslyckades med att hämta autentiseringsmetoder',
  failedToStartLogin: 'Misslyckades med att starta inloggning',
  failedToSendOtp: 'Misslyckades med att skicka OTP',

  // Error pages
  siteNotConfigured: 'Sajten är inte konfigurerad',
  siteNotConfiguredMessage:
    'Denna API-nyckel är inte kopplad till en konfigurerad sajt. Besök usethreadkit.com/sites för att slutföra din installation.',
  invalidApiKey: 'Ogiltig API-nyckel',
  invalidApiKeyMessage:
    'Den angivna API-nyckeln är ogiltig eller har återkallats. Kontrollera din instrumentpanel för rätt nyckel.',
  rateLimited: 'Begränsad frekvens',
  rateLimitedMessage: 'För många förfrågningar. Vänta en stund och försök igen.',
  failedToLoadComments: 'Misslyckades med att ladda kommentarer',
  tryAgainLater: 'Försök igen senare.',

  // Branding
  poweredByThreadKit: 'Drivs av ThreadKit',

  // Real-time updates
  loadNewComments: 'Ladda nya kommentarer',
  loadNewReplies: 'Ladda nya svar',
  isTyping: 'skriver...',
  },
};
