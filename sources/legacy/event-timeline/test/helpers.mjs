export const R = (id = 'r1', nameRaw = 'A', durationMinutesRaw = '1', noteRaw = '') => ({ id, nameRaw, durationMinutesRaw, noteRaw });
export const D = (startTimeRaw = '09:00', targetTimeRaw = '', targetNextDay = false, rows = [R()]) => ({ startTimeRaw, targetTimeRaw, targetNextDay, rows });
export const validRows = count => Array.from({ length: count }, (_, index) => R(`r${index + 1}`));
export const E = (code, field = null, rowId = null) => ({ ok: false, error: { code, field, rowId } });
export const exampleDraft = () => D('09:00', '10:00', false, [R('r1', ' 開場 ', '10'), R('r2', '討論', '35'), R('r3', '休息', '10')]);
export const normalizedExample = {
  startMinuteOfDay: 540, target: { minuteOfDay: 600, dayOffset: 0, absoluteMinute: 600 },
  rows: [{ id: 'r1', name: '開場', durationMinutes: 10, note: '' }, { id: 'r2', name: '討論', durationMinutes: 35, note: '' }, { id: 'r3', name: '休息', durationMinutes: 10, note: '' }], totalMinutes: 55
};
export const exampleSchedule = {
  startMinuteOfDay: 540, totalMinutes: 55, endAbsoluteMinute: 595, endMinuteOfDay: 595, endDayOffset: 0,
  rows: [
    { id: 'r1', name: '開場', durationMinutes: 10, note: '', startAbsoluteMinute: 540, endAbsoluteMinute: 550, startMinuteOfDay: 540, endMinuteOfDay: 550, startDayOffset: 0, endDayOffset: 0 },
    { id: 'r2', name: '討論', durationMinutes: 35, note: '', startAbsoluteMinute: 550, endAbsoluteMinute: 585, startMinuteOfDay: 550, endMinuteOfDay: 585, startDayOffset: 0, endDayOffset: 0 },
    { id: 'r3', name: '休息', durationMinutes: 10, note: '', startAbsoluteMinute: 585, endAbsoluteMinute: 595, startMinuteOfDay: 585, endMinuteOfDay: 595, startDayOffset: 0, endDayOffset: 0 }
  ], targetComparison: { targetAbsoluteMinute: 600, targetMinuteOfDay: 600, targetDayOffset: 0, differenceMinutes: 5, relation: 'early' }
};
export const zhReport = 'GlossQuote 活動時間表\n開始\t09:00\n01\t09:00–09:10\t開場\t10 分鐘\n02\t09:10–09:45\t討論\t35 分鐘\n03\t09:45–09:55\t休息\t10 分鐘\n總長\t55 分鐘\n結束\t09:55\n目標\t10:00（當日）\n差異\t提早 5 分鐘';
export const enReport = 'GlossQuote Event Timeline\nStart\t09:00\n01\t09:00–09:10\tOpening\t10 min\n02\t09:10–09:45\tDiscussion\t35 min\n03\t09:45–09:55\tBreak\t10 min\nTotal\t55 min\nEnd\t09:55\nTarget\t10:00 (same day)\nDifference\t5 min early';
