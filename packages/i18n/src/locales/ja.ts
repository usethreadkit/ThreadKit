import type { LocaleMetadata } from '@threadkit/core';

/**
 * Japanese translations
 */
export const ja: LocaleMetadata = {
  code: 'ja',
  rtl: false,
  translations: {
  // Common actions
  post: '投稿',
  cancel: 'キャンセル',
  save: '保存',
  edit: '編集',
  delete: '削除',
  reply: '返信',
  report: '報告',
  share: '共有',
  block: 'ブロック',
  unblock: 'ブロック解除',
  ban: 'BAN',
  send: '送信',
  verify: '確認',
  continue: '続ける',
  close: '閉じる',
  submit: '送信',
  yes: 'はい',
  no: 'いいえ',
  prev: '前へ',
  next: '次へ',
  back: '戻る',

  // Loading states
  loading: '読み込み中...',
  loadingComments: 'コメントを読み込み中...',
  posting: '投稿中...',
  signingInWith: 'でログイン中',

  // Empty states
  noComments: 'コメントはまだありません。最初のコメントを投稿しましょう！',
  noNotifications: '通知はまだありません',
  noBlockedUsers: 'ブロックしたユーザーはいません',

  // Sorting
  sortedBy: '並び替え:',
  sortTop: '人気',
  sortNew: '新着',
  sortControversial: '物議',
  sortOld: '古い順',

  // Comment form
  writeComment: 'コメントを書く...',
  writeReply: '返信を書く...',
  formattingHelp: '書式ヘルプ',
  markdownSupported: 'Markdown記法が使えます',
  youType: '入力:',
  youSee: '表示:',

  // Voting
  upvote: '賛成',
  downvote: '反対',
  point: 'ポイント',
  points: 'ポイント',

  // Threading
  expandComment: 'コメントを展開',
  collapseComment: 'コメントを折りたたむ',
  child: '返信',
  children: '返信',

  // Badges
  pinned: '固定',

  // Confirmations
  deleteConfirm: '削除しますか？',
  blockConfirm: 'ユーザーをブロックしますか？',
  banConfirm: 'ユーザーをBANしますか？',

  // Report reasons
  reportSpam: 'スパム',
  reportHarassment: '嫌がらせ',
  reportHateSpeech: 'ヘイトスピーチ',
  reportMisinformation: '誤情報',
  reportOther: 'その他',
  selectReason: '理由を選択...',
  reportSubmitted: 'ありがとうございます！',

  // Chat
  typeMessage: 'メッセージを入力...',
  signInToChat: 'ログインしてチャット',
  personOnline: '人がオンライン',
  peopleOnline: '人がオンライン',
  personTyping: '人が入力中...',
  peopleTyping: '人が入力中...',

  // Settings
  settings: '設定',
  signIn: 'ログイン',
  signOut: 'ログアウト',
  changeAvatar: 'アバターを変更',
  theme: 'テーマ',
  blockedUsers: 'ブロックしたユーザー',
  notifications: '通知',
  emailOnReplies: '返信時にメール',
  emailOnMentions: 'メンション時にメール',
  weeklyDigest: '週間ダイジェスト',
  deleteAccount: 'アカウント削除',
  accountDeleted: 'アカウントが削除されました',
  holdToDelete: '長押しで削除（15秒）',
  holdForSeconds: 'あと{seconds}秒長押し...',

  // Keyboard navigation
  keyboardNavigation: 'キーボードナビゲーション',
  enableKeyboardShortcuts: 'キーボードショートカットを有効にする',
  key: 'キー',
  action: 'アクション',
  nextComment: '次のコメント',
  previousComment: '前のコメント',
  focusCommentInput: '入力欄にフォーカス',
  editFocusedComment: 'コメントを編集',
  replyToFocusedComment: '返信',
  deleteFocusedComment: 'コメントを削除',
  collapseFocusedComment: '折りたたむ',
  expandFocusedComment: '展開',
  upvoteFocusedComment: '賛成票',
  downvoteFocusedComment: '反対票',
  confirmYesNo: 'はい/いいえを確認',
  cancelClose: 'キャンセル/閉じる',

  // Username
  usernameTaken: '使用済み',
  usernameAvailable: '利用可能',
  checking: '確認中...',
  chooseUsername: 'ユーザー名を選択',
  usernamePlaceholder: 'あなたのユーザー名',
  usernameHint: '文字、数字、ハイフン、アンダースコアのみ (2-24文字)',

  // Auth - general
  signInToVote: '投票するにはログイン',
  signInToPost: 'ログインして投稿',
  signInLabel: 'ログイン:',
  continueWith: 'で続ける',
  chooseSignInMethod: 'ログイン方法を選択',

  // Auth - OTP (email/phone)
  enterEmail: 'メールアドレスを入力',
  enterPhone: '電話番号を入力',
  sendCode: 'コードを送信',
  checkEmail: 'メールを確認',
  checkPhone: '電話を確認',
  enterCode: '送信した6桁のコードを入力:',
  codeSentTo: 'コードを送信しました:',
  invalidCode: '無効なコード',
  verificationFailed: '確認に失敗しました',
  weWillSendCode: 'ログイン用のコードを送信します',
  emailPlaceholder: 'example@example.com',
  phonePlaceholder: '+81 90 1234 5678',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'ようこそ！',
  chooseDisplayName: 'アカウントの表示名を選択してください',
  yourName: 'お名前',

  // Auth - OAuth
  popupShouldOpen: 'ポップアップウィンドウが開きます',
  completingSignIn: 'でログイン完了中',

  // Auth - Web3
  connectingTo: 'に接続中',

  // Auth - Anonymous
  guestNamePlaceholder: 'ゲスト',
  continueAsGuest: 'ゲストとして続ける',
  guest: 'ゲスト',
  anonymous: '匿名',

  // User profile
  karma: 'カルマ',
  comments: 'コメント',
  joined: '登録日',

  // Time formatting
  justNow: 'たった今',
  minutesAgo: '{n}分前',
  hoursAgo: '{n}時間前',
  daysAgo: '{n}日前',

  // Notifications
  markAllRead: 'すべて既読にする',

  // Social Links
  socialLinks: 'ソーシャルリンク',
  saveSocialLinks: 'ソーシャルリンクを保存',

  // Errors
  failedToPost: 'コメントの投稿に失敗しました',
  failedToVote: '投票に失敗しました',
  failedToDelete: '削除に失敗しました',
  failedToEdit: '編集に失敗しました',
  failedToBan: 'ユーザーのBANに失敗しました',
  failedToBlock: 'ユーザーのブロックに失敗しました',
  failedToUnblock: 'ユーザーのブロック解除に失敗しました',
  failedToReport: '報告に失敗しました',
  failedToPin: '固定に失敗しました',
  failedToFetchAuthMethods: '認証方法の取得に失敗しました',
  failedToStartLogin: 'ログインの開始に失敗しました',
  failedToSendOtp: 'コードの送信に失敗しました',

  // Error pages
  siteNotConfigured: 'サイトが設定されていません',
  siteNotConfiguredMessage:
    'このAPIキーは設定されたサイトに関連付けられていません。usethreadkit.com/sitesで設定を完了してください。',
  invalidApiKey: '無効なAPIキー',
  invalidApiKeyMessage:
    '提供されたAPIキーは無効か、取り消されています。正しいキーについてはダッシュボードを確認してください。',
  rateLimited: 'レート制限',
  rateLimitedMessage: 'リクエストが多すぎます。しばらく待ってから再度お試しください。',
  failedToLoadComments: 'コメントの読み込みに失敗しました',
  tryAgainLater: '後でもう一度お試しください。',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',

  // Real-time updates
  loadNewComments: '新しいコメントを読み込む',
  loadNewReplies: '新しい返信を読み込む',
  isTyping: '入力中...',
  },
};
