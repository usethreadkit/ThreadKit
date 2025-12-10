import type { LocaleMetadata } from '@threadkit/core';

/**
 * Turkish translations
 */
export const tr: LocaleMetadata = {
  code: 'tr',
  rtl: false,
  translations: {
  // Common actions
  post: 'Yayınla',
  cancel: 'İptal',
  save: 'Kaydet',
  edit: 'Düzenle',
  delete: 'Sil',
  reply: 'Yanıtla',
  report: 'Bildir',
  share: 'Paylaş',
  block: 'Engelle',
  unblock: 'Engeli Kaldır',
  ban: 'Yasakla',
  send: 'Gönder',
  verify: 'Doğrula',
  continue: 'Devam Et',
  close: 'Kapat',
  submit: 'Gönder',
  yes: 'Evet',
  no: 'Hayır',
  prev: 'Önceki',
  next: 'Sonraki',
  back: 'Geri',

  // Loading states
  loading: 'Yükleniyor...',
  loadingComments: 'Yorumlar yükleniyor...',
  posting: 'Yayınlanıyor...',
  signingInWith: 'İle oturum açılıyor',

  // Empty states
  noComments: 'Henüz yorum yok. İlk yorum yapan sen ol!',
  noNotifications: 'Henüz bildirim yok',
  noBlockedUsers: 'Engellenmiş kullanıcı yok',

  // Sorting
  sortedBy: 'Sıralama ölçütü:',
  sortTop: 'En İyi',
  sortNew: 'Yeni',
  sortControversial: 'Tartışmalı',
  sortOld: 'Eski',

  // Comment form
  writeComment: 'Yorum yaz...',
  writeReply: 'Yanıt yaz...',
  formattingHelp: 'Biçimlendirme yardımı',
  markdownSupported: 'Markdown biçimlendirmesi desteklenmektedir',
  youType: 'Sen yaz:',
  youSee: 'Sen gör:',

  // Voting
  upvote: 'Yukarı oy',
  downvote: 'Aşağı oy',
  point: 'puan',
  points: 'puan',

  // Threading
  expandComment: 'Yorumu genişlet',
  collapseComment: 'Yorumu daralt',
  child: 'çocuk',
  children: 'çocuklar',

  // Badges
  pinned: 'Sabitlenmiş',

  // Confirmations
  deleteConfirm: 'Sil?',
  blockConfirm: 'Kullanıcıyı engelle?',
  banConfirm: 'Kullanıcıyı yasakla?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Taciz',
  reportHateSpeech: 'Nefret söylemi',
  reportMisinformation: 'Yanlış bilgi',
  reportOther: 'Diğer',
  selectReason: 'Neden seç...',
  reportSubmitted: 'Teşekkürler!',

  // Chat
  typeMessage: 'Mesaj yaz...',
  signInToChat: 'Sohbet etmek için oturum aç',
  personOnline: 'kişi çevrimiçi',
  peopleOnline: 'kişi çevrimiçi',
  personTyping: 'kişi yazıyor...',
  peopleTyping: 'kişi yazıyor...',

  // Settings
  settings: 'Ayarlar',
  signIn: 'Oturum Aç',
  signOut: 'Oturumu Kapat',
  changeAvatar: 'Avatarı değiştir',
  theme: 'Tema',
  blockedUsers: 'Engellenmiş kullanıcılar',
  notifications: 'Bildirimler',
  emailOnReplies: 'Yanıtlarda e-posta',
  emailOnMentions: 'Bahsetmelerde e-posta',
  weeklyDigest: 'Haftalık özet',
  deleteAccount: 'Hesabı sil',
  accountDeleted: 'Hesap silindi',
  holdToDelete: 'Hesabı silmek için basılı tut (15sn)',
  holdForSeconds: '{seconds} saniye daha basılı tut...',

  // Keyboard navigation
  keyboardNavigation: 'Klavye Navigasyonu',
  enableKeyboardShortcuts: 'Klavye kısayollarını etkinleştir',
  key: 'Tuş',
  action: 'Eylem',
  nextComment: 'Sonraki yorum',
  previousComment: 'Önceki yorum',
  focusCommentInput: 'Girişe odaklan',
  editFocusedComment: 'Yorumu düzenle',
  replyToFocusedComment: 'Yanıtla',
  deleteFocusedComment: 'Yorumu sil',
  upvoteFocusedComment: 'Yukarı oy ver',
  downvoteFocusedComment: 'Aşağı oy ver',
  toggleCollapseFocusedComment: 'Daraltmayı değiştir',
  confirmYesNo: 'Evet/hayır onayla',
  cancelClose: 'İptal/kapat',

  // Username
  usernameTaken: 'Alındı',
  usernameAvailable: 'Mevcut',
  checking: 'Kontrol ediliyor...',
  chooseUsername: 'Bir kullanıcı adı seçin',
  usernamePlaceholder: 'kullanici-adiniz',
  usernameHint: 'Sadece harfler, sayılar, tire ve alt çizgi (2-24 karakter)',

  // Auth - general
  signInToVote: 'Oy vermek için giriş yapın',
  signInToPost: 'Yayınlamak için oturum aç',
  signInLabel: 'Oturum aç:',
  continueWith: 'İle devam et',
  chooseSignInMethod: 'Oturum açma yöntemini seç',

  // Auth - OTP (email/phone)
  enterEmail: 'E-postanı gir',
  enterPhone: 'Telefon numaranı gir',
  sendCode: 'Kod gönder',
  checkEmail: 'E-postanı kontrol et',
  checkPhone: 'Telefonunu kontrol et',
  enterCode: 'Gönderdiğimiz 6 haneli kodu gir',
  codeSentTo: 'Kod şuraya gönderildi:',
  invalidCode: 'Geçersiz kod',
  verificationFailed: 'Doğrulama başarısız oldu',
  weWillSendCode: 'Oturum açmak için sana bir kod göndereceğiz',
  emailPlaceholder: 'sen@ornek.com',
  phonePlaceholder: '+90 5xx xxx xx xx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Hoş geldin!',
  chooseDisplayName: 'Hesabın için bir görünen ad seç',
  yourName: 'Adın',

  // Auth - OAuth
  popupShouldOpen: 'Bir açılır pencere açılmış olmalı',
  completingSignIn: 'İle oturum açma tamamlanıyor',

  // Auth - Web3
  connectingTo: 'Bağlanılıyor:',

  // Auth - Anonymous
  guestNamePlaceholder: 'Misafir',
  continueAsGuest: 'Misafir olarak devam et',
  guest: 'Misafir',
  anonymous: 'Anonim',

  // User profile
  karma: 'Karma',
  comments: 'Yorumlar',
  joined: 'Katıldı',

  // Time formatting
  justNow: 'şimdi',
  minutesAgo: '{n}dk önce',
  hoursAgo: '{n}sa önce',
  daysAgo: '{n}gün önce',

  // Notifications
  markAllRead: 'Tümünü okundu olarak işaretle',

  // Social Links
  socialLinks: 'Sosyal Bağlantılar',
  saveSocialLinks: 'Sosyal Bağlantıları Kaydet',

  // Errors
  failedToPost: 'Yorum yayınlanamadı',
  failedToVote: 'Oylama başarısız oldu',
  failedToDelete: 'Silme başarısız oldu',
  failedToEdit: 'Düzenleme başarısız oldu',
  failedToBan: 'Kullanıcı yasaklanamadı',
  failedToBlock: 'Kullanıcı engellenemedi',
  failedToUnblock: 'Kullanıcının engeli kaldırılamadı',
  failedToReport: 'Bildirme başarısız oldu',
  failedToPin: 'Sabitleme başarısız oldu',
  failedToFetchAuthMethods: 'Kimlik doğrulama yöntemleri alınamadı',
  failedToStartLogin: 'Oturum açma başlatılamadı',
  failedToSendOtp: 'OTP gönderilemedi',

  // Error pages
  siteNotConfigured: 'Site yapılandırılmadı',
  siteNotConfiguredMessage:
    'Bu API anahtarı yapılandırılmış bir siteyle ilişkili değil. Kurulumu tamamlamak için usethreadkit.com/sites adresini ziyaret edin.',
  invalidApiKey: 'Geçersiz API anahtarı',
  invalidApiKeyMessage:
    'Sağlanan API anahtarı geçersiz veya iptal edildi. Doğru anahtar için kontrol panelinizi kontrol edin.',
  rateLimited: 'Oran sınırlı',
  rateLimitedMessage: 'Çok fazla istek. Lütfen bir süre bekleyip tekrar deneyin.',
  failedToLoadComments: 'Yorumlar yüklenemedi',
  tryAgainLater: 'Lütfen daha sonra tekrar deneyin.',

  // Branding
  poweredByThreadKit: 'ThreadKit tarafından desteklenmektedir',

  // Real-time updates
  loadNewComments: 'Yeni yorumları yükle',
  loadNewReplies: 'Yeni yanıtları yükle',
  isTyping: 'yazıyor...',
  },
};
