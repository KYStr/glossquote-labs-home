// Bilingual message dictionaries for dynamic UI strings and every
// error code the core, controller or report builder can raise. Static
// page copy lives in the two HTML files; this module covers everything
// the app renders at run time. The two error-code sets are identical.

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      SCHEMA: "輸入結構不正確，請檢查欄位。",
      INPUT_LIMIT: "輸入太長，請縮短後再試。",
      UNICODE: "輸入含有無效字元。",
      EMPTY: "此欄必填。",
      MONEY_FORMAT: "金額格式不正確：請輸入數字，最多兩位小數。",
      PERCENT_FORMAT: "利率格式不正確：請輸入數字，最多兩位小數。",
      INTEGER_FORMAT: "請輸入整數。",
      ENUM: "請選擇有效的還款方式。",
      RANGE: "數值超出允許範圍。",
      NEVER_PAYOFF: "每月還款不超過每月利息，餘額永遠不會減少",
      PAYOFF_TOO_LONG: "以目前設定，600 個月內無法還清。",
      OUTPUT_LIMIT: "報告超過大小上限，無法產生下載。",
      INTERNAL: "發生內部錯誤，請重試。",
      WORKER_ERROR: "計算元件啟動失敗，請重試。",
    }),
    ui: Object.freeze({
      statusEmpty: "輸入餘額與 APR，或載入範例開始。",
      statusDirty: "輸入已變更，請重新執行",
      statusBusy: "處理中",
      statusSuccess: "計算完成。",
      statusCancelled: "已取消，可重新執行",
      exampleLoaded: "已載入範例（合成資料），尚未執行。",
      pageInfo: "第 {page} / {pages} 頁 · 共 {count} 列",
      previousPage: "上一頁",
      nextPage: "下一頁",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      SCHEMA: "The input structure is invalid. Check the fields.",
      INPUT_LIMIT: "The input is too long. Shorten it and try again.",
      UNICODE: "The input contains an invalid character.",
      EMPTY: "This field is required.",
      MONEY_FORMAT: "Invalid amount: enter a number with at most two decimal places.",
      PERCENT_FORMAT: "Invalid rate: enter a number with at most two decimal places.",
      INTEGER_FORMAT: "Enter a whole number.",
      ENUM: "Choose a valid payoff mode.",
      RANGE: "The value is outside the allowed range.",
      NEVER_PAYOFF: "The payment does not exceed the monthly interest, so the balance never goes down.",
      PAYOFF_TOO_LONG: "This plan does not pay off within 600 months.",
      OUTPUT_LIMIT: "The report exceeds the size limit and cannot be downloaded.",
      INTERNAL: "An internal error occurred. Try again.",
      WORKER_ERROR: "The calculation worker failed to start. Try again.",
    }),
    ui: Object.freeze({
      statusEmpty: "Enter a balance and APR, or load the example to begin.",
      statusDirty: "Input changed. Run again.",
      statusBusy: "Working",
      statusSuccess: "Calculation complete.",
      statusCancelled: "Cancelled. You can run again.",
      exampleLoaded: "Example loaded (synthetic data). It has not been run yet.",
      pageInfo: "Page {page} of {pages} · {count} rows",
      previousPage: "Previous page",
      nextPage: "Next page",
    }),
  }),
});

export function dictionaryFor(lang) {
  return DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
}

export function errorMessage(lang, code) {
  const dict = dictionaryFor(lang);
  return dict.errors[code] ?? dict.errors.INTERNAL;
}

export function uiText(lang, key, params = {}) {
  const dict = dictionaryFor(lang);
  let text = dict.ui[key] ?? key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
