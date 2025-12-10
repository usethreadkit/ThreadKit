import type { LocaleMetadata } from '@threadkit/core';

/**
 * Latvian translations
 */
export const lv: LocaleMetadata = {
  code: 'lv',
  rtl: false,
  translations: {
  // Common actions
  post: 'Publicēt',
  cancel: 'Atcelt',
  save: 'Saglabāt',
  edit: 'Rediģēt',
  delete: 'Dzēst',
  reply: 'Atbildēt',
  report: 'Ziņot',
  share: 'Kopīgot',
  block: 'Bloķēt',
  unblock: 'Atbloķēt',
  ban: 'Aizliegt',
  send: 'Sūtīt',
  verify: 'Pārbaudīt',
  continue: 'Turpināt',
  close: 'Aizvērt',
  submit: 'Iesniegt',
  yes: 'Jā',
  no: 'Nē',
  prev: 'Iepriekšējais',
  next: 'Nākamais',
  back: 'Atpakaļ',

  // Loading states
  loading: 'Ielādē...',
  loadingComments: 'Ielādē komentārus...',
  posting: 'Publicē...',
  signingInWith: 'Pieslēgšanās ar',

  // Empty states
  noComments: 'Vēl nav komentāru. Esi pirmais, kas komentē!',
  noNotifications: 'Nav paziņojumu',
  noBlockedUsers: 'Nav bloķētu lietotāju',

  // Sorting
  sortedBy: 'Kārtots pēc:',
  sortTop: 'Populārākie',
  sortNew: 'Jaunākie',
  sortControversial: 'Pretrunīgi vērtēti',
  sortOld: 'Vecākie',

  // Comment form
  writeComment: 'Raksti komentāru...',
  writeReply: 'Raksti atbildi...',
  formattingHelp: 'Formatēšanas palīdzība',
  markdownSupported: 'Markdown formatēšana tiek atbalstīta',
  youType: 'Jūs rakstāt:',
  youSee: 'Jūs redzat:',

  // Voting
  upvote: 'Balsot par',
  downvote: 'Balsot pret',
  point: 'punkts',
  points: 'punkti',

  // Threading
  expandComment: 'Izvērst komentāru',
  collapseComment: 'Sakļaut komentāru',
  child: 'atbilde',
  children: 'atbildes',

  // Badges
  pinned: 'Piesprausts',

  // Confirmations
  deleteConfirm: 'Dzēst?',
  blockConfirm: 'Bloķēt lietotāju?',
  banConfirm: 'Aizliegt lietotāju?',

  // Report reasons
  reportSpam: 'Surogātpasts',
  reportHarassment: 'Uzmākšanās',
  reportHateSpeech: 'Naida runa',
  reportMisinformation: 'Dezinformācija',
  reportOther: 'Cits',
  selectReason: 'Izvēlēties iemeslu...',
  reportSubmitted: 'Paldies!',

  // Chat
  typeMessage: 'Raksti ziņu...',
  signInToChat: 'Pieslēgties, lai čatot',
  personOnline: 'persona tiešsaistē',
  peopleOnline: 'personas tiešsaistē',
  personTyping: 'persona raksta...',
  peopleTyping: 'personas raksta...',

  // Settings
  settings: 'Iestatījumi',
  signIn: 'Pieslēgties',
  signOut: 'Atteikties',
  changeAvatar: 'Mainīt avatāru',
  theme: 'Tēma',
  blockedUsers: 'Bloķētie lietotāji',
  notifications: 'Paziņojumi',
  emailOnReplies: 'E-pasts par atbildēm',
  emailOnMentions: 'E-pasts par pieminēšanu',
  weeklyDigest: 'Nedēļas apkopojums',
  deleteAccount: 'Dzēst kontu',
  accountDeleted: 'Konts dzēsts',
  holdToDelete: 'Turiet, lai dzēstu kontu (15s)',
  holdForSeconds: 'Turiet vēl {seconds} sekundes...',

  // Keyboard navigation
  keyboardNavigation: 'Tastatūras navigācija',
  enableKeyboardShortcuts: 'Iespējot tastatūras īsinājumtaustiņus',
  key: 'Taustiņš',
  action: 'Darbība',
  nextComment: 'Nākamais komentārs',
  previousComment: 'Iepriekšējais komentārs',
  focusCommentInput: 'Fokusēt ievadi',
  editFocusedComment: 'Rediģēt komentāru',
  replyToFocusedComment: 'Atbildēt',
  deleteFocusedComment: 'Dzēst komentāru',
  upvoteFocusedComment: 'Balsot par',
  downvoteFocusedComment: 'Balsot pret',
  toggleCollapseFocusedComment: 'Pārslēgt sakļaušanu',
  confirmYesNo: 'Apstiprināt jā/nē',
  cancelClose: 'Atcelt/aizvērt',

  // Username
  usernameTaken: 'Aizņemts',
  usernameAvailable: 'Pieejams',
  checking: 'Pārbaude...',
  chooseUsername: 'Izvēlieties lietotājvārdu',
  usernamePlaceholder: 'jusu-vards',
  usernameHint: 'Tikai burti, cipari, defises un pasvītrojumi (2-24 rakstzīmes)',

  // Auth - general
  signInToVote: 'Piesakieties, lai balsotu',
  signInToPost: 'Pieslēgties, lai publicētu',
  signInLabel: 'Pieslēgties:',
  continueWith: 'Turpināt ar',
  chooseSignInMethod: 'Izvēlēties pieslēgšanās metodi',

  // Auth - OTP (email/phone)
  enterEmail: 'Ievadiet savu e-pastu',
  sendCode: 'Sūtīt kodu',
  checkEmail: 'Pārbaudiet savu e-pastu',
  enterCode: 'Ievadiet 6 ciparu kodu, ko nosūtījām uz',
  codeSentTo: 'Kods nosūtīts uz',
  invalidCode: 'Nederīgs kods',
  verificationFailed: 'Verifikācija neizdevās',
  weWillSendCode: 'Mēs nosūtīsim jums kodu, lai pieteiktos',
  emailPlaceholder: 'jums@example.com',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Sveiki!',
  chooseDisplayName: 'Izvēlieties parādāmo vārdu savam kontam',
  yourName: 'Jūsu vārds',

  // Auth - OAuth
  popupShouldOpen: 'Vajadzēja atvērties uznirstošajam logam',
  completingSignIn: 'Pabeidz pieslēgšanos ar',

  // Auth - Web3
  connectingTo: 'Pieslēdzas pie',

  // Auth - Anonymous
  guestNamePlaceholder: 'Viesis',
  continueAsGuest: 'Turpināt kā viesis',
  guest: 'Viesis',
  anonymous: 'Anonīms',

  // User profile
  karma: 'Karma',
  comments: 'Komentāri',
  joined: 'Pievienojies',

  // Time formatting
  justNow: 'tikko',
  minutesAgo: 'pirms {n} min',
  hoursAgo: 'pirms {n} st',
  daysAgo: 'pirms {n} d',

  // Notifications
  markAllRead: 'Atzīmēt visus kā izlasītus',

  // Social Links
  socialLinks: 'Sociālās saites',
  saveSocialLinks: 'Saglabāt sociālās saites',

  // Errors
  failedToPost: 'Neizdevās publicēt komentāru',
  failedToVote: 'Neizdevās balsot',
  failedToDelete: 'Neizdevās dzēst',
  failedToEdit: 'Neizdevās rediģēt',
  failedToBan: 'Neizdevās aizliegt lietotāju',
  failedToBlock: 'Neizdevās bloķēt lietotāju',
  failedToUnblock: 'Neizdevās atbloķēt lietotāju',
  failedToReport: 'Neizdevās ziņot',
  failedToPin: 'Neizdevās piespraust',
  failedToFetchAuthMethods: 'Neizdevās ielādēt autentifikācijas metodes',
  failedToStartLogin: 'Neizdevās sākt pieslēgšanos',
  failedToSendOtp: 'Neizdevās nosūtīt OTP',

  // Error pages
  siteNotConfigured: 'Vietne nav konfigurēta',
  siteNotConfiguredMessage:
    'Šī API atslēga nav saistīta ar konfigurētu vietni. Apmeklējiet usethreadkit.com/sites, lai pabeigtu iestatīšanu.',
  invalidApiKey: 'Nederīga API atslēga',
  invalidApiKeyMessage:
    'Norādītā API atslēga ir nederīga vai ir atsaukta. Pārbaudiet savu paneli, lai iegūtu pareizo atslēgu.',
  rateLimited: 'Pārsniegts pieprasījumu limits',
  rateLimitedMessage: 'Pārāk daudz pieprasījumu. Lūdzu, pagaidiet brīdi un mēģiniet vēlreiz.',
  failedToLoadComments: 'Neizdevās ielādēt komentārus',
  tryAgainLater: 'Lūdzu, mēģiniet vēlreiz vēlāk.',

  // Branding
  poweredByThreadKit: 'Darbojas ar ThreadKit',

  // Real-time updates
  loadNewComments: 'Ielādēt jaunus komentārus',
  loadNewReplies: 'Ielādēt jaunas atbildes',
  isTyping: 'raksta...',
  },
};
