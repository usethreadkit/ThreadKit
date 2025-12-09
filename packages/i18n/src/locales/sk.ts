import type { TranslationStrings } from '@threadkit/core';

/**
 * Slovak translations
 */
export const sk: TranslationStrings = {
  // Common actions
  post: 'Odoslať',
  cancel: 'Zrušiť',
  save: 'Uložiť',
  edit: 'Upraviť',
  delete: 'Vymazať',
  reply: 'Odpovedať',
  report: 'Nahlásiť',
  share: 'Zdieľať',
  block: 'Blokovať',
  unblock: 'Odblokovať',
  ban: 'Zablokovať',
  send: 'Odoslať',
  verify: 'Overiť',
  continue: 'Pokračovať',
  close: 'Zavrieť',
  submit: 'Odoslať',
  yes: 'Áno',
  no: 'Nie',
  prev: 'Predchádzajúci',
  next: 'Ďalší',
  back: 'Späť',

  // Loading states
  loading: 'Načítava sa...',
  loadingComments: 'Načítavanie komentárov...',
  posting: 'Uverejňuje sa...',
  signingInWith: 'Prihlasovanie pomocou',

  // Empty states
  noComments: 'Zatiaľ žiadne komentáre. Buďte prvý!',
  noNotifications: 'Žiadne upozornenia',
  noBlockedUsers: 'Žiadni zablokovaní používatelia',

  // Sorting
  sortedBy: 'Zoradené podľa:',
  sortTop: 'Najlepšie',
  sortNew: 'Nové',
  sortControversial: 'Kontroverzné',
  sortOld: 'Najstaršie',

  // Comment form
  writeComment: 'Napíšte komentár...',
  writeReply: 'Napíšte odpoveď...',
  formattingHelp: 'Pomoc pri formátovaní',
  markdownSupported: 'Formátovanie Markdown je podporované',
  youType: 'Píšete:',
  youSee: 'Vidíte:',

  // Voting
  upvote: 'Páči sa mi',
  downvote: 'Nepáči sa mi',
  point: 'bod',
  points: 'bodov',

  // Threading
  expandComment: 'Rozbaliť komentár',
  collapseComment: 'Zbaliť komentár',
  child: 'odpoveď',
  children: 'odpovede',

  // Badges
  pinned: 'Pripnuté',

  // Confirmations
  deleteConfirm: 'Vymazať?',
  blockConfirm: 'Blokovať používateľa?',
  banConfirm: 'Zablokovať používateľa?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Obťažovanie',
  reportHateSpeech: 'Nenávistný prejav',
  reportMisinformation: 'Dezinformácie',
  reportOther: 'Iné',
  selectReason: 'Vyberte dôvod...',
  reportSubmitted: 'Ďakujeme!',

  // Chat
  typeMessage: 'Napíšte správu...',
  signInToChat: 'Prihláste sa pre chatovanie',
  personOnline: 'osoba online',
  peopleOnline: 'osoby online',
  personTyping: 'osoba píše...',
  peopleTyping: 'osoby píšu...',

  // Settings
  settings: 'Nastavenia',
  signIn: 'Prihlásiť sa',
  signOut: 'Odhlásiť sa',
  changeAvatar: 'Zmeniť avatar',
  theme: 'Téma',
  blockedUsers: 'Zablokovaní používatelia',
  notifications: 'Upozornenia',
  emailOnReplies: 'E-mail pri odpovediach',
  emailOnMentions: 'E-mail pri zmienkach',
  weeklyDigest: 'Týždenný súhrn',
  deleteAccount: 'Vymazať účet',
  accountDeleted: 'Účet vymazaný',
  holdToDelete: 'Podržte pre vymazanie účtu (15s)',
  holdForSeconds: 'Podržte ešte {seconds} sekúnd...',

  // Username
  usernameTaken: 'Zabrané',
  usernameAvailable: 'Dostupné',
  checking: 'Kontroluje sa...',
  chooseUsername: 'Zvoľte používateľské meno',
  usernamePlaceholder: 'vase-meno',
  usernameHint: 'Iba písmená, čísla, pomlčky a podčiarkovníky (2-24 znakov)',

  // Auth - general
  signInToVote: 'Prihláste sa na hlasovanie',
  signInToPost: 'Prihláste sa pre uverejnenie',
  signInLabel: 'Prihlásiť sa:',
  continueWith: 'Pokračovať s',
  chooseSignInMethod: 'Vyberte spôsob prihlásenia',

  // Auth - OTP (email/phone)
  enterEmail: 'Zadajte svoj e-mail',
  enterPhone: 'Zadajte svoje telefónne číslo',
  sendCode: 'Odoslať kód',
  checkEmail: 'Skontrolujte svoj e-mail',
  checkPhone: 'Skontrolujte svoj telefón',
  enterCode: 'Zadajte 6-miestny kód, ktorý bol odoslaný na',
  codeSentTo: 'Kód bol odoslaný na',
  invalidCode: 'Neplatný kód',
  verificationFailed: 'Overenie zlyhalo',
  weWillSendCode: 'Pošleme vám kód pre prihlásenie',
  emailPlaceholder: 'vy@example.com',
  phonePlaceholder: '+421 9xx xxx xxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Vitajte!',
  chooseDisplayName: 'Vyberte si zobrazované meno pre svoj účet',
  yourName: 'Vaše meno',

  // Auth - OAuth
  popupShouldOpen: 'Malo by sa otvoriť vyskakovacie okno',
  completingSignIn: 'Dokončuje sa prihlasovanie pomocou',

  // Auth - Web3
  connectingTo: 'Pripája sa k',

  // Auth - Anonymous
  guestNamePlaceholder: 'Hosť',
  continueAsGuest: 'Pokračovať ako hosť',
  guest: 'Hosť',
  anonymous: 'Anonymný',

  // User profile
  karma: 'Karma',
  comments: 'Komentáre',
  joined: 'Pripojený',

  // Time formatting
  justNow: 'právě teď',
  minutesAgo: 'pred {n} minútami',
  hoursAgo: 'pred {n} hodinami',
  daysAgo: 'pred {n} dňami',

  // Notifications
  markAllRead: 'Označiť všetko ako prečítané',

  // Social Links
  socialLinks: 'Sociálne odkazy',
  saveSocialLinks: 'Uložiť sociálne odkazy',

  // Errors
  failedToPost: 'Nepodarilo sa uverejniť komentár',
  failedToVote: 'Nepodarilo sa hlasovať',
  failedToDelete: 'Nepodarilo sa vymazať',
  failedToEdit: 'Nepodarilo sa upraviť',
  failedToBan: 'Nepodarilo sa zablokovať používateľa',
  failedToBlock: 'Nepodarilo sa zablokovať používateľa',
  failedToUnblock: 'Nepodarilo sa odblokovať používateľa',
  failedToReport: 'Nepodarilo sa nahlásiť',
  failedToPin: 'Nepodarilo sa pripnúť',
  failedToFetchAuthMethods: 'Nepodarilo sa načítať metódy overenia',
  failedToStartLogin: 'Nepodarilo sa začať prihlasovanie',
  failedToSendOtp: 'Nepodarilo sa odoslať OTP',

  // Error pages
  siteNotConfigured: 'Stránka nie je nakonfigurovaná',
  siteNotConfiguredMessage:
    'Tento API kľúč nie je spojený s nakonfigurovanou stránkou. Navštívte usethreadkit.com/sites pre dokončenie nastavenia.',
  invalidApiKey: 'Neplatný API kľúč',
  invalidApiKeyMessage:
    'Poskytnutý API kľúč je neplatný alebo bol zrušený. Skontrolujte svoj dashboard pre správny kľúč.',
  rateLimited: 'Prekročený limit',
  rateLimitedMessage: 'Príliš veľa požiadaviek. Prosím, počkajte chvíľu a skúste to znova.',
  failedToLoadComments: 'Nepodarilo sa načítať komentáre',
  tryAgainLater: 'Skúste to prosím neskôr.',

  // Branding
  poweredByThreadKit: 'Beží na ThreadKit',

  // Real-time updates
  loadNewComments: 'Načítať nové komentáre',
  loadNewReplies: 'Načítať nové odpovede',
  isTyping: 'píše...',
};
