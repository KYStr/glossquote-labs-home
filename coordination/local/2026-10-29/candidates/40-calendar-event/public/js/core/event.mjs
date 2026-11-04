import { CalendarError, DAY_MS, exactRecord, fail, parseCivilDate, parseClock, civilEpoch, isoCivil, normalizedText } from './date.mjs';
import { resolveLocal, ZONES } from './zone.mjs';

const COMMON = ['mode', 'title', 'location', 'notes'];
const TIMED = ['startDate', 'startTime', 'endDate', 'endTime', 'zone', 'startChoice', 'endChoice'];
const ALL_DAY = ['startDate', 'lastDate'];

export function validateEvent(draft, resolver = resolveLocal) {
  const errors = [];
  const ambiguities = {};
  function collect(fn) {
    try { return fn(); }
    catch (error) {
      errors.push({ code: error instanceof CalendarError ? error.code : 'INVALID_SCHEMA', field: error instanceof CalendarError ? error.field : 'form' });
      return undefined;
    }
  }
  const schema = collect(() => {
    exactRecord(draft, [...COMMON, ...TIMED, ...ALL_DAY], COMMON);
    if (draft.mode !== 'timed' && draft.mode !== 'all-day') fail('INVALID_SCHEMA');
    const fields = draft.mode === 'timed' ? TIMED : ALL_DAY;
    exactRecord(draft, [...COMMON, ...fields], [...COMMON, ...fields.filter(key => !key.endsWith('Choice'))]);
    return true;
  });
  if (!schema) return { ok: false, errors, ambiguities };
  const title = collect(() => normalizedText(draft.title, 'title', 120, { required: true }));
  const location = collect(() => normalizedText(draft.location, 'location', 200));
  const notes = collect(() => normalizedText(draft.notes, 'notes', 4000, { multiline: true }));
  const start = collect(() => parseCivilDate(draft.startDate, 'startDate'));
  let event;
  if (draft.mode === 'all-day') {
    const last = collect(() => parseCivilDate(draft.lastDate, 'lastDate'));
    if (start && last) collect(() => {
      const days = (civilEpoch(last) - civilEpoch(start)) / DAY_MS + 1;
      if (days < 1) fail('LAST_BEFORE_START', 'lastDate');
      if (days > 366) fail('EVENT_TOO_LONG', 'lastDate');
      if (draft.lastDate > '2099-12-30') fail('LAST_DATE_LIMIT', 'lastDate');
      event = { mode: 'all-day', title, location, notes, startDate: draft.startDate, lastDate: draft.lastDate,
        exclusiveEnd: isoCivil(civilEpoch(last) + DAY_MS), days };
    });
  } else {
    const end = collect(() => parseCivilDate(draft.endDate, 'endDate'));
    const startClock = collect(() => parseClock(draft.startTime, 'startTime'));
    const endClock = collect(() => parseClock(draft.endTime, 'endTime'));
    const zone = collect(() => {
      if (typeof draft.zone !== 'string' || !ZONES.includes(draft.zone)) fail('UNSUPPORTED_ZONE', 'zone');
      return draft.zone;
    });
    for (const key of ['startChoice', 'endChoice']) collect(() => {
      if (Object.hasOwn(draft, key) && !['', 'early', 'late'].includes(draft[key])) fail('INVALID_CHOICE', key);
    });
    // Bound expensive Intl work to two endpoints, after all cheap input checks.
    if (errors.length) return { ok: false, errors, ambiguities };
    const selected = {};
    for (const [side, civil, clock] of [['start', start, startClock], ['end', end, endClock]]) {
      if (!civil || !clock || !zone) continue;
      collect(() => {
        let candidates;
        try { ({ candidates } = resolver({ date: draft[`${side}Date`], time: draft[`${side}Time`], zone })); }
        catch { fail('UNSUPPORTED_ZONE', 'zone'); }
        if (!Array.isArray(candidates) || candidates.length > 2 || candidates.some(c =>
          !Number.isSafeInteger(c.epochMs) || !Number.isInteger(c.offsetMinutes) || Math.abs(c.offsetMinutes) > 960 || c.offsetMinutes % 15 !== 0)) fail('UNSUPPORTED_ZONE', 'zone');
        if (candidates.length === 0) fail('NONEXISTENT_TIME', `${side}Time`);
        if (candidates.length === 2) {
          ambiguities[side] = candidates;
          const choice = draft[`${side}Choice`];
          if (choice !== 'early' && choice !== 'late') fail('AMBIGUOUS_TIME', `${side}Choice`);
          selected[side] = candidates[choice === 'early' ? 0 : 1];
        } else selected[side] = candidates[0];
      });
    }
    if (selected.start && selected.end) collect(() => {
      const durationMs = selected.end.epochMs - selected.start.epochMs;
      if (durationMs <= 0) fail('END_NOT_AFTER_START', 'endTime');
      if (durationMs > 366 * DAY_MS) fail('EVENT_TOO_LONG', 'endDate');
      event = { mode: 'timed', title, location, notes, zone, startDate: draft.startDate, startTime: draft.startTime,
        endDate: draft.endDate, endTime: draft.endTime, start: selected.start, end: selected.end,
        startChoice: candidatesChoice(ambiguities.start, draft.startChoice), endChoice: candidatesChoice(ambiguities.end, draft.endChoice), durationMs };
    });
  }
  return errors.length || !event ? { ok: false, errors, ambiguities } : { ok: true, event, errors: [], ambiguities };
}

function candidatesChoice(candidates, choice) { return candidates ? choice : ''; }
