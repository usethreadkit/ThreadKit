import type { LocaleMetadata } from '@threadkit/core';

/**
 * Korean translations
 */
export const ko: LocaleMetadata = {
  code: 'ko',
  rtl: false,
  translations: {
  // Common actions
  post: '게시',
  cancel: '취소',
  save: '저장',
  edit: '수정',
  delete: '삭제',
  reply: '답글',
  report: '신고',
  share: '공유',
  block: '차단',
  unblock: '차단 해제',
  ban: '차단',
  send: '보내기',
  verify: '확인',
  continue: '계속',
  close: '닫기',
  submit: '제출',
  yes: '예',
  no: '아니오',
  prev: '이전',
  next: '다음',
  back: '뒤로',

  // Loading states
  loading: '로딩 중...',
  loadingComments: '댓글 로딩 중...',
  posting: '게시 중...',
  signingInWith: '로그인 중',

  // Empty states
  noComments: '아직 댓글이 없습니다. 첫 번째로 댓글을 달아보세요!',
  noNotifications: '알림이 없습니다',
  noBlockedUsers: '차단된 사용자가 없습니다',

  // Sorting
  sortedBy: '정렬:',
  sortTop: '인기순',
  sortNew: '최신순',
  sortControversial: '논쟁순',
  sortOld: '오래된순',

  // Comment form
  writeComment: '댓글을 작성하세요...',
  writeReply: '답글을 작성하세요...',
  formattingHelp: '서식 도움말',
  markdownSupported: 'Markdown 서식이 지원됩니다',
  youType: '입력:',
  youSee: '결과:',

  // Voting
  upvote: '추천',
  downvote: '비추천',
  point: '점',
  points: '점',

  // Threading
  expandComment: '댓글 펼치기',
  collapseComment: '댓글 접기',
  child: '개 답글',
  children: '개 답글',

  // Badges
  pinned: '고정됨',

  // Confirmations
  deleteConfirm: '삭제하시겠습니까?',
  blockConfirm: '사용자를 차단하시겠습니까?',
  banConfirm: '사용자를 차단하시겠습니까?',

  // Report reasons
  reportSpam: '스팸',
  reportHarassment: '괴롭힘',
  reportHateSpeech: '혐오 발언',
  reportMisinformation: '허위 정보',
  reportOther: '기타',
  selectReason: '이유 선택...',
  reportSubmitted: '감사합니다!',

  // Chat
  typeMessage: '메시지를 입력하세요...',
  signInToChat: '로그인하여 채팅',
  personOnline: '명 온라인',
  peopleOnline: '명 온라인',
  personTyping: '명이 입력 중...',
  peopleTyping: '명이 입력 중...',

  // Settings
  settings: '설정',
  signIn: '로그인',
  signOut: '로그아웃',
  changeAvatar: '아바타 변경',
  theme: '테마',
  blockedUsers: '차단된 사용자',
  notifications: '알림',
  emailOnReplies: '답글 시 이메일',
  emailOnMentions: '멘션 시 이메일',
  weeklyDigest: '주간 요약',
  deleteAccount: '계정 삭제',
  accountDeleted: '계정이 삭제되었습니다',
  holdToDelete: '길게 눌러 계정 삭제 (15초)',
  holdForSeconds: '{seconds}초 더 누르세요...',

  // Keyboard navigation
  keyboardNavigation: '키보드 탐색',
  enableKeyboardShortcuts: '키보드 단축키 활성화',
  key: '키',
  action: '동작',
  nextComment: '다음 댓글',
  previousComment: '이전 댓글',
  focusCommentInput: '입력 포커스',
  editFocusedComment: '댓글 편집',
  replyToFocusedComment: '답글',
  deleteFocusedComment: '댓글 삭제',
  collapseFocusedComment: '접기',
  expandFocusedComment: '펼치기',
  upvoteFocusedComment: '추천',
  downvoteFocusedComment: '비추천',
  confirmYesNo: '예/아니오 확인',
  cancelClose: '취소/닫기',

  // Username
  usernameTaken: '사용 중',
  usernameAvailable: '사용 가능',
  checking: '확인 중...',
  chooseUsername: '사용자 이름 선택',
  usernamePlaceholder: '사용자-이름',
  usernameHint: '문자, 숫자, 하이픈, 밑줄만 사용 가능 (2-24자)',

  // Auth - general
  signInToVote: '투표하려면 로그인',
  signInToPost: '로그인하여 게시',
  signInLabel: '로그인:',
  continueWith: '계속',
  chooseSignInMethod: '로그인 방법을 선택하세요',

  // Auth - OTP (email/phone)
  enterEmail: '이메일을 입력하세요',
  enterPhone: '전화번호를 입력하세요',
  sendCode: '코드 보내기',
  checkEmail: '이메일을 확인하세요',
  checkPhone: '전화를 확인하세요',
  enterCode: '전송된 6자리 코드를 입력하세요',
  codeSentTo: '코드가 전송되었습니다',
  invalidCode: '잘못된 코드',
  verificationFailed: '확인 실패',
  weWillSendCode: '로그인을 위한 코드를 보내드립니다',
  emailPlaceholder: 'example@example.com',
  phonePlaceholder: '+82 10 1234 5678',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: '환영합니다!',
  chooseDisplayName: '계정에 표시할 이름을 선택하세요',
  yourName: '이름',

  // Auth - OAuth
  popupShouldOpen: '팝업 창이 열렸어야 합니다',
  completingSignIn: '로그인 완료 중',

  // Auth - Web3
  connectingTo: '연결 중',

  // Auth - Anonymous
  guestNamePlaceholder: '게스트',
  continueAsGuest: '게스트로 계속',
  guest: '게스트',
  anonymous: '익명',

  // User profile
  karma: '카르마',
  comments: '댓글',
  joined: '가입일',

  // Time formatting
  justNow: '방금',
  minutesAgo: '{n}분 전',
  hoursAgo: '{n}시간 전',
  daysAgo: '{n}일 전',

  // Notifications
  markAllRead: '모두 읽음으로 표시',

  // Social Links
  socialLinks: '소셜 링크',
  saveSocialLinks: '소셜 링크 저장',

  // Errors
  failedToPost: '댓글 게시 실패',
  failedToVote: '투표 실패',
  failedToDelete: '삭제 실패',
  failedToEdit: '수정 실패',
  failedToBan: '사용자 차단 실패',
  failedToBlock: '사용자 차단 실패',
  failedToUnblock: '차단 해제 실패',
  failedToReport: '신고 실패',
  failedToPin: '고정 실패',
  failedToFetchAuthMethods: '인증 방법 가져오기 실패',
  failedToStartLogin: '로그인 시작 실패',
  failedToSendOtp: '코드 전송 실패',

  // Error pages
  siteNotConfigured: '사이트가 구성되지 않았습니다',
  siteNotConfiguredMessage:
    '이 API 키는 구성된 사이트와 연결되어 있지 않습니다. usethreadkit.com/sites에서 설정을 완료하세요.',
  invalidApiKey: '잘못된 API 키',
  invalidApiKeyMessage:
    '제공된 API 키가 유효하지 않거나 취소되었습니다. 대시보드에서 올바른 키를 확인하세요.',
  rateLimited: '요청 제한',
  rateLimitedMessage: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.',
  failedToLoadComments: '댓글 로드 실패',
  tryAgainLater: '나중에 다시 시도하세요.',

  // Branding
  poweredByThreadKit: 'Powered by ThreadKit',

  // Real-time updates
  loadNewComments: '새 댓글 불러오기',
  loadNewReplies: '새 답글 불러오기',
  isTyping: '입력 중...',
  },
};
