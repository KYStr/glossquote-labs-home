import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseAgenda } from '../public/js/core/analyse.mjs';
import { serializeAgendaReport, packageReportTexts, MAX_OUTPUT_BYTES, formatMinute } from '../public/js/core/output.mjs';
import { session, rawAgenda, validated } from './fixtures.mjs';

test('JSON roundtrip matches the full hand-written schema1 A01 oracle', () => {
  const agenda = validated(rawAgenda([
    session('A', { title: '開場' }), session('B', { title: '問答', speakerIndexes: [1], start: '09:30', end: '10:30' })
  ], { rooms: ['Room 1'], speakers: ['Alex', 'Blair'] }));
  const serialized = serializeAgendaReport(analyseAgenda(agenda));
  assert.equal(serialized.ok, true);
  assert.deepEqual(JSON.parse(serialized.files.json.text), {
    schema: 'gq.agenda-check', version: 1, settings: { transitionMinutes: 10 },
    coverage: { checkedPairs: 1, roomUnassignedSessionIds: [], speakerUnassignedSessionIds: [] },
    sessions: [
      { id: 'A', title: '開場', room: 'Room 1', speakers: ['Alex'], startMinute: 540, endMinute: 600 },
      { id: 'B', title: '問答', room: 'Room 1', speakers: ['Blair'], startMinute: 570, endMinute: 630 }
    ],
    overlapPairs: [{ sessionIds: ['A', 'B'], reasons: ['room_overlap'], sharedSpeakers: [] }], transitionWarnings: [],
    roomSchedules: [{ room: 'Room 1', sessions: [{ id: 'A', startMinute: 540, endMinute: 600 }, { id: 'B', startMinute: 570, endMinute: 630 }] }],
    speakerSchedules: [
      { speaker: 'Alex', sessions: [{ id: 'A', startMinute: 540, endMinute: 600 }] },
      { speaker: 'Blair', sessions: [{ id: 'B', startMinute: 570, endMinute: 630 }] }
    ]
  });
  assert.equal(serialized.files.json.name, 'agenda-conflicts.json');
  assert.equal(serialized.files.txt.name, 'agenda-conflicts.txt');
  assert.equal(serialized.files.json.type, 'application/json;charset=utf-8');
  assert.equal(serialized.files.txt.type, 'text/plain;charset=utf-8');
  for (const file of Object.values(serialized.files)) assert.equal(file.bytes, Buffer.byteLength(file.text, 'utf8'));
  assert.equal(serialized.totalBytes, Buffer.byteLength(serialized.files.json.text + serialized.files.txt.text, 'utf8'));
});

test('A09 English TXT has exact coverage, unassigned wording and every original session', () => {
  const result = analyseAgenda(validated(rawAgenda([session('A', { title: 'Opening', roomIndex: null, speakerIndexes: [] })], { rooms: [], speakers: [] })));
  const serialized = serializeAgendaReport(result, { language: 'en' });
  assert.equal(serialized.files.txt.text, `Agenda correction list and schedules
One local civil day and time zone; intervals [start,end). No automatic rescheduling.

Coverage
Session pairs checked: 0
Required: 10 min
Room unassigned: A
Speakers unassigned: A
Conflicts for unassigned resources cannot be determined. Assign them and check again.
No conflicts found for assigned resources; unassigned resources could not be checked.

Overlap errors (0)
None

Short transition warnings (0)
None

Room schedules
None

Speaker schedules
None

All sessions (input order)
A 09:00–10:00 | Opening | Unassigned | Unassigned
`);
  const parsed = JSON.parse(serialized.files.json.text);
  assert.deepEqual(parsed.roomSchedules, []);
  assert.deepEqual(parsed.speakerSchedules, []);
  assert.equal(parsed.sessions[0].room, null);
});

test('A16 script-like names/titles stay literal in both real outputs', () => {
  const title = '<script>alert(1)</script>';
  const room = '<img src=x onerror=alert(1)>';
  const result = analyseAgenda(validated(rawAgenda([session('A', { title })], { rooms: [room], speakers: ['<b>Fake</b>'] })));
  const serialized = serializeAgendaReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(JSON.parse(serialized.files.json.text).sessions[0].title, title);
  assert.equal(JSON.parse(serialized.files.json.text).sessions[0].room, room);
  assert.ok(serialized.files.txt.text.includes(title));
  assert.ok(serialized.files.txt.text.includes(room));
  assert.equal(serialized.files.txt.name, 'agenda-conflicts.txt');
});

test('TXT contains merged reasons, directed transitions and complete resource schedules', () => {
  const result = analyseAgenda(validated(rawAgenda([
    session('Later', { roomIndex: 1, start: '10:05', end: '11:00', speakerIndexes: [0, 1] }),
    session('Early', { speakerIndexes: [0, 1] }),
    session('Clash', { start: '09:30', end: '09:45', speakerIndexes: [0, 1] })
  ])));
  const txt = serializeAgendaReport(result, { language: 'en' }).files.txt.text;
  assert.ok(txt.includes('Early ↔ Clash | Room overlap + Speaker clash | Shared speakers: S, T'));
  assert.ok(txt.includes('Early → Later | R1 → R2 | Shared speakers: S, T | Gap: 5 min; Required: 10 min'));
  assert.ok(txt.includes('Room schedules\nR1\n  Early 09:00–10:00'));
  assert.ok(txt.includes('Speaker schedules\nS\n  Early 09:00–10:00'));
  assert.ok(txt.includes('All sessions (input order)\nLater 10:05–11:00'));
});

test('A18 byte gate accepts exactly 2MiB and rejects one additional UTF-8 byte atomically', () => {
  const json = '{}\n';
  const txt = 'x'.repeat(2097149);
  assert.equal(MAX_OUTPUT_BYTES, 2097152);
  const atLimit = packageReportTexts(json, txt);
  assert.equal(atLimit.ok, true);
  assert.equal(atLimit.totalBytes, 2097152);
  assert.equal(atLimit.files.txt.text.length, 2097149);
  assert.deepEqual(packageReportTexts(json, `${txt}x`), { ok: false, code: 'OUTPUT_LIMIT' });
  assert.deepEqual(packageReportTexts(json, `${txt.slice(0, -1)}é`), { ok: false, code: 'OUTPUT_LIMIT' });
  assert.equal(packageReportTexts(json, `${txt.slice(0, -2)}é`).ok, true);
});

test('A18 serializer applies combined byte cap without partial artifacts or mutating result', () => {
  const result = analyseAgenda(validated(rawAgenda()));
  const original = structuredClone(result);
  const full = serializeAgendaReport(result);
  assert.equal(serializeAgendaReport(result, { maxBytes: full.totalBytes }).ok, true);
  assert.deepEqual(serializeAgendaReport(result, { maxBytes: full.totalBytes - 1 }), { ok: false, code: 'OUTPUT_LIMIT' });
  assert.deepEqual(result, original);
  for (const maxBytes of [-1, 2.5, Infinity, MAX_OUTPUT_BYTES + 1]) assert.deepEqual(serializeAgendaReport(result, { maxBytes }), { ok: false, code: 'OUTPUT_LIMIT' });
});

test('A18 a valid dense bounded agenda exceeding the cap rejects both complete reports', () => {
  const result = analyseAgenda(validated(rawAgenda(
    Array.from({ length: 200 }, (_, index) => session(`S${index}`, { speakerIndexes: [0, 1, 2, 3, 4] })),
    { speakers: Array.from({ length: 5 }, (_, index) => `${index}${'界'.repeat(79)}`) }
  )));
  assert.equal(result.conflicts.length, 19900);
  assert.deepEqual(serializeAgendaReport(result), { ok: false, code: 'OUTPUT_LIMIT' });
});

test('formatMinute renders exact endpoint minutes without date or timezone conversion', () => {
  assert.deepEqual([formatMinute(0), formatMinute(540), formatMinute(1439)], ['00:00', '09:00', '23:59']);
});
