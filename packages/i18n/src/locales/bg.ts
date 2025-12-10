import type { LocaleMetadata } from '@threadkit/core';

/**
 * Bulgarian translations
 */
export const bg: LocaleMetadata = {
  code: 'bg',
  rtl: false,
  translations: {
  // Common actions
  post: 'Публикувай',
  cancel: 'Отказ',
  save: 'Запази',
  edit: 'Редактирай',
  delete: 'Изтрий',
  reply: 'Отговори',
  report: 'Докладвай',
  share: 'Сподели',
  block: 'Блокирай',
  unblock: 'Отблокирай',
  ban: 'Забрани',
  send: 'Изпрати',
  verify: 'Потвърди',
  continue: 'Продължи',
  close: 'Затвори',
  submit: 'Изпрати',
  yes: 'Да',
  no: 'Не',
  prev: 'Предишна',
  next: 'Следваща',
  back: 'Назад',

  // Loading states
  loading: 'Зареждане...',
  loadingComments: 'Зареждане на коментари...',
  posting: 'Публикуване...',
  signingInWith: 'Влизане с',

  // Empty states
  noComments: 'Все още няма коментари. Бъдете първият, който ще коментира!',
  noNotifications: 'Няма известия',
  noBlockedUsers: 'Няма блокирани потребители',

  // Sorting
  sortedBy: 'Сортиране по:',
  sortTop: 'Топ',
  sortNew: 'Нови',
  sortControversial: 'Противоречиви',
  sortOld: 'Най-стари',

  // Comment form
  writeComment: 'Напиши коментар...',
  writeReply: 'Напиши отговор...',
  formattingHelp: 'Помощ за форматиране',
  markdownSupported: 'Поддържа се Markdown форматиране',
  youType: 'Въвеждате:',
  youSee: 'Виждате:',

  // Voting
  upvote: 'Гласувай за',
  downvote: 'Гласувай против',
  point: 'точка',
  points: 'точки',

  // Threading
  expandComment: 'Разшири коментар',
  collapseComment: 'Свий коментар',
  child: 'отговор',
  children: 'отговори',

  // Badges
  pinned: 'Закачен',

  // Confirmations
  deleteConfirm: 'Изтриване?',
  blockConfirm: 'Блокиране на потребител?',
  banConfirm: 'Забрана на потребител?',

  // Report reasons
  reportSpam: 'Спам',
  reportHarassment: 'Тормоз',
  reportHateSpeech: 'Реч на омразата',
  reportMisinformation: 'Дезинформация',
  reportOther: 'Друго',
  selectReason: 'Изберете причина...',
  reportSubmitted: 'Благодарим!',

  // Chat
  typeMessage: 'Напишете съобщение...',
  signInToChat: 'Влезте, за да чатите',
  personOnline: 'човек онлайн',
  peopleOnline: 'души онлайн',
  personTyping: 'човек пише...',
  peopleTyping: 'души пишат...',

  // Settings
  settings: 'Настройки',
  signIn: 'Вход',
  signOut: 'Изход',
  changeAvatar: 'Смени аватара',
  theme: 'Тема',
  blockedUsers: 'Блокирани потребители',
  notifications: 'Известия',
  emailOnReplies: 'Имейл при отговори',
  emailOnMentions: 'Имейл при споменавания',
  weeklyDigest: 'Седмичен дайджест',
  deleteAccount: 'Изтрий акаунт',
  accountDeleted: 'Акаунтът е изтрит',
  holdToDelete: 'Задръж за изтриване на акаунт (15с)',
  holdForSeconds: 'Задръж за още {seconds} секунди...',

  // Keyboard navigation
  keyboardNavigation: 'Навигация с клавиатура',
  enableKeyboardShortcuts: 'Активиране на клавишни комбинации',
  key: 'Клавиш',
  action: 'Действие',
  nextComment: 'Следващ коментар',
  previousComment: 'Предишен коментар',
  focusCommentInput: 'Фокус на въвеждане',
  editFocusedComment: 'Редактиране на коментар',
  replyToFocusedComment: 'Отговор',
  deleteFocusedComment: 'Изтриване на коментар',
  upvoteFocusedComment: 'Гласуване нагоре',
  downvoteFocusedComment: 'Гласуване надолу',
  toggleCollapseFocusedComment: 'Превключи свиване',
  confirmYesNo: 'Потвърждение да/не',
  cancelClose: 'Отказ/затваряне',

  // Username
  usernameTaken: 'Заето',
  usernameAvailable: 'Налично',
  checking: 'Проверка...',
  chooseUsername: 'Изберете потребителско име',
  usernamePlaceholder: 'вашето-потребителско-име',
  usernameHint: 'Само букви, цифри, тирета, долни черти (2-24 знака)',

  // Auth - general
  signInToVote: 'Влезте, за да гласувате',
  signInToPost: 'Влезте, за да публикувате',
  signInLabel: 'Вход:',
  continueWith: 'Продължи с',
  chooseSignInMethod: 'Изберете метод за вход',

  // Auth - OTP (email/phone)
  enterEmail: 'Въведете вашия имейл',
  enterPhone: 'Въведете вашия телефонен номер',
  sendCode: 'Изпрати код',
  checkEmail: 'Проверете имейла си',
  checkPhone: 'Проверете телефона си',
  enterCode: 'Въведете 6-цифрения код, който изпратихме на',
  codeSentTo: 'Кодът е изпратен на',
  invalidCode: 'Невалиден код',
  verificationFailed: 'Потвърждението не бе успешно',
  weWillSendCode: 'Ще ви изпратим код за вход',
  emailPlaceholder: 'you@example.com',
  phonePlaceholder: '+359 8xx xxx xxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Добре дошли!',
  chooseDisplayName: 'Изберете показвано име за вашия акаунт',
  yourName: 'Вашето име',

  // Auth - OAuth
  popupShouldOpen: 'Трябваше да се отвори изскачащ прозорец',
  completingSignIn: 'Завършване на входа с',

  // Auth - Web3
  connectingTo: 'Свързване към',

  // Auth - Anonymous
  guestNamePlaceholder: 'Гост',
  continueAsGuest: 'Продължи като гост',
  guest: 'Гост',
  anonymous: 'Анонимен',

  // User profile
  karma: 'Карма',
  comments: 'Коментари',
  joined: 'Присъединен',

  // Time formatting
  justNow: 'току-що',
  minutesAgo: 'преди {n}м',
  hoursAgo: 'преди {n}ч',
  daysAgo: 'преди {n}д',

  // Notifications
  markAllRead: 'Маркирай всички като прочетени',

  // Social Links
  socialLinks: 'Социални връзки',
  saveSocialLinks: 'Запазване на социалните връзки',

  // Errors
  failedToPost: 'Неуспешно публикуване на коментар',
  failedToVote: 'Неуспешно гласуване',
  failedToDelete: 'Неуспешно изтриване',
  failedToEdit: 'Неуспешно редактиране',
  failedToBan: 'Неуспешно забраняване на потребител',
  failedToBlock: 'Неуспешно блокиране на потребител',
  failedToUnblock: 'Неуспешно отблокиране на потребител',
  failedToReport: 'Неуспешно докладване',
  failedToPin: 'Неуспешно закачане',
  failedToFetchAuthMethods: 'Неуспешно извличане на методи за удостоверяване',
  failedToStartLogin: 'Неуспешно стартиране на вход',
  failedToSendOtp: 'Неуспешно изпращане на OTP',

  // Error pages
  siteNotConfigured: 'Сайтът не е конфигуриран',
  siteNotConfiguredMessage:
    'Този API ключ не е свързан с конфигуриран сайт. Посетете usethreadkit.com/sites, за да завършите настройката си.',
  invalidApiKey: 'Невалиден API ключ',
  invalidApiKeyMessage:
    'Предоставеният API ключ е невалиден или е отменен. Проверете таблото си за управление за правилния ключ.',
  rateLimited: 'Ограничение на честотата',
  rateLimitedMessage: 'Твърде много заявки. Моля, изчакайте малко и опитайте отново.',
  failedToLoadComments: 'Неуспешно зареждане на коментари',
  tryAgainLater: 'Моля, опитайте отново по-късно.',

  // Branding
  poweredByThreadKit: 'Осъществено от ThreadKit',

  // Real-time updates
  loadNewComments: 'Зареди нови коментари',
  loadNewReplies: 'Зареди нови отговори',
  isTyping: 'пише...',
  },
};
