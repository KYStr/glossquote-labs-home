import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProject } from '../public/js/core/validate.mjs';
import { task, project, chain } from './helpers.mjs';

const reject = (raw, code, field) => {
  const result = validateProject(raw);
  assert.equal(result.ok, false);
  assert.equal(Object.hasOwn(result, 'input'), false);
  assert.ok(result.errors.some(error => error.code === code && (field === undefined || error.field === field)), code);
};

test('A08: empty workweek fails before calendar', () => reject(project(undefined, { workweek: [] }), 'NO_WORKDAYS', 'workweek'));
test('strict project and task shapes, safe types, and no secret-like raw exceptions', () => {
  for (const raw of [null, [], {}, { ...project(), extra: 'SYNTHETIC_CANARY_ONLY' }]) reject(raw, 'PROJECT_SCHEMA');
  reject(project([{ ...task('A'), extra: true }]), 'TASK_SCHEMA');
  reject(project(undefined, { workweek: [1, 1] }), 'WORKWEEK_INVALID');
  for (const workweek of [[-1], [7], ['1'], [1.5], null, Array(1)]) reject(project(undefined, { workweek }), 'WORKWEEK_INVALID');
  assert.equal(JSON.stringify(validateProject({ ...project(), unexpected: 'SYNTHETIC_CANARY_ONLY' })).includes('SYNTHETIC_CANARY_ONLY'), false);
});
test('A10: unknown IDs and duplicate edges have locations', () => {
  reject(project([task('A'), task('B', 1, ['MISSING'])]), 'UNKNOWN_PREDECESSOR', 'tasks.1.predecessors.0');
  reject(project([task('A'), task('B', 1, ['A', 'A'])]), 'DUPLICATE_EDGE', 'tasks.1.predecessors.1');
  reject(project([task('A', 1, [2])]), 'PREDECESSOR_INVALID');
  reject(project([task('A', 1, 'B')]), 'DEPENDENCY_LIMIT');
  reject(project([task('A', 1, Array(1))]), 'PREDECESSOR_INVALID');
  reject(project([task(Symbol('synthetic'), 1, ['MISSING'], 'Synthetic invalid ID')]), 'ID_INVALID');
  assert.equal(validateProject(project([task('A', 1, ['A'])])).ok, true, 'self-edge is retained for cycle detection');
});
test('A12/A20: task count, string grammar versus parsed numeric integer', () => {
  assert.equal(validateProject(project(chain(100, 260))).ok, true);
  reject(project(chain(101)), 'TASK_LIMIT');
  reject(project([]), 'TASK_LIMIT');
  for (const duration of ['0', '261', '2.0', '01', ' 2', '2 ', '+2', '2e0', '２', '', '99999999999999999', 0, 261, 1.5, NaN, Infinity, null, true]) reject(project([task('A', duration)]), 'DURATION_INVALID');
  for (const duration of ['1', '260', 1, 260, 2.0]) {
    const accepted = validateProject(project([task('A', duration)]));
    assert.equal(accepted.ok, true);
    assert.equal(accepted.input.tasks[0].durationWorkdays, Number(duration));
  }
});
test('A12: 500 edges accepted, 501 rejected; oversized per-row dependencies rejected', () => {
  const make = count => {
    const tasks = chain(33).map(t => ({ ...t, predecessors: [] }));
    let remaining = count;
    for (let to = 1; to < 33 && remaining > 0; to += 1) {
      for (let from = 0; from < to && remaining > 0; from += 1) { tasks[to].predecessors.push(tasks[from].id); remaining -= 1; }
    }
    return project(tasks);
  };
  assert.equal(validateProject(make(500)).ok, true);
  reject(make(501), 'DEPENDENCY_LIMIT');
  reject(project([task('A', 1, Array(501).fill('A'))]), 'DEPENDENCY_LIMIT');
});
test('A13: exact holiday limits, duplicate dates, nonexistent dates and input year floor', () => {
  const holidays = Array.from({ length: 366 }, (_, i) => new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10));
  assert.equal(validateProject(project(undefined, { holidays })).ok, true);
  reject(project(undefined, { holidays: [...holidays, '2025-01-01'] }), 'HOLIDAY_LIMIT');
  reject(project(undefined, { holidays: ['2026-10-20', '2026-10-20'] }), 'HOLIDAY_DUPLICATE');
  for (const date of ['2026-02-30', '1999-12-31', '2100-01-01', '2026-2-03', '2026-02-29', '2026-01-01\n']) {
    reject(project(undefined, { holidays: [date] }), 'DATE_INVALID');
    reject(project(undefined, { deadline: date }), 'DATE_INVALID', 'deadline');
  }
});
test('IDs, Unicode scalar names, controls, no silent rewriting, and normalized settings copies', () => {
  for (const id of ['', ' A', 'A ', '你好', 'x'.repeat(33)]) reject(project([task(id)]), 'ID_INVALID');
  reject(project([task('A'), task('A')]), 'ID_DUPLICATE');
  for (const name of ['', '   ', 'a\nb', 'a\tb', 'a\u2028b', 'a\u2029b', 'a\u0000b', '\uD800', '😀'.repeat(121)]) reject(project([task('A', 1, [], name)]), 'NAME_INVALID');
  const raw = project([task('a._-0', '2', [], ` ${'😀'.repeat(118)} `)], { workweek: [5, 1], holidays: ['2026-10-20', '2026-10-19'] });
  const result = validateProject(raw);
  assert.equal(result.ok, true);
  assert.equal(result.input.tasks[0].name, raw.tasks[0].name);
  assert.deepEqual(result.input.workweek, [1, 5]);
  assert.deepEqual(result.input.holidays, ['2026-10-19', '2026-10-20']);
  result.input.tasks[0].predecessors.push('X');
  assert.deepEqual(raw.tasks[0].predecessors, []);
});
