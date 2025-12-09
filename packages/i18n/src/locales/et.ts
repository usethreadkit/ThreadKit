import type { TranslationStrings } from '@threadkit/core';

/**
 * Estonian translations
 */
export const et: TranslationStrings = {
  // Common actions
  post: 'Postita',
  cancel: 'Tühista',
  save: 'Salvesta',
  edit: 'Muuda',
  delete: 'Kustuta',
  reply: 'Vasta',
  report: 'Teata',
  share: 'Jaga',
  block: 'Blokeeri',
  unblock: 'Tühista blokeering',
  ban: 'Keela',
  send: 'Saada',
  verify: 'Kinnita',
  continue: 'Jätka',
  close: 'Sulge',
  submit: 'Esita',
  yes: 'Jah',
  no: 'Ei',
  prev: 'Eelmine',
  next: 'Järgmine',
  back: 'Tagasi',

  // Loading states
  loading: 'Laeb...',
  loadingComments: 'Laeb kommentaare...',
  posting: 'Postitamine...',
  signingInWith: 'Sisse logimine',

  // Empty states
  noComments: 'Kommentaare veel pole. Ole esimene!',
  noNotifications: 'Teateid pole',
  noBlockedUsers: 'Blokeeritud kasutajaid pole',

  // Sorting
  sortedBy: 'Sorteeritud:',
  sortTop: 'Populaarsemad',
  sortNew: 'Uued',
  sortControversial: 'Vastuolulised',
  sortOld: 'Vanimad',

  // Comment form
  writeComment: 'Kirjuta kommentaar...',
  writeReply: 'Kirjuta vastus...',
  formattingHelp: 'Vormindamise abi',
  markdownSupported: 'Markdown vormindus on toetatud',
  youType: 'Sina tipid:',
  youSee: 'Sina näed:',

  // Voting
  upvote: 'Poolthääl',
  downvote: 'Vastuhääl',
  point: 'punkt',
  points: 'punktid',

  // Threading
  expandComment: 'Laienda kommentaar',
  collapseComment: 'Ahenda kommentaar',
  child: 'vastus',
  children: 'vastused',

  // Badges
  pinned: 'Kinnitatud',

  // Confirmations
  deleteConfirm: 'Kustuta?',
  blockConfirm: 'Blokeeri kasutaja?',
  banConfirm: 'Keela kasutaja?',

  // Report reasons
  reportSpam: 'Rämpspost',
  reportHarassment: 'Ahistamine',
  reportHateSpeech: 'Vihakõne',
  reportMisinformation: 'Väärinfo',
  reportOther: 'Muu',
  selectReason: 'Vali põhjus...',
  reportSubmitted: 'Aitäh!',

  // Chat
  typeMessage: 'Kirjuta sõnum...',
  signInToChat: 'Logi sisse vestluseks',
  personOnline: 'inimene onlines',
  peopleOnline: 'inimesed onlines',
  personTyping: 'inimene tipib...',
  peopleTyping: 'inimesed tipivad...',

  // Settings
  settings: 'Seaded',
  signIn: 'Logi sisse',
  signOut: 'Logi välja',
  changeAvatar: 'Muuda avatari',
  theme: 'Teema',
  blockedUsers: 'Blokeeritud kasutajad',
  notifications: 'Teavitused',
  emailOnReplies: 'E-mail vastuste kohta',
  emailOnMentions: 'E-mail mainimiste kohta',
  weeklyDigest: 'Nädala kokkuvõte',
  deleteAccount: 'Kustuta konto',
  accountDeleted: 'Konto kustutatud',
  holdToDelete: 'Hoia all, et kustutada konto (15s)',
  holdForSeconds: 'Hoia all veel {seconds} sekundit...',

  // Username
  usernameTaken: 'Võetud',
  usernameAvailable: 'Saadaval',
  checking: 'Kontrollimine...',
  chooseUsername: 'Valige kasutajanimi',
  usernamePlaceholder: 'teie-kasutajanimi',
  usernameHint: 'Ainult tähed, numbrid, sidekriipsud ja alakriipsud (2-24 tähemärki)',

  // Auth - general
  signInToVote: 'Hääletamiseks logi sisse',
  signInToPost: 'Logi sisse postitamiseks',
  signInLabel: 'Logi sisse:',
  continueWith: 'Jätka:',
  chooseSignInMethod: 'Vali sisselogimise meetod',

  // Auth - OTP (email/phone)
  enterEmail: 'Sisesta oma e-posti aadress',
  enterPhone: 'Sisesta oma telefoninumber',
  sendCode: 'Saada kood',
  checkEmail: 'Kontrolli oma e-posti',
  checkPhone: 'Kontrolli oma telefoni',
  enterCode: 'Sisesta 6-kohaline kood, mille saatsime',
  codeSentTo: 'Kood saadetud aadressile',
  invalidCode: 'Kehtetu kood',
  verificationFailed: 'Kontrollimine ebaõnnestus',
  weWillSendCode: 'Saadame sulle sisselogimiseks koodi',
  emailPlaceholder: 'sina@example.com',
  phonePlaceholder: '+372 5xx xxx xxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Tere tulemast!',
  chooseDisplayName: 'Vali oma kontole kuvatav nimi',
  yourName: 'Sinu nimi',

  // Auth - OAuth
  popupShouldOpen: 'Avada oleks pidanud hüpikaken',
  completingSignIn: 'Sisselogimine lõpetamisel',

  // Auth - Web3
  connectingTo: 'Ühendamine',

  // Auth - Anonymous
  guestNamePlaceholder: 'Külaline',
  continueAsGuest: 'Jätka külalisena',
  guest: 'Külaline',
  anonymous: 'Anonüümne',

  // User profile
  karma: 'Karma',
  comments: 'Kommentaarid',
  joined: 'Liitus',

  // Time formatting
  justNow: 'just now',
  minutesAgo: '{n}m tagasi',
  hoursAgo: '{n}h tagasi',
  daysAgo: '{n}p tagasi',

  // Notifications
  markAllRead: 'Märgi kõik loetuks',

  // Social Links
  socialLinks: 'Sotsiaalsed lingid',
  saveSocialLinks: 'Salvesta sotsiaalsed lingid',

  // Errors
  failedToPost: 'Kommentaari postitamine ebaõnnestus',
  failedToVote: 'Hääletamine ebaõnnestus',
  failedToDelete: 'Kustutamine ebaõnnestus',
  failedToEdit: 'Muutmine ebaõnnestus',
  failedToBan: 'Kasutaja keelamine ebaõnnestus',
  failedToBlock: 'Kasutaja blokeerimine ebaõnnestus',
  failedToUnblock: 'Kasutaja blokeeringu tühistamine ebaõnnestus',
  failedToReport: 'Teatamine ebaõnnestus',
  failedToPin: 'Kinnitamine ebaõnnestus',
  failedToFetchAuthMethods: 'Autentimismeetodite hankimine ebaõnnestus',
  failedToStartLogin: 'Sisselogimise alustamine ebaõnnestus',
  failedToSendOtp: 'OTP saatmine ebaõnnestus',

  // Error pages
  siteNotConfigured: 'Sait pole konfigureeritud',
  siteNotConfiguredMessage:
    'See API-võti pole seotud konfigureeritud saidiga. Külastage usethreadkit.com/sites oma seadistuse lõpuleviimiseks.',
  invalidApiKey: 'Kehtetu API-võti',
  invalidApiKeyMessage:
    'Esitatud API-võti on kehtetu või see on tühistatud. Kontrollige oma armatuurlauda õige võtme saamiseks.',
  rateLimited: 'Liiga palju päringuid',
  rateLimitedMessage: 'Liiga palju päringuid. Palun oodake hetk ja proovige uuesti.',
  failedToLoadComments: 'Kommentaaride laadimine ebaõnnestus',
  tryAgainLater: 'Palun proovige hiljem uuesti.',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',

  // Real-time updates
  loadNewComments: 'Laadi uued kommentaarid',
  loadNewReplies: 'Laadi uued vastused',
  isTyping: 'kirjutab...',
};
