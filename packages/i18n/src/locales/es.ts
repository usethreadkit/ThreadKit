import type { TranslationStrings } from '@threadkit/core';

/**
 * Spanish translations
 */
export const es: TranslationStrings = {
  // Common actions
  post: 'Publicar',
  cancel: 'Cancelar',
  save: 'Guardar',
  edit: 'Editar',
  delete: 'Eliminar',
  reply: 'Responder',
  report: 'Reportar',
  share: 'Compartir',
  block: 'Bloquear',
  unblock: 'Desbloquear',
  ban: 'Banear',
  send: 'Enviar',
  verify: 'Verificar',
  continue: 'Continuar',
  close: 'Cerrar',
  submit: 'Enviar',
  yes: 'Sí',
  no: 'No',
  prev: 'Anterior',
  next: 'Siguiente',
  back: 'Volver',

  // Loading states
  loading: 'Cargando...',
  loadingComments: 'Cargando comentarios...',
  posting: 'Publicando...',
  signingInWith: 'Iniciando sesión con',

  // Empty states
  noComments: '¡Aún no hay comentarios. Sé el primero en comentar!',
  noNotifications: 'Aún no hay notificaciones',
  noBlockedUsers: 'No hay usuarios bloqueados',

  // Sorting
  sortedBy: 'Ordenar por:',
  sortTop: 'Popular',
  sortNew: 'Nuevo',
  sortControversial: 'Controvertido',
  sortOld: 'Antiguo',

  // Comment form
  writeComment: 'Escribe un comentario...',
  writeReply: 'Escribe una respuesta...',
  formattingHelp: 'Ayuda de formato',
  markdownSupported: 'Se admite el formato Markdown',
  youType: 'Escribes:',
  youSee: 'Ves:',

  // Voting
  upvote: 'Votar a favor',
  downvote: 'Votar en contra',
  point: 'punto',
  points: 'puntos',

  // Threading
  expandComment: 'Expandir comentario',
  collapseComment: 'Contraer comentario',
  child: 'hijo',
  children: 'hijos',

  // Badges
  pinned: 'Fijado',

  // Confirmations
  deleteConfirm: '¿Eliminar?',
  blockConfirm: '¿Bloquear usuario?',
  banConfirm: '¿Banear usuario?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Acoso',
  reportHateSpeech: 'Discurso de odio',
  reportMisinformation: 'Desinformación',
  reportOther: 'Otro',
  selectReason: 'Seleccionar razón...',
  reportSubmitted: '¡Gracias!',

  // Chat
  typeMessage: 'Escribe un mensaje...',
  signInToChat: 'Inicia sesión para chatear',
  personOnline: 'persona en línea',
  peopleOnline: 'personas en línea',
  personTyping: 'persona está escribiendo...',
  peopleTyping: 'personas están escribiendo...',

  // Settings
  settings: 'Configuración',
  signIn: 'Iniciar sesión',
  signOut: 'Cerrar sesión',
  changeAvatar: 'Cambiar avatar',
  theme: 'Tema',
  blockedUsers: 'Usuarios bloqueados',
  notifications: 'Notificaciones',
  emailOnReplies: 'Email en respuestas',
  emailOnMentions: 'Email en menciones',
  weeklyDigest: 'Resumen semanal',
  deleteAccount: 'Eliminar cuenta',
  accountDeleted: 'Cuenta eliminada',
  holdToDelete: 'Mantén presionado para eliminar (15s)',
  holdForSeconds: 'Mantén presionado {seconds} segundos más...',

  // Username
  usernameTaken: 'Ocupado',
  usernameAvailable: 'Disponible',
  checking: 'Comprobando...',
  chooseUsername: 'Elige un nombre de usuario',
  usernamePlaceholder: 'tu-nombre-de-usuario',
  usernameHint: 'Solo letras, números, guiones y guiones bajos (2-24 caracteres)',

  // Auth - general
  signInToPost: 'Inicia sesión para publicar',
  signInLabel: 'Iniciar sesión:',
  continueWith: 'Continuar con',
  chooseSignInMethod: 'Elige cómo quieres iniciar sesión',

  // Auth - OTP (email/phone)
  enterEmail: 'Ingresa tu email',
  enterPhone: 'Ingresa tu número de teléfono',
  sendCode: 'Enviar código',
  checkEmail: 'Revisa tu email',
  checkPhone: 'Revisa tu teléfono',
  enterCode: 'Ingresa el código de 6 dígitos que enviamos a',
  codeSentTo: 'Código enviado a',
  invalidCode: 'Código inválido',
  verificationFailed: 'Verificación fallida',
  weWillSendCode: 'Te enviaremos un código para iniciar sesión',
  emailPlaceholder: 'tu@ejemplo.com',
  phonePlaceholder: '+34 612 345 678',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: '¡Bienvenido!',
  chooseDisplayName: 'Elige un nombre para mostrar en tu cuenta',
  yourName: 'Tu nombre',

  // Auth - OAuth
  popupShouldOpen: 'Debería abrirse una ventana emergente',
  completingSignIn: 'Completando inicio de sesión con',

  // Auth - Web3
  connectingTo: 'Conectando a',

  // User profile
  karma: 'Karma',
  comments: 'Comentarios',
  joined: 'Se unió',

  // Time formatting
  justNow: 'ahora',
  minutesAgo: 'hace {n}m',
  hoursAgo: 'hace {n}h',
  daysAgo: 'hace {n}d',

  // Notifications
  markAllRead: 'Marcar todo como leído',

  // Social Links
  socialLinks: 'Enlaces sociales',
  saveSocialLinks: 'Guardar enlaces sociales',

  // Errors
  failedToPost: 'Error al publicar comentario',
  failedToVote: 'Error al votar',
  failedToDelete: 'Error al eliminar',
  failedToEdit: 'Error al editar',
  failedToBan: 'Error al banear usuario',
  failedToBlock: 'Error al bloquear usuario',
  failedToUnblock: 'Error al desbloquear usuario',
  failedToReport: 'Error al reportar',
  failedToPin: 'Error al fijar',
  failedToFetchAuthMethods: 'Error al obtener métodos de autenticación',
  failedToStartLogin: 'Error al iniciar sesión',
  failedToSendOtp: 'Error al enviar código',

  // Error pages
  siteNotConfigured: 'Sitio no configurado',
  siteNotConfiguredMessage:
    'Esta clave API no está asociada con un sitio configurado. Visita usethreadkit.com/sites para completar tu configuración.',
  invalidApiKey: 'Clave API inválida',
  invalidApiKeyMessage:
    'La clave API proporcionada es inválida o ha sido revocada. Verifica tu panel para obtener la clave correcta.',
  rateLimited: 'Límite de solicitudes',
  rateLimitedMessage: 'Demasiadas solicitudes. Por favor espera un momento e intenta de nuevo.',
  failedToLoadComments: 'Error al cargar comentarios',
  tryAgainLater: 'Por favor intenta más tarde.',

  // Branding
  poweredByThreadKit: 'Desarrollado con ThreadKit',
};
