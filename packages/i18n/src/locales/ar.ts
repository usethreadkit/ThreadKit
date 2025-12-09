import type { TranslationStrings } from '@threadkit/core';

/**
 * Arabic translations
 */
export const ar: TranslationStrings = {
  // Common actions
  post: 'نشر',
  cancel: 'إلغاء',
  save: 'حفظ',
  edit: 'تعديل',
  delete: 'حذف',
  reply: 'رد',
  report: 'إبلاغ',
  share: 'مشاركة',
  block: 'حظر',
  unblock: 'إلغاء الحظر',
  ban: 'حظر كلي',
  send: 'إرسال',
  verify: 'تحقق',
  continue: 'متابعة',
  close: 'إغلاق',
  submit: 'إرسال',
  yes: 'نعم',
  no: 'لا',
  prev: 'سابق',
  next: 'تالي',
  back: 'رجوع',

  // Loading states
  loading: 'جار التحميل...',
  loadingComments: 'جار تحميل التعليقات...',
  posting: 'جار النشر...',
  signingInWith: 'تسجيل الدخول باستخدام',

  // Empty states
  noComments: 'لا توجد تعليقات حتى الآن. كن أول من يعلق!',
  noNotifications: 'لا توجد إشعارات',
  noBlockedUsers: 'لا يوجد مستخدمون محظورون',

  // Sorting
  sortedBy: 'فرز حسب:',
  sortTop: 'الأفضل',
  sortNew: 'الأحدث',
  sortControversial: 'الأكثر جدلاً',
  sortOld: 'الأقدم',

  // Comment form
  writeComment: 'اكتب تعليقاً...',
  writeReply: 'اكتب رداً...',
  formattingHelp: 'مساعدة في التنسيق',
  markdownSupported: 'تنسيق Markdown مدعوم',
  youType: 'أنت تكتب:',
  youSee: 'أنت ترى:',

  // Voting
  upvote: 'تصويت إيجابي',
  downvote: 'تصويت سلبي',
  point: 'نقطة',
  points: 'نقاط',

  // Threading
  expandComment: 'توسيع التعليق',
  collapseComment: 'طي التعليق',
  child: 'رد فرعي',
  children: 'ردود فرعية',

  // Badges
  pinned: 'مُثبت',

  // Confirmations
  deleteConfirm: 'حذف؟',
  blockConfirm: 'حظر المستخدم؟',
  banConfirm: 'حظر المستخدم كلياً؟',

  // Report reasons
  reportSpam: 'بريد عشوائي',
  reportHarassment: 'مضايقة',
  reportHateSpeech: 'خطاب كراهية',
  reportMisinformation: 'معلومات مضللة',
  reportOther: 'أخرى',
  selectReason: 'اختر سبباً...',
  reportSubmitted: 'شكراً!',

  // Chat
  typeMessage: 'اكتب رسالة...',
  signInToChat: 'سجل الدخول للدردشة',
  personOnline: 'شخص متصل',
  peopleOnline: 'أشخاص متصلون',
  personTyping: 'شخص يكتب...',
  peopleTyping: 'أشخاص يكتبون...',

  // Settings
  settings: 'الإعدادات',
  signIn: 'تسجيل الدخول',
  signOut: 'تسجيل الخروج',
  changeAvatar: 'تغيير الصورة الرمزية',
  theme: 'السمة',
  blockedUsers: 'المستخدمون المحظورون',
  notifications: 'الإشعارات',
  emailOnReplies: 'بريد إلكتروني عند الردود',
  emailOnMentions: 'بريد إلكتروني عند الإشارة',
  weeklyDigest: 'ملخص أسبوعي',
  deleteAccount: 'حذف الحساب',
  accountDeleted: 'تم حذف الحساب',
  holdToDelete: 'اضغط باستمرار لحذف الحساب (15 ثانية)',
  holdForSeconds: 'اضغط لمدة {seconds} ثوانٍ أخرى...',

  // Username
  usernameTaken: 'مأخوذ',
  usernameAvailable: 'متاح',
  checking: 'جار التحقق...',
  chooseUsername: 'اختر اسم مستخدم',
  usernamePlaceholder: 'اسم المستخدم الخاص بك',
  usernameHint: 'الأحرف والأرقام والواصلات والشرطات السفلية فقط (2-24 حرفًا)',

  // Auth - general
  signInToPost: 'سجل الدخول للنشر',
  signInLabel: 'تسجيل الدخول:',
  continueWith: 'متابعة باستخدام',
  chooseSignInMethod: 'اختر طريقة تسجيل الدخول',

  // Auth - OTP (email/phone)
  enterEmail: 'أدخل بريدك الإلكتروني',
  enterPhone: 'أدخل رقم هاتفك',
  sendCode: 'إرسال الرمز',
  checkEmail: 'تفقد بريدك الإلكتروني',
  checkPhone: 'تفقد هاتفك',
  enterCode: 'أدخل الرمز المكون من 6 أرقام المرسل إلى',
  codeSentTo: 'تم إرسال الرمز إلى',
  invalidCode: 'رمز غير صالح',
  verificationFailed: 'فشل التحقق',
  weWillSendCode: 'سنرسل لك رمزاً لتسجيل الدخول',
  emailPlaceholder: 'you@example.com',
  phonePlaceholder: '+966 5x xxx xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'أهلاً بك!',
  chooseDisplayName: 'اختر اسماً معروضاً لحسابك',
  yourName: 'اسمك',

  // Auth - OAuth
  popupShouldOpen: 'يجب أن تكون قد فتحت نافذة منبثقة',
  completingSignIn: 'جار إكمال تسجيل الدخول باستخدام',

  // Auth - Web3
  connectingTo: 'جار الاتصال بـ',

  // User profile
  karma: 'كارما',
  comments: 'التعليقات',
  joined: 'انضم',

  // Time formatting
  justNow: 'الآن',
  minutesAgo: 'منذ {n} دقيقة',
  hoursAgo: 'منذ {n} ساعة',
  daysAgo: 'منذ {n} يوم',

  // Notifications
  markAllRead: 'وضع الكل كمقروء',

  // Social Links
  socialLinks: 'روابط التواصل الاجتماعي',
  saveSocialLinks: 'حفظ روابط التواصل الاجتماعي',

  // Errors
  failedToPost: 'فشل نشر التعليق',
  failedToVote: 'فشل التصويت',
  failedToDelete: 'فشل الحذف',
  failedToEdit: 'فشل التعديل',
  failedToBan: 'فشل حظر المستخدم',
  failedToBlock: 'فشل حظر المستخدم',
  failedToUnblock: 'فشل إلغاء حظر المستخدم',
  failedToReport: 'فشل الإبلاغ',
  failedToPin: 'فشل التثبيت',
  failedToFetchAuthMethods: 'فشل جلب طرق المصادقة',
  failedToStartLogin: 'فشل بدء تسجيل الدخول',
  failedToSendOtp: 'فشل إرسال رمز التحقق',

  // Error pages
  siteNotConfigured: 'الموقع غير مهيأ',
  siteNotConfiguredMessage:
    'مفتاح API هذا غير مرتبط بموقع مهيأ. قم بزيارة usethreadkit.com/sites لإكمال إعدادك.',
  invalidApiKey: 'مفتاح API غير صالح',
  invalidApiKeyMessage:
    'مفتاح API المقدم غير صالح أو تم إبطاله. تحقق من لوحة المعلومات الخاصة بك للحصول على المفتاح الصحيح.',
  rateLimited: 'تم تجاوز الحد',
  rateLimitedMessage: 'طلبات كثيرة جداً. يرجى الانتظار قليلاً والمحاولة مرة أخرى.',
  failedToLoadComments: 'فشل تحميل التعليقات',
  tryAgainLater: 'يرجى المحاولة مرة أخرى لاحقاً.',

  // Branding
  poweredByThreadKit: 'مشغل بواسطة ThreadKit',
};
