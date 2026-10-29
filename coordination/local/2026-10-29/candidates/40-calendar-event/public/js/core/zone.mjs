import { exactRecord, fail, parseCivilDate, parseClock, civilEpoch } from './date.mjs';

export const ZONES = Object.freeze(['UTC', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Hong_Kong', 'Asia/Singapore', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney']);

export function createZoneResolver(formatterFactory = (zone) => new Intl.DateTimeFormat('en-GB', {
  timeZone: zone, calendar: 'gregory', numberingSystem: 'latn',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
  minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})) {
  const formatters = new Map();
  return function resolveLocal(input) {
    exactRecord(input, ['date', 'time', 'zone']);
    const { date, time, zone } = input;
    const civil = parseCivilDate(date);
    const clock = parseClock(time);
    if (typeof zone !== 'string' || !ZONES.includes(zone)) fail('UNSUPPORTED_ZONE', 'zone');
    try {
      if (!formatters.has(zone)) {
        const formatter = formatterFactory(zone);
        const options = formatter.resolvedOptions();
        if (options.calendar !== 'gregory' || options.numberingSystem !== 'latn' || options.hourCycle !== 'h23' ||
            options.timeZone !== zone) fail('UNSUPPORTED_ZONE', 'zone');
        formatters.set(zone, formatter);
      }
      const formatter = formatters.get(zone);
      const wall = civilEpoch(civil) + clock.hour * 3_600_000 + clock.minute * 60_000;
      const candidates = [];
      for (let step = -64; step <= 64; step++) {
        const epochMs = wall + step * 15 * 60_000;
        const parts = formatter.formatToParts(epochMs);
        const parsed = Object.create(null);
        const fields = ['year', 'month', 'day', 'hour', 'minute', 'second'];
        for (const part of parts) {
          if (!fields.includes(part.type)) { if (part.type !== 'literal') fail('UNSUPPORTED_ZONE', 'zone'); continue; }
          if (Object.hasOwn(parsed, part.type) || !/^\d{1,4}$/.test(part.value)) fail('UNSUPPORTED_ZONE', 'zone');
          parsed[part.type] = Number(part.value);
        }
        if (fields.some(key => !Object.hasOwn(parsed, key)) || parsed.year < 1999 || parsed.year > 2100 ||
            parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31 ||
            parsed.hour > 23 || parsed.minute > 59 || parsed.second > 59) fail('UNSUPPORTED_ZONE', 'zone');
        const readback = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
        if (readback.getUTCMonth() !== parsed.month - 1 || readback.getUTCDate() !== parsed.day) fail('UNSUPPORTED_ZONE', 'zone');
        const formattedWall = readback.getTime() + parsed.hour * 3_600_000 + parsed.minute * 60_000 + parsed.second * 1000;
        const observedOffset = (formattedWall - epochMs) / 60_000;
        if (!Number.isInteger(observedOffset) || Math.abs(observedOffset) > 960 || observedOffset % 15 !== 0) fail('UNSUPPORTED_ZONE', 'zone');
        if (parsed.year === civil.year && parsed.month === civil.month && parsed.day === civil.day &&
            parsed.hour === clock.hour && parsed.minute === clock.minute && parsed.second === 0) {
          candidates.push({ epochMs, offsetMinutes: (wall - epochMs) / 60_000 });
        }
      }
      const unique = [...new Map(candidates.map(c => [c.epochMs, c])).values()].sort((a, b) => a.epochMs - b.epochMs);
      if (unique.length > 2) fail('UNSUPPORTED_ZONE', 'zone');
      return { candidates: unique };
    } catch { fail('UNSUPPORTED_ZONE', 'zone'); }
  };
}

export const resolveLocal = createZoneResolver();
export function formatOffset(minutes) {
  if (!Number.isInteger(minutes) || Math.abs(minutes) > 960 || minutes % 15 !== 0) fail('UNSUPPORTED_ZONE', 'zone');
  return `UTC${minutes < 0 ? '-' : '+'}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, '0')}:${String(Math.abs(minutes) % 60).padStart(2, '0')}`;
}
