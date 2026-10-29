import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseAgenda, analysePair, aggregateAgenda, createPairJobs } from '../public/js/core/analyse.mjs';
import { session, rawAgenda, validated, clock } from './fixtures.mjs';

const run = (sessions, overrides = {}) => analyseAgenda(validated(rawAgenda(sessions, overrides)));

test('A01 room-only overlap has exactly one explicit reason', () => {
  const result = run([session('A'), session('B', { speakerIndexes: [1], start: '09:30', end: '09:45' })]);
  assert.deepEqual(result.conflicts, [{ sessionIds: ['A', 'B'], reasons: ['room_overlap'], sharedSpeakers: [] }]);
  assert.deepEqual(result.warnings, []);
});
test('A02 touching different rooms produces directed zero-gap warning', () => {
  const result = run([session('A'), session('B', { roomIndex: 1, start: '10:00', end: '11:00' })]);
  assert.deepEqual(result.conflicts, []);
  assert.deepEqual(result.warnings, [{ sessionIds: ['A', 'B'], sharedSpeakers: ['S'], fromRoom: 'R1', toRoom: 'R2', gapMinutes: 0, requiredMinutes: 10 }]);
});
test('A03 touching same room has neither overlap nor transition', () => {
  const result = run([session('A'), session('B', { start: '10:00', end: '11:00' })]);
  assert.deepEqual([result.conflicts, result.warnings], [[], []]);
});
test('A04 gap9 warns, gap10 meets threshold', () => {
  const result = run([session('A'), session('B', { roomIndex: 1, start: '10:09', end: '11:00' })]);
  assert.deepEqual(result.warnings, [{ sessionIds: ['A', 'B'], sharedSpeakers: ['S'], fromRoom: 'R1', toRoom: 'R2', gapMinutes: 9, requiredMinutes: 10 }]);
  assert.deepEqual(run([session('A'), session('B', { roomIndex: 1, start: '10:10', end: '11:00' })]).warnings, []);
});
test('A05 overlapping shared speaker never also becomes transition', () => {
  const result = run([session('A'), session('B', { roomIndex: 1, start: '09:30', end: '10:30' })]);
  assert.deepEqual(result.conflicts, [{ sessionIds: ['A', 'B'], reasons: ['speaker_overlap'], sharedSpeakers: ['S'] }]);
  assert.deepEqual(result.warnings, []);
});
test('A06 same pair merges room and speaker reasons', () => {
  const result = run([session('A'), session('B', { start: '09:30', end: '10:30' })]);
  assert.deepEqual(result.conflicts, [{ sessionIds: ['A', 'B'], reasons: ['room_overlap', 'speaker_overlap'], sharedSpeakers: ['S'] }]);
  assert.deepEqual(result.warnings, []);
});
test('A07 nested non-adjacent A-C is found and pair jobs are complete', () => {
  const agenda = validated(rawAgenda([session('A', { end: '12:00' }), session('B', { roomIndex: 1, speakerIndexes: [1], start: '10:00', end: '11:00' }), session('C', { speakerIndexes: [2], start: '11:00', end: '13:00' })]));
  assert.deepEqual([...createPairJobs(agenda)], [[0, 1], [0, 2], [1, 2]]);
  const result = analyseAgenda(agenda);
  assert.deepEqual(result.conflicts, [{ sessionIds: ['A', 'C'], reasons: ['room_overlap'], sharedSpeakers: [] }]);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.coverage.checkedPairs, 3);
});
test('A08 two common speakers produce one warning in registry order', () => {
  const result = run([session('A', { speakerIndexes: [1, 0] }), session('B', { roomIndex: 1, speakerIndexes: [0, 1], start: '10:05', end: '11:00' })]);
  assert.deepEqual(result.warnings, [{ sessionIds: ['A', 'B'], sharedSpeakers: ['S', 'T'], fromRoom: 'R1', toRoom: 'R2', gapMinutes: 5, requiredMinutes: 10 }]);
});
test('A09 completely unassigned records remain in coverage and full source', () => {
  const result = run([session('A', { roomIndex: null, speakerIndexes: [] }), session('B', { roomIndex: null, speakerIndexes: [] })]);
  assert.deepEqual([result.conflicts, result.warnings], [[], []]);
  assert.deepEqual(result.coverage, { checkedPairs: 1, roomUnassignedSessionIds: ['A', 'B'], speakerUnassignedSessionIds: ['A', 'B'] });
  assert.equal(result.agenda.sessions.length, 2);
});
test('A10 missing room prevents transition inference but not speaker overlaps', () => {
  const result = run([session('A'), session('B', { roomIndex: null, start: '10:02', end: '11:00' })]);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.coverage.roomUnassignedSessionIds, ['B']);
  const overlapping = run([session('A'), session('B', { roomIndex: null })]);
  assert.deepEqual(overlapping.conflicts, [{ sessionIds: ['A', 'B'], reasons: ['speaker_overlap'], sharedSpeakers: ['S'] }]);
});
test('A15 zero transition threshold produces no warning for touching rooms', () => {
  const result = run([session('A'), session('B', { roomIndex: 1, start: '10:00', end: '11:00' })], { transitionMinutes: 0 });
  assert.deepEqual([result.conflicts, result.warnings], [[], []]);
});
test('A17 all 19,900 pairs are enumerated for 200 contiguous one-minute sessions', () => {
  const sessions = Array.from({ length: 200 }, (_, index) => session(`S${index + 1}`, { start: clock(index), end: clock(index + 1), speakerIndexes: [] }));
  const agenda = validated(rawAgenda(sessions));
  const jobs = [...createPairJobs(agenda)];
  assert.equal(jobs.length, 19900);
  assert.equal(new Set(jobs.map(pair => pair.join(':'))).size, 19900);
  assert.deepEqual(jobs[0], [0, 1]);
  assert.deepEqual(jobs.at(-1), [198, 199]);
  const result = analyseAgenda(agenda);
  assert.deepEqual([result.conflicts, result.warnings], [[], []]);
  assert.equal(result.coverage.checkedPairs, 19900);
  assert.equal(result.resourceSchedules.rooms[0].sessions.length, 200);
});
test('A19 multi-resource nested pairs appear exactly once in input order', () => {
  const result = run([session('A', { speakerIndexes: [0, 1], end: '12:00' }), session('B', { speakerIndexes: [0, 1], start: '09:30' }), session('C', { roomIndex: 1, speakerIndexes: [1], start: '11:00', end: '13:00' })]);
  assert.deepEqual(result.conflicts, [
    { sessionIds: ['A', 'B'], reasons: ['room_overlap', 'speaker_overlap'], sharedSpeakers: ['S', 'T'] },
    { sessionIds: ['A', 'C'], reasons: ['speaker_overlap'], sharedSpeakers: ['T'] }
  ]);
  assert.deepEqual(result.warnings, []);
});
test('reverse chronology keeps pair row order but directs transition by time', () => {
  const result = run([session('Late', { roomIndex: 1, start: '10:05', end: '11:00' }), session('Early')]);
  assert.deepEqual(result.warnings, [{ sessionIds: ['Late', 'Early'], sharedSpeakers: ['S'], fromRoom: 'R1', toRoom: 'R2', gapMinutes: 5, requiredMinutes: 10 }]);
});
test('different rooms without common speaker do not infer a transition', () => {
  const result = run([session('A'), session('B', { roomIndex: 1, speakerIndexes: [1], start: '10:00', end: '11:00' })]);
  assert.deepEqual([result.conflicts, result.warnings], [[], []]);
});
test('resource schedules use registry/start/end/input order including unused registries', () => {
  const agenda = validated(rawAgenda([
    session('Z', { start: '11:00', end: '12:00', speakerIndexes: [1] }),
    session('Long', { start: '09:00', end: '11:00' }),
    session('First', { start: '09:00', end: '10:00' }),
    session('Tie', { start: '09:00', end: '10:00' })
  ]));
  const before = structuredClone(agenda);
  const result = analyseAgenda(agenda);
  assert.deepEqual(result.resourceSchedules.rooms, [
    { room: 'R1', sessions: [{ id: 'First', startMinute: 540, endMinute: 600 }, { id: 'Tie', startMinute: 540, endMinute: 600 }, { id: 'Long', startMinute: 540, endMinute: 660 }, { id: 'Z', startMinute: 660, endMinute: 720 }] },
    { room: 'R2', sessions: [] }
  ]);
  assert.deepEqual(result.resourceSchedules.speakers.map(resource => [resource.speaker, resource.sessions.map(s => s.id)]), [['S', ['First', 'Tie', 'Long']], ['T', ['Z']], ['U', []]]);
  assert.deepEqual(agenda, before);
});
test('aggregate preserves stable pair order even if result buffers arrive reversed', () => {
  const agenda = validated(rawAgenda([session('A'), session('B'), session('C')]));
  const pairs = [...createPairJobs(agenda)].map(([i, j]) => analysePair(agenda.sessions[i], agenda.sessions[j], 10)).reverse();
  assert.deepEqual(aggregateAgenda(agenda, pairs).conflicts.map(pair => pair.sessionIds), [['A', 'B'], ['A', 'C'], ['B', 'C']]);
});
test('minute occupancy oracle checks non-adjacent overlaps without interval formula', () => {
  const starts = [0, 3, 1, 12, 7, 4, 15, 9];
  const lengths = [8, 2, 3, 3, 6, 9, 2, 1];
  const agenda = validated(rawAgenda(starts.map((start, i) => session(`P${i}`, { start: clock(start), end: clock(start + lengths[i]), speakerIndexes: [] }))));
  const occupied = starts.map((start, i) => new Set(Array.from({ length: lengths[i] }, (_, j) => start + j)));
  const expected = [];
  for (let i = 0; i < occupied.length; i++) for (let j = i + 1; j < occupied.length; j++) {
    if ([...occupied[i]].some(minute => occupied[j].has(minute))) expected.push([`P${i}`, `P${j}`]);
  }
  assert.deepEqual(analyseAgenda(agenda).conflicts.map(pair => pair.sessionIds), expected);
});
