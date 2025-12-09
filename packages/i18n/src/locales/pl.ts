import type { TranslationStrings } from '@threadkit/core';

/**
 * Polish translations
 */
export const pl: TranslationStrings = {
  // Common actions
  post: 'Opublikuj',
  cancel: 'Anuluj',
  save: 'Zapisz',
  edit: 'Edytuj',
  delete: 'Usuń',
  reply: 'Odpowiedz',
  report: 'Zgłoś',
  share: 'Udostępnij',
  block: 'Zablokuj',
  unblock: 'Odblokuj',
  ban: 'Zbanuj',
  send: 'Wyślij',
  verify: 'Zweryfikuj',
  continue: 'Kontynuuj',
  close: 'Zamknij',
  submit: 'Wyślij',
  yes: 'Tak',
  no: 'Nie',
  prev: 'Poprzednia',
  next: 'Następna',
  back: 'Wróć',

  // Loading states
  loading: 'Ładowanie...',
  loadingComments: 'Ładowanie komentarzy...',
  posting: 'Publikowanie...',
  signingInWith: 'Logowanie za pomocą',

  // Empty states
  noComments: 'Brak komentarzy. Bądź pierwszy!',
  noNotifications: 'Brak powiadomień',
  noBlockedUsers: 'Brak zablokowanych użytkowników',

  // Sorting
  sortedBy: 'Sortuj według:',
  sortTop: 'Najlepsze',
  sortNew: 'Najnowsze',
  sortControversial: 'Kontrowersyjne',
  sortOld: 'Najstarsze',

  // Comment form
  writeComment: 'Napisz komentarz...',
  writeReply: 'Napisz odpowiedź...',
  formattingHelp: 'Pomoc w formatowaniu',
  markdownSupported: 'Formatowanie Markdown jest obsługiwane',
  youType: 'Wpisujesz:',
  youSee: 'Widzisz:',

  // Voting
  upvote: 'Głosuj za',
  downvote: 'Głosuj przeciw',
  point: 'punkt',
  points: 'punkty',

  // Threading
  expandComment: 'Rozwiń komentarz',
  collapseComment: 'Zwiń komentarz',
  child: 'dziecko',
  children: 'dzieci',

  // Badges
  pinned: 'Przypięty',

  // Confirmations
  deleteConfirm: 'Usunąć?',
  blockConfirm: 'Zablokować użytkownika?',
  banConfirm: 'Zbanować użytkownika?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Nękanie',
  reportHateSpeech: 'Mowa nienawiści',
  reportMisinformation: 'Dezinformacja',
  reportOther: 'Inne',
  selectReason: 'Wybierz powód...',
  reportSubmitted: 'Dzięki!',

  // Chat
  typeMessage: 'Wpisz wiadomość...',
  signInToChat: 'Zaloguj się, aby czatować',
  personOnline: 'osoba online',
  peopleOnline: 'osoby online',
  personTyping: 'osoba pisze...',
  peopleTyping: 'osoby piszą...',

  // Settings
  settings: 'Ustawienia',
  signIn: 'Zaloguj się',
  signOut: 'Wyloguj się',
  changeAvatar: 'Zmień awatar',
  theme: 'Motyw',
  blockedUsers: 'Zablokowani użytkownicy',
  notifications: 'Powiadomienia',
  emailOnReplies: 'E-mail o odpowiedziach',
  emailOnMentions: 'E-mail o wzmiankach',
  weeklyDigest: 'Tygodniowe podsumowanie',
  deleteAccount: 'Usuń konto',
  accountDeleted: 'Konto usunięte',
  holdToDelete: 'Przytrzymaj, aby usunąć konto (15s)',
  holdForSeconds: 'Przytrzymaj jeszcze przez {seconds} s...',

  // Username
  usernameTaken: 'Zajęte',
  usernameAvailable: 'Dostępne',
  checking: 'Sprawdzanie...',
  // Auth - general
  signInToPost: 'Zaloguj się, aby opublikować',
  signInLabel: 'Zaloguj się:',
  continueWith: 'Kontynuuj z',
  chooseSignInMethod: 'Wybierz sposób logowania',

  // Auth - OTP (email/phone)
  enterEmail: 'Wpisz swój e-mail',
  enterPhone: 'Wpisz swój numer telefonu',
  sendCode: 'Wyślij kod',
  checkEmail: 'Sprawdź e-mail',
  checkPhone: 'Sprawdź telefon',
  enterCode: 'Wpisz 6-cyfrowy kod wysłany na',
  codeSentTo: 'Kod wysłany na',
  invalidCode: 'Nieprawidłowy kod',
  verificationFailed: 'Weryfikacja nie powiodła się',
  weWillSendCode: 'Wyślemy Ci kod do zalogowania',
  emailPlaceholder: 'ty@przyklad.com',
  phonePlaceholder: '+48 123 456 789',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Witaj!',
  chooseDisplayName: 'Wybierz nazwę wyświetlaną dla swojego konta',
  yourName: 'Twoje imię',

  // Auth - OAuth
  popupShouldOpen: 'Powinno otworzyć się wyskakujące okno',
  completingSignIn: 'Kończenie logowania przez',

  // Auth - Web3
  connectingTo: 'Łączenie z',

  // User profile
  karma: 'Karma',
  comments: 'Komentarze',
  joined: 'Dołączył',

  // Time formatting
  justNow: 'przed chwilą',
  minutesAgo: '{n}min temu',
  hoursAgo: '{n}godz. temu',
  daysAgo: '{n}dni temu',

  // Notifications
  markAllRead: 'Oznacz wszystko jako przeczytane',

  // Social Links
  socialLinks: 'Linki społecznościowe',
  saveSocialLinks: 'Zapisz linki społecznościowe',

  // Errors
  failedToPost: 'Nie udało się opublikować komentarza',
  failedToVote: 'Nie udało się zagłosować',
  failedToDelete: 'Nie udało się usunąć',
  failedToEdit: 'Nie udało się edytować',
  failedToBan: 'Nie udało się zbanować użytkownika',
  failedToBlock: 'Nie udało się zablokować użytkownika',
  failedToUnblock: 'Nie udało się odblokować użytkownika',
  failedToReport: 'Nie udało się zgłosić',
  failedToPin: 'Nie udało się przypiąć',
  failedToFetchAuthMethods: 'Nie udało się pobrać metod logowania',
  failedToStartLogin: 'Nie udało się rozpocząć logowania',
  failedToSendOtp: 'Nie udało się wysłać kodu OTP',

  // Error pages
  siteNotConfigured: 'Strona nieskonfigurowana',
  siteNotConfiguredMessage:
    'Ten klucz API nie jest powiązany ze skonfigurowaną stroną. Odwiedź usethreadkit.com/sites, aby dokończyć konfigurację.',
  invalidApiKey: 'Nieprawidłowy klucz API',
  invalidApiKeyMessage:
    'Podany klucz API jest nieprawidłowy lub został unieważniony. Sprawdź poprawność klucza w panelu.',
  rateLimited: 'Przekroczono limit zapytań',
  rateLimitedMessage: 'Zbyt wiele żądań. Proszę chwilę odczekać i spróbować ponownie.',
  failedToLoadComments: 'Nie udało się załadować komentarzy',
  tryAgainLater: 'Spróbuj ponownie później.',

  // Branding
  poweredByThreadKit: 'Obsługiwane przez ThreadKit',
};
