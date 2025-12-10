import type { LocaleMetadata } from '@threadkit/core';

/**
 * Portuguese translations
 */
export const pt: LocaleMetadata = {
  code: 'pt',
  rtl: false,
  translations: {
  // Common actions
  post: 'Publicar',
  cancel: 'Cancelar',
  save: 'Salvar',
  edit: 'Editar',
  delete: 'Excluir',
  reply: 'Responder',
  report: 'Denunciar',
  share: 'Compartilhar',
  block: 'Bloquear',
  unblock: 'Desbloquear',
  ban: 'Banir',
  send: 'Enviar',
  verify: 'Verificar',
  continue: 'Continuar',
  close: 'Fechar',
  submit: 'Enviar',
  yes: 'Sim',
  no: 'Não',
  prev: 'Anterior',
  next: 'Próximo',
  back: 'Voltar',

  // Loading states
  loading: 'Carregando...',
  loadingComments: 'Carregando comentários...',
  posting: 'Publicando...',
  signingInWith: 'Entrando com',

  // Empty states
  noComments: 'Nenhum comentário ainda. Seja o primeiro a comentar!',
  noNotifications: 'Nenhuma notificação ainda',
  noBlockedUsers: 'Nenhum usuário bloqueado',

  // Sorting
  sortedBy: 'Ordenar por:',
  sortTop: 'Popular',
  sortNew: 'Novo',
  sortControversial: 'Controverso',
  sortOld: 'Antigo',

  // Comment form
  writeComment: 'Escreva um comentário...',
  writeReply: 'Escreva uma resposta...',
  formattingHelp: 'Ajuda de formatação',
  markdownSupported: 'Formatação Markdown é suportada',
  youType: 'Você digita:',
  youSee: 'Você vê:',

  // Voting
  upvote: 'Votar positivo',
  downvote: 'Votar negativo',
  point: 'ponto',
  points: 'pontos',

  // Threading
  expandComment: 'Expandir comentário',
  collapseComment: 'Recolher comentário',
  child: 'filho',
  children: 'filhos',

  // Badges
  pinned: 'Fixado',

  // Confirmations
  deleteConfirm: 'Excluir?',
  blockConfirm: 'Bloquear usuário?',
  banConfirm: 'Banir usuário?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Assédio',
  reportHateSpeech: 'Discurso de ódio',
  reportMisinformation: 'Desinformação',
  reportOther: 'Outro',
  selectReason: 'Selecionar motivo...',
  reportSubmitted: 'Obrigado!',

  // Chat
  typeMessage: 'Digite uma mensagem...',
  signInToChat: 'Entre para conversar',
  personOnline: 'pessoa online',
  peopleOnline: 'pessoas online',
  personTyping: 'pessoa está digitando...',
  peopleTyping: 'pessoas estão digitando...',

  // Settings
  settings: 'Configurações',
  signIn: 'Entrar',
  signOut: 'Sair',
  changeAvatar: 'Alterar avatar',
  theme: 'Tema',
  blockedUsers: 'Usuários bloqueados',
  notifications: 'Notificações',
  emailOnReplies: 'Email em respostas',
  emailOnMentions: 'Email em menções',
  weeklyDigest: 'Resumo semanal',
  deleteAccount: 'Excluir conta',
  accountDeleted: 'Conta excluída',
  holdToDelete: 'Segure para excluir (15s)',
  holdForSeconds: 'Segure por mais {seconds} segundos...',

  // Keyboard navigation
  keyboardNavigation: 'Navegação por teclado',
  enableKeyboardShortcuts: 'Ativar atalhos de teclado',
  key: 'Tecla',
  action: 'Ação',
  nextComment: 'Próximo comentário',
  previousComment: 'Comentário anterior',
  focusCommentInput: 'Focar entrada',
  editFocusedComment: 'Editar comentário',
  replyToFocusedComment: 'Responder',
  deleteFocusedComment: 'Excluir comentário',
  collapseFocusedComment: 'Recolher',
  expandFocusedComment: 'Expandir',
  upvoteFocusedComment: 'Votar a favor',
  downvoteFocusedComment: 'Votar contra',
  confirmYesNo: 'Confirmar sim/não',
  cancelClose: 'Cancelar/fechar',

  // Username
  usernameTaken: 'Ocupado',
  usernameAvailable: 'Disponível',
  checking: 'Verificando...',
  chooseUsername: 'Escolha um nome de usuário',
  usernamePlaceholder: 'seu-nome-de-usuário',
  usernameHint: 'Apenas letras, números, hífens, sublinhados (2-24 caracteres)',

  // Auth - general
  signInToVote: 'Entre para votar',
  signInToPost: 'Entre para publicar',
  signInLabel: 'Entrar:',
  continueWith: 'Continuar com',
  chooseSignInMethod: 'Escolha como você quer entrar',

  // Auth - OTP (email/phone)
  enterEmail: 'Digite seu email',
  enterPhone: 'Digite seu número de telefone',
  sendCode: 'Enviar código',
  checkEmail: 'Verifique seu email',
  checkPhone: 'Verifique seu telefone',
  enterCode: 'Digite o código de 6 dígitos que enviamos para',
  codeSentTo: 'Código enviado para',
  invalidCode: 'Código inválido',
  verificationFailed: 'Verificação falhou',
  weWillSendCode: 'Enviaremos um código para você entrar',
  emailPlaceholder: 'voce@exemplo.com',
  phonePlaceholder: '+55 11 98765 4321',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Bem-vindo!',
  chooseDisplayName: 'Escolha um nome de exibição para sua conta',
  yourName: 'Seu nome',

  // Auth - OAuth
  popupShouldOpen: 'Uma janela popup deve ter aberto',
  completingSignIn: 'Completando entrada com',

  // Auth - Web3
  connectingTo: 'Conectando a',

  // Auth - Anonymous
  guestNamePlaceholder: 'Convidado',
  continueAsGuest: 'Continuar como convidado',
  guest: 'Convidado',
  anonymous: 'Anônimo',

  // User profile
  karma: 'Karma',
  comments: 'Comentários',
  joined: 'Entrou em',

  // Time formatting
  justNow: 'agora',
  minutesAgo: '{n}m atrás',
  hoursAgo: '{n}h atrás',
  daysAgo: '{n}d atrás',

  // Notifications
  markAllRead: 'Marcar todos como lidos',

  // Social Links
  socialLinks: 'Links sociais',
  saveSocialLinks: 'Salvar links sociais',

  // Errors
  failedToPost: 'Falha ao publicar comentário',
  failedToVote: 'Falha ao votar',
  failedToDelete: 'Falha ao excluir',
  failedToEdit: 'Falha ao editar',
  failedToBan: 'Falha ao banir usuário',
  failedToBlock: 'Falha ao bloquear usuário',
  failedToUnblock: 'Falha ao desbloquear usuário',
  failedToReport: 'Falha ao denunciar',
  failedToPin: 'Falha ao fixar',
  failedToFetchAuthMethods: 'Falha ao buscar métodos de autenticação',
  failedToStartLogin: 'Falha ao iniciar login',
  failedToSendOtp: 'Falha ao enviar código',

  // Error pages
  siteNotConfigured: 'Site não configurado',
  siteNotConfiguredMessage:
    'Esta chave API não está associada a um site configurado. Visite usethreadkit.com/sites para completar sua configuração.',
  invalidApiKey: 'Chave API inválida',
  invalidApiKeyMessage:
    'A chave API fornecida é inválida ou foi revogada. Verifique seu painel para a chave correta.',
  rateLimited: 'Limite de requisições',
  rateLimitedMessage: 'Muitas requisições. Por favor aguarde um momento e tente novamente.',
  failedToLoadComments: 'Falha ao carregar comentários',
  tryAgainLater: 'Por favor tente novamente mais tarde.',

  // Branding
  poweredByThreadKit: 'Desenvolvido com ThreadKit',

  // Real-time updates
  loadNewComments: 'Carregar novos comentários',
  loadNewReplies: 'Carregar novas respostas',
  isTyping: 'está digitando...',
  },
};
