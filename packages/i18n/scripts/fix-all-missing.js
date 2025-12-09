#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { missingTranslations } from './missing-translations.js';

// Add username fields to locales that need them
const usernameFields = {
  cs: {
    chooseUsername: 'Vyberte uživatelské jméno',
    usernamePlaceholder: 'vase-jmeno',
    usernameHint: 'Pouze písmena, čísla, pomlčky a podtržítka (2-24 znaků)',
  },
  da: {
    chooseUsername: 'Vælg et brugernavn',
    usernamePlaceholder: 'dit-brugernavn',
    usernameHint: 'Kun bogstaver, tal, bindestreger og underscores (2-24 tegn)',
  },
  el: {
    chooseUsername: 'Επιλέξτε όνομα χρήστη',
    usernamePlaceholder: 'ονομα-χρηστη',
    usernameHint: 'Μόνο γράμματα, αριθμοί, παύλες και κάτω παύλες (2-24 χαρακτήρες)',
  },
  et: {
    chooseUsername: 'Valige kasutajanimi',
    usernamePlaceholder: 'teie-kasutajanimi',
    usernameHint: 'Ainult tähed, numbrid, sidekriipsud ja alakriipsud (2-24 tähemärki)',
  },
  fa: {
    chooseUsername: 'یک نام کاربری انتخاب کنید',
    usernamePlaceholder: 'نام-کاربری-شما',
    usernameHint: 'فقط حروف، اعداد، خط تیره و زیرخط (2-24 کاراکتر)',
  },
  fi: {
    chooseUsername: 'Valitse käyttäjänimi',
    usernamePlaceholder: 'kayttajanimi',
    usernameHint: 'Vain kirjaimia, numeroita, viivoja ja alaviivoja (2-24 merkkiä)',
  },
  fr: {
    chooseUsername: "Choisissez un nom d'utilisateur",
    usernamePlaceholder: 'votre-nom',
    usernameHint: 'Lettres, chiffres, tirets et underscores uniquement (2-24 caractères)',
  },
  he: {
    chooseUsername: 'בחר שם משתמש',
    usernamePlaceholder: 'שם-משתמש',
    usernameHint: 'אותיות, מספרים, מקפים וקו תחתון בלבד (2-24 תווים)',
  },
  ko: {
    chooseUsername: '사용자 이름 선택',
    usernamePlaceholder: '사용자-이름',
    usernameHint: '문자, 숫자, 하이픈, 밑줄만 사용 가능 (2-24자)',
  },
  lt: {
    chooseUsername: 'Pasirinkite vartotojo vardą',
    usernamePlaceholder: 'jusu-vardas',
    usernameHint: 'Tik raidės, skaičiai, brūkšneliai ir pabraukimai (2-24 simboliai)',
  },
  lv: {
    chooseUsername: 'Izvēlieties lietotājvārdu',
    usernamePlaceholder: 'jusu-vards',
    usernameHint: 'Tikai burti, cipari, defises un pasvītrojumi (2-24 rakstzīmes)',
  },
  my: {
    chooseUsername: 'အသုံးပြုသူအမည် ရွေးချယ်ပါ',
    usernamePlaceholder: 'သင့်-အမည်',
    usernameHint: 'စာလုံး၊ ဂဏန်း၊ ခေါင်းစဉ်၊ အောက်မျဉ်းသာ (2-24 စာလုံး)',
  },
  nl: {
    chooseUsername: 'Kies een gebruikersnaam',
    usernamePlaceholder: 'jouw-naam',
    usernameHint: 'Alleen letters, cijfers, koppeltekens en underscores (2-24 tekens)',
  },
  pl: {
    chooseUsername: 'Wybierz nazwę użytkownika',
    usernamePlaceholder: 'twoja-nazwa',
    usernameHint: 'Tylko litery, cyfry, myślniki i podkreślenia (2-24 znaków)',
  },
  ru: {
    chooseUsername: 'Выберите имя пользователя',
    usernamePlaceholder: 'ваше-имя',
    usernameHint: 'Только буквы, цифры, дефисы и подчеркивания (2-24 символа)',
  },
  sk: {
    chooseUsername: 'Zvoľte používateľské meno',
    usernamePlaceholder: 'vase-meno',
    usernameHint: 'Iba písmená, čísla, pomlčky a podčiarkovníky (2-24 znakov)',
  },
  th: {
    chooseUsername: 'เลือกชื่อผู้ใช้',
    usernamePlaceholder: 'ชื่อผู้ใช้ของคุณ',
    usernameHint: 'ตัวอักษร ตัวเลข ขีดกลาง และขีดล่างเท่านั้น (2-24 ตัวอักษร)',
  },
  tr: {
    chooseUsername: 'Bir kullanıcı adı seçin',
    usernamePlaceholder: 'kullanici-adiniz',
    usernameHint: 'Sadece harfler, sayılar, tire ve alt çizgi (2-24 karakter)',
  },
  uk: {
    chooseUsername: "Виберіть ім'я користувача",
    usernamePlaceholder: 'ваше-імя',
    usernameHint: 'Тільки літери, цифри, дефіси та підкреслення (2-24 символи)',
  },
  zh: {
    chooseUsername: '选择用户名',
    usernamePlaceholder: '您的用户名',
    usernameHint: '只能使用字母、数字、连字符和下划线（2-24 个字符）',
  },
};

const localesDir = join(process.cwd(), 'src', 'locales');
const localeFiles = readdirSync(localesDir).filter(f => f.endsWith('.ts'));

for (const filename of localeFiles) {
  const localeCode = filename.replace('.ts', '');

  if (localeCode === 'en') {
    console.log(`✓ Skipping ${filename} (reference locale)`);
    continue;
  }

  console.log(`Processing ${filename}...`);
  const filePath = join(localesDir, filename);
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Check for username fields
  const needsUsernameFields = usernameFields[localeCode];
  if (needsUsernameFields && !content.includes('chooseUsername:')) {
    console.log(`  Adding username fields...`);
    content = content.replace(
      /(usernameTaken:[\s\S]*?checking: '[^']*',)\n(  \/\/ Auth - general)/,
      `$1\n  chooseUsername: '${needsUsernameFields.chooseUsername}',\n  usernamePlaceholder: '${needsUsernameFields.usernamePlaceholder}',\n  usernameHint: '${needsUsernameFields.usernameHint}',\n\n$2`
    );
    modified = true;
  }

  // Check for vi anonymous fields (special case)
  if (localeCode === 'vi' && !content.includes('guestNamePlaceholder:')) {
    const viTranslations = missingTranslations.vi;
    console.log(`  Adding anonymous fields...`);
    content = content.replace(
      /(connectingTo: '[^']*',)\n\n(  \/\/ User profile)/,
      `$1\n\n  // Auth - Anonymous\n  guestNamePlaceholder: '${viTranslations.guestNamePlaceholder}',\n  continueAsGuest: '${viTranslations.continueAsGuest}',\n  guest: '${viTranslations.guest}',\n  anonymous: '${viTranslations.anonymous}',\n\n$2`
    );
    modified = true;
  }

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Updated`);
  } else {
    console.log(`  ✓ Already complete`);
  }
}

console.log('\n✅ Done! All locale files are now complete.');
