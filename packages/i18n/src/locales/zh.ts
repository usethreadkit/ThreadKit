import type { LocaleMetadata } from '@threadkit/core';

/**
 * Chinese (Simplified) translations
 */
export const zh: LocaleMetadata = {
  code: 'zh',
  rtl: false,
  translations: {
  // Common actions
  post: '发布',
  cancel: '取消',
  save: '保存',
  edit: '编辑',
  delete: '删除',
  reply: '回复',
  report: '举报',
  share: '分享',
  block: '屏蔽',
  unblock: '取消屏蔽',
  ban: '封禁',
  send: '发送',
  verify: '验证',
  continue: '继续',
  close: '关闭',
  submit: '提交',
  yes: '是',
  no: '否',
  prev: '上一个',
  next: '下一个',
  back: '返回',

  // Loading states
  loading: '加载中...',
  loadingComments: '加载评论中...',
  posting: '发布中...',
  signingInWith: '正在登录',

  // Empty states
  noComments: '暂无评论，成为第一个评论者吧！',
  noNotifications: '暂无通知',
  noBlockedUsers: '没有屏蔽的用户',

  // Sorting
  sortedBy: '排序方式：',
  sortTop: '热门',
  sortNew: '最新',
  sortControversial: '争议',
  sortOld: '最早',

  // Comment form
  writeComment: '写一条评论...',
  writeReply: '写一条回复...',
  formattingHelp: '格式帮助',
  markdownSupported: '支持Markdown格式',
  youType: '你输入：',
  youSee: '你看到：',

  // Voting
  upvote: '赞同',
  downvote: '反对',
  point: '分',
  points: '分',

  // Threading
  expandComment: '展开评论',
  collapseComment: '折叠评论',
  child: '条回复',
  children: '条回复',

  // Badges
  pinned: '置顶',

  // Confirmations
  deleteConfirm: '确定删除？',
  blockConfirm: '确定屏蔽该用户？',
  banConfirm: '确定封禁该用户？',

  // Report reasons
  reportSpam: '垃圾信息',
  reportHarassment: '骚扰',
  reportHateSpeech: '仇恨言论',
  reportMisinformation: '虚假信息',
  reportOther: '其他',
  selectReason: '选择原因...',
  reportSubmitted: '感谢反馈！',

  // Chat
  typeMessage: '输入消息...',
  signInToChat: '登录后聊天',
  personOnline: '人在线',
  peopleOnline: '人在线',
  personTyping: '人正在输入...',
  peopleTyping: '人正在输入...',

  // Settings
  settings: '设置',
  signIn: '登录',
  signOut: '退出登录',
  changeAvatar: '更换头像',
  theme: '主题',
  blockedUsers: '已屏蔽用户',
  notifications: '通知',
  emailOnReplies: '收到回复时发送邮件',
  emailOnMentions: '被提及时发送邮件',
  weeklyDigest: '每周摘要',
  deleteAccount: '删除账户',
  accountDeleted: '账户已删除',
  holdToDelete: '长按删除账户（15秒）',
  holdForSeconds: '再按住{seconds}秒...',

  // Keyboard navigation
  keyboardNavigation: '键盘导航',
  enableKeyboardShortcuts: '启用键盘快捷键',
  key: '按键',
  action: '操作',
  nextComment: '下一条评论',
  previousComment: '上一条评论',
  focusCommentInput: '聚焦输入框',
  editFocusedComment: '编辑评论',
  replyToFocusedComment: '回复',
  deleteFocusedComment: '删除评论',
  upvoteFocusedComment: '点赞',
  downvoteFocusedComment: '点踩',
  toggleCollapseFocusedComment: '切换折叠',
  confirmYesNo: '确认是/否',
  cancelClose: '取消/关闭',

  // Username
  usernameTaken: '已被占用',
  usernameAvailable: '可用',
  checking: '正在检查...',
  chooseUsername: '选择用户名',
  usernamePlaceholder: '您的用户名',
  usernameHint: '只能使用字母、数字、连字符和下划线（2-24 个字符）',

  // Auth - general
  signInToVote: '登录以投票',
  signInToPost: '登录后发布',
  signInLabel: '登录：',
  continueWith: '使用',
  chooseSignInMethod: '选择登录方式',

  // Auth - OTP (email/phone)
  enterEmail: '输入邮箱',
  sendCode: '发送验证码',
  checkEmail: '查看邮箱',
  enterCode: '输入发送到以下地址的6位验证码',
  codeSentTo: '验证码已发送至',
  invalidCode: '验证码无效',
  verificationFailed: '验证失败',
  weWillSendCode: '我们将发送验证码以完成登录',
  emailPlaceholder: 'example@example.com',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: '欢迎！',
  chooseDisplayName: '为您的账户选择一个显示名称',
  yourName: '您的名字',

  // Auth - OAuth
  popupShouldOpen: '弹出窗口应该已经打开',
  completingSignIn: '正在完成登录',

  // Auth - Web3
  connectingTo: '正在连接',

  // Auth - Anonymous
  guestNamePlaceholder: '访客',
  continueAsGuest: '以访客身份继续',
  guest: '访客',
  anonymous: '匿名',

  // User profile
  karma: '声望',
  comments: '评论',
  joined: '加入于',

  // Time formatting
  justNow: '刚刚',
  minutesAgo: '{n}分钟前',
  hoursAgo: '{n}小时前',
  daysAgo: '{n}天前',

  // Notifications
  markAllRead: '全部标记为已读',

  // Social Links
  socialLinks: '社交链接',
  saveSocialLinks: '保存社交链接',

  // Errors
  failedToPost: '发布评论失败',
  failedToVote: '投票失败',
  failedToDelete: '删除失败',
  failedToEdit: '编辑失败',
  failedToBan: '封禁用户失败',
  failedToBlock: '屏蔽用户失败',
  failedToUnblock: '取消屏蔽失败',
  failedToReport: '举报失败',
  failedToPin: '置顶失败',
  failedToFetchAuthMethods: '获取登录方式失败',
  failedToStartLogin: '开始登录失败',
  failedToSendOtp: '发送验证码失败',

  // Error pages
  siteNotConfigured: '网站未配置',
  siteNotConfiguredMessage:
    '此API密钥未关联已配置的网站。请访问usethreadkit.com/sites完成设置。',
  invalidApiKey: 'API密钥无效',
  invalidApiKeyMessage:
    '提供的API密钥无效或已被撤销。请在控制面板中查看正确的密钥。',
  rateLimited: '请求过于频繁',
  rateLimitedMessage: '请求过多，请稍后再试。',
  failedToLoadComments: '加载评论失败',
  tryAgainLater: '请稍后再试。',

  // Branding
  poweredByThreadKit: '由 ThreadKit 提供支持',

  // Real-time updates
  loadNewComments: '加载新评论',
  loadNewReplies: '加载新回复',
  isTyping: '正在输入...',
  },
};
