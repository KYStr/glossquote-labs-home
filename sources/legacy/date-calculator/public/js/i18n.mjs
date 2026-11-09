import { parseDate, weekdayFromOrdinal } from "./core/dates.mjs";

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key]);
  }
  return Object.freeze(value);
}

const MESSAGES = deepFreeze({
  "zh-Hant": {
    weekdays: ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"],
    months: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    dateLabel: "{year} 年 {month} 月 {day} 日（{weekday}）",
    summary: {
      diff: "開始：{start}；結束：{end}。",
      after: "{base} 加 {days} {unit}，結果為 {result}。",
      before: "{base} 減 {days} {unit}，結果為 {result}。",
      same: "{result}，與基準日期 {base}相同。",
      dayUnits: ["天", "天"],
    },
    empty: {
      diff: "輸入兩個日期，查看日期差。",
      offset: "輸入基準日期與加減天數。",
    },
    errors: {
      DATE_TOO_LONG: "日期文字過長，最多可輸入 32 個字元。",
      DATE_FORMAT: "請使用 YYYY-MM-DD 日期格式。",
      DATE_RANGE: "支援日期為 0001-01-01 至 9999-12-31。",
      INVALID_DATE: "此日期不存在，請檢查年份、月份與日期。",
      DAYS_FORMAT: "請輸入整數天數，例如 7 或 -7。",
      DAYS_RANGE: "天數須介於 -3652058 至 3652058。",
      RESULT_RANGE: "結果超出支援日期範圍，請調整日期或天數。",
      INVALID_REQUEST: "無法計算此輸入，請檢查欄位後重試。",
    },
    direction: {
      forward: "結束日期晚於開始日期。",
      backward: "結束日期早於開始日期。",
      same: "兩個日期相同。",
    },
    status: {
      diff: "日期差 {delta} 天；含起訖日 {inclusive} 天。",
      offset: "結果日期：{iso}。",
    },
    offsetRule: "正數往後，負數往前，0 表示同一天。",
  },
  en: {
    weekdays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    dateLabel: "{weekday}, {day} {month} {year}",
    summary: {
      diff: "Start: {start}; end: {end}.",
      after: "{result} is {days} {unit} after {base}.",
      before: "{result} is {days} {unit} before {base}.",
      same: "{result} is the same date as {base}.",
      dayUnits: ["day", "days"],
    },
    empty: {
      diff: "Enter two dates to see their difference.",
      offset: "Enter a base date and a day offset.",
    },
    errors: {
      DATE_TOO_LONG: "The date text is too long. Enter no more than 32 characters.",
      DATE_FORMAT: "Use the YYYY-MM-DD date format.",
      DATE_RANGE: "Supported dates are 0001-01-01 through 9999-12-31.",
      INVALID_DATE: "This date does not exist. Check the year, month, and day.",
      DAYS_FORMAT: "Enter a whole number of days, such as 7 or -7.",
      DAYS_RANGE: "Enter a day count from -3652058 to 3652058.",
      RESULT_RANGE: "The result is outside the supported date range. Adjust the date or day count.",
      INVALID_REQUEST: "This input cannot be calculated. Check the fields and try again.",
    },
    direction: {
      forward: "The end date is after the start date.",
      backward: "The end date is before the start date.",
      same: "The dates are the same.",
    },
    status: {
      diff: "Date difference: {delta} days; inclusive count: {inclusive} days.",
      offset: "Result date: {iso}.",
    },
    offsetRule: "Positive days move forward; negative days move backward; 0 keeps the same date.",
  },
});

export function getMessages(lang) {
  return lang === "en" ? MESSAGES.en : MESSAGES["zh-Hant"];
}

export function formatDateSummary(raw, lang) {
  const parsed = parseDate(raw);
  if (!parsed.ok) return parsed;
  const index = weekdayFromOrdinal(parsed.value.ordinal);
  if (!index.ok) return index;
  const messages = getMessages(lang);
  const { iso, year, month, day } = parsed.value;
  const weekday = messages.weekdays[index.value];
  const label = messages.dateLabel
    .replace("{year}", String(year).padStart(4, "0"))
    .replace("{month}", messages.months[month - 1])
    .replace("{day}", String(day))
    .replace("{weekday}", weekday);
  return { ok: true, value: { iso, weekdayIndex: index.value, weekday, label } };
}
