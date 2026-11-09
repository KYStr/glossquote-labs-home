export const WEEKDAYS = Object.freeze({
  'zh-Hant': Object.freeze(['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']),
  en: Object.freeze(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
});

export function serializePlanReport(plan, locale) {
  if (!plan || plan.kind !== 'plan' || !['scheduled', 'no-remaining-pages'].includes(plan.status) || typeof plan.title !== 'string') throw new TypeError('PLAN_REQUIRED');
  if (!Object.hasOwn(WEEKDAYS, locale)) throw new TypeError('LOCALE_INVALID');
  const s = plan.summary;
  const zh = locale === 'zh-Hant';
  const zero = plan.status === 'no-remaining-pages';
  const lines = zh ? [
    'Gloss Tools｜閱讀進度規劃',
    `書名：${plan.title || '未填'}`,
    zero ? '狀態：已無剩餘頁。這不代表曾記錄全書實際完成閱讀。' : '狀態：這只是一份計畫，不代表實際追蹤完成閱讀。',
    `總頁數：${s.totalPages}`, `已讀頁數：${s.completedPages}`, `剩餘頁數：${s.remainingPages}`,
    `日期範圍：${s.selectedStartDate} 至 ${s.selectedEndDate}`
  ] : [
    'Gloss Tools | Reading plan', `Book title: ${plan.title || 'Not provided'}`,
    zero ? 'Status: No pages remain. This does not record that the book was actually completed.' : 'Status: This is a plan. It does not track pages actually read.',
    `Total pages: ${s.totalPages}`, `Pages completed: ${s.completedPages}`, `Pages remaining: ${s.remainingPages}`,
    `Date range: ${s.selectedStartDate} to ${s.selectedEndDate}`
  ];
  if (zero) lines.push(zh ? '本計畫沒有每日排程。' : 'There is no daily schedule for this plan.');
  else {
    lines.push(zh ? `可讀日：${s.eligibleDayCount}；每日最低需求：${s.minimumPagesPerReadingDay} 頁` : `Available reading days: ${s.eligibleDayCount}; minimum pages per reading day: ${s.minimumPagesPerReadingDay}`);
    lines.push(zh ? `最後閱讀日：${s.lastReadingDate}；閱讀日：${s.readingDays}；彈性／休息日：${s.flexibleDays}` : `Last reading day: ${s.lastReadingDate}; reading days: ${s.readingDays}; flexible/rest days: ${s.flexibleDays}`);
    for (const row of plan.schedule) {
      const weekday = WEEKDAYS[locale][row.isoWeekday - 1];
      lines.push(zh ? `${row.date}｜${weekday}｜${row.kind === 'flex' ? '彈性／休息' : `頁碼 ${row.pageStart}–${row.pageEnd}（${row.pagesPerDay} 頁）`}` : `${row.date} | ${weekday} | ${row.kind === 'flex' ? 'Flexible / rest' : `Pages ${row.pageStart}–${row.pageEnd} (${row.pagesPerDay} pages)`}`);
    }
  }
  return lines.join('\n');
}
