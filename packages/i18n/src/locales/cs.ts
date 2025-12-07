import type { TranslationStrings } from '@threadkit/core';

/**
 * Czech translations
 */
export const cs: TranslationStrings = {
  // Common actions
  post: 'Odeslat',
  cancel: 'Zrušit',
  save: 'Uložit',
  edit: 'Upravit',
  delete: 'Smazat',
  reply: 'Odpovědět',
  report: 'Nahlásit',
  share: 'Sdílet',
  block: 'Zablokovat',
  unblock: 'Odblokovat',
  ban: 'Zabanovat',
  send: 'Odeslat',
  verify: 'Ověřit',
  continue: 'Pokračovat',
  close: 'Zavřít',
  submit: 'Odeslat',
  yes: 'Ano',
  no: 'Ne',
  prev: 'Předchozí',
  next: 'Další',
  back: 'Zpět',

  // Loading states
  loading: 'Načítání...',
  loadingComments: 'Načítání komentářů...',
  posting: 'Odesílání...',
  signingInWith: 'Přihlašování přes',

  // Empty states
  noComments: 'Zatím žádné komentáře. Buďte první!',
  noNotifications: 'Žádná upozornění',
  noBlockedUsers: 'Žádní zablokovaní uživatelé',

  // Sorting
  sortedBy: 'Seřazeno podle:',
  sortTop: 'Nejlepší',
  sortNew: 'Nejnovější',
  sortControversial: 'Kontroverzní',
  sortOld: 'Nejstarší',

  // Comment form
  writeComment: 'Napište komentář...',
  writeReply: 'Napište odpověď...',
  formattingHelp: 'Nápověda k formátování',
  markdownSupported: 'Podporováno formátování Markdown',
  youType: 'Píšete:',
  youSee: 'Vidíte:',

  // Voting
  upvote: 'Líbí se',
  downvote: 'Nelíbí se',
  point: 'bod',
  points: 'bodů',

  // Threading
  expandComment: 'Rozbalit komentář',
  collapseComment: 'Sbalit komentář',
  child: 'odpověď',
  children: 'odpovědi',

  // Badges
  pinned: 'Připnuto',

  // Confirmations
  deleteConfirm: 'Smazat?',
  blockConfirm: 'Zablokovat uživatele?',
  banConfirm: 'Zabanovat uživatele?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Obtěžování',
  reportHateSpeech: 'Nenávistný projev',
  reportMisinformation: 'Dezinformace',
  reportOther: 'Jiné',
  selectReason: 'Vyberte důvod...',
  reportSubmitted: 'Díky!',

  // Chat
  typeMessage: 'Napište zprávu...',
  signInToChat: 'Přihlaste se pro chatování',
  personOnline: 'osoba online',
  peopleOnline: 'osoby online',
  personTyping: 'osoba píše...',
  peopleTyping: 'osoby píší...',

  // Settings
  settings: 'Nastavení',
  signIn: 'Přihlásit se',
  signOut: 'Odhlásit se',
  changeAvatar: 'Změnit avatar',
  theme: 'Vzhled',
  blockedUsers: 'Zablokovaní uživatelé',
  notifications: 'Upozornění',
  emailOnReplies: 'E-mail při odpovědi',
  emailOnMentions: 'E-mail při zmínce',
  weeklyDigest: 'Týdenní souhrn',
  deleteAccount: 'Smazat účet',
  accountDeleted: 'Účet smazán',
  holdToDelete: 'Podržte pro smazání účtu (15s)',
  holdForSeconds: 'Držte ještě {seconds} sekund...',

  // Username
  usernameTaken: 'Zabrané',
  usernameAvailable: 'Dostupné',
  checking: 'Kontroluji...',

  // Auth - general
  signInToPost: 'Přihlaste se pro odeslání příspěvku',
  signInLabel: 'Přihlásit se:',
  continueWith: 'Pokračovat s',
  chooseSignInMethod: 'Vyberte způsob přihlášení',

  // Auth - OTP (email/phone)
  enterEmail: 'Zadejte svůj e-mail',
  enterPhone: 'Zadejte své telefonní číslo',
  sendCode: 'Odeslat kód',
  checkEmail: 'Zkontrolujte svůj e-mail',
  checkPhone: 'Zkontrolujte svůj telefon',
  enterCode: 'Zadejte 6místný kód odeslaný na',
  codeSentTo: 'Kód odeslán na',
  invalidCode: 'Neplatný kód',
  verificationFailed: 'Ověření selhalo',
  weWillSendCode: 'Pošleme vám kód pro přihlášení',
  emailPlaceholder: 'vy@example.com',
  phonePlaceholder: '+420 123 456 789',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Vítejte!',
  chooseDisplayName: 'Vyberte si zobrazované jméno pro svůj účet',
  yourName: 'Vaše jméno',

  // Auth - OAuth
  popupShouldOpen: 'Mělo by se otevřít vyskakovací okno',
  completingSignIn: 'Dokončování přihlášení pomocí',

  // Auth - Web3
  connectingTo: 'Připojování k',

  // User profile
  karma: 'Karma',
  comments: 'Komentáře',
  joined: 'Připojen',

  // Time formatting
  justNow: 'právě teď',
  minutesAgo: 'před {n} min',
  hoursAgo: 'před {n} hod',
  daysAgo: 'před {n} dny',

  // Notifications
  markAllRead: 'Označit vše jako přečtené',

  // Social Links
  socialLinks: 'Sociální odkazy',
  saveSocialLinks: 'Uložit sociální odkazy',

  // Errors
  failedToPost: 'Nepodařilo se odeslat komentář',
  failedToVote: 'Nepodařilo se hlasovat',
  failedToDelete: 'Nepodařilo se smazat',
  failedToEdit: 'Nepodařilo se upravit',
  failedToBan: 'Nepodařilo se zabanovat uživatele',
  failedToBlock: 'Nepodařilo se zablokovat uživatele',
  failedToUnblock: 'Nepodařilo se odblokovat uživatele',
  failedToReport: 'Nepodařilo se nahlásit',
  failedToPin: 'Nepodařilo se připnout',
  failedToFetchAuthMethods: 'Nepodařilo se načíst metody přihlášení',
  failedToStartLogin: 'Nepodařilo se zahájit přihlášení',
  failedToSendOtp: 'Nepodařilo se odeslat OTP',

  // Error pages
  siteNotConfigured: 'Stránka není nakonfigurována',
  siteNotConfiguredMessage:
    'Tento API klíč není spojen s nakonfigurovanou stránkou. Navštivte usethreadkit.com/dashboard pro dokončení nastavení.',
  invalidApiKey: 'Neplatný API klíč',
  invalidApiKeyMessage:
    'Poskytnutý API klíč je neplatný nebo byl zrušen. Zkontrolujte svůj dashboard pro správný klíč.',
  rateLimited: 'Překročen limit',
  rateLimitedMessage: 'Příliš mnoho požadavků. Prosím chvíli počkejte a zkuste to znovu.',
  failedToLoadComments: 'Nepodařilo se načíst komentáře',
  tryAgainLater: 'Zkuste to prosím později.',

  // Branding
  poweredByThreadKit: 'Poháněno ThreadKit',
};
