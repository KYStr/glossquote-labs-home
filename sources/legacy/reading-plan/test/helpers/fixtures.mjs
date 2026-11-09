export const P5 = Object.freeze({ titleRaw: '', totalPagesRaw: '100', completedPagesRaw: '40', startDateRaw: '2026-10-19', endDateRaw: '2026-10-23', weekdays: Object.freeze([1, 2, 3, 4, 5]), dailyCapRaw: '' });
export const input = (changes = {}) => ({ ...P5, weekdays: [...P5.weekdays], ...changes });
export const onePage = (changes = {}) => input({ totalPagesRaw: '1', completedPagesRaw: '0', ...changes });
export const P5_ROWS = [
  { date: '2026-10-19', isoWeekday: 1, pagesPerDay: 12, pageStart: 41, pageEnd: 52, kind: 'reading' },
  { date: '2026-10-20', isoWeekday: 2, pagesPerDay: 12, pageStart: 53, pageEnd: 64, kind: 'reading' },
  { date: '2026-10-21', isoWeekday: 3, pagesPerDay: 12, pageStart: 65, pageEnd: 76, kind: 'reading' },
  { date: '2026-10-22', isoWeekday: 4, pagesPerDay: 12, pageStart: 77, pageEnd: 88, kind: 'reading' },
  { date: '2026-10-23', isoWeekday: 5, pagesPerDay: 12, pageStart: 89, pageEnd: 100, kind: 'reading' }
];
export const P5_ZH = `Gloss Tools｜閱讀進度規劃
書名：未填
狀態：這只是一份計畫，不代表實際追蹤完成閱讀。
總頁數：100
已讀頁數：40
剩餘頁數：60
日期範圍：2026-10-19 至 2026-10-23
可讀日：5；每日最低需求：12 頁
最後閱讀日：2026-10-23；閱讀日：5；彈性／休息日：0
2026-10-19｜星期一｜頁碼 41–52（12 頁）
2026-10-20｜星期二｜頁碼 53–64（12 頁）
2026-10-21｜星期三｜頁碼 65–76（12 頁）
2026-10-22｜星期四｜頁碼 77–88（12 頁）
2026-10-23｜星期五｜頁碼 89–100（12 頁）`;
export const P5_EN = `Gloss Tools | Reading plan
Book title: Not provided
Status: This is a plan. It does not track pages actually read.
Total pages: 100
Pages completed: 40
Pages remaining: 60
Date range: 2026-10-19 to 2026-10-23
Available reading days: 5; minimum pages per reading day: 12
Last reading day: 2026-10-23; reading days: 5; flexible/rest days: 0
2026-10-19 | Monday | Pages 41–52 (12 pages)
2026-10-20 | Tuesday | Pages 53–64 (12 pages)
2026-10-21 | Wednesday | Pages 65–76 (12 pages)
2026-10-22 | Thursday | Pages 77–88 (12 pages)
2026-10-23 | Friday | Pages 89–100 (12 pages)`;
