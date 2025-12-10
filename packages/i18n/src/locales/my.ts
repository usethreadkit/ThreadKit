import type { LocaleMetadata } from '@threadkit/core';

/**
 * Burmese translations
 */
export const my: LocaleMetadata = {
  code: 'my',
  rtl: false,
  translations: {
  // Common actions
  post: 'တင်ရန်',
  cancel: 'မလုပ်တော့ပါ',
  save: 'သိမ်းရန်',
  edit: 'ပြင်ရန်',
  delete: 'ဖျက်ရန်',
  reply: 'ပြန်ကြားရန်',
  report: 'တိုင်ကြားရန်',
  share: 'မျှဝေရန်',
  block: 'ပိတ်ပင်ရန်',
  unblock: 'ပြန်ဖွင့်ရန်',
  ban: 'ပိတ်ပင်ရန်',
  send: 'ပို့ရန်',
  verify: 'အတည်ပြုရန်',
  continue: 'ဆက်လုပ်ရန်',
  close: 'ပိတ်ရန်',
  submit: 'တင်သွင်းရန်',
  yes: 'ဟုတ်ကဲ့',
  no: 'မဟုတ်ပါ',
  prev: 'ရှေ့',
  next: 'နောက်',
  back: 'ပြန်သွားရန်',

  // Loading states
  loading: 'Loading...',
  loadingComments: 'မှတ်ချက်များ Loading...',
  posting: 'Posting...',
  signingInWith: 'Signing in with',

  // Empty states
  noComments: 'မှတ်ချက်မရှိသေးပါ။ ပထမဆုံးမှတ်ချက်ပေးသူဖြစ်ပါစေ!',
  noNotifications: 'အသိပေးချက်မရှိပါ',
  noBlockedUsers: 'ပိတ်ပင်ထားသော အသုံးပြုသူမရှိပါ',

  // Sorting
  sortedBy: 'စီ리즈ပုံစံ:',
  sortTop: 'ထိပ်တန်း',
  sortNew: 'အသစ်',
  sortControversial: 'အငြင်းပွားဖွယ်',
  sortOld: 'အဟောင်း',

  // Comment form
  writeComment: 'မှတ်ချက်ရေးရန်...',
  writeReply: 'ပြန်စာရေးရန်...',
  formattingHelp: 'အကူအညီ',
  markdownSupported: 'Markdown ထောက်ခံသည်',
  youType: 'သင်ရိုက်သည်:',
  youSee: 'သင်မြင်သည်:',

  // Voting
  upvote: 'ထောက်ခံ',
  downvote: 'ကန့်ကွက်',
  point: 'အမှတ်',
  points: 'အမှတ်များ',

  // Threading
  expandComment: 'မှတ်ချက်ဖွင့်ရန်',
  collapseComment: 'မှတ်ချက်ပိတ်ရန်',
  child: 'အုံ',
  children: 'အုံများ',

  // Badges
  pinned: 'ပင်ထိုးထားသည်',

  // Confirmations
  deleteConfirm: 'ဖျက်မည်လား?',
  blockConfirm: 'အသုံးပြုသူကို ပိတ်ပင်မည်လား?',
  banConfirm: 'အသုံးပြုသူကို ပိတ်ပင်မည်လား?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'နှောင့်ယှက်မှု',
  reportHateSpeech: 'မုန်းတီးစကား',
  reportMisinformation: 'သတင်းမှား',
  reportOther: 'အခြား',
  selectReason: 'အကြောင်းရင်းရွေးပါ...',
  reportSubmitted: 'ကျေးဇူးတင်ပါတယ်!',

  // Chat
  typeMessage: 'စာရိုက်ပါ...',
  signInToChat: 'စကားပြောရန် ဝင်ပါ',
  personOnline: 'အွန်လိုင်း',
  peopleOnline: 'အွန်လိုင်း',
  personTyping: 'စာရိုက်နေသည်...',
  peopleTyping: 'စာရိုက်နေကြသည်...',

  // Settings
  settings: 'ဆက်တင်များ',
  signIn: 'အကောင့်ဝင်ရန်',
  signOut: 'ထွက်ရန်',
  changeAvatar: 'Avatar ပြောင်းရန်',
  theme: 'Theme',
  blockedUsers: 'ပိတ်ပင်ထားသူများ',
  notifications: 'အသိပေးချက်များ',
  emailOnReplies: 'ပြန်စာလာလျှင် Email ပို့ပါ',
  emailOnMentions: 'ခေါ်ဆိုခံရလျှင် Email ပို့ပါ',
  weeklyDigest: 'အပတ်စဉ် အကျဉ်းချုပ်',
  deleteAccount: 'အကောင့်ဖျက်ရန်',
  accountDeleted: 'အကောင့်ဖျက်ပြီးပါပြီ',
  holdToDelete: 'အကောင့်ဖျက်ရန် ဖိထားပါ (15s)',
  holdForSeconds: '{seconds} စက္ကန့် ဖိထားပါ...',

  // Username
  usernameTaken: 'အသုံးပြုပြီး',
  usernameAvailable: 'ရနိုင်သည်',
  checking: 'စစ်ဆေးနေသည်...',
  chooseUsername: 'အသုံးပြုသူအမည် ရွေးချယ်ပါ',
  usernamePlaceholder: 'သင့်-အမည်',
  usernameHint: 'စာလုံး၊ ဂဏန်း၊ ခေါင်းစဉ်၊ အောက်မျဉ်းသာ (2-24 စာလုံး)',

  // Auth - general
  signInToVote: 'မဲပေးရန် လော့ဂ်အင်ဝင်ပါ',
  signInToPost: 'Post တင်ရန် ဝင်ပါ',
  signInLabel: 'ဝင်ရန်:',
  continueWith: 'ဆက်လုပ်မည်',
  chooseSignInMethod: 'ဝင်ရောက်နည်းရွေးပါ',

  // Auth - OTP (email/phone)
  enterEmail: 'Email ထည့်ပါ',
  enterPhone: 'ဖုန်းနံပါတ်ထည့်ပါ',
  sendCode: 'ကုဒ်ပို့ရန်',
  checkEmail: 'Email စစ်ပါ',
  checkPhone: 'ဖုန်းစစ်ပါ',
  enterCode: 'ကုဒ် ၆ လုံးထည့်ပါ',
  codeSentTo: 'ကုဒ်ပို့လိုက်သည်',
  invalidCode: 'ကုဒ်မှားနေသည်',
  verificationFailed: 'အတည်ပြုမရပါ',
  weWillSendCode: 'ကုဒ်ပို့ပေးပါမည်',
  emailPlaceholder: 'you@example.com',
  phonePlaceholder: '+95 9xx xxx xxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'ကြိုဆိုပါတယ်!',
  chooseDisplayName: 'အမည်ရွေးပါ',
  yourName: 'သင့်အမည်',

  // Auth - OAuth
  popupShouldOpen: 'Popup ပွင့်လာပါလိမ့်မည်',
  completingSignIn: 'အကောင့်ဝင်နေသည်',

  // Auth - Web3
  connectingTo: 'ချိတ်ဆက်နေသည်',

  // Auth - Anonymous
  guestNamePlaceholder: 'ဧည့်သည်',
  continueAsGuest: 'ဧည့်သည်အဖြစ် ဆက်လုပ်ပါ',
  guest: 'ဧည့်သည်',
  anonymous: 'အမည်ဝှက်',

  // User profile
  karma: 'Karma',
  comments: 'မှတ်ချက်များ',
  joined: 'ဝင်ရောက်ခဲ့သည်',

  // Time formatting
  justNow: 'ခုနက',
  minutesAgo: '{n} မိနစ်က',
  hoursAgo: '{n} နာရီက',
  daysAgo: '{n} ရက်က',

  // Notifications
  markAllRead: 'အားလုံးဖတ်ပြီးအဖြစ်မှတ်သားပါ',

  // Social Links
  socialLinks: 'လူမှုကွန်ယက်လင့်များ',
  saveSocialLinks: 'လူမှုကွန်ယက်လင့်များကိုသိမ်းဆည်းပါ',

  // Errors
  failedToPost: 'Post တင်မရပါ',
  failedToVote: 'Vote ပေးမရပါ',
  failedToDelete: 'ဖျက်မရပါ',
  failedToEdit: 'ပြင်မရပါ',
  failedToBan: 'Ban မရပါ',
  failedToBlock: 'Block မရပါ',
  failedToUnblock: 'Unblock မရပါ',
  failedToReport: 'Report မရပါ',
  failedToPin: 'Pin မရပါ',
  failedToFetchAuthMethods: 'Auth methods ယူမရပါ',
  failedToStartLogin: 'Login စမရပါ',
  failedToSendOtp: 'OTP ပို့မရပါ',

  // Error pages
  siteNotConfigured: 'Site မသတ်မှတ်ရသေးပါ',
  siteNotConfiguredMessage:
    'API key မှားယွင်းနေပါသည်။',
  invalidApiKey: 'API key မမှန်ပါ',
  invalidApiKeyMessage:
    'API key မှားနေသည် သို့မဟုတ် ပယ်ဖျက်ထားသည်။',
  rateLimited: 'Rate limited',
  rateLimitedMessage: 'Requests များလွန်းသည်။ ခဏစောင့်ပါ။',
  failedToLoadComments: 'Comments ယူမရပါ',
  tryAgainLater: 'နောက်မှပြန်ကြိုးစားပါ။',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',

  // Real-time updates
  loadNewComments: 'မှတ်ချက်အသစ်များ ဖွင့်ပါ',
  loadNewReplies: 'အကြောင်းပြန်အသစ်များ ဖွင့်ပါ',
  isTyping: 'ရိုက်နေသည်...',
  },
};