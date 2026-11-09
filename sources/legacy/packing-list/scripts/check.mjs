import { validatePublic } from './validation.mjs';
import { translations } from '../public/js/i18n.mjs';

export function checkTranslations() {
  const keys = Object.keys(translations['zh-Hant']);
  if (JSON.stringify(keys) !== JSON.stringify(Object.keys(translations.en))) throw new Error('TRANSLATION_PARITY');
  for (const category of ['errors', 'ranges']) {
    if (JSON.stringify(Object.keys(translations['zh-Hant'][category])) !== JSON.stringify(Object.keys(translations.en[category]))) throw new Error('TRANSLATION_PARITY');
  }
}
checkTranslations();
const files = await validatePublic();
console.log(`PASS: ${files.length} allowed assets, bilingual HTML and translation parity, ESM syntax and local references. Static API scans are not complete Network/Storage evidence.`);
