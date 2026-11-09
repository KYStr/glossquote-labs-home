import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateEvent } from '../public/js/core/event.mjs';
import { serializeIcs, foldLine, escapeText, utcStamp, MAX_FILE_BYTES } from '../public/js/core/ics.mjs';

const meta = { uid: '00000000-0000-4000-8000-000000000001@glossquote.com', dtstamp: '20261022T000000Z' };
const draft = overrides => ({ mode: 'timed', title: '範例活動', location: '', notes: '', startDate: '2026-10-22', startTime: '09:00', endDate: '2026-10-22', endTime: '10:00', zone: 'Asia/Taipei', ...overrides });
const event = overrides => { const validated = validateEvent(draft(overrides)); assert.equal(validated.ok, true); return validated.event; };
// Independent reader: split physical bytes first, unfold, parse at first colon only.
function readIcs(output) {
  const bytes = Buffer.from(output, 'utf8');
  assert.notEqual(bytes.subarray(0, 3).toString('hex'), 'efbbbf');
  assert.equal(bytes.includes(0), false); assert.ok(output.endsWith('\r\n'));
  assert.equal(output.replaceAll('\r\n', '').includes('\n'), false);
  assert.equal(output.replaceAll('\r\n', '').includes('\r'), false);
  const physical = output.split('\r\n').slice(0, -1);
  for (const line of physical) assert.ok(Buffer.byteLength(line) <= 75);
  const logical = [];
  for (const line of physical) {
    if (line.startsWith(' ')) logical[logical.length - 1] += line.slice(1);
    else logical.push(line);
  }
  return logical.map(line => { const colon = line.indexOf(':'); return [line.slice(0, colon), line.slice(colon + 1)]; });
}
function decodeText(text) {
  let output = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\\') output += text[i];
    else { i++; assert.ok(['\\', ',', ';', 'n'].includes(text[i])); output += text[i] === 'n' ? '\n' : text[i]; }
  }
  return output;
}

test('C18 exact hand-written full ICS fixture, final CRLF, order, single event', async () => {
  const actual = serializeIcs(event(), meta);
  const fixture = await readFile(new URL('./fixtures/taipei.ics', import.meta.url));
  assert.deepEqual(Buffer.from(actual, 'utf8'), fixture);
  const fields = readIcs(actual);
  assert.deepEqual(fields, [
    ['BEGIN', 'VCALENDAR'], ['VERSION', '2.0'], ['PRODID', '-//GlossQuote Labs//Calendar Event 1.0//EN'], ['CALSCALE', 'GREGORIAN'],
    ['BEGIN', 'VEVENT'], ['UID', '00000000-0000-4000-8000-000000000001@glossquote.com'], ['DTSTAMP', '20261022T000000Z'],
    ['DTSTART', '20261022T010000Z'], ['DTEND', '20261022T020000Z'], ['SUMMARY', '範例活動'], ['END', 'VEVENT'], ['END', 'VCALENDAR'],
  ]);
  assert.ok(Buffer.byteLength(actual) <= MAX_FILE_BYTES);
});
test('C10 C11 date-only exclusive end, no time zone or time', () => {
  for (const [startDate, lastDate, expectedEnd] of [['2026-10-22', '2026-10-22', '20261023'], ['2024-02-28', '2024-02-29', '20240301']]) {
    const input = { mode: 'all-day', title: 'All day', location: '', notes: '', startDate, lastDate };
    const fields = Object.fromEntries(readIcs(serializeIcs(validateEvent(input).event, meta)));
    assert.equal(fields['DTSTART;VALUE=DATE'], startDate.replaceAll('-', '')); assert.equal(fields['DTEND;VALUE=DATE'], expectedEnd);
    assert.equal(fields.DTSTART, undefined); assert.equal(fields.TZID, undefined);
  }
});
test('C13 C14 escaped text round-trips and CRLF injection cannot create a property', () => {
  const title = '範例, semicolon; back\\slash: <b>plain text</b>';
  const fields = readIcs(serializeIcs(event({ title, location: 'Room A,B;C\\D', notes: 'A\r\nATTENDEE:evil\rEND:VEVENT\nURL:https://invalid.example/' }), meta));
  const properties = Object.fromEntries(fields);
  assert.equal(decodeText(properties.SUMMARY), title);
  assert.equal(decodeText(properties.LOCATION), 'Room A,B;C\\D');
  assert.equal(properties.DESCRIPTION, 'A\\nATTENDEE:evil\\nEND:VEVENT\\nURL:https://invalid.example/');
  assert.equal(decodeText(properties.DESCRIPTION), 'A\nATTENDEE:evil\nEND:VEVENT\nURL:https://invalid.example/');
  assert.equal(fields.filter(([name]) => name === 'ATTENDEE' || name === 'URL').length, 0);
  assert.equal(fields.filter(([name, value]) => name === 'END' && value === 'VEVENT').length, 1);
  assert.equal(escapeText('a:b,c;d\\e\r\nf'), 'a:b\\,c\\;d\\\\e\\nf');
});
test('C15 exact 75 octets; continuation leading space counted; mixed Unicode unfolds without corruption', () => {
  assert.deepEqual(foldLine('a'.repeat(75)), ['a'.repeat(75)]);
  assert.deepEqual(foldLine('a'.repeat(76)), ['a'.repeat(75), ' a']);
  assert.deepEqual(foldLine('a'.repeat(74) + '😀'), ['a'.repeat(74), ' 😀']);
  assert.deepEqual(foldLine('中'.repeat(25) + '🙂'.repeat(19)), ['中'.repeat(25), ' ' + '🙂'.repeat(18), ' 🙂']);
  for (let length = 68; length <= 80; length++) {
    const logical = 'x'.repeat(length) + '😀中,;\\'.repeat(50);
    const folded = foldLine(logical);
    assert.equal(folded.map((line, i) => i ? line.slice(1) : line).join(''), logical);
    for (const line of folded) { assert.ok(Buffer.byteLength(line) <= 75); assert.ok(line.isWellFormed()); }
  }
  const notes = '中😀,;\\\n'.repeat(500);
  const fields = Object.fromEntries(readIcs(serializeIcs(event({ title: '😀'.repeat(120), notes }), meta)));
  assert.equal(decodeText(fields.SUMMARY), '😀'.repeat(120)); assert.equal(decodeText(fields.DESCRIPTION), notes);
});
test('C16 metadata schema, strict uid/stamp/date, normalized event rejection', () => {
  for (const invalid of ['', 'a@evil.example', meta.uid + '\r\nURL:evil', 5]) assert.throws(() => serializeIcs(event(), { ...meta, uid: invalid }), { code: 'INVALID_UID' });
  for (const dtstamp of ['20250229T000000Z', '20261022T240000Z', '20261022T000060Z', '20261022T000000', '2026-10-22T00:00:00Z', '20261022T000000Z\n', null]) assert.throws(() => serializeIcs(event(), { ...meta, dtstamp }), { code: 'INVALID_STAMP' });
  assert.throws(() => serializeIcs(event(), { ...meta, extra: true }), { code: 'INVALID_SCHEMA' });
  for (const changed of [{ title: '\udfff' }, { notes: 'A\0B' }, { title: ' padded ' }, { title: 'A\nB' }, { durationMs: -1 }, { extra: true }]) assert.throws(() => serializeIcs({ ...event(), ...changed }, meta));
  assert.throws(() => foldLine('A\nB'), { code: 'INVALID_CONTENT_LINE' });
  assert.throws(() => foldLine('\ud800'), { code: 'INVALID_CONTENT_LINE' });
  assert.throws(() => escapeText('A\0B'), { code: 'INVALID_TEXT' });
});
test('Maximum legal input remains under 64KiB; absent optional properties omitted', () => {
  const actual = serializeIcs(event({ title: '😀'.repeat(120), location: '😀'.repeat(200), notes: '😀'.repeat(4000) }), meta);
  assert.ok(Buffer.byteLength(actual) < 20000); readIcs(actual);
  const names = readIcs(serializeIcs(event(), meta)).map(([name]) => name);
  for (const forbidden of ['LOCATION', 'DESCRIPTION', 'METHOD', 'VALARM', 'ATTENDEE', 'ORGANIZER', 'URL', 'RRULE', 'TZID', 'VTIMEZONE']) assert.equal(names.includes(forbidden), false);
  assert.equal(utcStamp(Date.UTC(2026, 9, 22, 0, 1, 2, 999)), '20261022T000102Z');
});
