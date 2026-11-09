// Fixed bilingual strings for the Annual Leave Calculator.
// Error strings for the pinned codes are verbatim from the specification.

export const MESSAGES = {
  "zh-Hant": {
    statusEmpty: "輸入到職日與基準日，或載入範例。",
    statusDirty: "輸入已變更，請重新執行",
    statusBusy: "處理中",
    statusCancelled: "已取消，可重新執行",
    statusSuccess: "計算完成。",
    exampleLoaded: "已載入範例（合成資料），請按「計算特休」執行。",
    todaySet: "已把基準日填入今天，請按「計算特休」執行。",
    errors: {
      SCHEMA: "輸入格式不正確。",
      INPUT_LIMIT: "輸入過長。",
      UNICODE: "輸入含不完整的字元。",
      EMPTY: "這個欄位必填。",
      DATE_FORMAT: "日期請用 YYYY-MM-DD 格式。",
      INVALID_DATE: "這個日期不存在。",
      RANGE_YEAR: "年份需在 1900 到 2100 之間。",
      INTEGER_FORMAT: "已休天數請輸入整數。",
      RANGE_USED_LIMIT: "已休天數需在 0 到 30 之間。",
      DATE_ORDER: "基準日不能早於到職日。",
      RANGE_USED_EXCEEDS: "已休天數不能超過本週期特休天數。",
      INTERNAL: "處理時發生問題，請重試。",
    },
    stageUnder: "尚未取得特休：到職未滿六個月。",
    stageFirst: "已滿六個月未滿一年：本週期 3 天。",
    periodNone: "尚無本週期",
    feb29Note: "到職日為 2 月 29 日：非閏年的周年日以 2 月 28 日計算。",
  },
  en: {
    statusEmpty: "Enter a start date and a reference date, or load the example.",
    statusDirty: "Input changed. Run again.",
    statusBusy: "Working",
    statusCancelled: "Cancelled. You can run again.",
    statusSuccess: "Calculation complete.",
    exampleLoaded: "Example loaded (synthetic data). Select “Calculate leave” to run it.",
    todaySet: "Reference date set to today. Select “Calculate leave” to run it.",
    errors: {
      SCHEMA: "The input is malformed.",
      INPUT_LIMIT: "The input is too long.",
      UNICODE: "The input contains an incomplete character.",
      EMPTY: "This field is required.",
      DATE_FORMAT: "Use the YYYY-MM-DD date format.",
      INVALID_DATE: "This date does not exist.",
      RANGE_YEAR: "The year must be between 1900 and 2100.",
      INTEGER_FORMAT: "Enter used days as a whole number.",
      RANGE_USED_LIMIT: "Used days must be between 0 and 30.",
      DATE_ORDER: "The reference date cannot be before the start date.",
      RANGE_USED_EXCEEDS: "Used days cannot exceed this period's leave days.",
      INTERNAL: "Something went wrong. Try again.",
    },
    stageUnder: "No leave yet: under six months of service.",
    stageFirst: "Six months to one year: 3 days this period.",
    periodNone: "No current period yet",
    feb29Note: "Start date is Feb 29: in non-leap years the anniversary is Feb 28.",
  },
};

export function messagesFor(lang) {
  return MESSAGES[lang] ?? MESSAGES.en;
}

// Maps a core error {code, field} plus the current draft to the pinned
// localized message. RANGE has three pinned variants, separated by field
// and by whether the used-days value itself is out of the 0-30 range.
export function errorMessage(messages, error, draft) {
  const table = messages.errors;
  if (!error) return "";
  if (error.code === "RANGE") {
    if (error.field === "usedDays") {
      const raw = draft && typeof draft.usedDays === "string" ? draft.usedDays : "";
      const value = /^(0|[1-9][0-9]*)$/.test(raw) ? Number(raw) : Number.NaN;
      if (Number.isInteger(value) && value > 30) return table.RANGE_USED_LIMIT;
      return table.RANGE_USED_EXCEEDS;
    }
    return table.RANGE_YEAR;
  }
  return table[error.code] ?? table.INTERNAL;
}
