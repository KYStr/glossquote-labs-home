// Bilingual string tables for the Daily Water Intake Calculator.
// The static HTML pages carry the same strings; scripts/check.mjs and the
// test suite verify the two cannot diverge. The model statement is generated
// from the MODEL data block in model.mjs so the printed model is the
// computed model (SPEC sections 4-5).

import { MODEL, formatMl } from './model.mjs';

export const LOCALES = ['zh-Hant', 'en'];

export const STRINGS = {
  'zh-Hant': {
    title: '每日飲水量計算機 — 估算你的每日飲水範圍',
    description: '依體重（每公斤 30–35 毫升）、活動量與氣候，估算每日飲水量範圍（毫升與杯數）。這是一般教育性估算，不是醫療建議。',
    h1: '每日飲水量計算機',
    intro: '輸入體重、活動量與氣候，結果一律以範圍呈現，來自本頁印出的簡單模型，不會給單一數字。',
    homeLink: 'GlossQuote Labs 首頁',
    langLink: 'English',
    weightLabel: '體重（公斤）',
    weightHint: '20.0–300.0 公斤，最多一位小數。',
    activityLabel: '活動量',
    activityNames: { sedentary: '久坐', light: '輕度', moderate: '中度', high: '高度' },
    climateLabel: '氣候',
    climateNames: { temperate: '溫和', warm: '溫暖', hot: '炎熱' },
    resultHeading: '估算範圍',
    mlPerDay: '毫升／日',
    cupsSuffix: '杯（每杯 250 毫升）',
    staleNote: '已過時：修正體重後才會更新這個範圍。',
    errors: {
      empty: '請輸入體重。',
      format: '請以數字輸入體重，例如 70 或 70.5。',
      decimals: '小數最多一位，例如 70.5。',
      range: '體重需介於 20.0 到 300.0 公斤之間。',
    },
    modelHeading: '計算模型',
    disclaimer: '這是依簡單模型計算的一般教育性估算。個人需求會因健康狀況、藥物、飲食，以及許多本工具未納入的因素而不同。這不是醫療建議。若有健康狀況或任何疑慮，請諮詢合格的專業人員。',
    privacyNote: '完全在你的瀏覽器中計算：不儲存、不傳送、不追蹤。',
  },
  en: {
    title: 'Daily Water Intake Calculator — Estimate Your Daily Range',
    description: 'Estimate a daily water intake range in millilitres and cups from body weight (30–35 ml per kg), activity level and climate. A general educational estimate, not medical advice.',
    h1: 'Daily Water Intake Calculator',
    intro: 'Enter your body weight, activity level and climate. The result is always a range from the simple model printed on this page — never a single prescribed number.',
    homeLink: 'GlossQuote Labs home',
    langLink: '繁體中文',
    weightLabel: 'Body weight (kg)',
    weightHint: '20.0–300.0 kg, one decimal place at most.',
    activityLabel: 'Activity level',
    activityNames: { sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', high: 'High' },
    climateLabel: 'Climate',
    climateNames: { temperate: 'Temperate', warm: 'Warm', hot: 'Hot' },
    resultHeading: 'Your estimated range',
    mlPerDay: 'ml per day',
    cupsSuffix: 'cups (250 ml per cup)',
    staleNote: 'Out of date: fix the weight to update this range.',
    errors: {
      empty: 'Enter your body weight.',
      format: 'Enter weight as a number, e.g. 70 or 70.5.',
      decimals: 'Use at most one decimal place, e.g. 70.5.',
      range: 'Weight must be between 20.0 and 300.0 kg.',
    },
    modelHeading: 'The model',
    disclaimer: 'This is a general educational estimate from a simple model. Individual needs vary with health, medication, diet and many other factors this tool does not model. It is not medical advice. If you have a health condition or any concern, please ask a qualified professional.',
    privacyNote: 'Runs entirely in your browser: nothing is stored, sent or tracked.',
  },
};

function factorText(factor) {
  // Print the exact pinned decimal (1 -> "1.0", 1.1 -> "1.1", 1.25 -> "1.25").
  return Number.isInteger(factor) ? factor.toFixed(1) : String(factor);
}

// The on-page model statement, generated from MODEL so it cannot diverge
// from the computation (SPEC section 5, toolchain-provenance aspect).
export function modelStatement(locale) {
  const s = STRINGS[locale];
  if (!s) throw new RangeError('unknown locale: ' + locale);
  const acts = MODEL.activityOrder
    .map((k) => s.activityNames[k] + ' +' + formatMl(MODEL.activityMl[k]))
    .join(locale === 'en' ? ', ' : '、');
  const climates = MODEL.climateOrder
    .map((k) => s.climateNames[k] + ' ×' + factorText(MODEL.climate[k].factor))
    .join(locale === 'en' ? ', ' : '、');
  if (locale === 'en') {
    return 'Baseline: ' + MODEL.baselineLowMlPerKg + '–' + MODEL.baselineHighMlPerKg +
      ' ml per kilogram of body weight. Activity additions (ml, added to both ends): ' + acts +
      '. Climate multipliers: ' + climates +
      '. Formula: low = (' + MODEL.baselineLowMlPerKg + ' × weight in kg + activity addition) × climate multiplier; high = (' +
      MODEL.baselineHighMlPerKg + ' × weight in kg + activity addition) × climate multiplier. Cups use ' +
      MODEL.cupMl + ' ml per cup and are computed from the exact, unrounded values.';
  }
  return '基準：每公斤體重 ' + MODEL.baselineLowMlPerKg + '–' + MODEL.baselineHighMlPerKg +
    ' 毫升。活動量加算（毫升，範圍兩端同加）：' + acts +
    '。氣候倍率：' + climates +
    '。公式：下限 =（' + MODEL.baselineLowMlPerKg + ' × 體重（公斤）+ 活動加算）× 氣候倍率；上限 =（' +
    MODEL.baselineHighMlPerKg + ' × 體重（公斤）+ 活動加算）× 氣候倍率。杯數以每杯 ' +
    MODEL.cupMl + ' 毫升換算，並由未捨入的精確值計算。';
}

// SPEC section 5 honesty rule (2): no diagnosis or assessment language
// anywhere in the product strings. The audit applies to every string except
// the disclaimer itself. Matching is case-insensitive for English.
export const FORBIDDEN = [
  'dehydrated', 'dehydration', 'you should drink exactly', 'your requirement is',
  'doctors recommend', 'doctor recommended', 'you drink too little', 'you are not drinking enough',
  '脫水', '你必須喝', '你的需求量', '你的需水量', '你喝太少',
  '醫師建議', '醫生建議', '醫師推薦', '醫生推薦',
];

export function auditText(text) {
  const lower = String(text).toLowerCase();
  return FORBIDDEN.filter((term) => lower.includes(term.toLowerCase()));
}

// Collect every auditable string of a locale: all string-table values except
// the disclaimer, plus the generated model statement and the meta text
// (title/description are part of the table, so they are covered).
export function auditableStrings(locale) {
  const out = [];
  const walk = (value, key) => {
    if (key === 'disclaimer') return;
    if (typeof value === 'string') out.push(value);
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, k);
    }
  };
  walk(STRINGS[locale], null);
  out.push(modelStatement(locale));
  return out;
}
