import type { LocaleMetadata } from '@threadkit/core';

/**
 * Slovenian translations
 */
export const sl: LocaleMetadata = {
  code: 'sl',
  rtl: false,
  translations: {
  // Common actions
  post: 'Objavi',
  cancel: 'Prekliči',
  save: 'Shrani',
  edit: 'Uredi',
  delete: 'Izbriši',
  reply: 'Odgovori',
  report: 'Prijavi',
  share: 'Deli',
  block: 'Blokiraj',
  unblock: 'Odblokiraj',
  ban: 'Prepovej',
  send: 'Pošlji',
  verify: 'Preveri',
  continue: 'Nadaljuj',
  close: 'Zapri',
  submit: 'Pošlji',
  yes: 'Da',
  no: 'Ne',
  prev: 'Prejšnja',
  next: 'Naslednja',
  back: 'Nazaj',

  // Loading states
  loading: 'Nalaganje...',
  loadingComments: 'Nalaganje komentarjev...',
  posting: 'Objavljanje...',
  signingInWith: 'Prijava z',

  // Empty states
  noComments: 'Še ni komentarjev. Bodite prvi, ki bo komentiral!',
  noNotifications: 'Ni obvestil',
  noBlockedUsers: 'Ni blokiranih uporabnikov',

  // Sorting
  sortedBy: 'Razvrščeno po:',
  sortTop: 'Top',
  sortNew: 'Novo',
  sortControversial: 'Kontroverzno',
  sortOld: 'Najstarejše',

  // Comment form
  writeComment: 'Napiši komentar...',
  writeReply: 'Napiši odgovor...',
  formattingHelp: 'Pomoč pri oblikovanju',
  markdownSupported: 'Markdown oblikovanje je podprto',
  youType: 'Tipkate:',
  youSee: 'Vidite:',

  // Voting
  upvote: 'Glasuj za',
  downvote: 'Glasuj proti',
  point: 'točka',
  points: 'točke',

  // Threading
  expandComment: 'Razširi komentar',
  collapseComment: 'Strni komentar',
  child: 'odgovor',
  children: 'odgovori',

  // Badges
  pinned: 'Pripeto',

  // Confirmations
  deleteConfirm: 'Izbriši?',
  blockConfirm: 'Blokiraj uporabnika?',
  banConfirm: 'Prepovej uporabnika?',

  // Report reasons
  reportSpam: 'Neželena pošta',
  reportHarassment: 'Napadalno vedenje',
  reportHateSpeech: 'Sovražni govor',
  reportMisinformation: 'Dezinformacije',
  reportOther: 'Drugo',
  selectReason: 'Izberite razlog...',
  reportSubmitted: 'Hvala!',

  // Chat
  typeMessage: 'Vnesite sporočilo...',
  signInToChat: 'Prijavite se za klepet',
  personOnline: 'oseba na spletu',
  peopleOnline: 'oseb na spletu',
  personTyping: 'oseba tipka...',
  peopleTyping: 'osebe tipkajo...',

  // Settings
  settings: 'Nastavitve',
  signIn: 'Prijava',
  signOut: 'Odjava',
  changeAvatar: 'Spremeni avatar',
  theme: 'Tema',
  blockedUsers: 'Blokirani uporabniki',
  notifications: 'Obvestila',
  emailOnReplies: 'E-pošta ob odgovorih',
  emailOnMentions: 'E-pošta ob omembah',
  weeklyDigest: 'Tedenski povzetek',
  deleteAccount: 'Izbriši račun',
  accountDeleted: 'Račun izbrisan',
  holdToDelete: 'Držite za izbris računa (15s)',
  holdForSeconds: 'Držite še {seconds} sekund...',

  // Keyboard navigation
  keyboardNavigation: 'Navigacija s tipkovnico',
  enableKeyboardShortcuts: 'Omogoči bližnjice na tipkovnici',
  key: 'Tipka',
  action: 'Dejanje',
  nextComment: 'Naslednji komentar',
  previousComment: 'Prejšnji komentar',
  focusCommentInput: 'Fokusiraj vnos',
  editFocusedComment: 'Uredi komentar',
  replyToFocusedComment: 'Odgovori',
  deleteFocusedComment: 'Izbriši komentar',
  upvoteFocusedComment: 'Glasuj za',
  downvoteFocusedComment: 'Glasuj proti',
  toggleCollapseFocusedComment: 'Preklopi strnitev',
  confirmYesNo: 'Potrdi da/ne',
  cancelClose: 'Prekliči/zapri',

  // Username
  usernameTaken: 'Zasedeno',
  usernameAvailable: 'Na voljo',
  checking: 'Preverjam...',
  chooseUsername: 'Izberite uporabniško ime',
  usernamePlaceholder: 'vaše-uporabniško-ime',
  usernameHint: 'Samo črke, številke, pomišljaji, podčrtaji (2-24 znakov)',

  // Auth - general
  signInToVote: 'Prijavite se za glasovanje',
  signInToPost: 'Prijavite se za objavo',
  signInLabel: 'Prijava:',
  continueWith: 'Nadaljuj z',
  chooseSignInMethod: 'Izberite način prijave',

  // Auth - OTP (email/phone)
  enterEmail: 'Vnesite svoj e-poštni naslov',
  sendCode: 'Pošlji kodo',
  checkEmail: 'Preverite svojo e-pošto',
  enterCode: 'Vnesite 6-mestno kodo, ki smo jo poslali na',
  codeSentTo: 'Koda poslana na',
  invalidCode: 'Neveljavna koda',
  verificationFailed: 'Preverjanje ni uspelo',
  weWillSendCode: 'Poslali vam bomo kodo za prijavo',
  emailPlaceholder: 'vi@example.com',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Dobrodošli!',
  chooseDisplayName: 'Izberite prikazno ime za svoj račun',
  yourName: 'Vaše ime',

  // Auth - OAuth
  popupShouldOpen: 'Pojavno okno bi se moralo odpreti',
  completingSignIn: 'Dokončujem prijavo z',

  // Auth - Web3
  connectingTo: 'Povezujem se z',

  // Auth - Anonymous
  guestNamePlaceholder: 'Gost',
  continueAsGuest: 'Nadaljuj kot gost',
  guest: 'Gost',
  anonymous: 'Anonimen',

  // User profile
  karma: 'Karma',
  comments: 'Komentarji',
  joined: 'Pridružen',

  // Time formatting
  justNow: 'ravnokar',
  minutesAgo: 'pred {n} min',
  hoursAgo: 'pred {n} ur',
  daysAgo: 'pred {n} d',

  // Notifications
  markAllRead: 'Označi vse kot prebrano',

  // Social Links
  socialLinks: 'Družabne povezave',
  saveSocialLinks: 'Shrani družabne povezave',

  // Errors
  failedToPost: 'Objavljanje komentarja ni uspelo',
  failedToVote: 'Glasovanje ni uspelo',
  failedToDelete: 'Brisanje ni uspelo',
  failedToEdit: 'Urejanje ni uspelo',
  failedToBan: 'Prepoved uporabnika ni uspela',
  failedToBlock: 'Blokiranje uporabnika ni uspelo',
  failedToUnblock: 'Odblokiranje uporabnika ni uspelo',
  failedToReport: 'Poročanje ni uspelo',
  failedToPin: 'Pripinjanje ni uspelo',
  failedToFetchAuthMethods: 'Pridobivanje metod preverjanja pristnosti ni uspelo',
  failedToStartLogin: 'Zagon prijave ni uspel',
  failedToSendOtp: 'Pošiljanje OTP ni uspelo',

  // Error pages
  siteNotConfigured: 'Mesto ni konfigurirano',
  siteNotConfiguredMessage:
    'Ta ključ API ni povezan s konfiguriranim mestom. Obiščite usethreadkit.com/sites, da dokončate namestitev.',
  invalidApiKey: 'Neveljaven ključ API',
  invalidApiKeyMessage:
    'Posredovani ključ API je neveljaven ali je bil preklican. Preverite nadzorno ploščo za pravi ključ.',
  rateLimited: 'Prekoračena omejitev hitrosti',
  rateLimitedMessage: 'Preveč zahtev. Prosimo, počakajte trenutek in poskusite znova.',
  failedToLoadComments: 'Nalaganje komentarjev ni uspelo',
  tryAgainLater: 'Poskusite znova pozneje.',

  // Branding
  poweredByThreadKit: 'Poganja ThreadKit',

  // Real-time updates
  loadNewComments: 'Naloži nove komentarje',
  loadNewReplies: 'Naloži nove odgovore',
  isTyping: 'piše...',
  },
};
