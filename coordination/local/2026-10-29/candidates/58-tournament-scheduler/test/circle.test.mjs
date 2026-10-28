import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRounds, validateSchedule, buildOpponentIndex } from '../public/js/core/circle.mjs';

const four = ['A', 'B', 'C', 'D'];
const pairs = rounds => rounds.map(round => round.matches.map(({ home, away }) => [home, away]));

test('A01: hand-written exact stable pairing order and opponent entries', () => {
  const rounds = generateRounds(four, { cycles: 1, courts: 2 });
  assert.deepEqual(pairs(rounds), [[['A', 'D'], ['B', 'C']], [['A', 'C'], ['D', 'B']], [['A', 'B'], ['C', 'D']]]);
  assert.deepEqual(rounds[0], { round: 1, cycle: 1, bye: null, matches: [
    { id: 'C1-R1-S1-M1', home: 'A', away: 'D', slot: 1, court: 1, startOffsetMinutes: null, endOffsetMinutes: null },
    { id: 'C1-R1-S1-M2', home: 'B', away: 'C', slot: 1, court: 2, startOffsetMinutes: null, endOffsetMinutes: null }
  ] });
  assert.deepEqual(buildOpponentIndex(rounds, four)[0], { team: 'A', entries: [
    { opponent: 'D', round: 1, cycle: 1, status: 'played' },
    { opponent: 'C', round: 2, cycle: 1, status: 'played' },
    { opponent: 'B', round: 3, cycle: 1, status: 'played' }
  ] });
});

test('A02: five-team exact byes and matchups', () => {
  const rounds = generateRounds(['A', 'B', 'C', 'D', 'E'], { cycles: 1, courts: 2 });
  assert.deepEqual(rounds.map(round => round.bye), ['A', 'D', 'B', 'E', 'C']);
  assert.deepEqual(pairs(rounds), [[['B', 'E'], ['C', 'D']], [['A', 'E'], ['B', 'C']], [['A', 'D'], ['E', 'C']], [['A', 'C'], ['D', 'B']], [['A', 'B'], ['D', 'E']]]);
  assert.equal(rounds.flatMap(round => round.matches).length, 10);
});

test('A03/A20: double round robin exact reverse order; every selected team has both cycles', () => {
  const rounds = generateRounds(four, { cycles: 2, courts: 2 });
  assert.deepEqual(pairs(rounds).slice(3), [[['D', 'A'], ['C', 'B']], [['C', 'A'], ['B', 'D']], [['B', 'A'], ['D', 'C']]]);
  assert.deepEqual(buildOpponentIndex(rounds, four)[1].entries, [
    { opponent: 'C', round: 1, cycle: 1, status: 'played' },
    { opponent: 'D', round: 2, cycle: 1, status: 'played' },
    { opponent: 'A', round: 3, cycle: 1, status: 'played' },
    { opponent: 'C', round: 4, cycle: 2, status: 'played' },
    { opponent: 'D', round: 5, cycle: 2, status: 'played' },
    { opponent: 'A', round: 6, cycle: 2, status: 'played' }
  ]);
});

test('A04/A05/A06/A14: two and 32 teams; reject invalid inputs and courts', () => {
  assert.deepEqual(pairs(generateRounds(['A', 'B'], { cycles: 1, courts: 1 })), [[['A', 'B']]]);
  const teams = Array.from({ length: 32 }, (_, i) => `Fake${i}`);
  const rounds = generateRounds(teams, { cycles: 1, courts: 16 });
  assert.equal(rounds.length, 31);
  assert.equal(rounds.flatMap(round => round.matches).length, 496);
  for (const courts of [0, 1.5, 17, NaN, Infinity, '1']) assert.throws(() => generateRounds(four, { cycles: 1, courts }), /INVALID_INPUT/);
  for (const teams of [['A'], Array(33).fill('A'), ['A', 'A'], ['A\nB', 'C']]) assert.throws(() => generateRounds(teams, { cycles: 1, courts: 1 }));
  for (const cycles of [0, 3, '1']) assert.throws(() => generateRounds(four, { cycles, courts: 1 }));
  assert.throws(() => generateRounds(four, { cycles: 1, courts: 1, extra: true }));
});

test('A09/A10: six teams split slots without filling missing courts from later rounds', () => {
  const teams = ['A', 'B', 'C', 'D', 'E', 'F'];
  const one = generateRounds(teams, { cycles: 1, courts: 1 });
  assert.deepEqual(one[0].matches.map(match => [match.home, match.away, match.slot, match.court]), [['A', 'F', 1, 1], ['B', 'E', 2, 1], ['C', 'D', 3, 1]]);
  const two = generateRounds(teams, { cycles: 1, courts: 2 });
  assert.deepEqual(two[0].matches.map(match => [match.slot, match.court]), [[1, 1], [1, 2], [2, 1]]);
  assert.equal(two[0].matches.length, 3);
});

test('A16: independent full pair/direction/round/slot oracle across all 992 parameter combinations', () => {
  let combinations = 0;
  for (let n = 2; n <= 32; n++) for (const cycles of [1, 2]) for (let courts = 1; courts <= 16; courts++) {
    combinations++;
    const teams = Array.from({ length: n }, (_, i) => `T${i}`);
    const frozenTeams = [...teams];
    const schedule = generateRounds(teams, { cycles, courts });
    const perCycle = n % 2 ? n : n - 1;
    assert.equal(schedule.length, perCycle * cycles);
    const counts = Array.from({ length: n }, () => Array(n).fill(0));
    const directed = Array.from({ length: n }, () => Array(n).fill(0));
    const byeCounts = Array.from({ length: cycles }, () => Array(n).fill(0));
    schedule.forEach((round, ri) => {
      assert.equal(round.round, ri + 1);
      assert.equal(round.cycle, Math.floor(ri / perCycle) + 1);
      assert.equal(round.matches.length, Math.floor(n / 2));
      const used = new Set();
      const occupied = new Set();
      round.matches.forEach((match, mi) => {
        assert.ok(teams.includes(match.home) && teams.includes(match.away));
        assert.notEqual(match.home, match.away);
        assert.equal(used.has(match.home), false);
        assert.equal(used.has(match.away), false);
        used.add(match.home); used.add(match.away);
        const a = teams.indexOf(match.home), b = teams.indexOf(match.away);
        counts[Math.min(a, b)][Math.max(a, b)]++;
        directed[a][b]++;
        assert.equal(match.slot, Math.floor(mi / courts) + 1);
        assert.equal(match.court, mi % courts + 1);
        assert.equal(occupied.has(`${match.slot}/${match.court}`), false);
        occupied.add(`${match.slot}/${match.court}`);
      });
      if (n % 2) {
        assert.ok(teams.includes(round.bye));
        assert.equal(used.has(round.bye), false);
        byeCounts[round.cycle - 1][teams.indexOf(round.bye)]++;
        used.add(round.bye);
      } else assert.equal(round.bye, null);
      assert.equal(used.size, n);
    });
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      assert.equal(counts[a][b], cycles);
      if (cycles === 2) { assert.equal(directed[a][b], 1); assert.equal(directed[b][a], 1); }
    }
    if (n % 2) byeCounts.flat().forEach(count => assert.equal(count, 1));
    assert.deepEqual(teams, frozenTeams);
    assert.deepEqual(validateSchedule(schedule, { teams, cycles, courts }), []);
  }
  assert.equal(combinations, 992);
});

test('validator semantic counterexamples: corrupt pair, direction, bye, slot and shape cannot pass', () => {
  for (const corrupt of [
    s => { s[0].matches[0].home = 'B'; },
    s => { s[3].matches[0].home = 'A'; s[3].matches[0].away = 'D'; },
    s => { s[0].bye = 'A'; },
    s => { s[0].matches[0].court = 2; },
    s => { s[0].matches[0].extra = true; },
    s => { s[0].matches[0].endOffsetMinutes = 10; }
  ]) {
    const schedule = generateRounds(four, { cycles: 2, courts: 2 });
    corrupt(schedule);
    assert.ok(validateSchedule(schedule, { teams: four, cycles: 2, courts: 2 }).length > 0);
  }
});
