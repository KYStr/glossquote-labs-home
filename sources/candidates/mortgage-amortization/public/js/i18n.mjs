// UI dictionaries for the Mortgage Amortization calculator. Error
// messages are keyed by the core module's error codes (plus the
// controller's field-parse codes); both languages carry the same keys
// (the project check enforces parity).

export const DICTIONARIES = Object.freeze({
  "zh-Hant": Object.freeze({
    errors: Object.freeze({
      PRINCIPAL_INVALID: "金額格式不正確：請輸入最多兩位小數的數字。",
      PRINCIPAL_OUT_OF_RANGE: "貸款金額必須大於 0 且不超過 {limit}（目前輸入 {actual}）。",
      RATE_INVALID: "利率格式不正確：請輸入最多四位小數的百分比數字。",
      RATE_OUT_OF_RANGE: "年利率必須介於 0% 到 {limit}% 之間（目前輸入 {actual}%）。",
      TERM_INVALID: "年期必須是整數。",
      TERM_OUT_OF_RANGE: "年期必須介於 1 到 {limit} 年之間（目前輸入 {actual} 年）。",
      GRACE_INVALID: "寬限期必須是整數月數。",
      GRACE_LIMIT_EXCEEDED: "寬限期上限為 {limit} 個月（目前輸入 {actual} 個月）。",
      TRANCHE_MONTH_OUT_OF_RANGE: "第二段利率的起始月必須介於 2 到 {limit} 月之間（目前輸入 {actual} 月）。",
      MONTH_INVALID: "月份必須是整數。",
      PREPAYMENT_LIMIT: "提前還款最多 {limit} 筆。",
      PREPAYMENT_MONTH_OUT_OF_RANGE: "提前還款月份必須介於 1 到 {limit} 月之間（目前輸入 {actual} 月）。",
      PREPAYMENT_AMOUNT_INVALID: "提前還款金額必須大於 0。",
      PREPAYMENT_MODE_INVALID: "提前還款方式不正確。",
      PREPAYMENT_EXCEEDS_BALANCE: "第 {month} 月的提前還款超過該月還款後的餘額（上限 {max}）。",
      PREPAYMENT_AFTER_PAYOFF: "第 {month} 月的提前還款落在貸款已結清之後。",
      METHOD_INVALID: "還款方式不正確。",
    }),
    ui: Object.freeze({
      PLACEHOLDER: "輸入貸款金額與年利率後，這裡會顯示逐月攤還表。",
      MODE_REDUCE_TERM: "縮短期數",
      MODE_REDUCE_PAYMENT: "減少月付",
      DELETE: "刪除",
      EVENT_TEXT: "第 {month} 月 · {amount} · {mode}",
    }),
  }),
  en: Object.freeze({
    errors: Object.freeze({
      PRINCIPAL_INVALID: "Invalid amount format: enter a number with at most two decimal places.",
      PRINCIPAL_OUT_OF_RANGE: "Principal must be greater than 0 and at most {limit} (you entered {actual}).",
      RATE_INVALID: "Invalid rate format: enter a percentage with at most four decimal places.",
      RATE_OUT_OF_RANGE: "The annual rate must be between 0% and {limit}% (you entered {actual}%).",
      TERM_INVALID: "The term must be a whole number of years.",
      TERM_OUT_OF_RANGE: "The term must be between 1 and {limit} years (you entered {actual} years).",
      GRACE_INVALID: "The grace period must be a whole number of months.",
      GRACE_LIMIT_EXCEEDED: "The grace period is capped at {limit} months (you entered {actual} months).",
      TRANCHE_MONTH_OUT_OF_RANGE: "The second rate must start between month 2 and month {limit} (you entered month {actual}).",
      MONTH_INVALID: "The month must be a whole number.",
      PREPAYMENT_LIMIT: "At most {limit} prepayment events are allowed.",
      PREPAYMENT_MONTH_OUT_OF_RANGE: "A prepayment month must be between 1 and {limit} (you entered month {actual}).",
      PREPAYMENT_AMOUNT_INVALID: "A prepayment amount must be greater than 0.",
      PREPAYMENT_MODE_INVALID: "The prepayment mode is invalid.",
      PREPAYMENT_EXCEEDS_BALANCE: "The month {month} prepayment exceeds the balance after that month's payment (maximum {max}).",
      PREPAYMENT_AFTER_PAYOFF: "The month {month} prepayment falls after the loan is already repaid.",
      METHOD_INVALID: "The repayment method is invalid.",
    }),
    ui: Object.freeze({
      PLACEHOLDER: "Enter the principal and annual rate to see the month-by-month schedule.",
      MODE_REDUCE_TERM: "Reduce term",
      MODE_REDUCE_PAYMENT: "Reduce payment",
      DELETE: "Delete",
      EVENT_TEXT: "Month {month} · {amount} · {mode}",
    }),
  }),
});

export function translate(lang, code, params = {}) {
  const dict = DICTIONARIES[lang] ?? DICTIONARIES["zh-Hant"];
  const template = dict.errors[code] ?? dict.ui[code] ?? code;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match);
}
