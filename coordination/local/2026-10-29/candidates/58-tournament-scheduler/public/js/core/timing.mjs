import { InputError } from './teams.mjs';

const fields = ['startDate', 'startTime', 'matchMinutes', 'changeoverMinutes'];
const leap = year => year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
export const daysInMonth = (year, month) => [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];

function integer(value, min, max) {
  if (typeof value === 'string' && !/^\d{1,4}$/u.test(value)) return false;
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  return Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
}

export function parseTiming(input) {
  if (input === null) return { ok: true, timing: null, errors: [] };
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join('|') !== [...fields].sort().join('|')) {
    return { ok: false, timing: null, errors: [{ code: 'TIMING_GROUP', field: 'timing' }] };
  }
  const missing = fields.filter(field => input[field] === '' || input[field] === null || input[field] === undefined);
  if (missing.length === fields.length) return { ok: true, timing: null, errors: [] };
  if (missing.length) return { ok: false, timing: null, errors: [{ code: 'TIMING_GROUP', field: 'timing' }] };
  const errors = [];
  const date = typeof input.startDate === 'string' && /^(20\d{2})-(\d{2})-(\d{2})$/u.exec(input.startDate);
  if (!date || Number(date[2]) < 1 || Number(date[2]) > 12 || Number(date[3]) < 1 || Number(date[3]) > daysInMonth(Number(date[1]), Number(date[2]))) {
    errors.push({ code: 'START_DATE', field: 'startDate' });
  }
  if (typeof input.startTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(input.startTime)) errors.push({ code: 'START_TIME', field: 'startTime' });
  if (!integer(input.matchMinutes, 1, 1440)) errors.push({ code: 'MATCH_MINUTES', field: 'matchMinutes' });
  if (!integer(input.changeoverMinutes, 0, 120)) errors.push({ code: 'CHANGEOVER_MINUTES', field: 'changeoverMinutes' });
  if (errors.length) return { ok: false, timing: null, errors };
  return { ok: true, timing: { startDate: input.startDate, startTime: input.startTime, matchMinutes: Number(input.matchMinutes), changeoverMinutes: Number(input.changeoverMinutes) }, errors: [] };
}

export function scheduleRounds(rounds, timingInput) {
  const parsed = parseTiming(timingInput);
  if (!parsed.ok) throw new InputError(parsed.errors);
  if (!Array.isArray(rounds) || rounds.length < 1 || rounds.length > 62) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
  let cursor = 0;
  const timing = parsed.timing;
  return rounds.map(round => {
    if (!Array.isArray(round.matches) || round.matches.length < 1 || round.matches.length > 16) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
    let maxSlot = 0;
    const matches = round.matches.map(match => {
      if (!Number.isInteger(match.slot) || match.slot < 1 || match.slot > 16) throw new InputError([{ code: 'SCHEDULE', field: 'teams' }]);
      maxSlot = Math.max(maxSlot, match.slot);
      const start = timing ? cursor + (match.slot - 1) * (timing.matchMinutes + timing.changeoverMinutes) : null;
      return { ...match, startOffsetMinutes: start, endOffsetMinutes: timing ? start + timing.matchMinutes : null };
    });
    if (timing) cursor += maxSlot * (timing.matchMinutes + timing.changeoverMinutes);
    return { ...round, matches };
  });
}

export function formatMoment(timingInput, offsetMinutes) {
  const parsed = parseTiming(timingInput);
  if (!parsed.ok || !parsed.timing || !Number.isSafeInteger(offsetMinutes) || offsetMinutes < 0 || offsetMinutes > 1547400) {
    throw new InputError([{ code: 'TIMING_OFFSET', field: 'timing' }]);
  }
  const timing = parsed.timing;
  let [year, month, day] = timing.startDate.split('-').map(Number);
  const [hour, minute] = timing.startTime.split(':').map(Number);
  const absolute = hour * 60 + minute + offsetMinutes;
  const dayOffset = Math.floor(absolute / 1440);
  // Small bounded Gregorian civil arithmetic; never consult the machine timezone or DST.
  day += dayOffset;
  while (day > daysInMonth(year, month)) {
    day -= daysInMonth(year, month);
    month++;
    if (month === 13) { month = 1; year++; }
  }
  const pad = value => String(value).padStart(2, '0');
  const localMinute = absolute % 1440;
  const date = `${year}-${pad(month)}-${pad(day)}`;
  const time = `${pad(Math.floor(localMinute / 60))}:${pad(localMinute % 60)}`;
  return { date, time, dayOffset, text: `${date} ${time}${dayOffset ? ` (+${dayOffset} day)` : ''}` };
}

export function formatRange(timing, match) {
  return timing ? `${formatMoment(timing, match.startOffsetMinutes).text} – ${formatMoment(timing, match.endOffsetMinutes).text}` : null;
}
