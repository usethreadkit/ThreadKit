import type { LocaleMetadata } from '@threadkit/core';

/**
 * Hungarian translations
 */
export const hu: LocaleMetadata = {
  code: 'hu',
  rtl: false,
  translations: {
  // Common actions
  post: 'Közzététel',
  cancel: 'Mégse',
  save: 'Mentés',
  edit: 'Szerkesztés',
  delete: 'Törlés',
  reply: 'Válasz',
  report: 'Jelentés',
  share: 'Megosztás',
  block: 'Letiltás',
  unblock: 'Feloldás',
  ban: 'Kitiltás',
  send: 'Küldés',
  verify: 'Ellenőrzés',
  continue: 'Folytatás',
  close: 'Bezárás',
  submit: 'Beküldés',
  yes: 'Igen',
  no: 'Nem',
  prev: 'Előző',
  next: 'Következő',
  back: 'Vissza',

  // Loading states
  loading: 'Betöltés...',
  loadingComments: 'Hozzászólások betöltése...',
  posting: 'Közzététel...',
  signingInWith: 'Bejelentkezés ezzel:',

  // Empty states
  noComments: 'Még nincsenek hozzászólások. Legyél te az első!',
  noNotifications: 'Nincsenek értesítések',
  noBlockedUsers: 'Nincsenek letiltott felhasználók',

  // Sorting
  sortedBy: 'Rendezés:',
  sortTop: 'Legjobb',
  sortNew: 'Legújabb',
  sortControversial: 'Vitatott',
  sortOld: 'Legrégebbi',

  // Comment form
  writeComment: 'Írj egy hozzászólást...',
  writeReply: 'Írj egy választ...',
  formattingHelp: 'Formázási segédlet',
  markdownSupported: 'Markdown formázás támogatott',
  youType: 'Ezt írod:',
  youSee: 'Ezt látod:',

  // Voting
  upvote: 'Fel szavazat',
  downvote: 'Le szavazat',
  point: 'pont',
  points: 'pont',

  // Threading
  expandComment: 'Hozzászólás kibontása',
  collapseComment: 'Hozzászólás összecsukása',
  child: 'válasz',
  children: 'válasz',

  // Badges
  pinned: 'Rögzítve',

  // Confirmations
  deleteConfirm: 'Törlöd?',
  blockConfirm: 'Letiltod a felhasználót?',
  banConfirm: 'Kitiltod a felhasználót?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Zaklatás',
  reportHateSpeech: 'Gyűlöletbeszéd',
  reportMisinformation: 'Félretájékoztatás',
  reportOther: 'Egyéb',
  selectReason: 'Válassz okot...',
  reportSubmitted: 'Köszönjük!',

  // Chat
  typeMessage: 'Írj egy üzenetet...',
  signInToChat: 'Jelentkezz be a csevegéshez',
  personOnline: 'fő online',
  peopleOnline: 'fő online',
  personTyping: 'valaki gépel...',
  peopleTyping: 'többen gépelnek...',

  // Settings
  settings: 'Beállítások',
  signIn: 'Bejelentkezés',
  signOut: 'Kijelentkezés',
  changeAvatar: 'Profilkép módosítása',
  theme: 'Téma',
  blockedUsers: 'Letiltott felhasználók',
  notifications: 'Értesítések',
  emailOnReplies: 'E-mail válaszokról',
  emailOnMentions: 'E-mail említésekről',
  weeklyDigest: 'Heti összefoglaló',
  deleteAccount: 'Fiók törlése',
  accountDeleted: 'Fiók törölve',
  holdToDelete: 'Tartsd lenyomva a törléshez (15mp)',
  holdForSeconds: 'Tartsd még {seconds} másodpercig...',

  // Keyboard navigation
  keyboardNavigation: 'Billentyűzetes navigáció',
  enableKeyboardShortcuts: 'Billentyűparancsok engedélyezése',
  key: 'Billentyű',
  action: 'Művelet',
  nextComment: 'Következő hozzászólás',
  previousComment: 'Előző hozzászólás',
  focusCommentInput: 'Beviteli mező fókuszálása',
  editFocusedComment: 'Hozzászólás szerkesztése',
  replyToFocusedComment: 'Válasz',
  deleteFocusedComment: 'Hozzászólás törlése',
  upvoteFocusedComment: 'Felszavazás',
  downvoteFocusedComment: 'Leszavazás',
  toggleCollapseFocusedComment: 'Összecsukás váltása',
  confirmYesNo: 'Megerősítés igen/nem',
  cancelClose: 'Mégse/bezárás',

  // Username
  usernameTaken: 'Foglalt',
  usernameAvailable: 'Elérhető',
  checking: 'Ellenőrzés...',
  chooseUsername: 'Válasszon felhasználónevet',
  usernamePlaceholder: 'az-ön-felhasználóneve',
  usernameHint: 'Csak betűk, számok, kötőjelek, aláhúzások (2-24 karakter)',

  // Auth - general
  signInToVote: 'Jelentkezz be a szavazáshoz',
  signInToPost: 'Jelentkezz be a hozzászóláshoz',
  signInLabel: 'Bejelentkezés:',
  continueWith: 'Folytatás ezzel:',
  chooseSignInMethod: 'Válassz bejelentkezési módot',

  // Auth - OTP (email/phone)
  enterEmail: 'Add meg az e-mail címed',
  sendCode: 'Kód küldése',
  checkEmail: 'Ellenőrizd az e-mail fiókod',
  enterCode: 'Írd be a 6 jegyű kódot, amit ide küldtünk:',
  codeSentTo: 'Kód elküldve ide:',
  invalidCode: 'Érvénytelen kód',
  verificationFailed: 'Sikertelen ellenőrzés',
  weWillSendCode: 'Küldünk egy kódot a bejelentkezéshez',
  emailPlaceholder: 'te@pelda.hu',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Üdvözlünk!',
  chooseDisplayName: 'Válassz egy megjelenített nevet a fiókodhoz',
  yourName: 'A neved',

  // Auth - OAuth
  popupShouldOpen: 'Egy felugró ablaknak kellett megnyílnia',
  completingSignIn: 'Bejelentkezés befejezése ezzel:',

  // Auth - Web3
  connectingTo: 'Csatlakozás ehhez:',

  // Auth - Anonymous
  guestNamePlaceholder: 'Vendég',
  continueAsGuest: 'Folytatás vendégként',
  guest: 'Vendég',
  anonymous: 'Névtelen',

  // User profile
  karma: 'Karma',
  comments: 'Hozzászólások',
  joined: 'Csatlakozott',

  // Time formatting
  justNow: 'épp most',
  minutesAgo: '{n} perce',
  hoursAgo: '{n} órája',
  daysAgo: '{n} napja',

  // Notifications
  markAllRead: 'Mindet olvasottnak jelöli',

  // Social Links
  socialLinks: 'Közösségi linkek',
  saveSocialLinks: 'Közösségi linkek mentése',

  // Errors
  failedToPost: 'Nem sikerült a közzététel',
  failedToVote: 'Nem sikerült a szavazás',
  failedToDelete: 'Nem sikerült a törlés',
  failedToEdit: 'Nem sikerült a szerkesztés',
  failedToBan: 'Nem sikerült a kitiltás',
  failedToBlock: 'Nem sikerült a letiltás',
  failedToUnblock: 'Nem sikerült a feloldás',
  failedToReport: 'Nem sikerült a jelentés',
  failedToPin: 'Nem sikerült a rögzítés',
  failedToFetchAuthMethods: 'Nem sikerült a hitelesítési módok lekérése',
  failedToStartLogin: 'Nem sikerült a bejelentkezés indítása',
  failedToSendOtp: 'Nem sikerült az egyszeri jelszó küldése',

  // Error pages
  siteNotConfigured: 'Az oldal nincs beállítva',
  siteNotConfiguredMessage:
    'Ez az API kulcs nincs összerendelve egy beállított oldallal. Látogass el a usethreadkit.com/sites oldalra a beállítás befejezéséhez.',
  invalidApiKey: 'Érvénytelen API kulcs',
  invalidApiKeyMessage:
    'A megadott API kulcs érvénytelen vagy visszavonták. Ellenőrizd a vezérlőpulton a helyes kulcsot.',
  rateLimited: 'Túl sok kérés',
  rateLimitedMessage: 'Túl sok kérés érkezett. Kérlek várj egy kicsit és próbáld újra.',
  failedToLoadComments: 'Nem sikerült betölteni a hozzászólásokat',
  tryAgainLater: 'Kérlek próbáld újra később.',

  // Branding
  poweredByThreadKit: 'A ThreadKit támogatásával',

  // Real-time updates
  loadNewComments: 'Új hozzászólások betöltése',
  loadNewReplies: 'Új válaszok betöltése',
  isTyping: 'gépel...',
  },
};
