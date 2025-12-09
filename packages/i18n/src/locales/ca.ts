import type { TranslationStrings } from '@threadkit/core';

/**
 * Catalan translations
 */
export const ca: TranslationStrings = {
  // Common actions
  post: 'Publicar',
  cancel: 'Cancel·lar',
  save: 'Desar',
  edit: 'Edita',
  delete: 'Suprimeix',
  reply: 'Respon',
  report: 'Informa',
  share: 'Comparteix',
  block: 'Bloqueja',
  unblock: 'Desbloqueja',
  ban: 'Baneja',
  send: 'Envia',
  verify: 'Verifica',
  continue: 'Continua',
  close: 'Tanca',
  submit: 'Envia',
  yes: 'Sí',
  no: 'No',
  prev: 'Anterior',
  next: 'Següent',
  back: 'Enrere',

  // Loading states
  loading: 'Carregant...', 
  loadingComments: 'Carregant comentaris...', 
  posting: 'Publicant...', 
  signingInWith: 'Iniciant sessió amb', 

  // Empty states
  noComments: 'Encara no hi ha comentaris. Sigues el primer a comentar!',
  noNotifications: 'No hi ha notificacions',
  noBlockedUsers: 'No hi ha usuaris bloquejats',

  // Sorting
  sortedBy: 'Ordenat per:',
  sortTop: 'Superior',
  sortNew: 'Nou',
  sortControversial: 'Controvertit',
  sortOld: 'Antic',

  // Comment form
  writeComment: 'Escriu un comentari...', 
  writeReply: 'Escriu una resposta...', 
  formattingHelp: 'Ajuda de formatació',
  markdownSupported: 'La formatació Markdown és compatible',
  youType: 'Tu escrius:',
  youSee: 'Tu veus:',

  // Voting
  upvote: 'Vota a favor',
  downvote: 'Vota en contra',
  point: 'punt',
  points: 'punts',

  // Threading
  expandComment: 'Expandeix el comentari',
  collapseComment: 'Redueix el comentari',
  child: 'resposta',
  children: 'respostes',

  // Badges
  pinned: 'Fixat',

  // Confirmations
  deleteConfirm: 'Suprimir?',
  blockConfirm: 'Bloquejar usuari?',
  banConfirm: 'Banejar usuari?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Assetjament',
  reportHateSpeech: 'Discurs d\'odi',
  reportMisinformation: 'Desinformació',
  reportOther: 'Altres',
  selectReason: 'Selecciona la raó...', 
  reportSubmitted: 'Gràcies!',

  // Chat
  typeMessage: 'Escriu un missatge...', 
  signInToChat: 'Inicia sessió per xatejar',
  personOnline: 'persona en línia',
  peopleOnline: 'persones en línia',
  personTyping: 'persona escriu...', 
  peopleTyping: 'persones escriuen...', 

  // Settings
  settings: 'Configuració',
  signIn: 'Inicia sessió',
  signOut: 'Tanca sessió',
  changeAvatar: 'Canvia l\'avatar',
  theme: 'Tema',
  blockedUsers: 'Usuaris bloquejats',
  notifications: 'Notificacions',
  emailOnReplies: 'Correu electrònic en respostes',
  emailOnMentions: 'Correu electrònic en mencions',
  weeklyDigest: 'Resum setmanal',
  deleteAccount: 'Elimina el compte',
  accountDeleted: 'Compte eliminat',
  holdToDelete: 'Mantén premut per eliminar el compte (15s)',
  holdForSeconds: 'Mantén premut {seconds} segons més...', 

  // Username
  usernameTaken: 'Ocupat',
  usernameAvailable: 'Disponible',
  checking: 'Comprovant...',
  chooseUsername: 'Tria un nom d\'usuari',
  usernamePlaceholder: 'el-teu-nom-d\'usuari',
  usernameHint: 'Només lletres, números, guions i guions baixos (2-24 caràcters)', 

  // Auth - general
  signInToPost: 'Inicia sessió per publicar',
  signInLabel: 'Inicia sessió:',
  continueWith: 'Continua amb',
  chooseSignInMethod: 'Tria com vols iniciar sessió',

  // Auth - OTP (email/phone)
  enterEmail: 'Introdueix el teu correu electrònic',
  enterPhone: 'Introdueix el teu número de telèfon',
  sendCode: 'Envia codi',
  checkEmail: 'Revisa el teu correu electrònic',
  checkPhone: 'Revisa el teu telèfon',
  enterCode: 'Introdueix el codi de 6 dígits que hem enviat a',
  codeSentTo: 'Codi enviat a',
  invalidCode: 'Codi invàlid',
  verificationFailed: 'La verificació ha fallat',
  weWillSendCode: 'T\'enviarem un codi per iniciar sessió',
  emailPlaceholder: 'tu@exemple.com',
  phonePlaceholder: '+34 6xx xxx xxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Benvingut!',
  chooseDisplayName: 'Tria un nom de visualització per al teu compte',
  yourName: 'El teu nom',

  // Auth - OAuth
  popupShouldOpen: 'S\'hauria d\'haver obert una finestra emergent',
  completingSignIn: 'Completant l\'inici de sessió amb',

  // Auth - Web3
  connectingTo: 'Connectant a',

  // User profile
  karma: 'Karma',
  comments: 'Comentaris',
  joined: 'S\'ha unit',

  // Time formatting
  justNow: 'ara mateix',
  minutesAgo: 'fa {n} min',
  hoursAgo: 'fa {n} h',
  daysAgo: 'fa {n} dies',

  // Notifications
  markAllRead: 'Marca-ho tot com a llegit',

  // Social Links
  socialLinks: 'Enllaços socials',
  saveSocialLinks: 'Desar enllaços socials',

  // Errors
  failedToPost: 'No s\'ha pogut publicar el comentari',
  failedToVote: 'No s\'ha pogut votar',
  failedToDelete: 'No s\'ha pogut suprimir',
  failedToEdit: 'No s\'ha pogut editar',
  failedToBan: 'No s\'ha pogut bandejar l\'usuari',
  failedToBlock: 'No s\'ha pogut bloquejar l\'usuari',
  failedToUnblock: 'No s\'ha pogut desbloquejar l\'usuari',
  failedToReport: 'No s\'ha pogut informar',
  failedToPin: 'No s\'ha pogut fixar',
  failedToFetchAuthMethods: 'No s\'han pogut obtenir els mètodes d\'autenticació',
  failedToStartLogin: 'No s\'ha pogut iniciar la sessió',
  failedToSendOtp: 'No s\'ha pogut enviar l\'OTP',

  // Error pages
  siteNotConfigured: 'Lloc no configurat',
  siteNotConfiguredMessage:
    'Aquesta clau API no està associada a un lloc configurat. Visita usethreadkit.com/sites per completar la configuració.',
  invalidApiKey: 'Clau API no vàlida',
  invalidApiKeyMessage:
    'La clau API proporcionada no és vàlida o ha estat revocada. Comprova el teu tauler de control per obtenir la clau correcta.',
  rateLimited: 'Límit de tarifes excedit',
  rateLimitedMessage: 'Massa sol·licituds. Si us plau, espera un moment i torna a provar-ho.',
  failedToLoadComments: 'No s\'han pogut carregar els comentaris',
  tryAgainLater: 'Si us plau, torna a provar-ho més tard.',

  // Branding
  poweredByThreadKit: 'Desenvolupat per ThreadKit',
};
