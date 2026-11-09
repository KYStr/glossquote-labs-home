// UI dictionaries for the Password Generator and Strength Checker.
// Error messages are keyed by the core module's error codes; band and
// penalty labels are keyed by the core's stable codes. Both languages
// carry the same keys (the project check enforces parity for errors).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      LENGTH_OUT_OF_RANGE: "長度必須是 8 到 128 之間的整數。",
      NO_SET_ENABLED: "至少要啟用一個字元集。",
      LENGTH_BELOW_SET_COUNT: "長度不得小於已啟用的字元集數量。",
      INTERNAL_REDRAW_EXHAUSTED: "內部錯誤：重抽次數用盡，請再試一次。",
      BYTE_SOURCE_EXHAUSTED: "亂數來源耗盡。",
      INVALID_POOL_SIZE: "內部錯誤：字元池大小無效。",
      WORD_COUNT_OUT_OF_RANGE: "單字數必須是 3 到 10 之間的整數。",
      INVALID_SEPARATOR: "分隔符號無效。",
      CHECK_TOO_LONG: "檢查長度上限為 1,024 個字元。",
    }),
    bands: Object.freeze({
      VERY_WEAK: "非常弱",
      WEAK: "弱",
      FAIR: "普通",
      STRONG: "強",
      VERY_STRONG: "非常強",
    }),
    penalties: Object.freeze({
      DICTIONARY: "含有字典單字",
      REPEAT_RUN: "有 3 個以上相同字元連續重複",
      SEQUENCE: "含有 4 個以上連續遞增或遞減序列",
      KEYBOARD_WALK: "含有鍵盤直線連打",
      YEAR: "含有 4 位數年份",
      SHORT_LENGTH: "長度不到 8",
    }),
    ui: Object.freeze({
      GENERATED: "已產生，{bits} 位元。",
      COPY: "複製",
      COPIED: "已複製。",
      COPY_FAILED: "複製失敗，請手動選取文字複製。",
      REPLACE_NOTE: "「產生」會取代目前顯示的 {count} 組。",
      NO_CRYPTO: "此瀏覽器不提供 crypto.getRandomValues，本工具拒絕產生密碼。",
      CHECK_EMPTY: "輸入密碼後會即時顯示估計結果。",
      BASE_LINE: "基礎熵 {bits} 位元（字元池 {pool}）。",
      FINAL_LINE: "估計結果：{bits} 位元 — {band}。",
      NO_PENALTY: "沒有觸發任何扣分項目。",
      PENALTY_LINE: "{label}：−{amount}",
      NON_ASCII_NOTE: "含有非 ASCII 字元，字元池 +20。",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      LENGTH_OUT_OF_RANGE: "Length must be an integer between 8 and 128.",
      NO_SET_ENABLED: "Enable at least one character set.",
      LENGTH_BELOW_SET_COUNT: "Length must be at least the number of enabled sets.",
      INTERNAL_REDRAW_EXHAUSTED: "Internal error: redraw limit reached; try again.",
      BYTE_SOURCE_EXHAUSTED: "Random byte source exhausted.",
      INVALID_POOL_SIZE: "Internal error: invalid pool size.",
      WORD_COUNT_OUT_OF_RANGE: "Word count must be an integer between 3 and 10.",
      INVALID_SEPARATOR: "Invalid separator.",
      CHECK_TOO_LONG: "The check limit is 1,024 characters.",
    }),
    bands: Object.freeze({
      VERY_WEAK: "very weak",
      WEAK: "weak",
      FAIR: "fair",
      STRONG: "strong",
      VERY_STRONG: "very strong",
    }),
    penalties: Object.freeze({
      DICTIONARY: "contains a dictionary word",
      REPEAT_RUN: "3+ identical characters in a row",
      SEQUENCE: "ascending or descending sequence of 4+",
      KEYBOARD_WALK: "keyboard walk of 4+",
      YEAR: "contains a 4-digit year",
      SHORT_LENGTH: "shorter than 8 characters",
    }),
    ui: Object.freeze({
      GENERATED: "Generated, {bits} bits.",
      COPY: "Copy",
      COPIED: "Copied.",
      COPY_FAILED: "Copy failed; select the text and copy it manually.",
      REPLACE_NOTE: "Generate replaces the {count} item(s) currently shown.",
      NO_CRYPTO: "This browser does not provide crypto.getRandomValues; the tool refuses to generate.",
      CHECK_EMPTY: "Type a password to see the estimate.",
      BASE_LINE: "Base entropy {bits} bits (pool {pool}).",
      FINAL_LINE: "Estimate: {bits} bits — {band}.",
      NO_PENALTY: "No penalties triggered.",
      PENALTY_LINE: "{label}: −{amount}",
      NON_ASCII_NOTE: "Contains non-ASCII characters; pool +20.",
    }),
  }),
});

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template =
    dict.errors[code] ?? dict.ui[code] ?? dict.bands[code] ?? dict.penalties[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}

export function bandLabel(lang, band) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  return dict.bands[band] ?? band;
}

export function penaltyLabel(lang, code) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  return dict.penalties[code] ?? code;
}
