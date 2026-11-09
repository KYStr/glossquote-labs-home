// UI dictionaries for the Regex Tester and Replacer.
// Error messages are keyed by the core module's error codes; both
// languages carry the same keys (the project check enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      PATTERN_TOO_LONG: "樣式長度上限為 500 個字元（Unicode 碼點）。",
      TEXT_TOO_LONG: "測試文字長度上限為 50,000 個字元（Unicode 碼點）。",
      REPLACEMENT_TOO_LONG: "取代字串長度上限為 1,000 個字元（Unicode 碼點）。",
      UNKNOWN_GROUP: "取代字串引用了不存在的具名群組 $<{name}>。",
      MATCH_LIMIT_REACHED: "比對已在 1,000 筆停止，取代預覽無法由不完整的列舉產生。",
    }),
    ui: Object.freeze({
      NO_MATCHES: "沒有符合的結果。",
      MATCH_COUNT: "共 {count} 筆符合 · 耗時 {ms} 毫秒",
      CAP_NOTICE: "已在 1,000 筆符合停止：以下清單是部分結果，不是全部。",
      ZERO_WIDTH_AT: "零寬度符合，位於 {pos}",
      DID_NOT_PARTICIPATE: "—（未參與）",
      EMPTY_GROUP: "（空字串）",
      GROUP_LABEL: "群組 {number}",
      MATCH_HEADING: "第 {number} 筆",
      POSITION_UNITS: "碼元 {start}–{end}",
      POSITION_POINTS: "碼點 {start}–{end}",
      REPLACE_COUNT: "已取代 {count} 處。",
      COPIED: "已複製取代結果。",
      COPY_FAILED: "複製失敗，請手動選取文字複製。",
      CLEARED: "已清除全部輸入。",
      ERROR_PREFIX: "樣式錯誤：",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      PATTERN_TOO_LONG: "The pattern limit is 500 characters (Unicode code points).",
      TEXT_TOO_LONG: "The test text limit is 50,000 characters (Unicode code points).",
      REPLACEMENT_TOO_LONG: "The replacement limit is 1,000 characters (Unicode code points).",
      UNKNOWN_GROUP: "The replacement refers to a named group $<{name}> that does not exist.",
      MATCH_LIMIT_REACHED: "Matching stopped at 1,000 matches; a replace preview cannot be built from a partial list.",
    }),
    ui: Object.freeze({
      NO_MATCHES: "No matches.",
      MATCH_COUNT: "{count} match(es) · {ms} ms",
      CAP_NOTICE: "Stopped at 1,000 matches: the list below is partial, not complete.",
      ZERO_WIDTH_AT: "zero-width match at {pos}",
      DID_NOT_PARTICIPATE: "— (did not participate)",
      EMPTY_GROUP: "(empty)",
      GROUP_LABEL: "Group {number}",
      MATCH_HEADING: "Match {number}",
      POSITION_UNITS: "units {start}–{end}",
      POSITION_POINTS: "code points {start}–{end}",
      REPLACE_COUNT: "{count} replacement(s) made.",
      COPIED: "Replace result copied.",
      COPY_FAILED: "Copy failed; select the text and copy it manually.",
      CLEARED: "All inputs cleared.",
      ERROR_PREFIX: "Pattern error: ",
    }),
  }),
});

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template = dict.errors[code] ?? dict.ui[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}

export function errorMessage(lang, error) {
  if (error && typeof error.code === "string") {
    return translate(lang, error.code, error.params ?? {});
  }
  return error instanceof Error ? error.message : String(error);
}
