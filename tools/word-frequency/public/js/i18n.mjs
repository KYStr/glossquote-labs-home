// UI dictionaries for the Word and Character Frequency Counter.
// Only dynamically rendered strings live here; static labels are in
// the pages. Both languages carry the same keys (the project check
// enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      INPUT_TOO_LARGE: "輸入超過上限：{count} 字元（上限 200,000），已拒絕，未截斷。",
    }),
    ui: Object.freeze({
      TOTALS: "計入總數 {total} · 不重複 {unique} 項 · 輸入 {input} 字元",
      EMPTY_TABLE: "目前沒有符合篩選條件的結果列。",
      ROWS_NOTE: "顯示 {shown} / {total} 列（CSV 匯出全部達到次數門檻的列）",
      EXPORTED: "已匯出 frequency.csv。",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      INPUT_TOO_LARGE: "Input refused: {count} characters (cap 200,000). Nothing was truncated.",
    }),
    ui: Object.freeze({
      TOTALS: "Counted total {total} · {unique} unique · input {input} characters",
      EMPTY_TABLE: "No rows meet the current filters.",
      ROWS_NOTE: "Showing {shown} of {total} rows (CSV includes all rows that meet the minimum count)",
      EXPORTED: "frequency.csv exported.",
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
