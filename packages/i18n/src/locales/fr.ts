import type { LocaleMetadata } from '@threadkit/core';

/**
 * French translations
 */
export const fr: LocaleMetadata = {
  code: 'fr',
  rtl: false,
  translations: {
  // Common actions
  post: 'Publier',
  cancel: 'Annuler',
  save: 'Enregistrer',
  edit: 'Modifier',
  delete: 'Supprimer',
  reply: 'Répondre',
  report: 'Signaler',
  share: 'Partager',
  block: 'Bloquer',
  unblock: 'Débloquer',
  ban: 'Bannir',
  send: 'Envoyer',
  verify: 'Vérifier',
  continue: 'Continuer',
  close: 'Fermer',
  submit: 'Soumettre',
  yes: 'Oui',
  no: 'Non',
  prev: 'Précédent',
  next: 'Suivant',
  back: 'Retour',

  // Loading states
  loading: 'Chargement...',
  loadingComments: 'Chargement des commentaires...',
  posting: 'Publication...',
  signingInWith: 'Connexion avec',

  // Empty states
  noComments: 'Aucun commentaire. Soyez le premier à commenter !',
  noNotifications: 'Aucune notification',
  noBlockedUsers: 'Aucun utilisateur bloqué',

  // Sorting
  sortedBy: 'Trié par :',
  sortTop: 'Populaire',
  sortNew: 'Récent',
  sortControversial: 'Controversé',
  sortOld: 'Ancien',

  // Comment form
  writeComment: 'Écrire un commentaire...',
  writeReply: 'Écrire une réponse...',
  formattingHelp: 'Aide au formatage',
  markdownSupported: 'Le formatage Markdown est pris en charge',
  youType: 'Vous tapez :',
  youSee: 'Vous voyez :',

  // Voting
  upvote: 'Voter pour',
  downvote: 'Voter contre',
  point: 'point',
  points: 'points',

  // Threading
  expandComment: 'Développer le commentaire',
  collapseComment: 'Réduire le commentaire',
  child: 'enfant',
  children: 'enfants',

  // Badges
  pinned: 'Épinglé',

  // Confirmations
  deleteConfirm: 'Supprimer ?',
  blockConfirm: 'Bloquer cet utilisateur ?',
  banConfirm: 'Bannir cet utilisateur ?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Harcèlement',
  reportHateSpeech: 'Discours haineux',
  reportMisinformation: 'Désinformation',
  reportOther: 'Autre',
  selectReason: 'Sélectionner une raison...',
  reportSubmitted: 'Merci !',

  // Chat
  typeMessage: 'Écrire un message...',
  signInToChat: 'Connectez-vous pour discuter',
  personOnline: 'personne en ligne',
  peopleOnline: 'personnes en ligne',
  personTyping: 'personne écrit...',
  peopleTyping: 'personnes écrivent...',

  // Settings
  settings: 'Paramètres',
  signIn: 'Se connecter',
  signOut: 'Se déconnecter',
  changeAvatar: "Changer d'avatar",
  theme: 'Thème',
  blockedUsers: 'Utilisateurs bloqués',
  notifications: 'Notifications',
  emailOnReplies: 'Email pour les réponses',
  emailOnMentions: 'Email pour les mentions',
  weeklyDigest: 'Résumé hebdomadaire',
  deleteAccount: 'Supprimer le compte',
  accountDeleted: 'Compte supprimé',
  holdToDelete: 'Maintenir pour supprimer (15s)',
  holdForSeconds: 'Maintenir encore {seconds} secondes...',

  // Keyboard navigation
  keyboardNavigation: 'Navigation au clavier',
  enableKeyboardShortcuts: 'Activer les raccourcis clavier',
  key: 'Touche',
  action: 'Action',
  nextComment: 'Commentaire suivant',
  previousComment: 'Commentaire précédent',
  focusCommentInput: 'Concentrer l\'entrée',
  editFocusedComment: 'Modifier le commentaire',
  replyToFocusedComment: 'Répondre',
  deleteFocusedComment: 'Supprimer le commentaire',
  upvoteFocusedComment: 'Voter pour',
  downvoteFocusedComment: 'Voter contre',
  toggleCollapseFocusedComment: 'Basculer réduction',
  confirmYesNo: 'Confirmer oui/non',
  cancelClose: 'Annuler/fermer',

  // Username
  usernameTaken: 'Pris',
  usernameAvailable: 'Disponible',
  checking: 'Vérification...',
  chooseUsername: "Choisissez un nom d'utilisateur",
  usernamePlaceholder: 'votre-nom',
  usernameHint: 'Lettres, chiffres, tirets et underscores uniquement (2-24 caractères)',

  // Auth - general
  signInToVote: 'Connectez-vous pour voter',
  signInToPost: 'Connectez-vous pour publier',
  signInLabel: 'Connexion :',
  continueWith: 'Continuer avec',
  chooseSignInMethod: 'Choisissez comment vous connecter',

  // Auth - OTP (email/phone)
  enterEmail: 'Entrez votre email',
  enterPhone: 'Entrez votre numéro de téléphone',
  sendCode: 'Envoyer le code',
  checkEmail: 'Vérifiez votre email',
  checkPhone: 'Vérifiez votre téléphone',
  enterCode: 'Entrez le code à 6 chiffres envoyé à',
  codeSentTo: 'Code envoyé à',
  invalidCode: 'Code invalide',
  verificationFailed: 'Échec de la vérification',
  weWillSendCode: 'Nous vous enverrons un code pour vous connecter',
  emailPlaceholder: 'vous@exemple.com',
  phonePlaceholder: '+33 6 12 34 56 78',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Bienvenue !',
  chooseDisplayName: "Choisissez un nom d'affichage pour votre compte",
  yourName: 'Votre nom',

  // Auth - OAuth
  popupShouldOpen: 'Une fenêtre popup devrait se ouvrir',
  completingSignIn: 'Connexion en cours avec',

  // Auth - Web3
  connectingTo: 'Connexion à',

  // Auth - Anonymous
  guestNamePlaceholder: 'Invité',
  continueAsGuest: "Continuer en tant qu'invité",
  guest: 'Invité',
  anonymous: 'Anonyme',

  // User profile
  karma: 'Karma',
  comments: 'Commentaires',
  joined: 'Membre depuis',

  // Time formatting
  justNow: "à l'instant",
  minutesAgo: 'il y a {n}m',
  hoursAgo: 'il y a {n}h',
  daysAgo: 'il y a {n}j',

  // Notifications
  markAllRead: 'Marquer tout lu',

  // Social Links
  socialLinks: 'Liens sociaux',
  saveSocialLinks: 'Enregistrer les liens sociaux',

  // Errors
  failedToPost: 'Échec de la publication',
  failedToVote: 'Échec du vote',
  failedToDelete: 'Échec de la suppression',
  failedToEdit: 'Échec de la modification',
  failedToBan: "Échec du bannissement de l'utilisateur",
  failedToBlock: "Échec du blocage de l'utilisateur",
  failedToUnblock: "Échec du déblocage de l'utilisateur",
  failedToReport: 'Échec du signalement',
  failedToPin: "Échec de l'épinglage",
  failedToFetchAuthMethods: "Échec de la récupération des méthodes d'authentification",
  failedToStartLogin: 'Échec de la connexion',
  failedToSendOtp: "Échec de l'envoi du code",

  // Error pages
  siteNotConfigured: 'Site non configuré',
  siteNotConfiguredMessage:
    "Cette clé API n'est pas associée à un site configuré. Visitez usethreadkit.com/sites pour terminer la configuration.",
  invalidApiKey: 'Clé API invalide',
  invalidApiKeyMessage:
    'La clé API fournie est invalide ou a été révoquée. Vérifiez votre tableau de bord pour la clé correcte.',
  rateLimited: 'Limite de requêtes atteinte',
  rateLimitedMessage: 'Trop de requêtes. Veuillez patienter et réessayer.',
  failedToLoadComments: 'Échec du chargement des commentaires',
  tryAgainLater: 'Veuillez réessayer plus tard.',

  // Branding
  poweredByThreadKit: 'Propulsé par ThreadKit',

  // Real-time updates
  loadNewComments: 'Charger les nouveaux commentaires',
  loadNewReplies: 'Charger les nouvelles réponses',
  isTyping: "est en train d'écrire...",
  },
};
