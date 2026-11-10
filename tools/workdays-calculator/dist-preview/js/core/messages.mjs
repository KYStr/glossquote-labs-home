// Fixed bilingual strings for the Workdays Calculator.
// Status strings and weekday names are pinned by the specification.

export const MESSAGES = {
  "zh-Hant": {
    statusEmpty: "輸入開始日期與結束日期（或工作日數），或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    statusSuccess: "計算完成。",
    runCount: "計算工作日",
    runShift: "計算目標日期",
    exampleLoaded: "已載入範例（合成資料），請按「計算工作日」執行。",
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入過長。",
      UNICODE: "輸入含不完整的字元。",
      EMPTY: "這個欄位必填。",
      DATE_FORMAT: "日期請用 YYYY-MM-DD 格式。",
      INVALID_DATE: "這個日期不存在。",
      INTEGER_FORMAT: "工作日數請輸入整數。",
      RANGE: "超出允許範圍（日期 1900-01-01 至 2100-12-31；工作日數 -3660 至 3660）。",
      ROW_LIMIT: "假日最多 400 筆。",
      INTERNAL: "處理時發生問題，請重試。",
    },
    weekdays: ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
    linePrefix: (row) => `第 ${row} 行：`,
    yes: "是",
    no: "否",
  },
  en: {
    statusEmpty: "Enter a start date and an end date (or a business-day count), or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    statusSuccess: "Calculation complete.",
    runCount: "Count business days",
    runShift: "Find target date",
    exampleLoaded: "Example loaded (synthetic data). Select “Count business days” to run it.",
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an incomplete character.",
      EMPTY: "This field is required.",
      DATE_FORMAT: "Use the YYYY-MM-DD date format.",
      INVALID_DATE: "This date does not exist.",
      INTEGER_FORMAT: "Enter business days as a whole number.",
      RANGE: "Out of range (dates 1900-01-01 to 2100-12-31; business days -3660 to 3660).",
      ROW_LIMIT: "At most 400 holiday lines are allowed.",
      INTERNAL: "Something went wrong. Try again.",
    },
    weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    linePrefix: (row) => `Line ${row}: `,
    yes: "Yes",
    no: "No",
  },
};

export function messagesFor(lang) {
  return MESSAGES[lang] ?? MESSAGES.en;
}

// Maps a core error {code, field, row} to the localized message. Holiday
// errors carry their 1-based row (blank lines included) as a prefix.
export function errorMessage(messages, error) {
  if (!error) return "";
  const table = messages.errors;
  const text = table[error.code] ?? table.INTERNAL;
  if (error.field === "holidays" && Number.isInteger(error.row)) {
    return messages.linePrefix(error.row) + text;
  }
  return text;
}
