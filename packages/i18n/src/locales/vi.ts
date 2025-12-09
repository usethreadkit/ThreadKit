import type { TranslationStrings } from '@threadkit/core';

/**
 * Vietnamese translations
 */
export const vi: TranslationStrings = {
  // Common actions
  post: 'Đăng',
  cancel: 'Hủy',
  save: 'Lưu',
  edit: 'Sửa',
  delete: 'Xóa',
  reply: 'Trả lời',
  report: 'Báo cáo',
  share: 'Chia sẻ',
  block: 'Chặn',
  unblock: 'Bỏ chặn',
  ban: 'Cấm',
  send: 'Gửi',
  verify: 'Xác minh',
  continue: 'Tiếp tục',
  close: 'Đóng',
  submit: 'Gửi đi',
  yes: 'Có',
  no: 'Không',
  prev: 'Trước',
  next: 'Tiếp theo',
  back: 'Quay lại',

  // Loading states
  loading: 'Đang tải...',
  loadingComments: 'Đang tải bình luận...',
  posting: 'Đang đăng...',
  signingInWith: 'Đang đăng nhập bằng',

  // Empty states
  noComments: 'Chưa có bình luận nào. Hãy là người đầu tiên bình luận!',
  noNotifications: 'Chưa có thông báo nào',
  noBlockedUsers: 'Không có người dùng bị chặn',

  // Sorting
  sortedBy: 'Sắp xếp theo:',
  sortTop: 'Hàng đầu',
  sortNew: 'Mới nhất',
  sortControversial: 'Gây tranh cãi',
  sortOld: 'Cũ nhất',

  // Comment form
  writeComment: 'Viết bình luận...',
  writeReply: 'Viết trả lời...',
  formattingHelp: 'Trợ giúp định dạng',
  markdownSupported: 'Định dạng Markdown được hỗ trợ',
  youType: 'Bạn gõ:',
  youSee: 'Bạn thấy:',

  // Voting
  upvote: 'Bình chọn tăng',
  downvote: 'Bình chọn giảm',
  point: 'điểm',
  points: 'điểm',

  // Threading
  expandComment: 'Mở rộng bình luận',
  collapseComment: 'Thu gọn bình luận',
  child: 'con',
  children: 'con',

  // Badges
  pinned: 'Đã ghim',

  // Confirmations
  deleteConfirm: 'Xóa?',
  blockConfirm: 'Chặn người dùng?',
  banConfirm: 'Cấm người dùng?',

  // Report reasons
  reportSpam: 'Thư rác',
  reportHarassment: 'Quấy rối',
  reportHateSpeech: 'Phát ngôn gây thù ghét',
  reportMisinformation: 'Thông tin sai lệch',
  reportOther: 'Khác',
  selectReason: 'Chọn lý do...',
  reportSubmitted: 'Cảm ơn!',

  // Chat
  typeMessage: 'Nhập tin nhắn...',
  signInToChat: 'Đăng nhập để trò chuyện',
  personOnline: 'người trực tuyến',
  peopleOnline: 'người trực tuyến',
  personTyping: 'người đang gõ...',
  peopleTyping: 'người đang gõ...',

  // Settings
  settings: 'Cài đặt',
  signIn: 'Đăng nhập',
  signOut: 'Đăng xuất',
  changeAvatar: 'Thay đổi ảnh đại diện',
  theme: 'Chủ đề',
  blockedUsers: 'Người dùng bị chặn',
  notifications: 'Thông báo',
emailOnReplies: 'Email khi có trả lời',
emailOnMentions: 'Email khi được nhắc đến',
weeklyDigest: 'Tổng hợp hàng tuần',
deleteAccount: 'Xóa tài khoản',
accountDeleted: 'Tài khoản đã bị xóa',
holdToDelete: 'Giữ để xóa tài khoản (15s)',
holdForSeconds: 'Giữ thêm {seconds} giây...',

  // Username
  usernameTaken: 'Đã dùng',
  usernameAvailable: 'Có sẵn',
  checking: 'Đang kiểm tra...',
  chooseUsername: 'Chọn tên người dùng',
  usernamePlaceholder: 'tên-người-dùng-của-bạn',
  usernameHint: 'Chỉ chữ cái, số, dấu gạch ngang, gạch dưới (2-24 ký tự)',
// Auth - general
signInToVote: 'Đăng nhập để bình chọn',
  signInToPost: 'Đăng nhập để đăng bài',
signInLabel: 'Đăng nhập:',
continueWith: 'Tiếp tục với',
chooseSignInMethod: 'Chọn phương thức đăng nhập',

// Auth - OTP (email/phone)
enterEmail: 'Nhập email của bạn',
enterPhone: 'Nhập số điện thoại của bạn',
sendCode: 'Gửi mã',
checkEmail: 'Kiểm tra email của bạn',
checkPhone: 'Kiểm tra điện thoại của bạn',
enterCode: 'Nhập mã 6 chữ số chúng tôi đã gửi đến',
codeSentTo: 'Mã đã gửi đến',
invalidCode: 'Mã không hợp lệ',
verificationFailed: 'Xác minh thất bại',
weWillSendCode: "Chúng tôi sẽ gửi cho bạn một mã để đăng nhập",
emailPlaceholder: 'bạn@example.com',
phonePlaceholder: '+84 xxx xxx xxxx',
otpPlaceholder: '000000',

// Auth - name input
welcome: 'Chào mừng!',
chooseDisplayName: 'Chọn tên hiển thị cho tài khoản của bạn',
yourName: 'Tên của bạn',

// Auth - OAuth
popupShouldOpen: 'Một cửa sổ bật lên sẽ mở ra',
completingSignIn: 'Hoàn tất đăng nhập bằng',

  // Auth - Web3
  connectingTo: 'Đang kết nối với',

  // Auth - Anonymous
  guestNamePlaceholder: 'Khách',
  continueAsGuest: 'Tiếp tục với tư cách khách',
  guest: 'Khách',
  anonymous: 'Ẩn danh',

  // User profile
  karma: 'Karma',
comments: 'Bình luận',
joined: 'Tham gia',

// Time formatting
justNow: 'vừa xong',
minutesAgo: '{n} phút trước',
hoursAgo: '{n} giờ trước',
daysAgo: '{n} ngày trước',

// Notifications
  markAllRead: 'Đánh dấu tất cả đã đọc',

  // Social Links
  socialLinks: 'Liên kết xã hội',
  saveSocialLinks: 'Lưu liên kết xã hội',
// Errors
failedToPost: 'Không thể đăng bình luận',
failedToVote: 'Không thể bình chọn',
failedToDelete: 'Không thể xóa',
failedToEdit: 'Không thể chỉnh sửa',
failedToBan: 'Không thể cấm người dùng',
failedToBlock: 'Không thể chặn người dùng',
failedToUnblock: 'Không thể bỏ chặn người dùng',
failedToReport: 'Không thể báo cáo',
failedToPin: 'Không thể ghim',
failedToFetchAuthMethods: 'Không thể lấy phương thức xác thực',
failedToStartLogin: 'Không thể bắt đầu đăng nhập',
failedToSendOtp: 'Không thể gửi OTP',

// Error pages
siteNotConfigured: 'Trang web chưa được cấu hình',
siteNotConfiguredMessage:
'Khóa API này không được liên kết với một trang web đã cấu hình. Truy cập usethreadkit.com/sites để hoàn tất thiết lập của bạn.',
invalidApiKey: 'Khóa API không hợp lệ',
invalidApiKeyMessage:
'Khóa API được cung cấp không hợp lệ hoặc đã bị thu hồi. Kiểm tra bảng điều khiển của bạn để biết khóa chính xác.',
rateLimited: 'Giới hạn tốc độ',
rateLimitedMessage: 'Quá nhiều yêu cầu. Vui lòng đợi một lát và thử lại.',
failedToLoadComments: 'Không thể tải bình luận',
tryAgainLater: 'Vui lòng thử lại sau.',

// Branding
poweredByThreadKit: 'Được cung cấp bởi ThreadKit',

  // Real-time updates
  loadNewComments: 'Tải bình luận mới',
  loadNewReplies: 'Tải câu trả lời mới',
  isTyping: 'đang nhập...',
};