import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, serializeReport, canonicalStringify, LIMITS } from '../public/js/core/graph.mjs';

const specDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', '..', 'docs', 'specs', 'dependency-reduction',
);
const fixtures = JSON.parse(await readFile(path.join(specDir, 'fixtures.json'), 'utf8'));

const coreCases = fixtures.cases.filter((c) => c.kind === 'core');
for (const c of coreCases) {
  test(`fixture ${c.id}: ${c.purpose}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test('schema: non-object, array, missing, extra, wrong type, accessor', () => {
  assert.deepEqual(run(null), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run([]), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ modules: 'A' }), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(
    run({ modules: 'A', edges: '', extra: 1 }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } },
  );
  assert.deepEqual(
    run({ modules: 1, edges: '' }),
    { ok: false, error: { code: 'SCHEMA', field: null, row: null } },
  );
  const withGetter = { edges: '' };
  Object.defineProperty(withGetter, 'modules', { enumerable: true, get: () => 'A' });
  assert.deepEqual(run(withGetter), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
});

test('modules limits: 3301 chars INPUT_LIMIT; 100 rows ok, 101 ROW_LIMIT', () => {
  assert.deepEqual(
    run({ modules: 'A'.repeat(3301), edges: '' }).error,
    { code: 'INPUT_LIMIT', field: 'modules', row: null },
  );
  // The longest valid modules input is 100 rows of 32-char names: 3299 chars.
  const rows100 = Array.from({ length: 100 }, (_, i) => `M${i}`.padEnd(32, 'x')).join('\n');
  assert.equal(rows100.length, 3299);
  assert.equal(run({ modules: rows100, edges: '' }).ok, true);
  // Row-limit case uses short names so capacity does not fire first
  // (capacity is checked before row count, per SPEC).
  const short100 = Array.from({ length: 100 }, (_, i) => `M${i}`).join('\n');
  assert.equal(run({ modules: short100, edges: '' }).ok, true);
  assert.deepEqual(
    run({ modules: `${short100}\nM100`, edges: '' }).error,
    { code: 'ROW_LIMIT', field: 'modules', row: 101 },
  );
});

test('edges limits: 26401 chars INPUT_LIMIT; 400 rows ok, 401 ROW_LIMIT', () => {
  assert.deepEqual(
    run({ modules: 'A\nB', edges: 'A>B'.padEnd(26401, 'x') }).error,
    { code: 'INPUT_LIMIT', field: 'edges', row: null },
  );
  // 400 distinct acyclic edges: M0..M19 -> M20..M39 (20 x 20 pairs).
  const modules = Array.from({ length: 40 }, (_, i) => `M${i}`).join('\n');
  const edges400 = [];
  for (let a = 0; a < 20; a += 1) {
    for (let b = 20; b < 40; b += 1) edges400.push(`M${a}>M${b}`);
  }
  assert.equal(edges400.length, 400);
  assert.equal(run({ modules, edges: edges400.join('\n') }).ok, true);
  const edges401 = `${edges400.join('\n')}\nM1>M21`;
  assert.deepEqual(
    run({ modules, edges: edges401 }).error,
    { code: 'ROW_LIMIT', field: 'edges', row: 401 },
  );
});

test('EMPTY: empty modules, and a lone trailing LF is empty', () => {
  assert.deepEqual(
    run({ modules: '', edges: '' }).error,
    { code: 'EMPTY', field: 'modules', row: null },
  );
  assert.deepEqual(
    run({ modules: '\n', edges: '' }).error,
    { code: 'EMPTY', field: 'modules', row: null },
  );
});

test('UNICODE: lone surrogates report the containing line', () => {
  const high = run({ modules: 'A\n\uD800\nB', edges: '' });
  assert.deepEqual(high.error, { code: 'UNICODE', field: 'modules', row: 2 });
  const low = run({ modules: 'A', edges: 'A>\uDC00' });
  assert.deepEqual(low.error, { code: 'UNICODE', field: 'edges', row: 1 });
  // A valid surrogate pair passes validation (but fails the name grammar).
  const pair = run({ modules: 'A\uD83D\uDE00', edges: '' });
  assert.deepEqual(pair.error, { code: 'ID', field: 'modules', row: 1 });
});

test('ID: names must match [A-Za-z][A-Za-z0-9_.-]{0,31}', () => {
  // Note: an entirely empty modules string is EMPTY, not ID (tested above).
  for (const bad of ['1A', 'A B', 'A!', 'A'.repeat(33), '-A', '.A', '_A']) {
    const outcome = run({ modules: bad, edges: '' });
    assert.deepEqual(outcome.error, { code: 'ID', field: 'modules', row: 1 }, bad);
  }
  assert.equal(run({ modules: 'a-1_B.c', edges: '' }).ok, true);
  assert.equal(run({ modules: 'A'.repeat(32), edges: '' }).ok, true);
});

test('DUP_ID: second occurrence row is reported, case-sensitive', () => {
  assert.deepEqual(
    run({ modules: 'A\nB\nA', edges: '' }).error,
    { code: 'DUP_ID', field: 'modules', row: 3 },
  );
  assert.equal(run({ modules: 'A\na', edges: '' }).ok, true);
});

test('EDGE shape: exactly one >, no whitespace, non-empty sides', () => {
  const cases = ['AB', 'A>B>C', 'A B>C', 'A> B', 'A>', '>B', 'A>B '];
  for (const bad of cases) {
    const outcome = run({ modules: 'A\nB\nC', edges: bad });
    assert.deepEqual(outcome.error, { code: 'EDGE', field: 'edges', row: 1 }, bad);
  }
});

test('UNKNOWN_ID and DUP_EDGE rows', () => {
  assert.deepEqual(
    run({ modules: 'A\nB', edges: 'A>B\nA>C' }).error,
    { code: 'UNKNOWN_ID', field: 'edges', row: 2 },
  );
  assert.deepEqual(
    run({ modules: 'A\nB', edges: 'A>B\nA>B' }).error,
    { code: 'DUP_EDGE', field: 'edges', row: 2 },
  );
});

test('trailing LF is stripped once per field', () => {
  assert.deepEqual(run({ modules: 'A\n', edges: 'A>A\n' }).result.cycle, ['A', 'A']);
  // Two trailing LFs leave an empty line, which is an ID error on line 2.
  assert.deepEqual(
    run({ modules: 'A\n\n', edges: '' }).error,
    { code: 'ID', field: 'modules', row: 2 },
  );
});

test('cycle: DFS starts from ASCII-sorted nodes, isolate outside the cycle', () => {
  const outcome = run({ modules: 'Z\nC\nB\nA', edges: 'B>C\nC>B' });
  assert.deepEqual(outcome.result, {
    status: 'cycle', stages: [], redundant: [], cycle: ['B', 'C', 'B'],
  });
});

test('cycle: longer cycle found from the first sorted start', () => {
  const outcome = run({
    modules: 'D\nC\nB\nA',
    edges: 'A>B\nB>C\nC>D\nD>B',
  });
  assert.deepEqual(outcome.result.cycle, ['B', 'C', 'D', 'B']);
});

test('stages: Kahn rounds never pull a successor into the same layer', () => {
  const outcome = run({
    modules: 'A\nB\nC\nD',
    edges: 'A>B\nA>C\nB>D\nC>D',
  });
  assert.deepEqual(outcome.result.stages, [['A'], ['B', 'C'], ['D']]);
  assert.deepEqual(outcome.result.redundant, []);
});

test('redundant: several edges, sorted by from then to', () => {
  const outcome = run({
    modules: 'A\nB\nC\nD',
    edges: 'A>B\nA>C\nA>D\nB>D\nC>D',
  });
  assert.deepEqual(outcome.result.redundant, [
    { from: 'A', to: 'D', via: ['A', 'B', 'D'] },
  ]);
  assert.deepEqual(outcome.result.stages, [['A'], ['B', 'C'], ['D']]);
});

test('redundant: BFS picks the shortest path, ASCII tie-break', () => {
  // A->D via B (2 hops) beats via C->E (3 hops); via B vs via C same length
  // picks B because successors are expanded in ASCII order.
  const outcome = run({
    modules: 'A\nB\nC\nD\nE',
    edges: 'A>D\nA>B\nA>C\nB>D\nC>E\nE>D',
  });
  assert.deepEqual(outcome.result.redundant, [
    { from: 'A', to: 'D', via: ['A', 'B', 'D'] },
  ]);
});

test('witness integrity: every via step is a real edge, direct edge unused', () => {
  const input = {
    modules: 'A\nB\nC\nD\nE\nF',
    edges: 'A>F\nA>B\nA>C\nB>D\nC>D\nD>F\nB>E\nE>F',
  };
  const outcome = run(input);
  assert.equal(outcome.ok, true);
  const edgeSet = new Set(input.edges.split('\n'));
  for (const { from, to, via } of outcome.result.redundant) {
    assert.ok(via.length >= 3, 'via has at least one intermediate module');
    assert.equal(via[0], from);
    assert.equal(via.at(-1), to);
    for (let i = 0; i + 1 < via.length; i += 1) {
      const step = `${via[i]}>${via[i + 1]}`;
      assert.ok(edgeSet.has(step), `via step ${step} must be a real edge`);
      assert.notEqual(step, `${from}>${to}`, 'via must not reuse the direct edge');
    }
  }
  // Every original edge crosses to a later stage.
  const stageOf = new Map();
  outcome.result.stages.forEach((layer, index) => {
    for (const name of layer) stageOf.set(name, index);
  });
  for (const line of input.edges.split('\n')) {
    const [from, to] = line.split('>');
    assert.ok(stageOf.get(from) < stageOf.get(to), `${line} must cross to a later stage`);
  }
});

test('serializeReport: canonical key order, trailing LF, UTF-8 bytes', () => {
  const result = {
    status: 'acyclic',
    stages: [['A'], ['B']],
    redundant: [{ from: 'A', to: 'B', via: ['A', 'X', 'B'] }],
    cycle: null,
  };
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.ok(serialized.text.endsWith('}\n'));
  assert.equal(
    serialized.text,
    '{"cycle":null,"redundant":[{"from":"A","to":"B","via":["A","X","B"]}],"stages":[["A"],["B"]],"status":"acyclic"}\n',
  );
  assert.equal(
    serialized.bytes,
    new TextEncoder().encode(serialized.text).length,
  );
  assert.equal(canonicalStringify({ b: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"b":1}');
});

test('serializeReport: OUTPUT_LIMIT on an oversized result', () => {
  const big = { status: 'acyclic', stages: [], redundant: [], cycle: null, pad: 'x'.repeat(LIMITS.reportMaxBytes) };
  const serialized = serializeReport(big);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: 'OUTPUT_LIMIT', field: null, row: null },
  });
});
