import type { LocaleMetadata } from '@threadkit/core';

/**
 * Serbian translations
 */
export const sr: LocaleMetadata = {
  code: 'sr',
  rtl: false,
  translations: {
  // Common actions
  post: 'Objavi',
  cancel: 'Otkaži',
  save: 'Sačuvaj',
  edit: 'Izmeni',
  delete: 'Obriši',
  reply: 'Odgovori',
  report: 'Prijavi',
  share: 'Podeli',
  block: 'Blokiraj',
  unblock: 'Odblokiraj',
  ban: 'Zabrani',
  send: 'Pošalji',
  verify: 'Proveri',
  continue: 'Nastavi',
  close: 'Zatvori',
  submit: 'Pošalji',
  yes: 'Da',
  no: 'Ne',
  prev: 'Preth',
  next: 'Sledeći',
  back: 'Nazad',

  // Loading states
  loading: 'Učitavanje...',
  loadingComments: 'Učitavanje komentara...',
  posting: 'Objavljivanje...',
  signingInWith: 'Prijavljivanje putem',

  // Empty states
  noComments: 'Još nema komentara. Budite prvi koji će komentarisati!',
  noNotifications: 'Nema obaveštenja',
  noBlockedUsers: 'Nema blokiranih korisnika',

  // Sorting
  sortedBy: 'Sortiraj po:',
  sortTop: 'Vrh',
  sortNew: 'Novo',
  sortControversial: 'Kontroverzno',
  sortOld: 'Najstarije',

  // Comment form
  writeComment: 'Napiši komentar...',
  writeReply: 'Napiši odgovor...',
  formattingHelp: 'Pomoć za formatiranje',
  markdownSupported: 'Markdown formatiranje je podržano',
  youType: 'Kucaš:',
  youSee: 'Vidiš:',

  // Voting
  upvote: 'Glasaj za',
  downvote: 'Glasaj protiv',
  point: 'poen',
  points: 'poena',

  // Threading
  expandComment: 'Proširi komentar',
  collapseComment: 'Skupi komentar',
  child: 'odgovor',
  children: 'odgovori',

  // Badges
  pinned: 'Zakačeno',

  // Confirmations
  deleteConfirm: 'Obriši?',
  blockConfirm: 'Blokirati korisnika?',
  banConfirm: 'Zabraniti korisnika?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Uznemiravanje',
  reportHateSpeech: 'Govor mržnje',
  reportMisinformation: 'Dezinformacije',
  reportOther: 'Ostalo',
  selectReason: 'Izaberi razlog...',
  reportSubmitted: 'Hvala!',

  // Chat
  typeMessage: 'Upiši poruku...',
  signInToChat: 'Prijavi se za chat',
  personOnline: 'osoba online',
  peopleOnline: 'osoba online',
  personTyping: 'osoba kuca...',
  peopleTyping: 'osobe kucaju...',

  // Settings
  settings: 'Podešavanja',
  signIn: 'Prijavi se',
  signOut: 'Odjavi se',
  changeAvatar: 'Promeni avatar',
  theme: 'Tema',
  blockedUsers: 'Blokirani korisnici',
  notifications: 'Obaveštenja',
  emailOnReplies: 'E-mail o odgovorima',
  emailOnMentions: 'E-mail o spominjanjima',
  weeklyDigest: 'Nedeljni pregled',
  deleteAccount: 'Obriši nalog',
  accountDeleted: 'Nalog obrisan',
  holdToDelete: 'Drži za brisanje naloga (15s)',
  holdForSeconds: 'Drži još {seconds} sekundi...',

  // Keyboard navigation
  keyboardNavigation: 'Навигација тастатуром',
  enableKeyboardShortcuts: 'Омогући пречице тастатуре',
  key: 'Тастер',
  action: 'Радња',
  nextComment: 'Следећи коментар',
  previousComment: 'Претходни коментар',
  focusCommentInput: 'Фокусирај унос',
  editFocusedComment: 'Измени коментар',
  replyToFocusedComment: 'Одговори',
  deleteFocusedComment: 'Обриши коментар',
  upvoteFocusedComment: 'Гласај за',
  downvoteFocusedComment: 'Гласај против',
  toggleCollapseFocusedComment: 'Пребаци сажимање',
  confirmYesNo: 'Потврди да/не',
  cancelClose: 'Откажи/затвори',

  // Username
  usernameTaken: 'Заузето',
  usernameAvailable: 'Доступно',
  checking: 'Проверавам...',
  chooseUsername: 'Изаберите корисничко име',
  usernamePlaceholder: 'ваше-корисничко-име',
  usernameHint: 'Само слова, бројеви, цртице, доње црте (2-24 знака)',

  // Auth - general
  signInToVote: 'Пријавите се да гласате',
  signInToPost: 'Prijavi se za objavu',
  signInLabel: 'Prijavi se:',
  continueWith: 'Nastavi sa',
  chooseSignInMethod: 'Odaberi metod prijave',

  // Auth - OTP (email/phone)
  enterEmail: 'Unesite svoju e-poštu',
  enterPhone: 'Unesite svoj broj telefona',
  sendCode: 'Pošalji kod',
  checkEmail: 'Proverite svoju e-poštu',
  checkPhone: 'Proverite svoj telefon',
  enterCode: 'Unesite 6-cifreni kod koji smo poslali na',
  codeSentTo: 'Kod poslat na',
  invalidCode: 'Nevažeći kod',
  verificationFailed: 'Provera nije uspela',
  weWillSendCode: 'Poslaćemo vam kod za prijavu',
  emailPlaceholder: 'vi@example.com',
  phonePlaceholder: '+381 6x xxx xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Dobrodošli!',
  chooseDisplayName: 'Odaberite ime za prikaz za svoj nalog',
  yourName: 'Vaše ime',

  // Auth - OAuth
  popupShouldOpen: 'Skočni prozor bi trebalo da se otvori',
  completingSignIn: 'Dovršavanje prijave putem',

  // Auth - Web3
  connectingTo: 'Povezivanje sa',

  // Auth - Anonymous
  guestNamePlaceholder: 'Гост',
  continueAsGuest: 'Настави као гост',
  guest: 'Гост',
  anonymous: 'Анониман',

  // User profile
  karma: 'Karma',
  comments: 'Komentari',
  joined: 'Pridružen',

  // Time formatting
  justNow: 'upravo sada',
  minutesAgo: 'pre {n} min',
  hoursAgo: 'pre {n} h',
  daysAgo: 'pre {n} d',

  // Notifications
  markAllRead: 'Означи све као прочитано',

  // Social Links
  socialLinks: 'Друштвени линкови',
  saveSocialLinks: 'Сачувај друштвене линкове',

  // Errors
  failedToPost: 'Nije uspelo objavljivanje komentara',
  failedToVote: 'Nije uspelo glasanje',
  failedToDelete: 'Nije uspelo brisanje',
  failedToEdit: 'Nije uspelo uređivanje',
  failedToBan: 'Nije uspelo zabranjivanje korisnika',
  failedToBlock: 'Nije uspelo blokiranje korisnika',
  failedToUnblock: 'Nije uspelo odblokiranje korisnika',
  failedToReport: 'Nije uspelo prijavljivanje',
  failedToPin: 'Nije uspelo zakačivanje',
  failedToFetchAuthMethods: 'Nije uspelo preuzimanje metoda autentifikacije',
  failedToStartLogin: 'Nije uspelo pokretanje prijave',
  failedToSendOtp: 'Nije uspelo slanje OTP-a',

  // Error pages
  siteNotConfigured: 'Sajt nije konfigurisan',
  siteNotConfiguredMessage:
    'Ovaj API ključ nije povezan sa konfigurisanim sajtom. Posetite usethreadkit.com/sites da biste dovršili podešavanje.',
  invalidApiKey: 'Nevažeći API ključ',
  invalidApiKeyMessage:
    'Dostavljeni API ključ je nevažeći ili je opozvan. Proverite svoju nadzornu ploču za ispravan ključ.',
  rateLimited: 'Prekoračen limit zahteva',
  rateLimitedMessage: 'Previše zahteva. Molimo pričekajte trenutak i pokušajte ponovno.',
  failedToLoadComments: 'Nije uspelo učitavanje komentara',
  tryAgainLater: 'Molimo pokušajte ponovno kasnije.',

  // Branding
  poweredByThreadKit: 'Pokreće ThreadKit',

  // Real-time updates
  loadNewComments: 'Учитај нове коментаре',
  loadNewReplies: 'Учитај нове одговоре',
  isTyping: 'куца...',
  },
};
