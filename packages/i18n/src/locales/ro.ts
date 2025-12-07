import type { TranslationStrings } from '@threadkit/core';

/**
 * Romanian translations
 */
export const ro: TranslationStrings = {
  // Common actions
  post: 'Postează',
  cancel: 'Anulează',
  save: 'Salvează',
  edit: 'Editează',
  delete: 'Șterge',
  reply: 'Răspunde',
  report: 'Raportează',
  share: 'Distribuie',
  block: 'Blochează',
  unblock: 'Deblochează',
  ban: 'Interzice',
  send: 'Trimite',
  verify: 'Verifică',
  continue: 'Continuă',
  close: 'Închide',
  submit: 'Trimite',
  yes: 'Da',
  no: 'Nu',
  prev: 'Anterior',
  next: 'Următor',
  back: 'Înapoi',

  // Loading states
  loading: 'Se încarcă...',
  loadingComments: 'Se încarcă comentariile...',
  posting: 'Se postează...',
  signingInWith: 'Conectare cu',

  // Empty states
  noComments: 'Niciun comentariu încă. Fii primul care comentează!',
  noNotifications: 'Nicio notificare',
  noBlockedUsers: 'Niciun utilizator blocat',

  // Sorting
  sortedBy: 'Sortare după:',
  sortTop: 'Top',
  sortNew: 'Noi',
  sortControversial: 'Controversate',
  sortOld: 'Vechi',

  // Comment form
  writeComment: 'Scrie un comentariu...',
  writeReply: 'Scrie un răspuns...',
  formattingHelp: 'Ajutor formatare',
  markdownSupported: 'Formatare Markdown suportată',
  youType: 'Tu scrii:',
  youSee: 'Tu vezi:',

  // Voting
  upvote: 'Vot pozitiv',
  downvote: 'Vot negativ',
  point: 'punct',
  points: 'puncte',

  // Threading
  expandComment: 'Extinde comentariul',
  collapseComment: 'Restrânge comentariul',
  child: 'răspuns',
  children: 'răspunsuri',

  // Badges
  pinned: 'Fixat',

  // Confirmations
  deleteConfirm: 'Ștergi?',
  blockConfirm: 'Blochezi utilizatorul?',
  banConfirm: 'Interzici utilizatorul?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Hărțuire',
  reportHateSpeech: 'Limbaj licențios',
  reportMisinformation: 'Dezinformare',
  reportOther: 'Altele',
  selectReason: 'Selectează motivul...',
  reportSubmitted: 'Mulțumesc!',

  // Chat
  typeMessage: 'Scrie un mesaj...',
  signInToChat: 'Conectează-te pentru a discuta',
  personOnline: 'persoană online',
  peopleOnline: 'persoane online',
  personTyping: 'o persoană scrie...',
  peopleTyping: 'persoane scriu...',

  // Settings
  settings: 'Setări',
  signIn: 'Conectare',
  signOut: 'Deconectare',
  changeAvatar: 'Schimbă avatarul',
  theme: 'Temă',
  blockedUsers: 'Utilizatori blocați',
  notifications: 'Notificări',
  emailOnReplies: 'Email la răspunsuri',
  emailOnMentions: 'Email la mențiuni',
  weeklyDigest: 'Rezumat săptămânal',
  deleteAccount: 'Șterge contul',
  accountDeleted: 'Cont șters',
  holdToDelete: 'Ține apăsat pentru a șterge contul (15s)',
  holdForSeconds: 'Ține apăsat încă {seconds} secunde...',

  // Username
  usernameTaken: 'Ocupat',
  usernameAvailable: 'Disponibil',
  checking: 'Verificare...',
  chooseUsername: 'Alegeți un nume de utilizator',
  usernamePlaceholder: 'numele-tău-de-utilizator',
  usernameHint: 'Doar litere, cifre, cratime, underscore (2-24 caractere)',

  // Auth - general
  signInToPost: 'Conectează-te pentru a posta',
  signInLabel: 'Conectare:',
  continueWith: 'Continuă cu',
  chooseSignInMethod: 'Alege metoda de conectare',

  // Auth - OTP (email/phone)
  enterEmail: 'Introdu email-ul tău',
  enterPhone: 'Introdu numărul tău de telefon',
  sendCode: 'Trimite codul',
  checkEmail: 'Verifică email-ul',
  checkPhone: 'Verifică telefonul',
  enterCode: 'Introdu codul din 6 cifre trimis la',
  codeSentTo: 'Cod trimis la',
  invalidCode: 'Cod invalid',
  verificationFailed: 'Verificare eșuată',
  weWillSendCode: 'Îți vom trimite un cod pentru conectare',
  emailPlaceholder: 'tu@exemplu.ro',
  phonePlaceholder: '+40 7xx xxx xxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Bun venit!',
  chooseDisplayName: 'Alege un nume de afișat pentru contul tău',
  yourName: 'Numele tău',

  // Auth - OAuth
  popupShouldOpen: 'O fereastră popup ar fi trebuit să se deschidă',
  completingSignIn: 'Se finalizează conectarea cu',

  // Auth - Web3
  connectingTo: 'Se conectează la',

  // User profile
  karma: 'Karma',
  comments: 'Comentarii',
  joined: 'S-a alăturat',

  // Time formatting
  justNow: 'chiar acum',
  minutesAgo: 'acum {n}m',
  hoursAgo: 'acum {n}h',
  daysAgo: 'acum {n}z',

  // Notifications
  markAllRead: 'Marchează totul ca citit',

  // Social Links
  socialLinks: 'Link-uri sociale',
  saveSocialLinks: 'Salvează link-urile sociale',

  // Errors
  failedToPost: 'Nu s-a putut posta comentariul',
  failedToVote: 'Nu s-a putut vota',
  failedToDelete: 'Nu s-a putut șterge',
  failedToEdit: 'Nu s-a putut edita',
  failedToBan: 'Nu s-a putut interzice utilizatorul',
  failedToBlock: 'Nu s-a putut bloca utilizatorul',
  failedToUnblock: 'Nu s-a putut debloca utilizatorul',
  failedToReport: 'Nu s-a putut raporta',
  failedToPin: 'Nu s-a putut fixa',
  failedToFetchAuthMethods: 'Nu s-au putut prelua metodele de autentificare',
  failedToStartLogin: 'Nu s-a putut iniția conectarea',
  failedToSendOtp: 'Nu s-a putut trimite OTP',

  // Error pages
  siteNotConfigured: 'Site neconfigurat',
  siteNotConfiguredMessage:
    'Această cheie API nu este asociată cu un site configurat. Vizitează usethreadkit.com/dashboard pentru a finaliza configurarea.',
  invalidApiKey: 'Cheie API invalidă',
  invalidApiKeyMessage:
    'Cheia API furnizată este invalidă sau a fost revocată. Verifică panoul de control pentru cheia corectă.',
  rateLimited: 'Limită de rată atinsă',
  rateLimitedMessage: 'Prea multe cereri. Te rugăm să aștepți un moment și să încerci din nou.',
  failedToLoadComments: 'Nu s-au putut încărca comentariile',
  tryAgainLater: 'Te rugăm să încerci din nou mai târziu.',

  // Branding
  poweredByThreadKit: 'Propulsat de ThreadKit',
};
