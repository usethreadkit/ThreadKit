import type { TranslationStrings } from '@threadkit/core';

/**
 * Greek translations
 */
export const el: TranslationStrings = {
  // Common actions
  post: 'Δημοσίευση',
  cancel: 'Ακύρωση',
  save: 'Αποθήκευση',
  edit: 'Επεξεργασία',
  delete: 'Διαγραφή',
  reply: 'Απάντηση',
  report: 'Αναφορά',
  share: 'Κοινοποίηση',
  block: 'Αποκλεισμός',
  unblock: 'Άρση αποκλεισμού',
  ban: 'Απαγόρευση',
  send: 'Αποστολή',
  verify: 'Επαλήθευση',
  continue: 'Συνέχεια',
  close: 'Κλείσιμο',
  submit: 'Υποβολή',
  yes: 'Ναι',
  no: 'Όχι',
  prev: 'Προηγ',
  next: 'Επόμ',
  back: 'Πίσω',

  // Loading states
  loading: 'Φόρτωση...',
  loadingComments: 'Φόρτωση σχολίων...',
  posting: 'Δημοσίευση...',
  signingInWith: 'Σύνδεση με',

  // Empty states
  noComments: 'Δεν υπάρχουν σχόλια ακόμα. Γίνε ο πρώτος που θα σχολιάσει!',
  noNotifications: 'Δεν υπάρχουν ειδοποιήσεις',
  noBlockedUsers: 'Δεν υπάρχουν αποκλεισμένοι χρήστες',

  // Sorting
  sortedBy: 'Ταξινόμηση κατά:',
  sortTop: 'Κορυφαία',
  sortNew: 'Νέα',
  sortControversial: 'Αμφιλεγόμενα',
  sortOld: 'Παλαιότερα',

  // Comment form
  writeComment: 'Γράψε ένα σχόλιο...',
  writeReply: 'Γράψε μια απάντηση...',
  formattingHelp: 'Βοήθεια μορφοποίησης',
  markdownSupported: 'Υποστηρίζεται μορφοποίηση Markdown',
  youType: 'Πληκτρολογείς:',
  youSee: 'Βλέπεις:',

  // Voting
  upvote: 'Θετική ψήφος',
  downvote: 'Αρνητική ψήφος',
  point: 'πόντος',
  points: 'πόντοι',

  // Threading
  expandComment: 'Ανάπτυξη σχολίου',
  collapseComment: 'Σύμπτυξη σχολίου',
  child: 'απάντηση',
  children: 'απαντήσεις',

  // Badges
  pinned: 'Καρφιτσωμένο',

  // Confirmations
  deleteConfirm: 'Διαγραφή;',
  blockConfirm: 'Αποκλεισμός χρήστη;',
  banConfirm: 'Απαγόρευση χρήστη;',

  // Report reasons
  reportSpam: 'Ανεπιθύμητο',
  reportHarassment: 'Παρενόχληση',
  reportHateSpeech: 'Ρητορική μίσους',
  reportMisinformation: 'Παραπληροφόρηση',
  reportOther: 'Άλλο',
  selectReason: 'Επίλεξε αιτία...',
  reportSubmitted: 'Ευχαριστούμε!',

  // Chat
  typeMessage: 'Πληκτρολόγησε ένα μήνυμα...',
  signInToChat: 'Συνδέσου για να συνομιλήσεις',
  personOnline: 'άτομο online',
  peopleOnline: 'άτομα online',
  personTyping: 'άτομο πληκτρολογεί...',
  peopleTyping: 'άτομα πληκτρολογούν...',

  // Settings
  settings: 'Ρυθμίσεις',
  signIn: 'Σύνδεση',
  signOut: 'Αποσύνδεση',
  changeAvatar: 'Αλλαγή avatar',
  theme: 'Θέμα',
  blockedUsers: 'Αποκλεισμένοι χρήστες',
  notifications: 'Ειδοποιήσεις',
  emailOnReplies: 'Email για απαντήσεις',
  emailOnMentions: 'Email για αναφορές',
  weeklyDigest: 'Εβδομαδιαία σύνοψη',
  deleteAccount: 'Διαγραφή λογαριασμού',
  accountDeleted: 'Ο λογαριασμός διαγράφηκε',
  holdToDelete: 'Κράτα πατημένο για διαγραφή (15δ)',
  holdForSeconds: 'Κράτα πατημένο για {seconds} δευτερόλεπτα ακόμα...',

  // Username
  usernameTaken: 'Κατειλημμένο',
  usernameAvailable: 'Διαθέσιμο',
  checking: 'Έλεγχος...',

  // Auth - general
  signInToPost: 'Συνδέσου για να δημοσιεύσεις',
  signInLabel: 'Σύνδεση:',
  continueWith: 'Συνέχεια με',
  chooseSignInMethod: 'Επίλεξε μέθοδο σύνδεσης',

  // Auth - OTP (email/phone)
  enterEmail: 'Εισάγετε το email σας',
  enterPhone: 'Εισάγετε το τηλέφωνό σας',
  sendCode: 'Αποστολή κωδικού',
  checkEmail: 'Ελέγξτε το email σας',
  checkPhone: 'Ελέγξτε το τηλέφωνό σας',
  enterCode: 'Εισάγετε τον 6ψήφιο κωδικό που στάλθηκε στο',
  codeSentTo: 'Ο κωδικός στάλθηκε στο',
  invalidCode: 'Μη έγκυρος κωδικός',
  verificationFailed: 'Η επαλήθευση απέτυχε',
  weWillSendCode: 'Θα σας στείλουμε έναν κωδικό για σύνδεση',
  emailPlaceholder: 'you@example.com',
  phonePlaceholder: '+30 69x xxx xxxx',
  otpPlaceholder: '000000',

  // Auth - name input
  welcome: 'Καλώς ορίσατε!',
  chooseDisplayName: 'Επιλέξτε όνομα εμφάνισης για τον λογαριασμό σας',
  yourName: 'Το όνομά σας',

  // Auth - OAuth
  popupShouldOpen: 'Θα πρέπει να έχει ανοίξει ένα αναδυόμενο παράθυρο',
  completingSignIn: 'Ολοκλήρωση σύνδεσης με',

  // Auth - Web3
  connectingTo: 'Σύνδεση με',

  // User profile
  karma: 'Karma',
  comments: 'Σχόλια',
  joined: 'Μέλος από',

  // Time formatting
  justNow: 'μόλις τώρα',
  minutesAgo: 'πριν {n}λ',
  hoursAgo: 'πριν {n}ω',
  daysAgo: 'πριν {n}μ',

  // Notifications
  markAllRead: 'Σήμανση όλων ως αναγνωσμένων',

  // Social Links
  socialLinks: 'Κοινωνικοί σύνδεσμοι',
  saveSocialLinks: 'Αποθήκευση κοινωνικών συνδέσμων',

  // Errors
  failedToPost: 'Αποτυχία δημοσίευσης σχολίου',
  failedToVote: 'Αποτυχία ψηφοφορίας',
  failedToDelete: 'Αποτυχία διαγραφής',
  failedToEdit: 'Αποτυχία επεξεργασίας',
  failedToBan: 'Αποτυχία απαγόρευσης χρήστη',
  failedToBlock: 'Αποτυχία αποκλεισμού χρήστη',
  failedToUnblock: 'Αποτυχία άρσης αποκλεισμού χρήστη',
  failedToReport: 'Αποτυχία αναφοράς',
  failedToPin: 'Αποτυχία καρφιτσώματος',
  failedToFetchAuthMethods: 'Αποτυχία λήψης μεθόδων ελέγχου ταυτότητας',
  failedToStartLogin: 'Αποτυχία έναρξης σύνδεσης',
  failedToSendOtp: 'Αποτυχία αποστολής OTP',

  // Error pages
  siteNotConfigured: 'Ο ιστότοπος δεν έχει ρυθμιστεί',
  siteNotConfiguredMessage:
    'Αυτό το κλειδί API δεν σχετίζεται με έναν ρυθμισμένο ιστότοπο. Επισκεφθείτε το usethreadkit.com/sites για να ολοκληρώσετε τη ρύθμισή σας.',
  invalidApiKey: 'Μη έγκυρο κλειδί API',
  invalidApiKeyMessage:
    'Το κλειδί API που δόθηκε δεν είναι έγκυρο ή έχει ανακληθεί. Ελέγξτε τον πίνακα ελέγχου σας για το σωστό κλειδί.',
  rateLimited: 'Υπέρβαση ορίου ρυθμού',
  rateLimitedMessage: 'Πάρα πολλά αιτήματα. Παρακαλούμε περιμένετε λίγο και προσπαθήστε ξανά.',
  failedToLoadComments: 'Αποτυχία φόρτωσης σχολίων',
  tryAgainLater: 'Παρακαλούμε προσπαθήστε ξανά αργότερα.',

  // Branding
  poweredByThreadKit: 'Με την υποστήριξη του ThreadKit',
};
