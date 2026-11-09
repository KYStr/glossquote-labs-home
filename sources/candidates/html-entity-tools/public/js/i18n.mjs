// UI dictionaries for the HTML Entity Encoder and Decoder.
// Only dynamically rendered strings live here; static labels are in
// the pages. Both languages carry the same keys (the project check
// enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      INPUT_TOO_LARGE: "輸入超過上限：{count} 字元（上限 100,000），已拒絕，未截斷。",
    }),
    ui: Object.freeze({
      COUNTS: "輸入 {input} 字元 · 輸出 {output} 字元（皆以字碼點計）",
      NO_REFERENCES: "找不到任何參照。",
      CHANGES_COUNT: "共 {count} 筆變更",
      UNRESOLVED_COUNT: "共 {count} 筆無法解析",
      ROWS_MORE: "（只顯示前 {shown} 筆，共 {total} 筆）",
      DOUBLE_HINT: "輸出裡還有可解碼的參照，看起來像雙重編碼。要再解碼一次嗎？",
      NOTE_C1_REMAP: "C1 對照",
      NOTE_ZERO_REPLACEMENT: "數值為 0 → 替代字元",
      NOTE_SURROGATE_REPLACEMENT: "代理對範圍 → 替代字元",
      NOTE_RANGE_REPLACEMENT: "超出範圍 → 替代字元",
      NOTE_MISSING_SEMICOLON: "缺少分號",
      REASON_UNKNOWN_NAME: "未知名稱",
      REASON_INVALID_NUMBER: "數字格式錯誤",
      COPIED: "已複製輸出。",
      COPY_FAILED: "複製失敗，請手動選取輸出複製。",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      INPUT_TOO_LARGE: "Input refused: {count} characters (cap 100,000). Nothing was truncated.",
    }),
    ui: Object.freeze({
      COUNTS: "Input {input} characters · output {output} characters (counted as code points)",
      NO_REFERENCES: "No references found.",
      CHANGES_COUNT: "{count} replacements",
      UNRESOLVED_COUNT: "{count} unresolved",
      ROWS_MORE: "(showing the first {shown} of {total})",
      DOUBLE_HINT: "The output still contains a decodable reference — it looks double-encoded. Decode again?",
      NOTE_C1_REMAP: "C1 remap",
      NOTE_ZERO_REPLACEMENT: "zero → replacement character",
      NOTE_SURROGATE_REPLACEMENT: "surrogate → replacement character",
      NOTE_RANGE_REPLACEMENT: "out of range → replacement character",
      NOTE_MISSING_SEMICOLON: "missing semicolon",
      REASON_UNKNOWN_NAME: "unknown name",
      REASON_INVALID_NUMBER: "invalid number",
      COPIED: "Output copied.",
      COPY_FAILED: "Copy failed; select the output and copy manually.",
    }),
  }),
});

function fill(template, params) {
  let out = template;
  for (const [key, value] of Object.entries(params ?? {})) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

export function translate(lang, code, params) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  return fill(dict.ui[code] ?? code, params);
}

export function errorMessage(lang, code, params) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES.en;
  return fill(dict.errors[code] ?? code, params);
}
