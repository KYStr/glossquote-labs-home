import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRounds } from '../public/js/core/circle.mjs';
import { scheduleRounds } from '../public/js/core/timing.mjs';
import { serializeSchedule, encodeOutputPair, MAX_OUTPUT_BYTES, DOWNLOAD_NAMES } from '../public/js/core/output.mjs';

const teams = ['A', 'B'];
const options = { cycles: 1, courts: 2, timing: null };
const decoder = new TextDecoder('utf-8', { fatal: true });

test('exact schema 1 JSON and complete hand-written A/B TXT content', () => {
  const output = serializeSchedule(generateRounds(teams, optionsForCore()), options, teams);
  assert.equal(output.ok, true);
  assert.deepEqual(JSON.parse(decoder.decode(output.jsonBytes)), {
    schema: 'gq.round-robin', version: 1, options: { cycles: 1, courts: 2, timing: null }, teams: ['A', 'B'],
    rounds: [{ round: 1, cycle: 1, bye: null, matches: [{ id: 'C1-R1-S1-M1', home: 'A', away: 'B', slot: 1, court: 1, startOffsetMinutes: null, endOffsetMinutes: null }] }],
    opponents: [
      { team: 'A', entries: [{ opponent: 'B', round: 1, cycle: 1, status: 'played' }] },
      { team: 'B', entries: [{ opponent: 'A', round: 1, cycle: 1, status: 'played' }] }
    ]
  });
  assert.equal(decoder.decode(output.txtBytes), [
    'Round-robin schedule', 'Teams: 2 | Cycles: 1 | Courts: 2',
    'Home/away are labels only. No rest-time optimization. Civil times only; no timezone or DST conversion.',
    'One changeover between actual slots, including rounds; none after the final match.', 'No times assigned.', '',
    'Round 1 (Cycle 1)', 'Slot 1 | Court 1 | Home: "A" | Away: "B"', '', 'Team opponent lists', '',
    'Teams: "A"', 'Round 1 (Cycle 1) | Slot 1 | Court 1 | Home: "A" | Away: "B"', '',
    'Teams: "B"', 'Round 1 (Cycle 1) | Slot 1 | Court 1 | Home: "A" | Away: "B"', ''
  ].join('\n'));
});

function optionsForCore() { return { cycles: 1, courts: 2 }; }

test('A17: markup-like, formula-like and Unicode names remain literal text; filenames fixed', () => {
  const names = ['<script>alert(1)</script>', '=1+1', '隊伍😀'];
  const result = serializeSchedule(generateRounds(names, optionsForCore()), options, names, { locale: 'zh-Hant' });
  const json = JSON.parse(decoder.decode(result.jsonBytes));
  assert.deepEqual(json.teams, names);
  assert.ok(decoder.decode(result.txtBytes).includes('"<script>alert(1)</script>"'));
  assert.ok(decoder.decode(result.txtBytes).includes('輪空'));
  assert.deepEqual(DOWNLOAD_NAMES, { txt: 'round-robin.txt', json: 'round-robin.json' });
});

test('A18: actual shared byte gate accepts exactly 2 MiB and rejects one UTF-8 byte more atomically', () => {
  const exact = encodeOutputPair('é'.repeat(524288), 'x'.repeat(1048576));
  assert.equal(exact.ok, true);
  assert.equal(exact.txtBytes.byteLength + exact.jsonBytes.byteLength, 2097152);
  const over = encodeOutputPair('é'.repeat(524288), `${'x'.repeat(1048576)}x`);
  assert.deepEqual(over, { ok: false, code: 'OUTPUT_LIMIT', actualBytes: 2097153 });
  assert.equal('txtBytes' in over, false);
  assert.equal('jsonBytes' in over, false);
  assert.throws(() => encodeOutputPair('a', 'b', MAX_OUTPUT_BYTES + 1));
});

test('serializer invokes byte gate on its actual complete pair, including exact and one-below custom limits', () => {
  const schedule = generateRounds(teams, optionsForCore());
  const result = serializeSchedule(schedule, options, teams);
  const length = result.txtBytes.byteLength + result.jsonBytes.byteLength;
  assert.equal(serializeSchedule(schedule, options, teams, { maxBytes: length }).ok, true);
  assert.deepEqual(serializeSchedule(schedule, options, teams, { maxBytes: length - 1 }), { ok: false, code: 'OUTPUT_LIMIT', actualBytes: length });
});

test('A20: full 5-team double-cycle exports contain every match, all byes, both directions and opponent entries', () => {
  const names = ['A', 'B', 'C', 'D', 'E'];
  const opts = { cycles: 2, courts: 1, timing: null };
  const output = serializeSchedule(generateRounds(names, { cycles: 2, courts: 1 }), opts, names);
  const doc = JSON.parse(decoder.decode(output.jsonBytes));
  assert.equal(doc.rounds.length, 10);
  assert.equal(doc.rounds.flatMap(round => round.matches).length, 20);
  assert.deepEqual(doc.opponents[0].entries.filter(entry => entry.status === 'bye').map(entry => entry.round), [1, 6]);
  assert.deepEqual(doc.opponents[0].entries.filter(entry => entry.status === 'played').map(entry => entry.opponent), ['E', 'D', 'C', 'B', 'E', 'D', 'C', 'B']);
  assert.ok(decoder.decode(output.txtBytes).includes('Round 10 (Cycle 2)'));
});

test('A12 serialized timed exports include actual dates +N day and exact offset values', () => {
  const opts = { cycles: 1, courts: 1, timing: { startDate: '2026-10-23', startTime: '23:30', matchMinutes: 90, changeoverMinutes: 15 } };
  const rounds = scheduleRounds(generateRounds(teams, { cycles: 1, courts: 1 }), opts.timing);
  const output = serializeSchedule(rounds, opts, teams, { locale: 'zh-Hant' });
  assert.ok(decoder.decode(output.txtBytes).includes('2026-10-24 01:00 (+1 day)'));
  assert.equal(JSON.parse(decoder.decode(output.jsonBytes)).rounds[0].matches[0].endOffsetMinutes, 90);
  rounds[0].matches[0].endOffsetMinutes = 91;
  assert.throws(() => serializeSchedule(rounds, opts, teams), /INVALID_INPUT/);
});

test('maximum 992 matches serialize completely with short names, long-name over-limit output fails atomically', () => {
  const names = Array.from({ length: 32 }, (_, i) => `Fake${i}`);
  const opts = { cycles: 2, courts: 1, timing: { startDate: '2099-12-31', startTime: '23:59', matchMinutes: 1440, changeoverMinutes: 120 } };
  const rounds = scheduleRounds(generateRounds(names, { cycles: 2, courts: 1 }), opts.timing);
  const output = serializeSchedule(rounds, opts, names);
  assert.equal(output.ok, true);
  const doc = JSON.parse(decoder.decode(output.jsonBytes));
  assert.equal(doc.rounds.flatMap(round => round.matches).length, 992);
  assert.equal(doc.opponents.flatMap(item => item.entries).length, 1984);
  const longNames = Array.from({ length: 32 }, (_, i) => `${String(i).padStart(2, '0')}${'😀'.repeat(78)}`);
  const longRounds = scheduleRounds(generateRounds(longNames, { cycles: 2, courts: 1 }), opts.timing);
  const over = serializeSchedule(longRounds, opts, longNames);
  assert.equal(over.ok, false);
  assert.equal(over.code, 'OUTPUT_LIMIT');
  assert.ok(over.actualBytes > 2097152);
  assert.equal('txtBytes' in over, false);
});
