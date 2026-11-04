import { DAY_MS, exactRecord, fail, normalizedText, parseCivilDate, parseClock, civilEpoch, isoCivil } from './date.mjs';
import { ZONES } from './zone.mjs';

export const PRODID = '-//GlossQuote Labs//Calendar Event 1.0//EN';
export const MAX_FILE_BYTES = 65_536;
const encoder = new TextEncoder();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@glossquote\.com$/i;

export function escapeText(text) {
  if (typeof text !== 'string' || text.length > 12000 || !text.isWellFormed() || /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/.test(text)) fail('INVALID_TEXT');
  return text.replace(/\r\n?/g, '\n').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export function foldLine(text) {
  if (typeof text !== 'string' || text.length > MAX_FILE_BYTES || !text.isWellFormed() || /[\u0000-\u001f\u007f-\u009f]/.test(text)) fail('INVALID_CONTENT_LINE');
  const lines = [];
  let line = ''; let bytes = 0;
  for (const point of text) {
    const size = encoder.encode(point).length;
    if (bytes + size > 75) { lines.push(line); line = ' '; bytes = 1; }
    line += point; bytes += size;
  }
  lines.push(line);
  return lines;
}

export function utcStamp(epochMs) {
  if (!Number.isSafeInteger(epochMs)) fail('INVALID_STAMP');
  const d = new Date(epochMs);
  if (!Number.isFinite(d.getTime()) || d.getUTCFullYear() < 1999 || d.getUTCFullYear() > 2100) fail('INVALID_STAMP');
  return d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
}

function checkStamp(stamp) {
  if (typeof stamp !== 'string' || !/^20\d{6}T\d{6}Z$/.test(stamp)) fail('INVALID_STAMP');
  const year = Number(stamp.slice(0, 4));
  const date = parseCivilDate(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`);
  const clock = parseClock(`${stamp.slice(9, 11)}:${stamp.slice(11, 13)}`);
  const second = Number(stamp.slice(13, 15));
  if (year !== date.year || second > 59 || !Number.isInteger(clock.hour)) fail('INVALID_STAMP');
}

function checkEvent(event) {
  const common = ['mode', 'title', 'location', 'notes', 'startDate'];
  const timed = ['zone', 'startTime', 'endDate', 'endTime', 'start', 'end', 'startChoice', 'endChoice', 'durationMs'];
  const allDay = ['lastDate', 'exclusiveEnd', 'days'];
  exactRecord(event, [...common, ...timed, ...allDay], common);
  if (!['timed', 'all-day'].includes(event.mode)) fail('INVALID_EVENT');
  exactRecord(event, [...common, ...(event.mode === 'timed' ? timed : allDay)]);
  const title = normalizedText(event.title, 'title', 120, { required: true });
  const location = normalizedText(event.location, 'location', 200);
  const notes = normalizedText(event.notes, 'notes', 4000, { multiline: true });
  if (title !== event.title || location !== event.location || notes !== event.notes) fail('INVALID_EVENT');
  const startDate = parseCivilDate(event.startDate);
  if (event.mode === 'all-day') {
    const last = parseCivilDate(event.lastDate);
    const days = (civilEpoch(last) - civilEpoch(startDate)) / DAY_MS + 1;
    if (days < 1 || days > 366 || event.lastDate > '2099-12-30' || event.days !== days || event.exclusiveEnd !== isoCivil(civilEpoch(last) + DAY_MS)) fail('INVALID_EVENT');
  } else {
    if (!ZONES.includes(event.zone) || !['', 'early', 'late'].includes(event.startChoice) || !['', 'early', 'late'].includes(event.endChoice)) fail('INVALID_EVENT');
    for (const side of ['start', 'end']) {
      const civil = parseCivilDate(event[`${side}Date`]); const clock = parseClock(event[`${side}Time`]);
      exactRecord(event[side], ['epochMs', 'offsetMinutes']);
      const { epochMs, offsetMinutes } = event[side];
      if (!Number.isSafeInteger(epochMs) || !Number.isInteger(offsetMinutes) || Math.abs(offsetMinutes) > 960 || offsetMinutes % 15 !== 0 ||
          epochMs + offsetMinutes * 60_000 !== civilEpoch(civil) + clock.hour * 3_600_000 + clock.minute * 60_000) fail('INVALID_EVENT');
    }
    const durationMs = event.end.epochMs - event.start.epochMs;
    if (durationMs <= 0 || durationMs > 366 * DAY_MS || event.durationMs !== durationMs) fail('INVALID_EVENT');
  }
}

// Receives the exact normalized event returned by validateEvent; never raw properties.
export function serializeIcs(event, metadata) {
  exactRecord(metadata, ['uid', 'dtstamp']);
  if (typeof metadata.uid !== 'string' || !UUID.test(metadata.uid)) fail('INVALID_UID');
  try { checkStamp(metadata.dtstamp); } catch { fail('INVALID_STAMP'); }
  checkEvent(event);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:${PRODID}`, 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${metadata.uid}`, `DTSTAMP:${metadata.dtstamp}`];
  if (event.mode === 'all-day') {
    lines.push(`DTSTART;VALUE=DATE:${event.startDate.replaceAll('-', '')}`, `DTEND;VALUE=DATE:${event.exclusiveEnd.replaceAll('-', '')}`);
  } else lines.push(`DTSTART:${utcStamp(event.start.epochMs)}`, `DTEND:${utcStamp(event.end.epochMs)}`);
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.notes) lines.push(`DESCRIPTION:${escapeText(event.notes)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  const output = lines.flatMap(foldLine).join('\r\n') + '\r\n';
  if (encoder.encode(output).length > MAX_FILE_BYTES) fail('FILE_TOO_LARGE');
  return output;
}
