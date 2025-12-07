import type { TranslationStrings } from '@threadkit/core';

/**
 * German translations
 */
export const de: TranslationStrings = {
  // Common actions
  post: 'Posten',
  cancel: 'Abbrechen',
  save: 'Speichern',
  edit: 'Bearbeiten',
  delete: 'Löschen',
  reply: 'Antworten',
  report: 'Melden',
  share: 'Teilen',
  block: 'Blockieren',
  unblock: 'Entblockieren',
  ban: 'Sperren',
  send: 'Senden',
  verify: 'Bestätigen',
  continue: 'Weiter',
  close: 'Schließen',
  submit: 'Absenden',
  yes: 'Ja',
  no: 'Nein',
  prev: 'Zurück',
  next: 'Weiter',
  back: 'Zurück',

  // Loading states
  loading: 'Lädt...',
  loadingComments: 'Kommentare werden geladen...',
  posting: 'Wird gepostet...',
  signingInWith: 'Anmeldung mit',

  // Empty states
  noComments: 'Noch keine Kommentare. Sei der Erste!',
  noNotifications: 'Keine Benachrichtigungen',
  noBlockedUsers: 'Keine blockierten Benutzer',

  // Sorting
  sortedBy: 'Sortiert nach:',
  sortTop: 'Beliebt',
  sortNew: 'Neu',
  sortControversial: 'Kontrovers',
  sortOld: 'Alt',

  // Comment form
  writeComment: 'Kommentar schreiben...',
  writeReply: 'Antwort schreiben...',
  formattingHelp: 'Formatierungshilfe',
  markdownSupported: 'Markdown-Formatierung wird unterstützt',
  youType: 'Du tippst:',
  youSee: 'Du siehst:',

  // Voting
  upvote: 'Hochwählen',
  downvote: 'Runterwählen',
  point: 'Punkt',
  points: 'Punkte',

  // Threading
  expandComment: 'Kommentar erweitern',
  collapseComment: 'Kommentar einklappen',
  child: 'Antwort',
  children: 'Antworten',

  // Badges
  pinned: 'Angepinnt',

  // Confirmations
  deleteConfirm: 'Löschen?',
  blockConfirm: 'Benutzer blockieren?',
  banConfirm: 'Benutzer sperren?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Belästigung',
  reportHateSpeech: 'Hassrede',
  reportMisinformation: 'Fehlinformation',
  reportOther: 'Sonstiges',
  selectReason: 'Grund auswählen...',
  reportSubmitted: 'Danke!',

  // Chat
  typeMessage: 'Nachricht schreiben...',
  signInToChat: 'Anmelden zum Chatten',
  personOnline: 'Person online',
  peopleOnline: 'Personen online',
  personTyping: 'Person schreibt...',
  peopleTyping: 'Personen schreiben...',

  // Settings
  settings: 'Einstellungen',
  signIn: 'Anmelden',
  signOut: 'Abmelden',
  changeAvatar: 'Avatar ändern',
  theme: 'Design',
  blockedUsers: 'Blockierte Benutzer',
  notifications: 'Benachrichtigungen',
  emailOnReplies: 'E-Mail bei Antworten',
  emailOnMentions: 'E-Mail bei Erwähnungen',
  weeklyDigest: 'Wöchentliche Zusammenfassung',
  deleteAccount: 'Konto löschen',
  accountDeleted: 'Konto gelöscht',
  holdToDelete: 'Gedrückt halten zum Löschen (15s)',
  holdForSeconds: 'Noch {seconds} Sekunden halten...',

  // Username
  usernameTaken: 'Belegt',
  usernameAvailable: 'Verfügbar',
  checking: 'Prüfe...',
  chooseUsername: 'Benutzernamen wählen',
  usernamePlaceholder: 'dein-benutzername',
  usernameHint: 'Nur Buchstaben, Zahlen, Bindestriche, Unterstriche (2-24 Zeichen)',

  // Auth - general
  signInToPost: 'Anmelden zum Posten',
  signInLabel: 'Anmelden:',
  continueWith: 'Weiter mit',
  chooseSignInMethod: 'Wähle wie du dich anmelden möchtest',

  // Auth - OTP (email/phone)
  enterEmail: 'E-Mail eingeben',
  enterPhone: 'Telefonnummer eingeben',
  sendCode: 'Code senden',
  checkEmail: 'E-Mail prüfen',
  checkPhone: 'Telefon prüfen',
  enterCode: 'Gib den 6-stelligen Code ein, den wir gesendet haben an',
  codeSentTo: 'Code gesendet an',
  invalidCode: 'Ungültiger Code',
  verificationFailed: 'Bestätigung fehlgeschlagen',
  weWillSendCode: 'Wir senden dir einen Code zur Anmeldung',
  emailPlaceholder: 'du@beispiel.de',
  phonePlaceholder: '+49 170 1234567',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Willkommen!',
  chooseDisplayName: 'Wähle einen Anzeigenamen für dein Konto',
  yourName: 'Dein Name',

  // Auth - OAuth
  popupShouldOpen: 'Ein Popup-Fenster sollte sich geöffnet haben',
  completingSignIn: 'Anmeldung wird abgeschlossen mit',

  // Auth - Web3
  connectingTo: 'Verbinde mit',

  // User profile
  karma: 'Karma',
  comments: 'Kommentare',
  joined: 'Beigetreten',

  // Time formatting
  justNow: 'gerade eben',
  minutesAgo: 'vor {n}m',
  hoursAgo: 'vor {n}h',
  daysAgo: 'vor {n}d',

  // Notifications
  markAllRead: 'Alle als gelesen markieren',

  // Social Links
  socialLinks: 'Soziale Links',
  saveSocialLinks: 'Soziale Links speichern',

  // Errors
  failedToPost: 'Posten fehlgeschlagen',
  failedToVote: 'Abstimmung fehlgeschlagen',
  failedToDelete: 'Löschen fehlgeschlagen',
  failedToEdit: 'Bearbeiten fehlgeschlagen',
  failedToBan: 'Sperren des Benutzers fehlgeschlagen',
  failedToBlock: 'Blockieren des Benutzers fehlgeschlagen',
  failedToUnblock: 'Entblockieren des Benutzers fehlgeschlagen',
  failedToReport: 'Melden fehlgeschlagen',
  failedToPin: 'Anpinnen fehlgeschlagen',
  failedToFetchAuthMethods: 'Abrufen der Anmeldemethoden fehlgeschlagen',
  failedToStartLogin: 'Anmeldung fehlgeschlagen',
  failedToSendOtp: 'Code senden fehlgeschlagen',

  // Error pages
  siteNotConfigured: 'Seite nicht konfiguriert',
  siteNotConfiguredMessage:
    'Dieser API-Schlüssel ist keiner konfigurierten Seite zugeordnet. Besuche usethreadkit.com/dashboard um die Einrichtung abzuschließen.',
  invalidApiKey: 'Ungültiger API-Schlüssel',
  invalidApiKeyMessage:
    'Der angegebene API-Schlüssel ist ungültig oder wurde widerrufen. Prüfe dein Dashboard für den korrekten Schlüssel.',
  rateLimited: 'Rate-Limit erreicht',
  rateLimitedMessage: 'Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut.',
  failedToLoadComments: 'Kommentare konnten nicht geladen werden',
  tryAgainLater: 'Bitte versuche es später erneut.',

  // Branding
  poweredByThreadKit: 'Betrieben von ThreadKit',
};
