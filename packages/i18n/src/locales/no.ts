import type { LocaleMetadata } from '@threadkit/core';

/**
 * Norwegian translations
 */
export const no: LocaleMetadata = {
  code: 'no',
  rtl: false,
  translations: {
  // Common actions
  post: 'Publiser',
  cancel: 'Avbryt',
  save: 'Lagre',
  edit: 'Rediger',
  delete: 'Slett',
  reply: 'Svar',
  report: 'Rapporter',
  share: 'Del',
  block: 'Blokker',
  unblock: 'Opphev blokkering',
  ban: 'Utesteng',
  send: 'Send',
  verify: 'Verifiser',
  continue: 'Fortsett',
  close: 'Lukk',
  submit: 'Send inn',
  yes: 'Ja',
  no: 'Nei',
  prev: 'Forrige',
  next: 'Neste',
  back: 'Tilbake',

  // Loading states
  loading: 'Laster inn...',
  loadingComments: 'Laster inn kommentarer...',
  posting: 'Publiserer...',
  signingInWith: 'Logger inn med',

  // Empty states
  noComments: 'Ingen kommentarer ennå. Vær den første til å kommentere!',
  noNotifications: 'Ingen varsler',
  noBlockedUsers: 'Ingen blokkerte brukere',

  // Sorting
  sortedBy: 'Sortert etter:',
  sortTop: 'Topp',
  sortNew: 'Nyeste',
  sortControversial: 'Kontroversiell',
  sortOld: 'Eldste',

  // Comment form
  writeComment: 'Skriv en kommentar...',
  writeReply: 'Skriv et svar...',
  formattingHelp: 'Formateringshjelp',
  markdownSupported: 'Markdown-formatering støttes',
  youType: 'Du skriver:',
  youSee: 'Du ser:',

  // Voting
  upvote: 'Oppstemme',
  downvote: 'Nedstemme',
  point: 'poeng',
  points: 'poeng',

  // Threading
  expandComment: 'Vis kommentar',
  collapseComment: 'Skjul kommentar',
  child: 'svar',
  children: 'svar',

  // Badges
  pinned: 'Festet',

  // Confirmations
  deleteConfirm: 'Slett?',
  blockConfirm: 'Blokker bruker?',
  banConfirm: 'Utesteng bruker?',

  // Report reasons
  reportSpam: 'Søppelpost',
  reportHarassment: 'Trakassering',
  reportHateSpeech: 'Hatefulle ytringer',
  reportMisinformation: 'Feilinformasjon',
  reportOther: 'Annet',
  selectReason: 'Velg årsak...',
  reportSubmitted: 'Takk!',

  // Chat
  typeMessage: 'Skriv en melding...',
  signInToChat: 'Logg inn for å chatte',
  personOnline: 'person online',
  peopleOnline: 'personer online',
  personTyping: 'person skriver...',
  peopleTyping: 'personer skriver...',

  // Settings
  settings: 'Innstillinger',
  signIn: 'Logg inn',
  signOut: 'Logg ut',
  changeAvatar: 'Bytt avatar',
  theme: 'Tema',
  blockedUsers: 'Blokkerte brukere',
  notifications: 'Varsler',
  emailOnReplies: 'E-post ved svar',
  emailOnMentions: 'E-post ved omtale',
  weeklyDigest: 'Ukentlig sammendrag',
  deleteAccount: 'Slett konto',
  accountDeleted: 'Konto slettet',
  holdToDelete: 'Hold for å slette konto (15s)',
  holdForSeconds: 'Hold i {seconds} sekunder til...',

  // Username
  usernameTaken: 'Opptatt',
  usernameAvailable: 'Tilgjengelig',
  checking: 'Sjekker...',
  chooseUsername: 'Velg et brukernavn',
  usernamePlaceholder: 'ditt-brukernavn',
  usernameHint: 'Kun bokstaver, tall, bindestreker, understreker (2-24 tegn)',

  // Auth - general
  signInToVote: 'Logg inn for å stemme',
  signInToPost: 'Logg inn for å publisere',
  signInLabel: 'Logg inn:',
  continueWith: 'Fortsett med',
  chooseSignInMethod: 'Velg påloggingsmetode',

  // Auth - OTP (email/phone)
  enterEmail: 'Skriv inn e-postadressen din',
  enterPhone: 'Skriv inn telefonnummeret ditt',
  sendCode: 'Send kode',
  checkEmail: 'Sjekk e-posten din',
  checkPhone: 'Sjekk telefonen din',
  enterCode: 'Skriv inn den 6-sifrede koden vi sendte til',
  codeSentTo: 'Kode sendt til',
  invalidCode: 'Ugyldig kode',
  verificationFailed: 'Verifisering mislyktes',
  weWillSendCode: 'Vi sender deg en kode for å logge inn',
  emailPlaceholder: 'deg@eksempel.no',
  phonePlaceholder: '+47 4xx xxx xx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Velkommen!',
  chooseDisplayName: 'Velg et visningsnavn for kontoen din',
  yourName: 'Ditt navn',

  // Auth - OAuth
  popupShouldOpen: 'Et popup-vindu burde ha åpnet',
  completingSignIn: 'Fullfører pålogging med',

  // Auth - Web3
  connectingTo: 'Kobler til',

  // Auth - Anonymous
  guestNamePlaceholder: 'Gjest',
  continueAsGuest: 'Fortsett som gjest',
  guest: 'Gjest',
  anonymous: 'Anonym',

  // User profile
  karma: 'Karma',
  comments: 'Kommentarer',
  joined: 'Ble medlem',

  // Time formatting
  justNow: 'akkurat nå',
  minutesAgo: '{n}m siden',
  hoursAgo: '{n}t siden',
  daysAgo: '{n}d siden',

  // Notifications
  markAllRead: 'Merk alle som lest',

  // Social Links
  socialLinks: 'Sosiale lenker',
  saveSocialLinks: 'Lagre sosiale lenker',

  // Errors
  failedToPost: 'Kunne ikke publisere kommentar',
  failedToVote: 'Kunne ikke stemme',
  failedToDelete: 'Kunne ikke slette',
  failedToEdit: 'Kunne ikke redigere',
  failedToBan: 'Kunne ikke utestenge bruker',
  failedToBlock: 'Kunne ikke blokkere bruker',
  failedToUnblock: 'Kunne ikke oppheve blokkering av bruker',
  failedToReport: 'Kunne ikke rapportere',
  failedToPin: 'Kunne ikke feste',
  failedToFetchAuthMethods: 'Kunne ikke hente godkjenningsmetoder',
  failedToStartLogin: 'Kunne ikke starte pålogging',
  failedToSendOtp: 'Kunne ikke sende OTP',

  // Error pages
  siteNotConfigured: 'Nettstedet er ikke konfigurert',
  siteNotConfiguredMessage:
    'Denne API-nøkkelen er ikke tilknyttet et konfigurert nettsted. Besøk usethreadkit.com/sites for å fullføre oppsettet ditt.',
  invalidApiKey: 'Ugyldig API-nøkkel',
  invalidApiKeyMessage:
    'Den angitte API-nøkkelen er ugyldig eller har blitt tilbakekalt. Sjekk dashbordet ditt for riktig nøkkel.',
  rateLimited: 'Hastighetsbegrenset',
  rateLimitedMessage: 'For mange forespørsler. Vent et øyeblikk og prøv igjen.',
  failedToLoadComments: 'Kunne ikke laste inn kommentarer',
  tryAgainLater: 'Prøv igjen senere.',

  // Branding
  poweredByThreadKit: 'Drevet av ThreadKit',

  // Real-time updates
  loadNewComments: 'Last inn nye kommentarer',
  loadNewReplies: 'Last inn nye svar',
  isTyping: 'skriver...',
  },
};
