#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localesDir = join(__dirname, '../src/locales');

// Proper translations for "Toggle collapse"
const translations = {
  ar: 'تبديل الطي',
  bg: 'Превключи свиване',
  ca: 'Alternar col·lapse',
  cs: 'Přepnout sbalení',
  da: 'Skift fold sammen',
  de: 'Einklappen umschalten',
  el: 'Εναλλαγή σύμπτυξης',
  en: 'Toggle collapse',
  es: 'Alternar colapsar',
  et: 'Lülita ahendamine',
  fa: 'تغییر وضعیت جمع شدن',
  fi: 'Vaihda supistus',
  fr: 'Basculer réduction',
  he: 'החלף כיווץ',
  hr: 'Prebaci sažimanje',
  hu: 'Összecsukás váltása',
  id: 'Alihkan lipat',
  it: 'Attiva/disattiva compressione',
  ja: '折りたたみ切替',
  ko: '접기 전환',
  lt: 'Perjungti sutraukimą',
  lv: 'Pārslēgt sakļaušanu',
  my: 'ချုံ့ခြင်းကို ပြောင်းလဲရန်',
  nl: 'Inklappen schakelen',
  no: 'Veksle sammenslåing',
  pl: 'Przełącz zwijanie',
  pt: 'Alternar recolher',
  ro: 'Comutare restrângere',
  ru: 'Переключить сворачивание',
  sk: 'Prepnúť zbalenie',
  sl: 'Preklopi strnitev',
  sr: 'Пребаци сажимање',
  sv: 'Växla kollaps',
  th: 'สลับการยุบ',
  tr: 'Daraltmayı değiştir',
  uk: 'Перемкнути згортання',
  vi: 'Chuyển đổi thu gọn',
  zh: '切换折叠',
};

for (const [lang, translation] of Object.entries(translations)) {
  const filePath = join(localesDir, `${lang}.ts`);
  let content = readFileSync(filePath, 'utf-8');

  // Add toggleCollapseFocusedComment after deleteFocusedComment if it doesn't exist
  if (!content.includes('toggleCollapseFocusedComment')) {
    content = content.replace(
      /(deleteFocusedComment:\s*['"'].*?['"'],?)\n/,
      `$1\n  toggleCollapseFocusedComment: '${translation}',\n`
    );
  }

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Updated ${lang}.ts: "${translation}"`);
}

console.log('\n✅ All translations updated!');
