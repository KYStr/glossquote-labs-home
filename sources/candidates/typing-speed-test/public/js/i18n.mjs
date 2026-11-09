// UI dictionaries for the Typing Speed Test.
// Both languages carry the same keys (the project check enforces
// parity). Metric labels exist in WPM and CPM variants: which pair is
// rendered depends on the passage language, never on the UI language,
// and a Chinese passage's results use the CPM labels only (SPEC
// section 4 — the letters for the English unit must not headline a
// Chinese result).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({}),
    ui: Object.freeze({
      GROSS_WPM: "總 WPM",
      NET_WPM: "淨 WPM",
      GROSS_CPM: "總字元/分鐘 (CPM)",
      NET_CPM: "淨字元/分鐘 (CPM)",
      ACCURACY: "準確率",
      ELAPSED: "用時（秒）",
      TIME_LEFT: "剩餘 {seconds} 秒",
      PASTE_REFUSED: "已拒絕貼上：本測驗只接受實際鍵入的字元。",
      ANNOUNCE_START: "開始計時。",
      ANNOUNCE_TEN: "剩餘 10 秒。",
      ANNOUNCE_END: "時間到，輸入已鎖定。",
      ANNOUNCE_DONE: "完成全文，輸入已鎖定。",
      NO_CHARS: "沒有輸入任何字元，因此沒有成績。",
      MISTAKES_HEADING: "打錯的字詞",
      MISTAKE_WORD: "應為「{expected}」，實際輸入「{typed}」",
      MISTAKE_CHAR: "應為「{expected}」，實際輸入「{typed}」，共 {count} 次",
      PASSAGE_SOURCE: "文章：{title}（為 GlossQuote Labs 原創）",
      CONFIRM_DISCARD: "目前的嘗試將被丟棄，確定嗎？",
      NONE: "無",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({}),
    ui: Object.freeze({
      GROSS_WPM: "Gross WPM",
      NET_WPM: "Net WPM",
      GROSS_CPM: "Gross CPM (characters per minute)",
      NET_CPM: "Net CPM (characters per minute)",
      ACCURACY: "Accuracy",
      ELAPSED: "Elapsed (s)",
      TIME_LEFT: "{seconds} s left",
      PASTE_REFUSED: "Paste refused: this test only accepts actually typed characters.",
      ANNOUNCE_START: "Timer started.",
      ANNOUNCE_TEN: "10 seconds left.",
      ANNOUNCE_END: "Time up. Input locked.",
      ANNOUNCE_DONE: "Passage complete. Input locked.",
      NO_CHARS: "No characters typed, so there is no result.",
      MISTAKES_HEADING: "Mistyped units",
      MISTAKE_WORD: "expected “{expected}”, typed “{typed}”",
      MISTAKE_CHAR: "expected “{expected}”, typed “{typed}”, {count} time(s)",
      PASSAGE_SOURCE: "Passage: {title} (original for GlossQuote Labs)",
      CONFIRM_DISCARD: "Discard the current attempt?",
      NONE: "None",
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
