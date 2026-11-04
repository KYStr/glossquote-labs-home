import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT } from './check.mjs';
import { generateRounds } from '../public/js/core/circle.mjs';
import { scheduleRounds } from '../public/js/core/timing.mjs';
import { serializeSchedule } from '../public/js/core/output.mjs';

const root = join(PROJECT_ROOT, 'evidence/m1/output-fixtures-verified');
await mkdir(root); // Immutable synthetic artifacts, no replacement of an earlier run.
const fixtures = [
  { id: 'five-single-zh', teams: ['A', 'B', 'C', 'D', 'E'], cycles: 1, courts: 2, timing: null, locale: 'zh-Hant', rounds: 5, matches: 10 },
  { id: 'five-single-en', teams: ['A', 'B', 'C', 'D', 'E'], cycles: 1, courts: 2, timing: null, locale: 'en', rounds: 5, matches: 10 },
  { id: 'four-timed-en', teams: ['A', 'B', 'C', 'D'], cycles: 1, courts: 1, timing: { startDate: '2026-10-23', startTime: '09:00', matchMinutes: 60, changeoverMinutes: 10 }, locale: 'en', rounds: 3, matches: 6 },
  { id: 'midnight-zh', teams: ['A', 'B'], cycles: 1, courts: 1, timing: { startDate: '2026-10-23', startTime: '23:30', matchMinutes: 90, changeoverMinutes: 15 }, locale: 'zh-Hant', rounds: 1, matches: 1 },
  { id: 'max-32-double-en', teams: Array.from({ length: 32 }, (_, i) => `Fake${i}`), cycles: 2, courts: 1, timing: { startDate: '2099-12-31', startTime: '23:59', matchMinutes: 1440, changeoverMinutes: 120 }, locale: 'en', rounds: 62, matches: 992 }
];
const files = [];
for (const fixture of fixtures) {
  const options = { cycles: fixture.cycles, courts: fixture.courts, timing: fixture.timing };
  const generated = scheduleRounds(generateRounds(fixture.teams, { cycles: fixture.cycles, courts: fixture.courts }), fixture.timing);
  const output = serializeSchedule(generated, options, fixture.teams, { locale: fixture.locale });
  assert.equal(output.ok, true);
  await mkdir(join(root, fixture.id));
  for (const [filename, bytes] of [['round-robin.txt', output.txtBytes], ['round-robin.json', output.jsonBytes]]) {
    const path = `${fixture.id}/${filename}`;
    await writeFile(join(root, path), bytes, { flag: 'wx' });
    const actual = await readFile(join(root, path));
    assert.ok(actual.equals(Buffer.from(bytes)));
    files.push({ path, bytes: actual.length, sha256: createHash('sha256').update(actual).digest('hex') });
  }
}

// Independently re-open the written artifacts. No core validator or generated expected data.
for (const fixture of fixtures) {
  const doc = JSON.parse(await readFile(join(root, fixture.id, 'round-robin.json'), 'utf8'));
  const txt = await readFile(join(root, fixture.id, 'round-robin.txt'), 'utf8');
  assert.deepEqual(Object.keys(doc).sort(), ['opponents', 'options', 'rounds', 'schema', 'teams', 'version']);
  assert.equal(doc.schema, 'gq.round-robin');
  assert.equal(doc.version, 1);
  assert.deepEqual(doc.teams, fixture.teams);
  assert.equal(doc.rounds.length, fixture.rounds);
  assert.equal(doc.rounds.flatMap(round => round.matches).length, fixture.matches);
  const pairCount = new Map();
  const directed = new Set();
  const byeCount = new Map(fixture.teams.map(team => [team, 0]));
  for (const round of doc.rounds) {
    const used = new Set();
    for (const match of round.matches) {
      assert.ok(fixture.teams.includes(match.home) && fixture.teams.includes(match.away));
      assert.equal(used.has(match.home), false); assert.equal(used.has(match.away), false);
      used.add(match.home); used.add(match.away);
      const key = JSON.stringify([match.home, match.away].sort());
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
      if (fixture.cycles === 2) {
        const direction = JSON.stringify([match.home, match.away]);
        assert.equal(directed.has(direction), false);
        directed.add(direction);
      }
    }
    if (round.bye !== null) {
      assert.equal(used.has(round.bye), false);
      assert.ok(byeCount.has(round.bye));
      byeCount.set(round.bye, byeCount.get(round.bye) + 1);
    }
  }
  for (let a = 0; a < fixture.teams.length; a++) for (let b = a + 1; b < fixture.teams.length; b++) {
    assert.equal(pairCount.get(JSON.stringify([fixture.teams[a], fixture.teams[b]].sort())), fixture.cycles);
  }
  assert.equal(doc.opponents.length, fixture.teams.length);
  for (const team of doc.opponents) {
    assert.equal(team.entries.length, fixture.rounds);
    assert.equal(team.entries.filter(entry => entry.status === 'played').length, (fixture.teams.length - 1) * fixture.cycles);
    assert.equal(team.entries.filter(entry => entry.status === 'bye').length, fixture.teams.length % 2 ? fixture.cycles : 0);
    if (fixture.teams.length % 2) assert.equal(byeCount.get(team.team), fixture.cycles);
  }
  if (fixture.id.startsWith('five-single-')) {
    assert.deepEqual(doc.rounds.map(round => round.bye), ['A', 'D', 'B', 'E', 'C']);
    assert.deepEqual(doc.rounds.map(round => round.matches.map(match => [match.home, match.away])), [[['B', 'E'], ['C', 'D']], [['A', 'E'], ['B', 'C']], [['A', 'D'], ['E', 'C']], [['A', 'C'], ['D', 'B']], [['A', 'B'], ['D', 'E']]]);
    assert.ok(txt.includes(fixture.locale === 'en' ? 'Round 5 (Cycle 1)' : '輪次 5 (循環 1)'));
  }
  if (fixture.id === 'four-timed-en') {
    assert.deepEqual(doc.rounds.flatMap(round => round.matches).map(match => match.startOffsetMinutes), [0, 70, 140, 210, 280, 350]);
    assert.equal(doc.rounds.at(-1).matches.at(-1).endOffsetMinutes, 410);
    for (const time of ['09:00', '10:10', '11:20', '12:30', '13:40', '14:50', '15:50']) assert.ok(txt.includes(`2026-10-23 ${time}`));
  }
  if (fixture.id === 'midnight-zh') {
    assert.equal(doc.rounds[0].matches[0].endOffsetMinutes, 90);
    assert.ok(txt.includes('2026-10-24 01:00 (+1 day)'));
  }
  if (fixture.id === 'max-32-double-en') {
    assert.equal(doc.rounds.at(-1).matches.at(-1).startOffsetMinutes, 1545960);
    assert.equal(doc.rounds.at(-1).matches.at(-1).endOffsetMinutes, 1547400);
    assert.ok(txt.includes('2102-12-11 13:59 (+1075 day)'));
  }
}
await writeFile(join(root, 'manifest.json'), `${JSON.stringify({ schema: 'gq.m1-artifacts', version: 1, data: 'synthetic-only', verification: 'read actual UTF-8 files; independent fixed oracle and full pair counter', fixtures: fixtures.map(({ id, rounds, matches }) => ({ id, rounds, matches })), files }, null, 2)}\n`, { flag: 'wx' });
process.stdout.write(`PASS: ${fixtures.length} synthetic schedules, ${files.length} real TXT/JSON files; independent content checks and SHA-256.\n`);
