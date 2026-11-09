const en = {
  initial: 'Choose a start and end date, enter the page counts, then create a plan.',
  changed: 'Your inputs changed. The old plan was cleared. Recalculate to see an updated plan.',
  create: 'Create reading plan', recalculate: 'Recalculate plan',
  invalid: 'Check the highlighted inputs', infeasible: 'The daily cap is too low', scheduled: 'Your reading plan',
  zero: 'No pages remain. This does not record that the book was actually completed.',
  noSchedule: 'There is no daily schedule for this plan.',
  planOnly: 'This is a plan. It does not track pages actually read.',
  remaining: 'Pages remaining', available: 'Available reading days', minimum: 'Minimum pages per reading day',
  last: 'Last reading day', readingDays: 'Reading days', flexibleDays: 'Flexible / rest days',
  cap: 'Daily page cap', capacity: 'Page capacity', shortfall: 'Page shortfall', minDays: 'Minimum reading days needed',
  adjust: 'No schedule was created. Add reading days, extend the date range, or raise the daily cap.',
  flex: 'Flexible / rest', pages: (a, b) => `Pages ${a}–${b}`, count: (n) => `${n} pages`,
  unnamed: 'Untitled book', copy: 'Copy plan', copying: 'Copying…', copied: 'Reading plan copied.',
  copyDenied: 'Clipboard access was denied. Select the report in the text box and copy it manually.',
  downloaded: 'TXT download requested. Your browser manages the downloaded file.',
  downloadFailed: 'The TXT could not be prepared. Select the report and copy it manually.',
  textDates: 'Use text dates', nativeDates: 'Use date picker',
  dateTextHelp: 'Text dates: enter YYYY-MM-DD. Values are kept exactly as entered.',
  dateNativeHelp: 'Choose dates from 1900-01-01 through 2100-12-31. Both dates are included; at most 366 days.',
  dateModeError: 'Keep text mode until both dates are blank or valid YYYY-MM-DD dates from 1900 through 2100. Your text has been kept.',
  cleared: 'Inputs and plan cleared.',
  schema: 'The plan data could not be validated safely. Reload and enter it again.',
  type: 'This field has an invalid value type. Enter it again.',
  tooLong: 'This input is too long. Shorten it and try again.',
  titleLong: 'The title is too long. Shorten it and try again.',
  titleTrim: 'Shorten the title to 80 ordinary characters or fewer. Some symbols use more space.',
  titleUnicode: 'Remove control characters or an incomplete Unicode character.',
  totalRequired: 'Enter the total number of pages.', completedRequired: 'Enter pages completed; enter 0 if you have not started.',
  digits: 'Enter 1 to 5 digits (0–9) without spaces, commas, or symbols.',
  totalRange: 'Total pages must be from 1 to 10000.', completedRange: 'Pages completed must be from 0 through the total page count.',
  completedGreater: 'Pages completed cannot exceed total pages.',
  dateRequired: 'Choose both a start date and an end date.', dateFormat: 'Use YYYY-MM-DD, for example 2026-10-19.',
  dateInvalid: 'This date does not exist. Check the year, month, and day.',
  dateRange: 'Dates must be from 1900-01-01 through 2100-12-31.',
  dateOrder: 'The end date must be on or after the start date.', dateWindow: 'The inclusive date range can be at most 366 days. Shorten it.',
  weekdayEmpty: 'Select at least one reading weekday.', weekdayInvalid: 'Select one or more weekdays from Monday through Sunday.',
  noDays: 'No selected reading weekday falls within this date range. Change the dates or selected weekdays.',
  capFormat: 'Enter 1 to 5 digits (0–9), or leave the cap blank.', capRange: 'The daily cap must be from 1 to 10000, or blank.'
};
const zh = {
  initial: '選擇開始與截止日期、輸入頁數，再產生計畫。',
  changed: '資料已變更，舊計畫已清除。請重新計算。',
  create: '產生閱讀計畫', recalculate: '重新計算計畫',
  invalid: '請檢查標示的輸入欄位', infeasible: '每日上限不足以完成', scheduled: '你的閱讀計畫',
  zero: '已無剩餘頁。這不代表曾記錄全書實際完成閱讀。', noSchedule: '本計畫沒有每日排程。',
  planOnly: '這只是一份計畫，不代表實際追蹤完成閱讀。',
  remaining: '剩餘頁數', available: '可讀日', minimum: '每日最低需求頁數', last: '最後閱讀日',
  readingDays: '閱讀日', flexibleDays: '彈性／休息日', cap: '每日頁數上限', capacity: '可排容量（頁）',
  shortfall: '不足頁數', minDays: '至少需要的可讀日數', adjust: '這裡沒有排程。請增加可讀日、延長日期範圍，或提高每日上限。',
  flex: '彈性／休息', pages: (a, b) => `頁碼 ${a}–${b}`, count: (n) => `${n} 頁`, unnamed: '未填書名',
  copy: '複製計畫', copying: '複製中…', copied: '已複製閱讀計畫。',
  copyDenied: '無法使用剪貼簿。報告仍可在文字框中選取，請手動複製。',
  downloaded: '已請求下載 TXT。下載檔案由瀏覽器管理。', downloadFailed: '無法建立 TXT，請選取報告並手動複製。',
  textDates: '改用文字輸入日期', nativeDates: '改用日期選擇器',
  dateTextHelp: '文字日期：請輸入 YYYY-MM-DD，原始輸入會保持不變。',
  dateNativeHelp: '日期限 1900-01-01 至 2100-12-31。包含開始與截止日，最多 366 天。',
  dateModeError: '請先修正為 1900 至 2100 年的有效 YYYY-MM-DD 日期，或留空，再切換。已保留原始文字。',
  cleared: '輸入與計畫已清除。', schema: '無法安全檢查計畫資料。請重新整理並重新輸入。',
  type: '這個欄位格式不正確，請重新輸入。', tooLong: '輸入太長，請縮短後再試。',
  titleLong: '書名太長，請縮短後再試。', titleTrim: '書名最多 80 個一般字元；表情符號可能占用較多長度，請縮短後再試。',
  titleUnicode: '請移除控制字元或不完整的 Unicode 字元。',
  totalRequired: '請輸入總頁數。', completedRequired: '請輸入已讀頁數；若尚未開始，輸入 0。',
  digits: '請輸入 1 至 5 位數字（0–9），不要加入空格、逗號或符號。', totalRange: '總頁數必須介於 1 至 10000。',
  completedRange: '已讀頁數必須介於 0 與總頁數之間。', completedGreater: '已讀頁數不能大於總頁數。',
  dateRequired: '請選擇開始日期與截止日期。', dateFormat: '請使用 YYYY-MM-DD，例如 2026-10-19。',
  dateInvalid: '這不是有效日期，請檢查年、月與日。', dateRange: '日期必須介於 1900-01-01 與 2100-12-31。',
  dateOrder: '截止日期必須是開始日期當天或之後。', dateWindow: '日期區間含首尾最多 366 天，請縮短日期範圍。',
  weekdayEmpty: '至少選擇一個可讀星期。', weekdayInvalid: '請重新選擇星期一至星期日中的一個或多個日期。',
  noDays: '這段日期內沒有符合已選星期的可讀日。請更改日期或選取的星期。',
  capFormat: '請輸入 1 至 5 位數字（0–9），或留空不設上限。', capRange: '每日上限必須介於 1 至 10000，或留空。'
};
export const MESSAGES = Object.freeze({ 'zh-Hant': Object.freeze(zh), en: Object.freeze(en) });
const mapping = {
  TITLE_TYPE: 'type', TITLE_TOO_LONG: 'titleLong', TITLE_CONTROL: 'titleUnicode', TITLE_SURROGATE: 'titleUnicode', TITLE_TRIMMED_TOO_LONG: 'titleTrim',
  TOTAL_REQUIRED: 'totalRequired', TOTAL_FORMAT: 'digits', TOTAL_RANGE: 'totalRange',
  COMPLETED_REQUIRED: 'completedRequired', COMPLETED_FORMAT: 'digits', COMPLETED_RANGE: 'completedRange', COMPLETED_GT_TOTAL: 'completedGreater',
  DATE_ORDER: 'dateOrder', DATE_WINDOW_TOO_LONG: 'dateWindow', NO_READING_DAYS: 'noDays',
  WEEKDAYS_EMPTY: 'weekdayEmpty', DAILY_CAP_FORMAT: 'capFormat', DAILY_CAP_RANGE: 'capRange'
};
for (const prefix of ['TOTAL', 'COMPLETED', 'START_DATE', 'END_DATE', 'DAILY_CAP']) {
  mapping[`${prefix}_TYPE`] = 'type'; mapping[`${prefix}_TOO_LONG`] = 'tooLong';
}
for (const prefix of ['START_DATE', 'END_DATE']) {
  for (const [suffix, key] of Object.entries({ REQUIRED: 'dateRequired', FORMAT: 'dateFormat', INVALID: 'dateInvalid', RANGE: 'dateRange' })) mapping[`${prefix}_${suffix}`] = key;
}
for (const suffix of ['TYPE', 'SPARSE', 'EXTRA', 'INVALID', 'DUPLICATE']) mapping[`WEEKDAYS_${suffix}`] = 'weekdayInvalid';
for (const suffix of ['SHAPE', 'KEYS', 'ACCESSOR', 'UNINSPECTABLE']) mapping[`SCHEMA_${suffix}`] = 'schema';
export const ERROR_KEYS = Object.freeze(mapping);
export function errorMessage(code, locale) {
  const m = MESSAGES[locale];
  return m[ERROR_KEYS[code] ?? 'schema'];
}
