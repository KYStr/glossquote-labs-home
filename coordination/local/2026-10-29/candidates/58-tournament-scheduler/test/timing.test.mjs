import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRounds } from '../public/js/core/circle.mjs';
import { parseTiming, scheduleRounds, formatMoment } from '../public/js/core/timing.mjs';

const timing = { startDate: '2026-10-23', startTime: '09:00', matchMinutes: 60, changeoverMinutes: 10 };

test('A11: exact six starts, round transitions and final end without trailing changeover', () => {
  const original = generateRounds(['A', 'B', 'C', 'D'], { cycles: 1, courts: 1 });
  const rounds = scheduleRounds(original, timing);
  const matches = rounds.flatMap(round => round.matches);
  assert.deepEqual(matches.map(match => match.startOffsetMinutes), [0, 70, 140, 210, 280, 350]);
  assert.deepEqual(matches.map(match => formatMoment(timing, match.startOffsetMinutes).time), ['09:00', '10:10', '11:20', '12:30', '13:40', '14:50']);
  assert.equal(formatMoment(timing, matches.at(-1).endOffsetMinutes).text, '2026-10-23 15:50');
  assert.equal(original[0].matches[0].startOffsetMinutes, null);
});

test('A10 timing: partially used final slot consumes one slot, same-slot games are simultaneous', () => {
  const rounds = scheduleRounds(generateRounds(['A', 'B', 'C', 'D', 'E', 'F'], { cycles: 1, courts: 2 }), timing);
  assert.deepEqual(rounds.slice(0, 2).map(round => round.matches.map(match => [match.startOffsetMinutes, match.endOffsetMinutes])), [
    [[0, 60], [0, 60], [70, 130]], [[140, 200], [140, 200], [210, 270]]
  ]);
  assert.equal(rounds.at(-1).matches.at(-1).endOffsetMinutes, 690);
});

test('A12: exact midnight rollover date and +1 day label; no final changeover', () => {
  const input = { ...timing, startTime: '23:30', matchMinutes: 90, changeoverMinutes: 15 };
  const match = scheduleRounds(generateRounds(['A', 'B'], { cycles: 1, courts: 1 }), input)[0].matches[0];
  assert.equal(match.endOffsetMinutes, 90);
  assert.deepEqual(formatMoment(input, 90), { date: '2026-10-24', time: '01:00', dayOffset: 1, text: '2026-10-24 01:00 (+1 day)' });
});

test('A13: full timing group required; absent timing keeps both offsets null', () => {
  assert.equal(parseTiming({ startDate: '', startTime: '09:00', matchMinutes: '', changeoverMinutes: '' }).errors[0].code, 'TIMING_GROUP');
  assert.equal(parseTiming({ startTime: '09:00' }).ok, false);
  assert.equal(parseTiming({ startDate: '', startTime: '', matchMinutes: '', changeoverMinutes: '' }).timing, null);
  const rounds = scheduleRounds(generateRounds(['A', 'B'], { cycles: 1, courts: 16 }), null);
  assert.equal(rounds[0].matches[0].startOffsetMinutes, null);
  assert.equal(rounds[0].matches[0].endOffsetMinutes, null);
});

test('civil dates, leap years, time and duration boundaries reject malformed values', () => {
  for (const startDate of ['1999-12-31', '2100-01-01', '2026-02-29', '2000-02-30', '2026-04-31', '2026-00-10', '2026-13-01', '2026-01-00', '2026-1-01', '2026-01-01Z']) assert.equal(parseTiming({ ...timing, startDate }).ok, false);
  for (const startTime of ['24:00', '09:60', '9:00', '09:00:00', '09:00Z']) assert.equal(parseTiming({ ...timing, startTime }).ok, false);
  for (const matchMinutes of [0, 1441, 1.5, '1e2', Infinity]) assert.equal(parseTiming({ ...timing, matchMinutes }).ok, false);
  for (const changeoverMinutes of [-1, 121, ' ', null]) assert.equal(parseTiming({ ...timing, changeoverMinutes }).ok, false);
  assert.equal(parseTiming({ ...timing, startDate: '2000-02-29', matchMinutes: 1440, changeoverMinutes: 120 }).ok, true);
  assert.equal(formatMoment({ ...timing, startDate: '2000-02-28', startTime: '00:00' }, 2880).date, '2000-03-01');
  assert.equal(formatMoment({ ...timing, startDate: '2099-12-31', startTime: '00:00' }, 60 * 24 * 60).date, '2100-03-01');
  assert.throws(() => formatMoment(timing, -1));
});

test('maximum 992 single-court slots have exact bounded offsets and a real 2102 civil end', () => {
  const input = { startDate: '2099-12-31', startTime: '23:59', matchMinutes: 1440, changeoverMinutes: 120 };
  const teams = Array.from({ length: 32 }, (_, i) => `Fake${i}`);
  const match = scheduleRounds(generateRounds(teams, { cycles: 2, courts: 1 }), input).at(-1).matches.at(-1);
  assert.equal(match.startOffsetMinutes, 1545960);
  assert.equal(match.endOffsetMinutes, 1547400);
  assert.equal(formatMoment(input, match.endOffsetMinutes).text, '2102-12-11 13:59 (+1075 day)');
});
