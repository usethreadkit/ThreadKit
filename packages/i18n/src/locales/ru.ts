import type { LocaleMetadata } from '@threadkit/core';

/**
 * Russian translations
 */
export const ru: LocaleMetadata = {
  code: 'ru',
  rtl: false,
  translations: {
  // Common actions
  post: 'Опубликовать',
  cancel: 'Отмена',
  save: 'Сохранить',
  edit: 'Редактировать',
  delete: 'Удалить',
  reply: 'Ответить',
  report: 'Пожаловаться',
  share: 'Поделиться',
  block: 'Заблокировать',
  unblock: 'Разблокировать',
  ban: 'Забанить',
  send: 'Отправить',
  verify: 'Подтвердить',
  continue: 'Продолжить',
  close: 'Закрыть',
  submit: 'Отправить',
  yes: 'Да',
  no: 'Нет',
  prev: 'Назад',
  next: 'Далее',
  back: 'Назад',

  // Loading states
  loading: 'Загрузка...',
  loadingComments: 'Загрузка комментариев...',
  posting: 'Публикация...',
  signingInWith: 'Вход через',

  // Empty states
  noComments: 'Комментариев пока нет. Будьте первым!',
  noNotifications: 'Уведомлений нет',
  noBlockedUsers: 'Заблокированных пользователей нет',

  // Sorting
  sortedBy: 'Сортировка:',
  sortTop: 'Популярные',
  sortNew: 'Новые',
  sortControversial: 'Спорные',
  sortOld: 'Старые',

  // Comment form
  writeComment: 'Написать комментарий...',
  writeReply: 'Написать ответ...',
  formattingHelp: 'Справка по форматированию',
  markdownSupported: 'Поддерживается разметка Markdown',
  youType: 'Вы пишете:',
  youSee: 'Вы видите:',

  // Voting
  upvote: 'За',
  downvote: 'Против',
  point: 'балл',
  points: 'баллов',

  // Threading
  expandComment: 'Развернуть комментарий',
  collapseComment: 'Свернуть комментарий',
  child: 'ответ',
  children: 'ответов',

  // Badges
  pinned: 'Закреплено',

  // Confirmations
  deleteConfirm: 'Удалить?',
  blockConfirm: 'Заблокировать пользователя?',
  banConfirm: 'Забанить пользователя?',

  // Report reasons
  reportSpam: 'Спам',
  reportHarassment: 'Оскорбления',
  reportHateSpeech: 'Разжигание ненависти',
  reportMisinformation: 'Дезинформация',
  reportOther: 'Другое',
  selectReason: 'Выберите причину...',
  reportSubmitted: 'Спасибо!',

  // Chat
  typeMessage: 'Введите сообщение...',
  signInToChat: 'Войдите, чтобы общаться',
  personOnline: 'пользователь онлайн',
  peopleOnline: 'пользователей онлайн',
  personTyping: 'пользователь печатает...',
  peopleTyping: 'пользователей печатают...',

  // Settings
  settings: 'Настройки',
  signIn: 'Войти',
  signOut: 'Выйти',
  changeAvatar: 'Сменить аватар',
  theme: 'Тема',
  blockedUsers: 'Заблокированные пользователи',
  notifications: 'Уведомления',
  emailOnReplies: 'Email при ответах',
  emailOnMentions: 'Email при упоминаниях',
  weeklyDigest: 'Еженедельный дайджест',
  deleteAccount: 'Удалить аккаунт',
  accountDeleted: 'Аккаунт удалён',
  holdToDelete: 'Удерживайте для удаления (15с)',
  holdForSeconds: 'Удерживайте ещё {seconds} секунд...',

  // Keyboard navigation
  keyboardNavigation: 'Навигация с клавиатуры',
  enableKeyboardShortcuts: 'Включить горячие клавиши',
  key: 'Клавиша',
  action: 'Действие',
  nextComment: 'Следующий комментарий',
  previousComment: 'Предыдущий комментарий',
  focusCommentInput: 'Фокус на вводе',
  editFocusedComment: 'Редактировать комментарий',
  replyToFocusedComment: 'Ответить',
  deleteFocusedComment: 'Удалить комментарий',
  upvoteFocusedComment: 'Голосовать за',
  downvoteFocusedComment: 'Голосовать против',
  toggleCollapseFocusedComment: 'Переключить сворачивание',
  confirmYesNo: 'Подтвердить да/нет',
  cancelClose: 'Отменить/закрыть',

  // Username
  usernameTaken: 'Занято',
  usernameAvailable: 'Доступно',
  checking: 'Проверка...',
  chooseUsername: 'Выберите имя пользователя',
  usernamePlaceholder: 'ваше-имя',
  usernameHint: 'Только буквы, цифры, дефисы и подчеркивания (2-24 символа)',

  // Auth - general
  signInToVote: 'Войдите, чтобы голосовать',
  signInToPost: 'Войдите, чтобы опубликовать',
  signInLabel: 'Вход:',
  continueWith: 'Продолжить с',
  chooseSignInMethod: 'Выберите способ входа',

  // Auth - OTP (email/phone)
  enterEmail: 'Введите email',
  sendCode: 'Отправить код',
  checkEmail: 'Проверьте email',
  enterCode: 'Введите 6-значный код, отправленный на',
  codeSentTo: 'Код отправлен на',
  invalidCode: 'Неверный код',
  verificationFailed: 'Ошибка проверки',
  weWillSendCode: 'Мы отправим вам код для входа',
  emailPlaceholder: 'вы@пример.com',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Добро пожаловать!',
  chooseDisplayName: 'Выберите отображаемое имя для вашего аккаунта',
  yourName: 'Ваше имя',

  // Auth - OAuth
  popupShouldOpen: 'Должно было открыться всплывающее окно',
  completingSignIn: 'Завершение входа через',

  // Auth - Web3
  connectingTo: 'Подключение к',

  // Auth - Anonymous
  guestNamePlaceholder: 'Гость',
  continueAsGuest: 'Продолжить как гость',
  guest: 'Гость',
  anonymous: 'Анонимный',

  // User profile
  karma: 'Карма',
  comments: 'Комментарии',
  joined: 'Присоединился',

  // Time formatting
  justNow: 'только что',
  minutesAgo: '{n} мин. назад',
  hoursAgo: '{n} ч. назад',
  daysAgo: '{n} д. назад',

  // Notifications
  markAllRead: 'Отметить все как прочитанное',

  // Social Links
  socialLinks: 'Социальные ссылки',
  saveSocialLinks: 'Сохранить социальные ссылки',

  // Errors
  failedToPost: 'Не удалось опубликовать комментарий',
  failedToVote: 'Не удалось проголосовать',
  failedToDelete: 'Не удалось удалить',
  failedToEdit: 'Не удалось отредактировать',
  failedToBan: 'Не удалось забанить пользователя',
  failedToBlock: 'Не удалось заблокировать пользователя',
  failedToUnblock: 'Не удалось разблокировать пользователя',
  failedToReport: 'Не удалось пожаловаться',
  failedToPin: 'Не удалось закрепить',
  failedToFetchAuthMethods: 'Не удалось получить методы авторизации',
  failedToStartLogin: 'Не удалось начать вход',
  failedToSendOtp: 'Не удалось отправить код',

  // Error pages
  siteNotConfigured: 'Сайт не настроен',
  siteNotConfiguredMessage:
    'Этот API-ключ не связан с настроенным сайтом. Посетите usethreadkit.com/sites для завершения настройки.',
  invalidApiKey: 'Неверный API-ключ',
  invalidApiKeyMessage:
    'Предоставленный API-ключ недействителен или был отозван. Проверьте правильный ключ в панели управления.',
  rateLimited: 'Превышен лимит запросов',
  rateLimitedMessage: 'Слишком много запросов. Подождите немного и попробуйте снова.',
  failedToLoadComments: 'Не удалось загрузить комментарии',
  tryAgainLater: 'Пожалуйста, попробуйте позже.',

  // Branding
  poweredByThreadKit: 'Работает на ThreadKit',

  // Real-time updates
  loadNewComments: 'Загрузить новые комментарии',
  loadNewReplies: 'Загрузить новые ответы',
  isTyping: 'печатает...',
  },
};
