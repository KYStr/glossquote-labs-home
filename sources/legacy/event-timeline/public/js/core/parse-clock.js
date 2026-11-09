export function parseClock(raw) {
  if (typeof raw !== 'string' || raw.length !== 5 || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(raw)) return { ok: false, code: 'TIME_FORMAT' };
  return { ok: true, minuteOfDay: Number(raw.slice(0, 2)) * 60 + Number(raw.slice(3)) };
}

export function formatClock(minuteOfDay) {
  if (!Number.isSafeInteger(minuteOfDay) || minuteOfDay < 0 || minuteOfDay > 1439) throw new RangeError('Invalid clock minute');
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`;
}
