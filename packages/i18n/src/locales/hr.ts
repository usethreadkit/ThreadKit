import type { TranslationStrings } from '@threadkit/core';

/**
 * Croatian translations
 */
export const hr: TranslationStrings = {
  // Common actions
  post: 'Objavi',
  cancel: 'Poništi',
  save: 'Spremi',
  edit: 'Uredi',
  delete: 'Izbriši',
  reply: 'Odgovori',
  report: 'Prijavi',
  share: 'Podijeli',
  block: 'Blokiraj',
  unblock: 'Deblokiraj',
  ban: 'Zabrani',
  send: 'Pošalji',
  verify: 'Provjeri',
  continue: 'Nastavi',
  close: 'Zatvori',
  submit: 'Pošalji',
  yes: 'Da',
  no: 'Ne',
  prev: 'Preth',
  next: 'Sljedeća',
  back: 'Natrag',

  // Loading states
  loading: 'Učitavanje...',
  loadingComments: 'Učitavanje komentara...',
  posting: 'Objavljivanje...',
  signingInWith: 'Prijavljivanje s',

  // Empty states
  noComments: 'Još nema komentara. Budite prvi koji će komentirati!',
  noNotifications: 'Nema obavijesti',
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
  youType: 'Pišeš:',
  youSee: 'Vidiš:',

  // Voting
  upvote: 'Glasaj za',
  downvote: 'Glasaj protiv',
  point: 'bod',
  points: 'bodova',

  // Threading
  expandComment: 'Proširi komentar',
  collapseComment: 'Skupi komentar',
  child: 'odgovor',
  children: 'odgovori',

  // Badges
  pinned: 'Zakačeno',

  // Confirmations
  deleteConfirm: 'Izbrisati?',
  blockConfirm: 'Blokirati korisnika?',
  banConfirm: 'Zabraniti korisnika?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Uznemiravanje',
  reportHateSpeech: 'Govor mržnje',
  reportMisinformation: 'Dezinformacije',
  reportOther: 'Ostalo',
  selectReason: 'Odaberi razlog...',
  reportSubmitted: 'Hvala!',

  // Chat
  typeMessage: 'Upiši poruku...',
  signInToChat: 'Prijavite se za chat',
  personOnline: 'osoba online',
  peopleOnline: 'osobe online',
  personTyping: 'osoba tipka...',
  peopleTyping: 'osobe tipkaju...',

  // Settings
  settings: 'Postavke',
  signIn: 'Prijava',
  signOut: 'Odjava',
  changeAvatar: 'Promijeni avatar',
  theme: 'Tema',
  blockedUsers: 'Blokirani korisnici',
  notifications: 'Obavijesti',
  emailOnReplies: 'E-mail o odgovorima',
  emailOnMentions: 'E-mail o spominjanjima',
  weeklyDigest: 'Tjedni pregled',
  deleteAccount: 'Izbriši račun',
  accountDeleted: 'Račun izbrisan',
  holdToDelete: 'Držite za brisanje računa (15s)',
  holdForSeconds: 'Držite još {seconds} sekundi...',

  // Username
  usernameTaken: 'Zauzeto',
  usernameAvailable: 'Dostupno',
  checking: 'Provjeravam...',
  chooseUsername: 'Odaberite korisničko ime',
  usernamePlaceholder: 'vaše-korisničko-ime',
  usernameHint: 'Samo slova, brojevi, crtice, podvlake (2-24 znaka)',

  // Auth - general
  signInToPost: 'Prijavite se za objavu',
  signInLabel: 'Prijava:',
  continueWith: 'Nastavi s',
  chooseSignInMethod: 'Odaberite način prijave',

  // Auth - OTP (email/phone)
  enterEmail: 'Unesite svoju e-poštu',
  enterPhone: 'Unesite svoj telefonski broj',
  sendCode: 'Pošalji kod',
  checkEmail: 'Provjerite svoju e-poštu',
  checkPhone: 'Provjerite svoj telefon',
  enterCode: 'Unesite 6-znamenkasti kod koji smo poslali na',
  codeSentTo: 'Kod poslan na',
  invalidCode: 'Nevažeći kod',
  verificationFailed: 'Provjera nije uspjela',
  weWillSendCode: 'Poslat ćemo vam kod za prijavu',
  emailPlaceholder: 'vi@example.com',
  phonePlaceholder: '+385 9x xxx xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Dobrodošli!',
  chooseDisplayName: 'Odaberite prikazno ime za svoj račun',
  yourName: 'Vaše ime',

  // Auth - OAuth
  popupShouldOpen: 'Skočni prozor se trebao otvoriti',
  completingSignIn: 'Dovršavanje prijave s',

  // Auth - Web3
  connectingTo: 'Povezivanje na',

  // User profile
  karma: 'Karma',
  comments: 'Komentari',
  joined: 'Pridružen',

  // Time formatting
  justNow: 'upravo sada',
  minutesAgo: 'prije {n} min',
  hoursAgo: 'prije {n} h',
  daysAgo: 'prije {n} d',

  // Notifications
  markAllRead: 'Označi sve kao pročitano',

  // Social Links
  socialLinks: 'Društvene veze',
  saveSocialLinks: 'Spremi društvene veze',

  // Errors
  failedToPost: 'Nije uspjelo objavljivanje komentara',
  failedToVote: 'Nije uspjelo glasovanje',
  failedToDelete: 'Nije uspjelo brisanje',
  failedToEdit: 'Nije uspjelo uređivanje',
  failedToBan: 'Nije uspjelo zabranjivanje korisnika',
  failedToBlock: 'Nije uspjelo blokiranje korisnika',
  failedToUnblock: 'Nije uspjelo deblokiranje korisnika',
  failedToReport: 'Nije uspjelo prijavljivanje',
  failedToPin: 'Nije uspjelo prikvačivanje',
  failedToFetchAuthMethods: 'Nije uspjelo dohvaćanje metoda autentifikacije',
  failedToStartLogin: 'Nije uspjelo pokretanje prijave',
  failedToSendOtp: 'Nije uspjelo slanje OTP-a',

  // Error pages
  siteNotConfigured: 'Stranica nije konfigurirana',
  siteNotConfiguredMessage:
    'Ovaj API ključ nije povezan s konfiguriranom stranicom. Posjetite usethreadkit.com/sites kako biste dovršili postavljanje.',
  invalidApiKey: 'Nevažeći API ključ',
  invalidApiKeyMessage:
    'Dostavljeni API ključ je nevažeći ili je opozvan. Provjerite svoju nadzornu ploču za ispravan ključ.',
  rateLimited: 'Prekoračen limit zahtjeva',
  rateLimitedMessage: 'Previše zahtjeva. Molimo pričekajte trenutak i pokušajte ponovno.',
  failedToLoadComments: 'Nije uspjelo učitavanje komentara',
  tryAgainLater: 'Molimo pokušajte ponovno kasnije.',

  // Branding
  poweredByThreadKit: 'Pokreće ThreadKit',
};
