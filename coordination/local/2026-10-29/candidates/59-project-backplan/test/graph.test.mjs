import test from 'node:test';
import assert from 'node:assert/strict';
import { topologicalOrder, findCyclePaths, analyzeGraph } from '../public/js/core/graph.mjs';
import { task, chain } from './helpers.mjs';

test('stable row-order Kahn tie-break and longest duration', () => {
  const tasks = [task('C', 1, ['A']), task('B', 2), task('A', 3), task('D', 4, ['B'])];
  assert.deepEqual(topologicalOrder(tasks), ['B', 'A', 'C', 'D']);
  assert.equal(analyzeGraph(tasks).longestPathWorkdays, 6);
});
test('A09: real closed cycles and self-edge; downstream blocked task is not a cycle member', () => {
  const tasks = [task('A', 1, ['B']), task('B', 1, ['A']), task('C', 1, ['B']), task('D', 1, ['C'])];
  assert.deepEqual(findCyclePaths(tasks), [['A', 'B', 'A']]);
  assert.throws(() => topologicalOrder(tasks), e => e.code === 'CYCLE' && JSON.stringify(e.cycles) === '[["A","B","A"]]');
  assert.deepEqual(findCyclePaths([task('A', 1, ['A'])]), [['A', 'A']]);
  const disjoint = [task('A', 1, ['B']), task('B', 1, ['A']), task('C', 1, ['D']), task('D', 1, ['C']), task('E', 1, ['B', 'D'])];
  assert.deepEqual(findCyclePaths(disjoint), [['A', 'B', 'A'], ['C', 'D', 'C']]);
});
test('A10/A11/A12: graph caps, unknown and duplicate edges, 26,000-day chain', () => {
  assert.throws(() => topologicalOrder([task('A', 1, ['MISSING'])]), e => e.code === 'UNKNOWN_PREDECESSOR');
  assert.throws(() => topologicalOrder([task('A'), task('B', 1, ['A', 'A'])]), e => e.code === 'DUPLICATE_EDGE');
  assert.equal(analyzeGraph(chain(100, 260)).longestPathWorkdays, 26000);
  assert.throws(() => topologicalOrder(chain(101)), e => e.code === 'TASK_LIMIT');
  assert.throws(() => topologicalOrder(chain(2), Array(501).fill(['T1', 'T2'])), e => e.code === 'DEPENDENCY_LIMIT');
});
test('fixed small DAGs: longest path agrees with independent exhaustive path enumeration', () => {
  for (let sample = 0; sample < 32; sample += 1) {
    const tasks = Array.from({ length: 7 }, (_, i) => task(`N${i}`, (i * 3 + sample) % 5 + 1));
    for (let to = 1; to < tasks.length; to += 1) for (let from = 0; from < to; from += 1) if ((from * 5 + to * 3 + sample) % 4 === 0) tasks[to].predecessors.push(tasks[from].id);
    const successors = id => tasks.filter(t => t.predecessors.includes(id));
    let maximum = 0;
    function enumerate(node, total) {
      const sum = total + node.durationWorkdays;
      maximum = Math.max(maximum, sum);
      successors(node.id).forEach(next => enumerate(next, sum));
    }
    tasks.filter(t => t.predecessors.length === 0).forEach(t => enumerate(t, 0));
    const graph = analyzeGraph(tasks);
    assert.equal(graph.longestPathWorkdays, maximum);
    assert.deepEqual(findCyclePaths(tasks), []);
    for (const t of tasks) for (const pred of t.predecessors) assert.ok(graph.order.indexOf(pred) < graph.order.indexOf(t.id));
  }
});
