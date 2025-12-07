import type { TranslationStrings } from '@threadkit/core';

/**
 * Italian translations
 */
export const it: TranslationStrings = {
  // Common actions
  post: 'Pubblica',
  cancel: 'Annulla',
  save: 'Salva',
  edit: 'Modifica',
  delete: 'Elimina',
  reply: 'Rispondi',
  report: 'Segnala',
  share: 'Condividi',
  block: 'Blocca',
  unblock: 'Sblocca',
  ban: 'Bandisci',
  send: 'Invia',
  verify: 'Verifica',
  continue: 'Continua',
  close: 'Chiudi',
  submit: 'Invia',
  yes: 'Sì',
  no: 'No',
  prev: 'Prec',
  next: 'Succ',
  back: 'Indietro',

  // Loading states
  loading: 'Caricamento...',
  loadingComments: 'Caricamento commenti...',
  posting: 'Pubblicazione...',
  signingInWith: 'Accesso con',

  // Empty states
  noComments: 'Nessun commento. Sii il primo a commentare!',
  noNotifications: 'Nessuna notifica',
  noBlockedUsers: 'Nessun utente bloccato',

  // Sorting
  sortedBy: 'Ordina per:',
  sortTop: 'Popolari',
  sortNew: 'Recenti',
  sortControversial: 'Controversi',
  sortOld: 'Meno recenti',

  // Comment form
  writeComment: 'Scrivi un commento...',
  writeReply: 'Scrivi una risposta...',
  formattingHelp: 'Aiuto formattazione',
  markdownSupported: 'Formattazione Markdown supportata',
  youType: 'Scrivi:',
  youSee: 'Vedi:',

  // Voting
  upvote: 'Vota positivo',
  downvote: 'Vota negativo',
  point: 'punto',
  points: 'punti',

  // Threading
  expandComment: 'Espandi commento',
  collapseComment: 'Comprimi commento',
  child: 'risposta',
  children: 'risposte',

  // Badges
  pinned: 'In evidenza',

  // Confirmations
  deleteConfirm: 'Eliminare?',
  blockConfirm: 'Bloccare utente?',
  banConfirm: 'Bandire utente?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Molestie',
  reportHateSpeech: "Incitamento all'odio",
  reportMisinformation: 'Disinformazione',
  reportOther: 'Altro',
  selectReason: 'Seleziona motivo...',
  reportSubmitted: 'Grazie!',

  // Chat
  typeMessage: 'Scrivi un messaggio...',
  signInToChat: 'Accedi per chattare',
  personOnline: 'persona online',
  peopleOnline: 'persone online',
  personTyping: 'persona sta scrivendo...',
  peopleTyping: 'persone stanno scrivendo...',

  // Settings
  settings: 'Impostazioni',
  signIn: 'Accedi',
  signOut: 'Esci',
  changeAvatar: 'Cambia avatar',
  theme: 'Tema',
  blockedUsers: 'Utenti bloccati',
  notifications: 'Notifiche',
  emailOnReplies: 'Email per risposte',
  emailOnMentions: 'Email per menzioni',
  weeklyDigest: 'Riepilogo settimanale',
  deleteAccount: 'Elimina account',
  accountDeleted: 'Account eliminato',
  holdToDelete: "Tieni premuto per eliminare l'account (15s)",
  holdForSeconds: 'Tieni premuto per altri {seconds} secondi...',

  // Username
  usernameTaken: 'Occupato',
  usernameAvailable: 'Disponibile',
  checking: 'Controllo...',
  chooseUsername: 'Scegli un nome utente',
  usernamePlaceholder: 'il-tuo-nome-utente',
  usernameHint: 'Solo lettere, numeri, trattini, underscore (2-24 caratteri)',

  // Auth - general
  signInToPost: 'Accedi per pubblicare',
  signInLabel: 'Accedi:',
  continueWith: 'Continua con',
  chooseSignInMethod: 'Scegli come accedere',

  // Auth - OTP (email/phone)
  enterEmail: 'Inserisci la tua email',
  enterPhone: 'Inserisci il tuo numero di telefono',
  sendCode: 'Invia codice',
  checkEmail: 'Controlla la tua email',
  checkPhone: 'Controlla il tuo telefono',
  enterCode: 'Inserisci il codice a 6 cifre inviato a',
  codeSentTo: 'Codice inviato a',
  invalidCode: 'Codice non valido',
  verificationFailed: 'Verifica fallita',
  weWillSendCode: 'Ti invieremo un codice per accedere',
  emailPlaceholder: 'tu@esempio.com',
  phonePlaceholder: '+39 333 123 4567',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Benvenuto!',
  chooseDisplayName: 'Scegli un nome da visualizzare per il tuo account',
  yourName: 'Il tuo nome',

  // Auth - OAuth
  popupShouldOpen: 'Una finestra popup dovrebbe essersi aperta',
  completingSignIn: 'Completamento accesso con',

  // Auth - Web3
  connectingTo: 'Connessione a',

  // User profile
  karma: 'Karma',
  comments: 'Commenti',
  joined: 'Iscritto',

  // Time formatting
  justNow: 'adesso',
  minutesAgo: '{n}m fa',
  hoursAgo: '{n}h fa',
  daysAgo: '{n}g fa',

  // Notifications
  markAllRead: 'Segna tutti come letti',

  // Social Links
  socialLinks: 'Link sociali',
  saveSocialLinks: 'Salva link sociali',

  // Errors
  failedToPost: 'Pubblicazione commento fallita',
  failedToVote: 'Voto fallito',
  failedToDelete: 'Eliminazione fallita',
  failedToEdit: 'Modifica fallita',
  failedToBan: 'Bandimento utente fallito',
  failedToBlock: 'Blocco utente fallito',
  failedToUnblock: 'Sblocco utente fallito',
  failedToReport: 'Segnalazione fallita',
  failedToPin: 'Messa in evidenza fallita',
  failedToFetchAuthMethods: 'Recupero metodi di autenticazione fallito',
  failedToStartLogin: 'Avvio accesso fallito',
  failedToSendOtp: 'Invio codice fallito',

  // Error pages
  siteNotConfigured: 'Sito non configurato',
  siteNotConfiguredMessage:
    'Questa chiave API non è associata a un sito configurato. Visita usethreadkit.com/dashboard per completare la configurazione.',
  invalidApiKey: 'Chiave API non valida',
  invalidApiKeyMessage:
    'La chiave API fornita non è valida o è stata revocata. Controlla la dashboard per la chiave corretta.',
  rateLimited: 'Limite richieste raggiunto',
  rateLimitedMessage: 'Troppe richieste. Attendi un momento e riprova.',
  failedToLoadComments: 'Caricamento commenti fallito',
  tryAgainLater: 'Riprova più tardi.',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',
};
