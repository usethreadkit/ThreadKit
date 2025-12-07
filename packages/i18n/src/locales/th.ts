import type { TranslationStrings } from '@threadkit/core';

/**
 * Thai translations
 */
export const th: TranslationStrings = {
  // Common actions
  post: 'โพสต์',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  edit: 'แก้ไข',
  delete: 'ลบ',
  reply: 'ตอบกลับ',
  report: 'รายงาน',
  share: 'แชร์',
  block: 'บล็อก',
  unblock: 'เลิกบล็อก',
  ban: 'แบน',
  send: 'ส่ง',
  verify: 'ยืนยัน',
  continue: 'ดำเนินการต่อ',
  close: 'ปิด',
  submit: 'ส่ง',
  yes: 'ใช่',
  no: 'ไม่',
  prev: 'ก่อนหน้า',
  next: 'ถัดไป',
  back: 'ย้อนกลับ',

  // Loading states
  loading: 'กำลังโหลด...',
  loadingComments: 'กำลังโหลดความคิดเห็น...',
  posting: 'กำลังโพสต์...',
  signingInWith: 'กำลังเข้าสู่ระบบด้วย',

  // Empty states
  noComments: 'ยังไม่มีความคิดเห็น. เป็นคนแรกที่แสดงความคิดเห็น!',
  noNotifications: 'ไม่มีการแจ้งเตือน',
  noBlockedUsers: 'ไม่มีผู้ใช้ที่ถูกบล็อก',

  // Sorting
  sortedBy: 'จัดเรียงโดย:',
  sortTop: 'ยอดนิยม',
  sortNew: 'ใหม่ล่าสุด',
  sortControversial: 'เป็นที่ถกเถียง',
  sortOld: 'เก่าที่สุด',

  // Comment form
  writeComment: 'เขียนความคิดเห็น...',
  writeReply: 'เขียนตอบกลับ...',
  formattingHelp: 'ความช่วยเหลือในการจัดรูปแบบ',
  markdownSupported: 'รองรับการจัดรูปแบบ Markdown',
  youType: 'คุณพิมพ์:',
  youSee: 'คุณเห็น:',

  // Voting
  upvote: 'โหวตขึ้น',
  downvote: 'โหวตลง',
  point: 'คะแนน',
  points: 'คะแนน',

  // Threading
  expandComment: 'ขยายความคิดเห็น',
  collapseComment: 'ยุบความคิดเห็น',
  child: 'คำตอบ',
  children: 'คำตอบ',

  // Badges
  pinned: 'ปักหมุด',

  // Confirmations
  deleteConfirm: 'ลบ?',
  blockConfirm: 'บล็อกผู้ใช้?',
  banConfirm: 'แบนผู้ใช้?',

  // Report reasons
  reportSpam: 'สแปม',
  reportHarassment: 'การคุกคาม',
  reportHateSpeech: 'คำพูดแสดงความเกลียดชัง',
  reportMisinformation: 'ข้อมูลบิดเบือน',
  reportOther: 'อื่นๆ',
  selectReason: 'เลือกเหตุผล...',
  reportSubmitted: 'ขอบคุณ!',

  // Chat
  typeMessage: 'พิมพ์ข้อความ...',
  signInToChat: 'เข้าสู่ระบบเพื่อสนทนา',
  personOnline: 'คนออนไลน์',
  peopleOnline: 'คนออนไลน์',
  personTyping: 'คนกำลังพิมพ์...',
  peopleTyping: 'คนกำลังพิมพ์...',

  // Settings
  settings: 'การตั้งค่า',
  signIn: 'เข้าสู่ระบบ',
  signOut: 'ออกจากระบบ',
  changeAvatar: 'เปลี่ยนรูปโปรไฟล์',
  theme: 'ธีม',
  blockedUsers: 'ผู้ใช้ที่ถูกบล็อก',
  notifications: 'การแจ้งเตือน',
  emailOnReplies: 'อีเมลเมื่อมีการตอบกลับ',
  emailOnMentions: 'อีเมลเมื่อมีการกล่าวถึง',
  weeklyDigest: 'สรุปรายสัปดาห์',
  deleteAccount: 'ลบบัญชี',
  accountDeleted: 'ลบบัญชีแล้ว',
  holdToDelete: 'กดค้างไว้เพื่อลบบัญชี (15วิ)',
  holdForSeconds: 'กดค้างไว้ต่ออีก {seconds} วินาที...',

  // Username
  usernameTaken: 'ไม่ว่าง',
  usernameAvailable: 'ว่าง',
  checking: 'กำลังตรวจสอบ...',

  // Auth - general
  signInToPost: 'เข้าสู่ระบบเพื่อโพสต์',
  signInLabel: 'เข้าสู่ระบบ:',
  continueWith: 'ดำเนินการต่อด้วย',
  chooseSignInMethod: 'เลือกวิธีการเข้าสู่ระบบ',

  // Auth - OTP (email/phone)
  enterEmail: 'ป้อนอีเมลของคุณ',
  enterPhone: 'ป้อนหมายเลขโทรศัพท์ของคุณ',
  sendCode: 'ส่งรหัส',
  checkEmail: 'ตรวจสอบอีเมลของคุณ',
  checkPhone: 'ตรวจสอบโทรศัพท์ของคุณ',
  enterCode: 'ป้อนรหัส 6 หลักที่เราส่งไปที่',
  codeSentTo: 'รหัสถูกส่งไปยัง',
  invalidCode: 'รหัสไม่ถูกต้อง',
  verificationFailed: 'การยืนยันล้มเหลว',
  weWillSendCode: 'เราจะส่งรหัสให้คุณเพื่อเข้าสู่ระบบ',
  emailPlaceholder: 'คุณ@example.com',
  phonePlaceholder: '+66 8x xxxx xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'ยินดีต้อนรับ!',
  chooseDisplayName: 'เลือกชื่อที่แสดงสำหรับบัญชีของคุณ',
  yourName: 'ชื่อของคุณ',

  // Auth - OAuth
  popupShouldOpen: 'หน้าต่างป๊อปอัพควรจะเปิดขึ้น',
  completingSignIn: 'กำลังดำเนินการเข้าสู่ระบบด้วย',

  // Auth - Web3
  connectingTo: 'กำลังเชื่อมต่อกับ',

  // User profile
  karma: 'กรรม',
  comments: 'ความคิดเห็น',
  joined: 'เข้าร่วมเมื่อ',

  // Time formatting
  justNow: 'เมื่อสักครู่',
  minutesAgo: '{n} นาทีที่แล้ว',
  hoursAgo: '{n} ชั่วโมงที่แล้ว',
  daysAgo: '{n} วันที่แล้ว',

  // Notifications
  markAllRead: 'ทำเครื่องหมายว่าอ่านแล้วทั้งหมด',

  // Social Links
  socialLinks: 'ลิงก์โซเชียล',
  saveSocialLinks: 'บันทึกลิงก์โซเชียล',

  // Errors
  failedToPost: 'โพสต์ความคิดเห็นล้มเหลว',
  failedToVote: 'โหวตล้มเหลว',
  failedToDelete: 'ล้มเหลวในการลบ',
  failedToEdit: 'แก้ไขล้มเหลว',
  failedToBan: 'แบนผู้ใช้ล้มเหลว',
  failedToBlock: 'บล็อกผู้ใช้ล้มเหลว',
  failedToUnblock: 'เลิกบล็อกผู้ใช้ล้มเหลว',
  failedToReport: 'รายงานล้มเหลว',
  failedToPin: 'ปักหมุดล้มเหลว',
  failedToFetchAuthMethods: 'เรียกวิธีการรับรองความถูกต้องล้มเหลว',
  failedToStartLogin: 'เริ่มเข้าสู่ระบบล้มเหลว',
  failedToSendOtp: 'ส่ง OTP ล้มเหลว',

  // Error pages
  siteNotConfigured: 'ไซต์ไม่ได้รับการกำหนดค่า',
  siteNotConfiguredMessage:
    'คีย์ API นี้ไม่ได้เชื่อมโยงกับไซต์ที่กำหนดค่าไว้ โปรดเยี่ยมชม usethreadkit.com/dashboard เพื่อดำเนินการตั้งค่าของคุณให้เสร็จสมบูรณ์',
  invalidApiKey: 'คีย์ API ไม่ถูกต้อง',
  invalidApiKeyMessage:
    'คีย์ API ที่ให้มาไม่ถูกต้องหรือถูกเพิกถอนแล้ว โปรดตรวจสอบแดชบอร์ดของคุณสำหรับคีย์ที่ถูกต้อง',
  rateLimited: 'จำกัดอัตรา',
  rateLimitedMessage: 'มีการร้องขอมากเกินไป โปรดรอสักครู่แล้วลองอีกครั้ง',
  failedToLoadComments: 'โหลดความคิดเห็นล้มเหลว',
  tryAgainLater: 'โปรดลองอีกครั้งในภายหลัง',

  // Branding
  poweredByThreadKit: 'ขับเคลื่อนโดย ThreadKit',
};
