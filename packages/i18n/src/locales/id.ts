import type { TranslationStrings } from '@threadkit/core';

/**
 * Indonesian translations
 */
export const id: TranslationStrings = {
  // Common actions
  post: 'Kirim',
  cancel: 'Batal',
  save: 'Simpan',
  edit: 'Ubah',
  delete: 'Hapus',
  reply: 'Balas',
  report: 'Lapor',
  share: 'Bagikan',
  block: 'Blokir',
  unblock: 'Buka Blokir',
  ban: 'Banned',
  send: 'Kirim',
  verify: 'Verifikasi',
  continue: 'Lanjutkan',
  close: 'Tutup',
  submit: 'Kirim',
  yes: 'Ya',
  no: 'Tidak',
  prev: 'Sebelumnya',
  next: 'Selanjutnya',
  back: 'Kembali',

  // Loading states
  loading: 'Memuat...',
  loadingComments: 'Memuat komentar...',
  posting: 'Mengirim...',
  signingInWith: 'Masuk dengan',

  // Empty states
  noComments: 'Belum ada komentar. Jadilah yang pertama berkomentar!',
  noNotifications: 'Belum ada notifikasi',
  noBlockedUsers: 'Tidak ada pengguna yang diblokir',

  // Sorting
  sortedBy: 'Urutkan berdasarkan:',
  sortTop: 'Teratas',
  sortNew: 'Terbaru',
  sortControversial: 'Kontroversial',
  sortOld: 'Terlama',

  // Comment form
  writeComment: 'Tulis komentar...',
  writeReply: 'Tulis balasan...',
  formattingHelp: 'Bantuan format',
  markdownSupported: 'Format Markdown didukung',
  youType: 'Anda ketik:',
  youSee: 'Anda lihat:',

  // Voting
  upvote: 'Upvote',
  downvote: 'Downvote',
  point: 'poin',
  points: 'poin',

  // Threading
  expandComment: 'Lihat komentar',
  collapseComment: 'Sembunyikan komentar',
  child: 'balasan',
  children: 'balasan',

  // Badges
  pinned: 'Disematkan',

  // Confirmations
  deleteConfirm: 'Hapus?',
  blockConfirm: 'Blokir pengguna?',
  banConfirm: 'Banned pengguna?',

  // Report reasons
  reportSpam: 'Spam',
  reportHarassment: 'Pelecehan',
  reportHateSpeech: 'Ujaran kebencian',
  reportMisinformation: 'Misinformasi',
  reportOther: 'Lainnya',
  selectReason: 'Pilih alasan...',
  reportSubmitted: 'Terima kasih!',

  // Chat
  typeMessage: 'Ketik pesan...',
  signInToChat: 'Masuk untuk mengobrol',
  personOnline: 'orang online',
  peopleOnline: 'orang online',
  personTyping: 'orang sedang mengetik...',
  peopleTyping: 'orang sedang mengetik...',

  // Settings
  settings: 'Pengaturan',
  signIn: 'Masuk',
  signOut: 'Keluar',
  changeAvatar: 'Ganti avatar',
  theme: 'Tema',
  blockedUsers: 'Pengguna diblokir',
  notifications: 'Notifikasi',
  emailOnReplies: 'Email saat ada balasan',
  emailOnMentions: 'Email saat disebut',
  weeklyDigest: 'Ringkasan mingguan',
  deleteAccount: 'Hapus akun',
  accountDeleted: 'Akun dihapus',
  holdToDelete: 'Tahan untuk menghapus akun (15d)',
  holdForSeconds: 'Tahan selama {seconds} detik lagi...',

  // Username
  usernameTaken: 'Terpakai',
  usernameAvailable: 'Tersedia',
  checking: 'Memeriksa...',
  chooseUsername: 'Pilih nama pengguna',
  usernamePlaceholder: 'nama-pengguna-anda',
  usernameHint: 'Hanya huruf, angka, tanda hubung, garis bawah (2-24 karakter)',

  // Auth - general
  signInToVote: 'Masuk untuk memilih',
  signInToPost: 'Masuk untuk memposting',
  signInLabel: 'Masuk:',
  continueWith: 'Lanjutkan dengan',
  chooseSignInMethod: 'Pilih metode masuk',

  // Auth - OTP (email/phone)
  enterEmail: 'Masukkan email Anda',
  enterPhone: 'Masukkan nomor telepon Anda',
  sendCode: 'Kirim kode',
  checkEmail: 'Periksa email Anda',
  checkPhone: 'Periksa telepon Anda',
  enterCode: 'Masukkan 6 digit kode yang kami kirim ke',
  codeSentTo: 'Kode dikirim ke',
  invalidCode: 'Kode tidak valid',
  verificationFailed: 'Verifikasi gagal',
  weWillSendCode: 'Kami akan mengirimkan kode untuk masuk',
  emailPlaceholder: 'anda@contoh.com',
  phonePlaceholder: '+62 8xx xxxx xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Selamat datang!',
  chooseDisplayName: 'Pilih nama tampilan untuk akun Anda',
  yourName: 'Nama Anda',

  // Auth - OAuth
  popupShouldOpen: 'Jendela popup seharusnya terbuka',
  completingSignIn: 'Menyelesaikan masuk dengan',

  // Auth - Web3
  connectingTo: 'Menghubungkan ke',

  // Auth - Anonymous
  guestNamePlaceholder: 'Tamu',
  continueAsGuest: 'Lanjutkan sebagai tamu',
  guest: 'Tamu',
  anonymous: 'Anonim',

  // User profile
  karma: 'Karma',
  comments: 'Komentar',
  joined: 'Bergabung',

  // Time formatting
  justNow: 'baru saja',
  minutesAgo: '{n}m yang lalu',
  hoursAgo: '{n}j yang lalu',
  daysAgo: '{n}h yang lalu',

  // Notifications
  markAllRead: 'Tandai semua sudah dibaca',

  // Social Links
  socialLinks: 'Tautan sosial',
  saveSocialLinks: 'Simpan tautan sosial',

  // Errors
  failedToPost: 'Gagal memposting komentar',
  failedToVote: 'Gagal memberikan suara',
  failedToDelete: 'Gagal menghapus',
  failedToEdit: 'Gagal mengubah',
  failedToBan: 'Gagal mem-banned pengguna',
  failedToBlock: 'Gagal memblokir pengguna',
  failedToUnblock: 'Gagal membuka blokir pengguna',
  failedToReport: 'Gagal melaporkan',
  failedToPin: 'Gagal menyematkan',
  failedToFetchAuthMethods: 'Gagal mengambil metode otentikasi',
  failedToStartLogin: 'Gagal memulai masuk',
  failedToSendOtp: 'Gagal mengirim OTP',

  // Error pages
  siteNotConfigured: 'Situs tidak dikonfigurasi',
  siteNotConfiguredMessage:
    'Kunci API ini tidak terkait dengan situs yang dikonfigurasi. Kunjungi usethreadkit.com/sites untuk menyelesaikan pengaturan Anda.',
  invalidApiKey: 'Kunci API tidak valid',
  invalidApiKeyMessage:
    'Kunci API yang diberikan tidak valid atau telah dicabut. Periksa dasbor Anda untuk kunci yang benar.',
  rateLimited: 'Batas tarif terlampaui',
  rateLimitedMessage: 'Terlalu banyak permintaan. Harap tunggu sebentar dan coba lagi.',
  failedToLoadComments: 'Gagal memuat komentar',
  tryAgainLater: 'Silakan coba lagi nanti.',

  // Branding
  poweredByThreadKit: 'Didukung oleh ThreadKit',

  // Real-time updates
  loadNewComments: 'Muat komentar baru',
  loadNewReplies: 'Muat balasan baru',
  isTyping: 'sedang mengetik...',
};
