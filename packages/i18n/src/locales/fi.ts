import type { TranslationStrings } from '@threadkit/core';

/**
 * Finnish translations
 */
export const fi: TranslationStrings = {
  // Common actions
  post: 'Lähetä',
  cancel: 'Peruuta',
  save: 'Tallenna',
  edit: 'Muokkaa',
  delete: 'Poista',
  reply: 'Vastaa',
  report: 'Ilmoita',
  share: 'Jaa',
  block: 'Estä',
  unblock: 'Poista esto',
  ban: 'Porttikielto',
  send: 'Lähetä',
  verify: 'Vahvista',
  continue: 'Jatka',
  close: 'Sulje',
  submit: 'Lähetä',
  yes: 'Kyllä',
  no: 'Ei',
  prev: 'Edel',
  next: 'Seur',
  back: 'Takaisin',

  // Loading states
  loading: 'Ladataan...',
  loadingComments: 'Ladataan kommentteja...',
  posting: 'Lähetetään...',
  signingInWith: 'Kirjaudutaan sisään',

  // Empty states
  noComments: 'Ei vielä kommentteja. Ole ensimmäinen kommentoija!',
  noNotifications: 'Ei ilmoituksia',
  noBlockedUsers: 'Ei estettyjä käyttäjiä',

  // Sorting
  sortedBy: 'Lajitteluperuste:',
  sortTop: 'Parhaat',
  sortNew: 'Uudet',
  sortControversial: 'Kiistanalaiset',
  sortOld: 'Vanhimmat',

  // Comment form
  writeComment: 'Kirjoita kommentti...',
  writeReply: 'Kirjoita vastaus...',
  formattingHelp: 'Muotoiluohje',
  markdownSupported: 'Markdown-muotoilua tuetaan',
  youType: 'Kirjoitat:',
  youSee: 'Näet:',

  // Voting
  upvote: 'Ylä-ääni',
  downvote: 'Alaääni',
  point: 'piste',
  points: 'pistettä',

  // Threading
  expandComment: 'Laajenna kommentti',
  collapseComment: 'Pienennä kommentti',
  child: 'vastaus',
  children: 'vastausta',

  // Badges
  pinned: 'Kiinnitetty',

  // Confirmations
  deleteConfirm: 'Poista?',
  blockConfirm: 'Estä käyttäjä?',
  banConfirm: 'Anna porttikielto?',

  // Report reasons
  reportSpam: 'Roskaposti',
  reportHarassment: 'Häirintä',
  reportHateSpeech: 'Vihapuhe',
  reportMisinformation: 'Väärä tieto',
  reportOther: 'Muu',
  selectReason: 'Valitse syy...',
  reportSubmitted: 'Kiitos!',

  // Chat
  typeMessage: 'Kirjoita viesti...',
  signInToChat: 'Kirjaudu sisään keskustellaksesi',
  personOnline: 'henkilö paikalla',
  peopleOnline: 'henkilöä paikalla',
  personTyping: 'henkilö kirjoittaa...',
  peopleTyping: 'henkilöä kirjoittaa...',

  // Settings
  settings: 'Asetukset',
  signIn: 'Kirjaudu',
  signOut: 'Kirjaudu ulos',
  changeAvatar: 'Vaihda avatar',
  theme: 'Teema',
  blockedUsers: 'Estetyt käyttäjät',
  notifications: 'Ilmoitukset',
  emailOnReplies: 'Sähköposti vastauksista',
  emailOnMentions: 'Sähköposti maininnoista',
  weeklyDigest: 'Viikoittainen kooste',
  deleteAccount: 'Poista tili',
  accountDeleted: 'Tili poistettu',
  holdToDelete: 'Pidä painettuna poistaaksesi tilin (15s)',
  holdForSeconds: 'Pidä vielä {seconds} sekuntia...',

  // Username
  usernameTaken: 'Varattu',
  usernameAvailable: 'Käytettävissä',
  checking: 'Tarkistetaan...',
  chooseUsername: 'Valitse käyttäjänimi',
  usernamePlaceholder: 'kayttajanimi',
  usernameHint: 'Vain kirjaimia, numeroita, viivoja ja alaviivoja (2-24 merkkiä)',

  // Auth - general
  signInToVote: 'Kirjaudu äänestääksesi',
  signInToPost: 'Kirjaudu sisään lähettääksesi',
  signInLabel: 'Kirjaudu:',
  continueWith: 'Jatka palvelulla',
  chooseSignInMethod: 'Valitse kirjautumistapa',

  // Auth - OTP (email/phone)
  enterEmail: 'Anna sähköpostiosoitteesi',
  enterPhone: 'Anna puhelinnumerosi',
  sendCode: 'Lähetä koodi',
  checkEmail: 'Tarkista sähköpostisi',
  checkPhone: 'Tarkista puhelimesi',
  enterCode: 'Syötä 6-numeroinen koodi, joka lähetettiin osoitteeseen',
  codeSentTo: 'Koodi lähetetty osoitteeseen',
  invalidCode: 'Virheellinen koodi',
  verificationFailed: 'Vahvistus epäonnistui',
  weWillSendCode: 'Lähetämme sinulle koodin kirjautumista varten',
  emailPlaceholder: 'sinä@esimerkki.fi',
  phonePlaceholder: '+358 40 123 4567',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Tervetuloa!',
  chooseDisplayName: 'Valitse tilillesi näyttönimi',
  yourName: 'Nimesi',

  // Auth - OAuth
  popupShouldOpen: 'Ponnahdusikkunan pitäisi avautua',
  completingSignIn: 'Viimeistellään kirjautumista palvelulla',

  // Auth - Web3
  connectingTo: 'Yhdistetään',

  // Auth - Anonymous
  guestNamePlaceholder: 'Vieras',
  continueAsGuest: 'Jatka vieraana',
  guest: 'Vieras',
  anonymous: 'Anonyymi',

  // User profile
  karma: 'Karma',
  comments: 'Kommentit',
  joined: 'Liittyi',

  // Time formatting
  justNow: 'juuri nyt',
  minutesAgo: '{n}m sitten',
  hoursAgo: '{n}t sitten',
  daysAgo: '{n}pv sitten',

  // Notifications
  markAllRead: 'Merkitse kaikki luetuksi',

  // Social Links
  socialLinks: 'Sosiaalisen median linkit',
  saveSocialLinks: 'Tallenna sosiaalisen median linkit',

  // Errors
  failedToPost: 'Kommentin lähetys epäonnistui',
  failedToVote: 'Äänestys epäonnistui',
  failedToDelete: 'Poisto epäonnistui',
  failedToEdit: 'Muokkaus epäonnistui',
  failedToBan: 'Käyttäjän porttikielto epäonnistui',
  failedToBlock: 'Käyttäjän esto epäonnistui',
  failedToUnblock: 'Käyttäjän eston poisto epäonnistui',
  failedToReport: 'Ilmoitus epäonnistui',
  failedToPin: 'Kiinnitys epäonnistui',
  failedToFetchAuthMethods: 'Todennusmenetelmien haku epäonnistui',
  failedToStartLogin: 'Kirjautumisen aloitus epäonnistui',
  failedToSendOtp: 'Kertakäyttökoodin lähetys epäonnistui',

  // Error pages
  siteNotConfigured: 'Sivustoa ei ole määritetty',
  siteNotConfiguredMessage:
    'Tätä API-avainta ei ole liitetty määritettyyn sivustoon. Viimeistele asennus osoitteessa usethreadkit.com/sites.',
  invalidApiKey: 'Virheellinen API-avain',
  invalidApiKeyMessage:
    'Annettu API-avain on virheellinen tai se on peruutettu. Tarkista oikea avain hallintapaneelistasi.',
  rateLimited: 'Määräraja ylitetty',
  rateLimitedMessage: 'Liian monta pyyntöä. Odota hetki ja yritä uudelleen.',
  failedToLoadComments: 'Kommenttien lataus epäonnistui',
  tryAgainLater: 'Yritä myöhemmin uudelleen.',

  // Branding
  poweredByThreadKit: 'Voimanlähteenä ThreadKit',

  // Real-time updates
  loadNewComments: 'Lataa uudet kommentit',
  loadNewReplies: 'Lataa uudet vastaukset',
  isTyping: 'kirjoittaa...',
};
