import type { TranslationStrings } from '@threadkit/core';

/**
 * Persian translations (Farsi)
 */
export const fa: TranslationStrings = {
  // Common actions
  post: 'ارسال',
  cancel: 'لغو',
  save: 'ذخیره',
  edit: 'ویرایش',
  delete: 'حذف',
  reply: 'پاسخ',
  report: 'گزارش',
  share: 'اشتراک‌گذاری',
  block: 'بلاک',
  unblock: 'آنبلاک',
  ban: 'بن',
  send: 'ارسال',
  verify: 'تایید',
  continue: 'ادامه',
  close: 'بستن',
  submit: 'ارسال',
  yes: 'بله',
  no: 'خیر',
  prev: 'قبلی',
  next: 'بعدی',
  back: 'بازگشت',

  // Loading states
  loading: 'در حال بارگذاری...',
  loadingComments: 'نظرات در حال بارگذاری...',
  posting: 'در حال ارسال...',
  signingInWith: 'ورود با',

  // Empty states
  noComments: 'هنوز نظری ثبت نشده است. اولین نفر باشید!',
  noNotifications: 'هنوز هیچ اعلانی وجود ندارد',
  noBlockedUsers: 'هیچ کاربر مسدود شده‌ای وجود ندارد',

  // Sorting
  sortedBy: 'مرتب‌سازی بر اساس:',
  sortTop: 'برترین',
  sortNew: 'جدیدترین',
  sortControversial: 'بحث‌برانگیز',
  sortOld: 'قدیمی‌ترین',

  // Comment form
  writeComment: 'یک نظر بنویسید...',
  writeReply: 'یک پاسخ بنویسید...',
  formattingHelp: 'راهنمای قالب‌بندی',
  markdownSupported: 'قالب‌بندی Markdown پشتیبانی می‌شود',
  youType: 'شما تایپ می‌کنید:',
  youSee: 'شما می‌بینید:',

  // Voting
  upvote: 'رای مثبت',
  downvote: 'رای منفی',
  point: 'امتیاز',
  points: 'امتیازات',

  // Threading
  expandComment: 'گسترش نظر',
  collapseComment: 'جمع کردن نظر',
  child: 'فرزند',
  children: 'فرزندان',

  // Badges
  pinned: 'سنجاق شده',

  // Confirmations
  deleteConfirm: 'حذف شود؟',
  blockConfirm: 'کاربر مسدود شود؟',
  banConfirm: 'کاربر بن شود؟',

  // Report reasons
  reportSpam: 'هرزنامه',
  reportHarassment: 'آزار و اذیت',
  reportHateSpeech: 'سخنان نفرت‌پراکن',
  reportMisinformation: 'اطلاعات نادرست',
  reportOther: 'سایر',
  selectReason: 'انتخاب دلیل...',
  reportSubmitted: 'متشکریم!',

  // Chat
  typeMessage: 'پیام خود را بنویسید...',
  signInToChat: 'برای چت وارد شوید',
  personOnline: 'نفر آنلاین',
  peopleOnline: 'نفر آنلاین',
  personTyping: 'نفر در حال تایپ است...',
  peopleTyping: 'نفر در حال تایپ هستند...',

  // Settings
  settings: 'تنظیمات',
  signIn: 'ورود',
  signOut: 'خروج',
  changeAvatar: 'تغییر آواتار',
  theme: 'پوسته',
  blockedUsers: 'کاربران مسدود شده',
  notifications: 'اعلان‌ها',
  emailOnReplies: 'ایمیل برای پاسخ‌ها',
  emailOnMentions: 'ایمیل برای منشن‌ها',
  weeklyDigest: 'خلاصه هفتگی',
  deleteAccount: 'حذف حساب کاربری',
  accountDeleted: 'حساب کاربری حذف شد',
  holdToDelete: 'برای حذف حساب (15 ثانیه) نگه دارید',
  holdForSeconds: '{seconds} ثانیه دیگر نگه دارید...',

  // Username
  usernameTaken: 'گرفته شده',
  usernameAvailable: 'موجود',
  checking: 'در حال بررسی...',

  // Auth - general
  signInToPost: 'برای ارسال وارد شوید',
  signInLabel: 'ورود:',
  continueWith: 'ادامه با',
  chooseSignInMethod: 'روش ورود را انتخاب کنید',

  // Auth - OTP (email/phone)
  enterEmail: 'ایمیل خود را وارد کنید',
  enterPhone: 'شماره تلفن خود را وارد کنید',
  sendCode: 'ارسال کد',
  checkEmail: 'ایمیل خود را بررسی کنید',
  checkPhone: 'تلفن خود را بررسی کنید',
  enterCode: 'کد 6 رقمی ارسال شده به',
  codeSentTo: 'کد ارسال شد به',
  invalidCode: 'کد نامعتبر',
  verificationFailed: 'تایید ناموفق بود',
  weWillSendCode: 'ما یک کد برای ورود به شما ارسال خواهیم کرد',
  emailPlaceholder: 'شما@مثال.کام',
  phonePlaceholder: '+98 9xx xxxxxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'خوش آمدید!',
  chooseDisplayName: 'یک نام نمایشی برای حساب خود انتخاب کنید',
  yourName: 'نام شما',

  // Auth - OAuth
  popupShouldOpen: 'یک پنجره پاپ‌آپ باید باز شده باشد',
  completingSignIn: 'تکمیل ورود با',

  // Auth - Web3
  connectingTo: 'در حال اتصال به',

  // User profile
  karma: 'کارما',
  comments: 'نظرات',
  joined: 'تاریخ عضویت',

  // Time formatting
  justNow: 'همین الان',
  minutesAgo: '{n} دقیقه پیش',
  hoursAgo: '{n} ساعت پیش',
  daysAgo: '{n} روز پیش',

  // Notifications
  markAllRead: 'علامت گذاری همه به عنوان خوانده شده',

  // Social Links
  socialLinks: 'لینک‌های اجتماعی',
  saveSocialLinks: 'ذخیره لینک‌های اجتماعی',

  // Errors
  failedToPost: 'ارسال نظر ناموفق بود',
  failedToVote: 'رای دادن ناموفق بود',
  failedToDelete: 'حذف ناموفق بود',
  failedToEdit: 'ویرایش ناموفق بود',
  failedToBan: 'بن کردن کاربر ناموفق بود',
  failedToBlock: 'مسدود کردن کاربر ناموفق بود',
  failedToUnblock: 'آنبلاک کردن کاربر ناموفق بود',
  failedToReport: 'گزارش ناموفق بود',
  failedToPin: 'سنجاق کردن ناموفق بود',
  failedToFetchAuthMethods: 'دریافت روش‌های احراز هویت ناموفق بود',
  failedToStartLogin: 'شروع ورود ناموفق بود',
  failedToSendOtp: 'ارسال OTP ناموفق بود',

  // Error pages
  siteNotConfigured: 'سایت پیکربندی نشده است',
  siteNotConfiguredMessage:
    'این کلید API با یک سایت پیکربندی شده مرتبط نیست. برای تکمیل تنظیمات خود به usethreadkit.com/dashboard مراجعه کنید.',
  invalidApiKey: 'کلید API نامعتبر',
  invalidApiKeyMessage:
    'کلید API ارائه شده نامعتبر است یا باطل شده است. برای کلید صحیح داشبورد خود را بررسی کنید.',
  rateLimited: 'محدودیت نرخ',
  rateLimitedMessage: 'درخواست‌های زیاد. لطفا لحظه‌ای صبر کنید و دوباره امتحان کنید.',
  failedToLoadComments: 'بارگذاری نظرات ناموفق بود',
  tryAgainLater: 'لطفا بعدا دوباره امتحان کنید.',

  // Branding
  poweredByThreadKit: 'پشتیبانی شده توسط ThreadKit',
};