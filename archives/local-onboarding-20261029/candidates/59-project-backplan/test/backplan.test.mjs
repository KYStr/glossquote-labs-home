import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBackplan, assertSchedule } from '../public/js/core/backplan.mjs';
import { analyzeGraph } from '../public/js/core/graph.mjs';
import { buildWorkdayCalendar } from '../public/js/core/calendar.mjs';
import { task, project, chain, dates, nativeWorkdays } from './helpers.mjs';

test('A01/A05: inclusive five-day chain fixed oracle', () => {
  const p = calculateBackplan(project([task('A', 2), task('B', 3, ['A'])]));
  assert.equal(p.longestPathWorkdays, 5);
  assert.equal(p.anchor, '2026-10-19');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-19', '2026-10-20', '2026-10-19', '2026-10-20', 0, true]);
  assert.deepEqual(dates(p.tasks[1]), ['2026-10-21', '2026-10-23', '2026-10-21', '2026-10-23', 0, true]);
  assert.deepEqual(p.criticalTaskIds, ['A', 'B']);
  assert.equal(p.settings.deadlineAdjustmentDays, 0);
});
test('A02/A16: independent roots share anchor; shorter root has two workdays slack', () => {
  const p = calculateBackplan(project([task('A', 2), task('B', 4)]));
  assert.equal(p.anchor, '2026-10-20');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', 2, false]);
  assert.deepEqual(dates(p.tasks[1]), ['2026-10-20', '2026-10-23', '2026-10-20', '2026-10-23', 0, true]);
  assert.deepEqual(p.criticalTaskIds, ['B']);
});
test('A03: one-day task and Saturday deadline show Friday adjustment', () => {
  const p = calculateBackplan(project(undefined, { deadline: '2026-10-24' }));
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-23', '2026-10-23', '2026-10-23', '2026-10-23', 0, true]);
  assert.deepEqual(p.settings, { deadline: '2026-10-24', effectiveDeadline: '2026-10-23', deadlineAdjusted: true, deadlineAdjustmentDays: 1, workweek: [1, 2, 3, 4, 5], holidays: [] });
});
test('A04: holiday deadline moves earlier, then four workdays count inclusively', () => {
  const p = calculateBackplan(project([task('A', 2), task('B', 2, ['A'])], { holidays: ['2026-10-23'] }));
  assert.equal(p.anchor, '2026-10-19');
  assert.equal(p.settings.effectiveDeadline, '2026-10-22');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-19', '2026-10-20', '2026-10-19', '2026-10-20', 0, true]);
  assert.deepEqual(dates(p.tasks[1]), ['2026-10-21', '2026-10-22', '2026-10-21', '2026-10-22', 0, true]);
});
test('A06: Tuesday/Thursday workweek', () => {
  const p = calculateBackplan(project([task('A', 2)], { workweek: [2, 4] }));
  assert.equal(p.settings.effectiveDeadline, '2026-10-22');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-20', '2026-10-22', '2026-10-20', '2026-10-22', 0, true]);
});
test('A07: Tuesday holiday is skipped inside a task, not added as a calendar-day duration', () => {
  const p = calculateBackplan(project([task('A', 2), task('B', 2, ['A'])], { holidays: ['2026-10-20'] }));
  assert.equal(p.anchor, '2026-10-19');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-19', '2026-10-21', '2026-10-19', '2026-10-21', 0, true]);
  assert.deepEqual(dates(p.tasks[1]), ['2026-10-22', '2026-10-23', '2026-10-22', '2026-10-23', 0, true]);
});
test('A08/A09/A10: validation/cycle failures never enter calendar or return a partial plan', () => {
  const progress = [];
  assert.throws(() => calculateBackplan(project(undefined, { workweek: [] }), { onProgress: p => progress.push(p) }), e => e.errors[0].code === 'NO_WORKDAYS');
  assert.deepEqual(progress, []);
  const bad = project([task('A', 1, ['B']), task('B', 1, ['A']), task('AFTER', 1, ['B'])]);
  assert.throws(() => calculateBackplan(bad, { onProgress: p => progress.push(p) }), e => e.code === 'CYCLE' && JSON.stringify(e.errors[0].cycles) === '[["A","B","A"]]');
  assert.equal(progress.some(p => ['calendar', 'forward', 'backward'].includes(p.phase)), false);
  assert.throws(() => calculateBackplan(project([task('A', 1, ['A'])])), e => e.errors[0].cycles[0].join(',') === 'A,A');
  assert.throws(() => calculateBackplan(project([task('A', 1, ['MISSING'])])), e => e.code === 'VALIDATION');
});
test('A11: 100 tasks × 260 workdays with Monday-only calendar, year 1501 anchor', () => {
  const p = calculateBackplan(project(chain(100, 260), { deadline: '2000-01-07', workweek: [1] }));
  assert.equal(p.longestPathWorkdays, 26000);
  assert.equal(p.anchor, '1501-09-23');
  assert.equal(p.settings.effectiveDeadline, '2000-01-03');
  assert.equal(p.tasks.length, 100);
  assert.equal(p.tasks.at(-1).EF, '2000-01-03');
  for (let i = 0; i < p.tasks.length; i += 1) {
    const t = p.tasks[i];
    assert.equal(new Date(`${t.ES}T00:00:00Z`).getUTCDay(), 1);
    assert.equal(new Date(`${t.EF}T00:00:00Z`).getUTCDay(), 1);
    assert.equal(Date.parse(t.EF) - Date.parse(t.ES), 259 * 7 * 86400000);
    assert.equal(t.slackWorkdays, 0);
    if (i) assert.equal(Date.parse(t.ES) - Date.parse(p.tasks[i - 1].EF), 7 * 86400000);
  }
});
test('A17: original deadline, earlier civil year, delta and workweek retained', () => {
  const p = calculateBackplan(project([task('A')], { deadline: '2000-01-01', workweek: [6], holidays: ['2000-01-01'] }));
  assert.equal(p.anchor, '1999-12-25');
  assert.equal(p.settings.deadline, '2000-01-01');
  assert.equal(p.settings.effectiveDeadline, '1999-12-25');
  assert.equal(p.settings.deadlineAdjusted, true);
  assert.equal(p.settings.deadlineAdjustmentDays, 7);
});
test('A18: A1→B1 plus independent C1 gives one day slack to C', () => {
  const p = calculateBackplan(project([task('A'), task('B', 1, ['A']), task('C')]));
  assert.equal(p.longestPathWorkdays, 2);
  assert.equal(p.anchor, '2026-10-22');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-22', '2026-10-22', '2026-10-22', '2026-10-22', 0, true]);
  assert.deepEqual(dates(p.tasks[1]), ['2026-10-23', '2026-10-23', '2026-10-23', '2026-10-23', 0, true]);
  assert.deepEqual(dates(p.tasks[2]), ['2026-10-22', '2026-10-22', '2026-10-23', '2026-10-23', 1, false]);
  assert.deepEqual(p.criticalTaskIds, ['A', 'B']);
});
test('A19: unequal multiple predecessors; successor follows the latest predecessor only', () => {
  const p = calculateBackplan(project([task('A', 2), task('B', 5), task('C', 1, ['A', 'B'])]));
  assert.equal(p.longestPathWorkdays, 6);
  assert.equal(p.anchor, '2026-10-16');
  assert.deepEqual(dates(p.tasks[0]), ['2026-10-16', '2026-10-19', '2026-10-21', '2026-10-22', 3, false]);
  assert.deepEqual(dates(p.tasks[1]), ['2026-10-16', '2026-10-22', '2026-10-16', '2026-10-22', 0, true]);
  assert.deepEqual(dates(p.tasks[2]), ['2026-10-23', '2026-10-23', '2026-10-23', '2026-10-23', 0, true]);
  assert.deepEqual(p.criticalTaskIds, ['B', 'C']);
});
test('result invariants fail closed when a plan is corrupted', () => {
  const raw = project([task('A', 2), task('B', 3, ['A'])]);
  const p = calculateBackplan(raw);
  const graph = analyzeGraph(raw.tasks);
  const calendar = buildWorkdayCalendar(raw.deadline, raw.workweek, raw.holidays, 5);
  for (const change of [q => { q.tasks[0].slackWorkdays = -1; }, q => { q.tasks[1].ES = '2026-10-20'; }, q => { q.tasks[1].EF = '2026-10-24'; }, q => { q.tasks[0].LS = '2026-10-21'; }, q => { q.criticalTaskIds = ['B']; }]) {
    const q = structuredClone(p);
    change(q);
    assert.throws(() => assertSchedule(q, graph, calendar));
  }
});
test('fixed family of DAG/calendar variants checked against independent workday lists', () => {
  const weeks = [[1, 2, 3, 4, 5], [2, 4], [0], [0, 1, 2, 3, 4, 5, 6]];
  for (let sample = 0; sample < 32; sample += 1) {
    const tasks = Array.from({ length: 6 }, (_, i) => task(`N${i}`, (i + sample) % 4 + 1));
    for (let to = 1; to < 6; to += 1) for (let from = 0; from < to; from += 1) if ((sample + from + to * 3) % 3 === 0) tasks[to].predecessors.push(`N${from}`);
    const input = project(tasks, { workweek: weeks[sample % 4], holidays: ['2026-10-15', '2026-10-18'] });
    const p = calculateBackplan(input);
    const all = nativeWorkdays('2025-01-01', input.deadline, input.workweek, input.holidays);
    const days = all.slice(-p.longestPathWorkdays);
    assert.equal(p.anchor, days[0]);
    assert.equal(p.settings.effectiveDeadline, days.at(-1));
    const index = date => days.indexOf(date);
    for (const t of p.tasks) {
      assert.equal(index(t.EF) - index(t.ES) + 1, t.durationWorkdays);
      assert.equal(index(t.LF) - index(t.LS) + 1, t.durationWorkdays);
      assert.equal(index(t.LS) - index(t.ES), t.slackWorkdays);
      assert.ok(t.slackWorkdays >= 0);
      for (const pred of t.predecessors) assert.ok(index(t.ES) > index(p.tasks.find(q => q.id === pred).EF));
      if (!t.predecessors.length) assert.equal(t.ES, p.anchor);
    }
  }
});
