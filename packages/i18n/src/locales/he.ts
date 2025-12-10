import type { LocaleMetadata } from '@threadkit/core';

/**
 * Hebrew translations (RTL)
 */
export const he: LocaleMetadata = {
  code: 'he',
  rtl: true,
  translations: {
  // Common actions
  post: 'פרסם',
  cancel: 'ביטול',
  save: 'שמור',
  edit: 'ערוך',
  delete: 'מחק',
  reply: 'השב',
  report: 'דווח',
  share: 'שתף',
  block: 'חסום',
  unblock: 'בטל חסימה',
  ban: 'החרם',
  send: 'שלח',
  verify: 'אמת',
  continue: 'המשך',
  close: 'סגור',
  submit: 'שלח',
  yes: 'כן',
  no: 'לא',
  prev: 'קודם',
  next: 'הבא',
  back: 'חזור',

  // Loading states
  loading: 'טוען...',
  loadingComments: 'טוען תגובות...',
  posting: 'מפרסם...',
  signingInWith: 'מתחבר עם',

  // Empty states
  noComments: 'אין עדיין תגובות. היה הראשון להגיב!',
  noNotifications: 'אין התראות',
  noBlockedUsers: 'אין משתמשים חסומים',

  // Sorting
  sortedBy: 'ממוין לפי:',
  sortTop: 'הכי פופולרי',
  sortNew: 'חדש',
  sortControversial: 'שנוי במחלוקת',
  sortOld: 'ישן',

  // Comment form
  writeComment: 'כתוב תגובה...',
  writeReply: 'כתוב תגובה...',
  formattingHelp: 'עזרה בעיצוב',
  markdownSupported: 'עיצוב Markdown נתמך',
  youType: 'אתה מקליד:',
  youSee: 'אתה רואה:',

  // Voting
  upvote: 'הצבעה חיובית',
  downvote: 'הצבעה שלילית',
  point: 'נקודה',
  points: 'נקודות',

  // Threading
  expandComment: 'הרחב תגובה',
  collapseComment: 'כווץ תגובה',
  child: 'תשובת משנה',
  children: 'תשובות משנה',

  // Badges
  pinned: 'נעוץ',

  // Confirmations
  deleteConfirm: 'למחוק?',
  blockConfirm: 'לחסום משתמש?',
  banConfirm: 'להחרים משתמש?',

  // Report reasons
  reportSpam: 'ספאם',
  reportHarassment: 'הטרדה',
  reportHateSpeech: 'הסתה לשנאה',
  reportMisinformation: 'מידע שגוי',
  reportOther: 'אחר',
  selectReason: 'בחר סיבה...',
  reportSubmitted: 'תודה!',

  // Chat
  typeMessage: 'הקלד הודעה...',
  signInToChat: 'התחבר כדי לשוחח',
  personOnline: 'אדם מחובר',
  peopleOnline: 'אנשים מחוברים',
  personTyping: 'אדם מקליד...',
  peopleTyping: 'אנשים מקלידים...',

  // Settings
  settings: 'הגדרות',
  signIn: 'התחבר',
  signOut: 'התנתק',
  changeAvatar: 'שנה תמונת פרופיל',
  theme: 'ערכת נושא',
  blockedUsers: 'משתמשים חסומים',
  notifications: 'התראות',
  emailOnReplies: 'אימייל על תגובות',
  emailOnMentions: 'אימייל על אזכורים',
  weeklyDigest: 'תקציר שבועי',
  deleteAccount: 'מחק חשבון',
  accountDeleted: 'החשבון נמחק',
  holdToDelete: 'החזק כדי למחוק חשבון (15שנ)',
  holdForSeconds: 'החזק למשך {seconds} שניות נוספות...',

  // Keyboard navigation
  keyboardNavigation: 'ניווט מקלדת',
  enableKeyboardShortcuts: 'הפעל קיצורי מקלדת',
  key: 'מקש',
  action: 'פעולה',
  nextComment: 'תגובה הבאה',
  previousComment: 'תגובה קודמת',
  focusCommentInput: 'מיקוד קלט',
  editFocusedComment: 'ערוך תגובה',
  replyToFocusedComment: 'השב',
  deleteFocusedComment: 'מחק תגובה',
  collapseFocusedComment: 'כווץ',
  expandFocusedComment: 'הרחב',
  upvoteFocusedComment: 'הצבע בעד',
  downvoteFocusedComment: 'הצבע נגד',
  confirmYesNo: 'אשר כן/לא',
  cancelClose: 'ביטול/סגירה',

  // Username
  usernameTaken: 'תפוס',
  usernameAvailable: 'פנוי',
  checking: 'בדיקה...',
  chooseUsername: 'בחר שם משתמש',
  usernamePlaceholder: 'שם-משתמש',
  usernameHint: 'אותיות, מספרים, מקפים וקו תחתון בלבד (2-24 תווים)',

  // Auth - general
  signInToVote: 'התחבר כדי להצביע',
  signInToPost: 'התחבר כדי לפרסם',
  signInLabel: 'התחבר:',
  continueWith: 'המשך עם',
  chooseSignInMethod: 'בחר שיטת התחברות',

  // Auth - OTP (email/phone)
  enterEmail: 'הכנס את כתובת האימייל שלך',
  enterPhone: 'הכנס את מספר הטלפון שלך',
  sendCode: 'שלח קוד',
  checkEmail: 'בדוק את האימייל שלך',
  checkPhone: 'בדוק את הטלפון שלך',
  enterCode: 'הכנס את הקוד בן 6 הספרות שנשלח אל',
  codeSentTo: 'הקוד נשלח אל',
  invalidCode: 'קוד לא חוקי',
  verificationFailed: 'אימות נכשל',
  weWillSendCode: 'נשלח לך קוד להתחברות',
  emailPlaceholder: 'אתה@example.com',
  phonePlaceholder: '+972 5x-xxx-xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'ברוך הבא!',
  chooseDisplayName: 'בחר שם תצוגה לחשבונך',
  yourName: 'שמך',

  // Auth - OAuth
  popupShouldOpen: 'חלון קופץ אמור היה להיפתח',
  completingSignIn: 'משלים התחברות עם',

  // Auth - Web3
  connectingTo: 'מתחבר אל',

  // Auth - Anonymous
  guestNamePlaceholder: 'אורח',
  continueAsGuest: 'המשך כאורח',
  guest: 'אורח',
  anonymous: 'אנונימי',

  // User profile
  karma: 'קארמה',
  comments: 'תגובות',
  joined: 'הצטרף',

  // Time formatting
  justNow: 'עכשיו',
  minutesAgo: 'לפני {n} דק׳',
  hoursAgo: 'לפני {n} שעות',
  daysAgo: 'לפני {n} ימים',

  // Notifications
  markAllRead: 'סמן הכל כנקרא',

  // Social Links
  socialLinks: 'קישורים חברתיים',
  saveSocialLinks: 'שמור קישורים חברתיים',

  // Errors
  failedToPost: 'פרסום התגובה נכשל',
  failedToVote: 'ההצבעה נכשלה',
  failedToDelete: 'המחיקה נכשלה',
  failedToEdit: 'העריכה נכשלה',
  failedToBan: 'חסימת המשתמש נכשלה',
  failedToBlock: 'חסימת המשתמש נכשלה',
  failedToUnblock: 'ביטול חסימת המשתמש נכשל',
  failedToReport: 'הדיווח נכשל',
  failedToPin: 'נעיצת התגובה נכשלה',
  failedToFetchAuthMethods: 'אחזור שיטות אימות נכשל',
  failedToStartLogin: 'הפעלת התחברות נכשלה',
  failedToSendOtp: 'שליחת OTP נכשלה',

  // Error pages
  siteNotConfigured: 'האתר לא הוגדר',
  siteNotConfiguredMessage:
    'מפתח API זה אינו משויך לאתר שהוגדר. בקר ב-usethreadkit.com/sites כדי להשלים את ההגדרה.',
  invalidApiKey: 'מפתח API לא חוקי',
  invalidApiKeyMessage:
    'מפתח ה-API שסופק אינו חוקי או שבוטל. בדוק את לוח המחוונים שלך עבור המפתח הנכון.',
  rateLimited: 'קצב מוגבל',
  rateLimitedMessage: 'יותר מדי בקשות. אנא המתן רגע ונסה שוב.',
  failedToLoadComments: 'טעינת התגובות נכשלה',
  tryAgainLater: 'נסה שוב מאוחר יותר.',

  // Branding
  poweredByThreadKit: 'מופעל על ידי ThreadKit',

  // Real-time updates
  loadNewComments: 'טען תגובות חדשות',
  loadNewReplies: 'טען תשובות חדשות',
  isTyping: 'כותב...',
  },
};
