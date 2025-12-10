import type { LocaleMetadata } from '@threadkit/core';

/**
 * Dutch translations
 */
export const nl: LocaleMetadata = {
  code: 'nl',
  rtl: false,
  translations: {
  // Common actions
  post: 'Plaatsen',
  cancel: 'Annuleren',
  save: 'Opslaan',
  edit: 'Bewerken',
  delete: 'Verwijderen',
  reply: 'Reageren',
  report: 'Rapporteren',
  share: 'Delen',
  block: 'Blokkeren',
  unblock: 'Deblokkeren',
  ban: 'Verbannen',
  send: 'Verzenden',
  verify: 'Verifiëren',
  continue: 'Doorgaan',
  close: 'Sluiten',
  submit: 'Verzenden',
  yes: 'Ja',
  no: 'Nee',
  prev: 'Vorige',
  next: 'Volgende',
  back: 'Terug',

  // Loading states
  loading: 'Laden...',
  loadingComments: 'Reacties laden...',
  posting: 'Plaatsen...',
  signingInWith: 'Inloggen met',

  // Empty states
  noComments: 'Nog geen reacties. Wees de eerste!',
  noNotifications: 'Geen meldingen',
  noBlockedUsers: 'Geen geblokkeerde gebruikers',

  // Sorting
  sortedBy: 'Sorteren op:',
  sortTop: 'Populair',
  sortNew: 'Nieuw',
  sortControversial: 'Controversieel',
  sortOld: 'Oud',

  // Comment form
  writeComment: 'Schrijf een reactie...',
  writeReply: 'Schrijf een antwoord...',
  formattingHelp: 'Opmaakhulp',
  markdownSupported: 'Markdown-opmaak wordt ondersteund',
  youType: 'Je typt:',
  youSee: 'Je ziet:',

  // Voting
  upvote: 'Omhoog stemmen',
  downvote: 'Omlaag stemmen',
  point: 'punt',
  points: 'punten',

  // Threading
  expandComment: 'Reactie uitvouwen',
  collapseComment: 'Reactie invouwen',
  child: 'antwoord',
  children: 'antwoorden',

  // Badges
  pinned: 'Vastgepind',

  // Confirmations
  deleteConfirm: 'Verwijderen?',
  blockConfirm: 'Gebruiker blokkeren?',
  banConfirm: 'Gebruiker verbannen?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Intimidatie',
  reportHateSpeech: 'Haatdragende taal',
  reportMisinformation: 'Desinformatie',
  reportOther: 'Anders',
  selectReason: 'Selecteer reden...',
  reportSubmitted: 'Bedankt!',

  // Chat
  typeMessage: 'Typ een bericht...',
  signInToChat: 'Log in om te chatten',
  personOnline: 'persoon online',
  peopleOnline: 'personen online',
  personTyping: 'persoon is aan het typen...',
  peopleTyping: 'personen zijn aan het typen...',

  // Settings
  settings: 'Instellingen',
  signIn: 'Inloggen',
  signOut: 'Uitloggen',
  changeAvatar: 'Avatar wijzigen',
  theme: 'Thema',
  blockedUsers: 'Geblokkeerde gebruikers',
  notifications: 'Meldingen',
  emailOnReplies: 'E-mail bij reacties',
  emailOnMentions: 'E-mail bij vermeldingen',
  weeklyDigest: 'Wekelijkse samenvatting',
  deleteAccount: 'Account verwijderen',
  accountDeleted: 'Account verwijderd',
  holdToDelete: 'Houd ingedrukt om te verwijderen (15s)',
  holdForSeconds: 'Nog {seconds} seconden ingedrukt houden...',

  // Keyboard navigation
  keyboardNavigation: 'Toetsenbordnavigatie',
  enableKeyboardShortcuts: 'Sneltoetsen inschakelen',
  key: 'Toets',
  action: 'Actie',
  nextComment: 'Volgende opmerking',
  previousComment: 'Vorige opmerking',
  focusCommentInput: 'Focus invoer',
  editFocusedComment: 'Opmerking bewerken',
  replyToFocusedComment: 'Antwoorden',
  deleteFocusedComment: 'Opmerking verwijderen',
  upvoteFocusedComment: 'Omhoog stemmen',
  downvoteFocusedComment: 'Omlaag stemmen',
  toggleCollapseFocusedComment: 'Inklappen schakelen',
  confirmYesNo: 'Bevestig ja/nee',
  cancelClose: 'Annuleren/sluiten',

  // Username
  usernameTaken: 'Bezet',
  usernameAvailable: 'Beschikbaar',
  checking: 'Controleren...',
  chooseUsername: 'Kies een gebruikersnaam',
  usernamePlaceholder: 'jouw-naam',
  usernameHint: 'Alleen letters, cijfers, koppeltekens en underscores (2-24 tekens)',

  // Auth - general
  signInToVote: 'Meld je aan om te stemmen',
  signInToPost: 'Log in om te plaatsen',
  signInLabel: 'Inloggen:',
  continueWith: 'Doorgaan met',
  chooseSignInMethod: 'Kies hoe je wilt inloggen',

  // Auth - OTP (email/phone)
  enterEmail: 'Voer je e-mail in',
  enterPhone: 'Voer je telefoonnummer in',
  sendCode: 'Code versturen',
  checkEmail: 'Controleer je e-mail',
  checkPhone: 'Controleer je telefoon',
  enterCode: 'Voer de 6-cijferige code in die we hebben gestuurd naar',
  codeSentTo: 'Code verstuurd naar',
  invalidCode: 'Ongeldige code',
  verificationFailed: 'Verificatie mislukt',
  weWillSendCode: 'We sturen je een code om in te loggen',
  emailPlaceholder: 'jij@voorbeeld.nl',
  phonePlaceholder: '+31 6 12345678',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Welkom!',
  chooseDisplayName: 'Kies een weergavenaam voor je account',
  yourName: 'Je naam',

  // Auth - OAuth
  popupShouldOpen: 'Er zou een pop-upvenster moeten zijn geopend',
  completingSignIn: 'Inloggen voltooien met',

  // Auth - Web3
  connectingTo: 'Verbinden met',

  // Auth - Anonymous
  guestNamePlaceholder: 'Gast',
  continueAsGuest: 'Doorgaan als gast',
  guest: 'Gast',
  anonymous: 'Anoniem',

  // User profile
  karma: 'Karma',
  comments: 'Reacties',
  joined: 'Lid sinds',

  // Time formatting
  justNow: 'zojuist',
  minutesAgo: '{n}m geleden',
  hoursAgo: '{n}u geleden',
  daysAgo: '{n}d geleden',

  // Notifications
  markAllRead: 'Markeer alles als gelezen',

  // Social Links
  socialLinks: 'Sociale links',
  saveSocialLinks: 'Sociale links opslaan',

  // Errors
  failedToPost: 'Plaatsen van reactie mislukt',
  failedToVote: 'Stemmen mislukt',
  failedToDelete: 'Verwijderen mislukt',
  failedToEdit: 'Bewerken mislukt',
  failedToBan: 'Verbannen van gebruiker mislukt',
  failedToBlock: 'Blokkeren van gebruiker mislukt',
  failedToUnblock: 'Deblokkeren van gebruiker mislukt',
  failedToReport: 'Rapporteren mislukt',
  failedToPin: 'Vastpinnen mislukt',
  failedToFetchAuthMethods: 'Ophalen van inlogmethoden mislukt',
  failedToStartLogin: 'Starten van inloggen mislukt',
  failedToSendOtp: 'Versturen van code mislukt',

  // Error pages
  siteNotConfigured: 'Site niet geconfigureerd',
  siteNotConfiguredMessage:
    'Deze API-sleutel is niet gekoppeld aan een geconfigureerde site. Bezoek usethreadkit.com/sites om de configuratie te voltooien.',
  invalidApiKey: 'Ongeldige API-sleutel',
  invalidApiKeyMessage:
    'De opgegeven API-sleutel is ongeldig of is ingetrokken. Controleer je dashboard voor de juiste sleutel.',
  rateLimited: 'Limiet bereikt',
  rateLimitedMessage: 'Te veel verzoeken. Wacht even en probeer het opnieuw.',
  failedToLoadComments: 'Laden van reacties mislukt',
  tryAgainLater: 'Probeer het later opnieuw.',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',

  // Real-time updates
  loadNewComments: 'Laad nieuwe reacties',
  loadNewReplies: 'Laad nieuwe antwoorden',
  isTyping: 'typt...',
  },
};
