import type { LocaleMetadata } from '@threadkit/core';

/**
 * Lithuanian translations
 */
export const lt: LocaleMetadata = {
  code: 'lt',
  rtl: false,
  translations: {
  // Common actions
  post: 'Paskelbti',
  cancel: 'Atšaukti',
  save: 'Išsaugoti',
  edit: 'Redaguoti',
  delete: 'Ištrinti',
  reply: 'Atsakyti',
  report: 'Pranešti',
  share: 'Dalintis',
  block: 'Blokuoti',
  unblock: 'Atblokuoti',
  ban: 'Užblokuoti visam laikui',
  send: 'Siųsti',
  verify: 'Patvirtinti',
  continue: 'Tęsti',
  close: 'Uždaryti',
  submit: 'Pateikti',
  yes: 'Taip',
  no: 'Ne',
  prev: 'Ankstesnis',
  next: 'Kitas',
  back: 'Atgal',

  // Loading states
  loading: 'Kraunama...',
  loadingComments: 'Kraunami komentarai...',
  posting: 'Skelbiama...',
  signingInWith: 'Prisijungiama su',

  // Empty states
  noComments: 'Komentarų dar nėra. Būkite pirmas!',
  noNotifications: 'Nėra pranešimų',
  noBlockedUsers: 'Nėra blokuotų vartotojų',

  // Sorting
  sortedBy: 'Rikiuoti pagal:',
  sortTop: 'Populiariausi',
  sortNew: 'Naujausi',
  sortControversial: 'Kontroversiški',
  sortOld: 'Seniausi',

  // Comment form
  writeComment: 'Parašykite komentarą...',
  writeReply: 'Parašykite atsakymą...',
  formattingHelp: 'Formato pagalba',
  markdownSupported: 'Markdown formatavimas palaikomas',
  youType: 'Jūs rašote:',
  youSee: 'Jūs matote:',

  // Voting
  upvote: 'Palaikyti',
  downvote: 'Nepalaikyti',
  point: 'taškas',
  points: 'taškai',

  // Threading
  expandComment: 'Išskleisti komentarą',
  collapseComment: 'Suskleisti komentarą',
  child: 'atsakymas',
  children: 'atsakymai',

  // Badges
  pinned: 'Prikabinta',

  // Confirmations
  deleteConfirm: 'Ištrinti?',
  blockConfirm: 'Blokuoti vartotoją?',
  banConfirm: 'Užblokuoti vartotoją visam laikui?',

  // Report reasons
  reportSpam: 'Šlamštas',
  reportHarassment: 'Priekabiavimas',
  reportHateSpeech: 'Neapykantos kalba',
  reportMisinformation: 'Dezinformacija',
  reportOther: 'Kita',
  selectReason: 'Pasirinkite priežastį...',
  reportSubmitted: 'Ačiū!',

  // Chat
  typeMessage: 'Įveskite žinutę...',
  signInToChat: 'Prisijunkite, kad galėtumėte bendrauti',
  personOnline: 'žmogus prisijungęs',
  peopleOnline: 'žmonės prisijungę',
  personTyping: 'žmogus rašo...',
  peopleTyping: 'žmonės rašo...',

  // Settings
  settings: 'Nustatymai',
  signIn: 'Prisijungti',
  signOut: 'Atsijungti',
  changeAvatar: 'Pakeisti avatarą',
  theme: 'Tema',
  blockedUsers: 'Blokuoti vartotojai',
  notifications: 'Pranešimai',
  emailOnReplies: 'El. paštas apie atsakymus',
  emailOnMentions: 'El. paštas apie paminėjimus',
  weeklyDigest: 'Savaitinė apžvalga',
  deleteAccount: 'Ištrinti paskyrą',
  accountDeleted: 'Paskyra ištrinta',
  holdToDelete: 'Laikykite, kad ištrintumėte paskyrą (15s)',
  holdForSeconds: 'Laikykite dar {seconds} sekundžių...',

  // Keyboard navigation
  keyboardNavigation: 'Klaviatūros navigacija',
  enableKeyboardShortcuts: 'Įjungti klaviatūros sparčiuosius klavišus',
  key: 'Klavišas',
  action: 'Veiksmas',
  nextComment: 'Kitas komentaras',
  previousComment: 'Ankstesnis komentaras',
  focusCommentInput: 'Fokusuoti įvestį',
  editFocusedComment: 'Redaguoti komentarą',
  replyToFocusedComment: 'Atsakyti',
  deleteFocusedComment: 'Ištrinti komentarą',
  upvoteFocusedComment: 'Balsuoti už',
  downvoteFocusedComment: 'Balsuoti prieš',
  toggleCollapseFocusedComment: 'Perjungti sutraukimą',
  confirmYesNo: 'Patvirtinti taip/ne',
  cancelClose: 'Atšaukti/uždaryti',

  // Username
  usernameTaken: 'Užimtas',
  usernameAvailable: 'Prieinamas',
  checking: 'Tikrinama...',
  chooseUsername: 'Pasirinkite vartotojo vardą',
  usernamePlaceholder: 'jusu-vardas',
  usernameHint: 'Tik raidės, skaičiai, brūkšneliai ir pabraukimai (2-24 simboliai)',

  // Auth - general
  signInToVote: 'Prisijunkite, kad balsuotumėte',
  signInToPost: 'Prisijunkite, kad galėtumėte paskelbti',
  signInLabel: 'Prisijungti:',
  continueWith: 'Tęsti su',
  chooseSignInMethod: 'Pasirinkite prisijungimo būdą',

  // Auth - OTP (email/phone)
  enterEmail: 'Įveskite savo el. pašto adresą',
  sendCode: 'Siųsti kodą',
  checkEmail: 'Patikrinkite savo el. paštą',
  enterCode: 'Įveskite 6 skaitmenų kodą, kurį išsiuntėme į',
  codeSentTo: 'Kodas išsiųstas į',
  invalidCode: 'Neteisingas kodas',
  verificationFailed: 'Patvirtinimas nepavyko',
  weWillSendCode: 'Išsiųsime jums prisijungimo kodą',
  emailPlaceholder: 'jūs@example.com',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Sveiki!',
  chooseDisplayName: 'Pasirinkite rodomą pavadinimą savo paskyrai',
  yourName: 'Jūsų vardas',

  // Auth - OAuth
  popupShouldOpen: 'Turėjo atsidaryti iššokantis langas',
  completingSignIn: 'Užbaigiamas prisijungimas su',

  // Auth - Web3
  connectingTo: 'Jungiamasi prie',

  // Auth - Anonymous
  guestNamePlaceholder: 'Svečias',
  continueAsGuest: 'Tęsti kaip svečias',
  guest: 'Svečias',
  anonymous: 'Anoniminis',

  // User profile
  karma: 'Karma',
  comments: 'Komentarai',
  joined: 'Prisijungė',

  // Time formatting
  justNow: 'ką tik',
  minutesAgo: 'prieš {n} min',
  hoursAgo: 'prieš {n} val',
  daysAgo: 'prieš {n} d',

  // Notifications
  markAllRead: 'Pažymėti visus kaip perskaitytus',

  // Social Links
  socialLinks: 'Socialinės nuorodos',
  saveSocialLinks: 'Išsaugoti socialines nuorodas',

  // Errors
  failedToPost: 'Nepavyko paskelbti komentaro',
  failedToVote: 'Nepavyko balsuoti',
  failedToDelete: 'Nepavyko ištrinti',
  failedToEdit: 'Nepavyko redaguoti',
  failedToBan: 'Nepavyko užblokuoti vartotojo',
  failedToBlock: 'Nepavyko blokuoti vartotojo',
  failedToUnblock: 'Nepavyko atblokuoti vartotojo',
  failedToReport: 'Nepavyko pranešti',
  failedToPin: 'Nepavyko prisegti',
  failedToFetchAuthMethods: 'Nepavyko gauti autentifikavimo metodų',
  failedToStartLogin: 'Nepavyko paleisti prisijungimo',
  failedToSendOtp: 'Nepavyko išsiųsti OTP',

  // Error pages
  siteNotConfigured: 'Svetainė nesukonfigūruota',
  siteNotConfiguredMessage:
    'Šis API raktas nėra susietas su sukonfigūruota svetaine. Apsilankykite usethreadkit.com/sites, kad užbaigtumėte nustatymus.',
  invalidApiKey: 'Neteisingas API raktas',
  invalidApiKeyMessage:
    'Pateiktas API raktas yra neteisingas arba buvo atšauktas. Patikrinkite savo informacijos suvestinę dėl teisingo rakto.',
  rateLimited: 'Viršytas užklausų limitas',
  rateLimitedMessage: 'Per daug užklausų. Palaukite ir bandykite dar kartą.',
  failedToLoadComments: 'Nepavyko įkelti komentarų',
  tryAgainLater: 'Prašome pabandyti dar kartą vėliau.',

  // Branding
  poweredByThreadKit: 'Palaiko ThreadKit',

  // Real-time updates
  loadNewComments: 'Įkelti naujus komentarus',
  loadNewReplies: 'Įkelti naujus atsakymus',
  isTyping: 'rašo...',
  },
};
