import type { LocaleMetadata } from '@threadkit/core';

/**
 * Ukrainian translations
 */
export const uk: LocaleMetadata = {
  code: 'uk',
  rtl: false,
  translations: {
  // Common actions
  post: 'Опублікувати',
  cancel: 'Скасувати',
  save: 'Зберегти',
  edit: 'Редагувати',
  delete: 'Видалити',
  reply: 'Відповісти',
  report: 'Поскаржитись',
  share: 'Поділитися',
  block: 'Заблокувати',
  unblock: 'Розблокувати',
  ban: 'Забанити',
  send: 'Надіслати',
  verify: 'Перевірити',
  continue: 'Продовжити',
  close: 'Закрити',
  submit: 'Відправити',
  yes: 'Так',
  no: 'Ні',
  prev: 'Попер',
  next: 'Наст',
  back: 'Назад',

  // Loading states
  loading: 'Завантаження...', 
  loadingComments: 'Завантаження коментарів...', 
  posting: 'Публікація...', 
  signingInWith: 'Вхід через', 

  // Empty states
  noComments: 'Коментарів ще немає. Будьте першим!',
  noNotifications: 'Немає сповіщень',
  noBlockedUsers: 'Немає заблокованих користувачів',

  // Sorting
  sortedBy: 'Сортувати за:',
  sortTop: 'Топ',
  sortNew: 'Нові',
  sortControversial: 'Суперечливі',
  sortOld: 'Старі',

  // Comment form
  writeComment: 'Напишіть коментар...', 
  writeReply: 'Напишіть відповідь...', 
  formattingHelp: 'Довідка з форматування',
  markdownSupported: 'Підтримується Markdown',
  youType: 'Ви пишете:',
  youSee: 'Ви бачите:',

  // Voting
  upvote: 'За',
  downvote: 'Проти',
  point: 'бал',
  points: 'балів',

  // Threading
  expandComment: 'Розгорнути коментар',
  collapseComment: 'Згорнути коментар',
  child: 'відповідь',
  children: 'відповіді',

  // Badges
  pinned: 'Закріплено',

  // Confirmations
  deleteConfirm: 'Видалити?',
  blockConfirm: 'Заблокувати користувача?',
  banConfirm: 'Забанити користувача?',

  // Report reasons
  reportSpam: 'Спам',
  reportHarassment: 'Домагання',
  reportHateSpeech: 'Мова ворожнечі',
  reportMisinformation: 'Дезінформація',
  reportOther: 'Інше',
  selectReason: 'Виберіть причину...', 
  reportSubmitted: 'Дякуємо!',

  // Chat
  typeMessage: 'Введіть повідомлення...', 
  signInToChat: 'Увійдіть, щоб спілкуватися',
  personOnline: 'користувач онлайн',
  peopleOnline: 'користувачів онлайн',
  personTyping: 'користувач друкує...', 
  peopleTyping: 'користувачів друкують...', 

  // Settings
  settings: 'Налаштування',
  signIn: 'Увійти',
  signOut: 'Вийти',
  changeAvatar: 'Змінити аватар',
  theme: 'Тема',
  blockedUsers: 'Заблоковані користувачі',
  notifications: 'Сповіщення',
  emailOnReplies: 'Email при відповідях',
  emailOnMentions: 'Email при згадках',
  weeklyDigest: 'Тижневий дайджест',
  deleteAccount: 'Видалити акаунт',
  accountDeleted: 'Акаунт видалено',
  holdToDelete: 'Утримуйте для видалення (15с)',
  holdForSeconds: 'Утримуйте ще {seconds} с...',

  // Keyboard navigation
  keyboardNavigation: 'Навігація з клавіатури',
  enableKeyboardShortcuts: 'Увімкнути гарячі клавіші',
  key: 'Клавіша',
  action: 'Дія',
  nextComment: 'Наступний коментар',
  previousComment: 'Попередній коментар',
  focusCommentInput: 'Фокус на введенні',
  editFocusedComment: 'Редагувати коментар',
  replyToFocusedComment: 'Відповісти',
  deleteFocusedComment: 'Видалити коментар',
  upvoteFocusedComment: 'Голосувати за',
  downvoteFocusedComment: 'Голосувати проти',
  toggleCollapseFocusedComment: 'Перемкнути згортання',
  confirmYesNo: 'Підтвердити так/ні',
  cancelClose: 'Скасувати/закрити',

  // Username
  usernameTaken: 'Зайнято',
  usernameAvailable: 'Доступно',
  checking: 'Перевірка...',
  chooseUsername: "Виберіть ім'я користувача",
  usernamePlaceholder: 'ваше-імя',
  usernameHint: 'Тільки літери, цифри, дефіси та підкреслення (2-24 символи)',

  // Auth - general
  signInToVote: 'Увійдіть, щоб голосувати',
  signInToPost: 'Увійдіть, щоб публікувати',
  signInLabel: 'Увійти:',
  continueWith: 'Продовжити з',
  chooseSignInMethod: 'Виберіть спосіб входу',

  // Auth - OTP (email/phone)
  enterEmail: 'Введіть ваш email',
  sendCode: 'Надіслати код',
  checkEmail: 'Перевірте ваш email',
  enterCode: 'Введіть 6-значний код, надісланий на',
  codeSentTo: 'Код надіслано на',
  invalidCode: 'Невірний код',
  verificationFailed: 'Перевірка не вдалася',
  weWillSendCode: 'Ми надішлемо код для входу',
  emailPlaceholder: 'you@example.com',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Ласкаво просимо!',
  chooseDisplayName: 'Виберіть ім\'я для акаунта',
  yourName: 'Ваше ім\'я',

  // Auth - OAuth
  popupShouldOpen: 'Мало відкритися спливаюче вікно',
  completingSignIn: 'Завершення входу через',

  // Auth - Web3
  connectingTo: 'Підключення до',

  // Auth - Anonymous
  guestNamePlaceholder: 'Гість',
  continueAsGuest: 'Продовжити як гість',
  guest: 'Гість',
  anonymous: 'Анонімний',

  // User profile
  karma: 'Карма',
  comments: 'Коментарі',
  joined: 'Приєднався',

  // Time formatting
  justNow: 'щойно',
  minutesAgo: '{n} хв тому',
  hoursAgo: '{n} год тому',
  daysAgo: '{n} дн тому',

  // Notifications
  markAllRead: 'Позначити всі прочитані',

  // Social Links
  socialLinks: 'Соціальні посилання',
  saveSocialLinks: 'Зберегти соціальні посилання',

  // Errors
  failedToPost: 'Не вдалося опублікувати',
  failedToVote: 'Не вдалося проголосувати',
  failedToDelete: 'Не вдалося видалити',
  failedToEdit: 'Не вдалося редагувати',
  failedToBan: 'Не вдалося забанити',
  failedToBlock: 'Не вдалося заблокувати',
  failedToUnblock: 'Не вдалося розблокувати',
  failedToReport: 'Не вдалося поскаржитись',
  failedToPin: 'Не вдалося закріпити',
  failedToFetchAuthMethods: 'Помилка отримання методів входу',
  failedToStartLogin: 'Помилка початку входу',
  failedToSendOtp: 'Помилка надсилання коду',

  // Error pages
  siteNotConfigured: 'Сайт не налаштовано',
  siteNotConfiguredMessage:
    'Цей API ключ не пов\'язаний з налаштованим сайтом. Відвідайте usethreadkit.com/sites для налаштування.',
  invalidApiKey: 'Невірний API ключ',
  invalidApiKeyMessage:
    'Наданий API ключ невірний або відкликаний. Перевірте ваш дашборд.',
  rateLimited: 'Ліміті запитів',
  rateLimitedMessage: 'Забагато запитів. Будь ласка, зачекайте і спробуйте знову.',
  failedToLoadComments: 'Не вдалося завантажити коментарі',
  tryAgainLater: 'Будь ласка, спробуйте пізніше.',

  // Branding
  poweredByThreadKit: 'Працює на ThreadKit',

  // Real-time updates
  loadNewComments: 'Завантажити нові коментарі',
  loadNewReplies: 'Завантажити нові відповіді',
  isTyping: 'друкує...',
  },
};
