// Core tests: every literal fixture from fixtures.json (deep-compared), the
// validation ladder (capacity -> surrogate -> empty -> rows -> per-row
// checks), boundary values, and an exhaustive property check over a small
// vocabulary that compares run() against an independent brute-force
// matcher. Expected values are hand-derived or read from fixtures.json;
// nothing is generated from the implementation under test.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { run, serializeReport, MAX_ROUTES_LENGTH, MAX_PATTERN_LENGTH } from '../public/js/core/core.mjs';

const fixtures = JSON.parse(
  await readFile(new URL('../../../docs/specs/route-overlap-audit/fixtures.json', import.meta.url), 'utf8'),
);

// ---- Independent matcher (written for the tests, from SPEC section 2) ----
function parsePatternTest(pattern) {
  if (pattern === '/') return [];
  if (!pattern.startsWith('/') || pattern.endsWith('/')) return null;
  const parts = pattern.slice(1).split('/');
  if (parts.length > 8) return null;
  return parts.map((part) => {
    if (part.startsWith(':')) return { type: 'param' };
    if (part.startsWith('*')) return { type: 'tail' };
    return { type: 'literal', value: part };
  });
}

function pathSegments(path) {
  return path === '/' ? [] : path.slice(1).split('/');
}

function matchesPattern(pattern, path) {
  const segments = parsePatternTest(pattern);
  if (segments === null) return false;
  const pathSegs = pathSegments(path);
  const tailIndex = segments.findIndex((s) => s.type === 'tail');
  if (tailIndex === -1) {
    if (pathSegs.length !== segments.length) return false;
    return segments.every((seg, i) => seg.type === 'param' || seg.value === pathSegs[i]);
  }
  if (pathSegs.length < segments.length || pathSegs.length > 8) return false;
  for (let i = 0; i < tailIndex; i += 1) {
    const seg = segments[i];
    if (seg.type === 'literal' && seg.value !== pathSegs[i]) return false;
  }
  return true;
}

function witnessMatchesBoth(routesText, first, second, witness) {
  const lines = routesText.replace(/\n$/, '').split('\n');
  const patternOf = (row) => lines[row - 1].split('\t')[1];
  return matchesPattern(patternOf(first), witness) && matchesPattern(patternOf(second), witness);
}

// ---- Fixtures ----
for (const fixture of fixtures.cases.filter((c) => c.kind === 'core')) {
  test(`fixture ${fixture.id}: ${fixture.purpose}`, () => {
    const outcome = run(fixture.input);
    assert.deepEqual(outcome, fixture.expected);
    if (outcome.ok) {
      for (const overlap of outcome.result.overlaps) {
        assert.equal(
          witnessMatchesBoth(fixture.input.routes, overlap.first, overlap.second, overlap.witness),
          true,
          `witness ${overlap.witness} must match both patterns`,
        );
      }
    }
  });
}

// ---- Schema / whole-input errors ----
test('SCHEMA: non-object, wrong type, missing/extra field, accessor', () => {
  assert.deepEqual(run(null), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run('GET\t/a'), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run([]), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({}), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ routes: 42 }), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  assert.deepEqual(run({ routes: 'GET\t/a', extra: true }), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  const withGetter = {};
  Object.defineProperty(withGetter, 'routes', { enumerable: true, get: () => 'GET\t/a' });
  assert.deepEqual(run(withGetter), { ok: false, error: { code: 'SCHEMA', field: null, row: null } });
  // A null-prototype object with exactly the routes field is a plain object.
  assert.equal(run(Object.assign(Object.create(null), { routes: 'GET\t/a' })).ok, true);
});

test('capacity: length limit, surrogate, empty, row limit', () => {
  assert.deepEqual(run({ routes: 'x'.repeat(MAX_ROUTES_LENGTH + 1) }), { ok: false, error: { code: 'INPUT_LIMIT', field: 'routes', row: null } });
  // Exactly at the cap: no INPUT_LIMIT (falls through to the row check).
  assert.deepEqual(run({ routes: 'x'.repeat(MAX_ROUTES_LENGTH) }), { ok: false, error: { code: 'ROW_FORMAT', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/a\uD800' }), { ok: false, error: { code: 'UNICODE', field: 'routes', row: null } });
  assert.deepEqual(run({ routes: 'GET\t/a\uDC00' }), { ok: false, error: { code: 'UNICODE', field: 'routes', row: null } });
  // A valid surrogate pair passes the Unicode check and fails on grammar.
  assert.deepEqual(run({ routes: 'GET\t/a\uD83D\uDE00' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: '' }), { ok: false, error: { code: 'EMPTY', field: 'routes', row: null } });
  const hundred = Array.from({ length: 100 }, () => 'GET\t/a').join('\n');
  assert.equal(run({ routes: hundred }).ok, true);
  const hundredOne = `${hundred}\nGET\t/a`;
  assert.deepEqual(run({ routes: hundredOne }), { ok: false, error: { code: 'ROW_LIMIT', field: 'routes', row: null } });
});

test('trailing LF is stripped once', () => {
  assert.deepEqual(run({ routes: 'GET\t/a\n' }), { ok: true, result: { routeCount: 1, overlaps: [] } });
  assert.deepEqual(run({ routes: 'GET\t/a\n\n' }), { ok: false, error: { code: 'ROW_FORMAT', field: 'routes', row: 2 } });
});

// ---- Per-row checks, in SPEC order ----
test('ROW_FORMAT before METHOD before PATTERN_LIMIT before PATTERN before DUP_PARAMETER', () => {
  assert.deepEqual(run({ routes: 'GET /a' }), { ok: false, error: { code: 'ROW_FORMAT', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/a\t/b' }), { ok: false, error: { code: 'ROW_FORMAT', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'get\t/a' }), { ok: false, error: { code: 'METHOD', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GOT\t/a' }), { ok: false, error: { code: 'METHOD', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET \t/a' }), { ok: false, error: { code: 'METHOD', field: 'routes', row: 1 } });
  const tooLong = `GET\t/${'a'.repeat(MAX_PATTERN_LENGTH)}`;
  assert.deepEqual(run({ routes: tooLong }), { ok: false, error: { code: 'PATTERN_LIMIT', field: 'routes', row: 1 } });
  // Exactly 160 pattern units: no PATTERN_LIMIT, grammar decides.
  assert.deepEqual(run({ routes: `GET\t/${'a'.repeat(MAX_PATTERN_LENGTH - 1)}` }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\ta' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/a/' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t//a' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/a//b' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/A' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/:A' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/:1a' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/*' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/:a/*b/c' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/a/b/c/d/e/f/g/h/i' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/:a/:a' }), { ok: false, error: { code: 'DUP_PARAMETER', field: 'routes', row: 1 } });
  assert.deepEqual(run({ routes: 'GET\t/:a/*a' }), { ok: false, error: { code: 'DUP_PARAMETER', field: 'routes', row: 1 } });
  // Error row is the source line of the offending row.
  assert.deepEqual(run({ routes: 'GET\t/a\nPOST\t/bad method' }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 2 } });
});

test('grammar boundaries: literal 24/25, param name 16/17, 8 segments', () => {
  assert.equal(run({ routes: `GET\t/${'a'.repeat(24)}` }).ok, true);
  assert.deepEqual(run({ routes: `GET\t/${'a'.repeat(25)}` }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.equal(run({ routes: `GET\t/:${'a'.repeat(16)}` }).ok, true);
  assert.deepEqual(run({ routes: `GET\t/:${'a'.repeat(17)}` }), { ok: false, error: { code: 'PATTERN', field: 'routes', row: 1 } });
  assert.equal(run({ routes: 'GET\t/a-b_c9/:x_1/*t' }).ok, true);
  assert.equal(run({ routes: 'GET\t/a/b/c/d/e/f/g/h' }).ok, true);
  assert.equal(run({ routes: 'GET\t/:a/:b' }).ok, true);
});

// ---- Overlap semantics ----
test('overlap semantics: duplicates, methods, tail extension, root', () => {
  // Identical lines overlap; ordering is first then second ascending.
  assert.deepEqual(run({ routes: 'GET\t/a\nGET\t/a\nGET\t/a' }), {
    ok: true,
    result: {
      routeCount: 3,
      overlaps: [
        { method: 'GET', first: 1, second: 2, witness: '/a' },
        { method: 'GET', first: 1, second: 3, witness: '/a' },
        { method: 'GET', first: 2, second: 3, witness: '/a' },
      ],
    },
  });
  // GET and HEAD never overlap, even on identical patterns.
  assert.deepEqual(run({ routes: 'GET\t/a\nHEAD\t/a' }), { ok: true, result: { routeCount: 2, overlaps: [] } });
  // Tail extends to cover a longer literal pattern.
  assert.deepEqual(run({ routes: 'GET\t/a/*t\nGET\t/a/b/c' }), {
    ok: true,
    result: {
      routeCount: 2,
      overlaps: [{ method: 'GET', first: 1, second: 2, witness: '/a/b/c' }],
    },
  });
  // Tail against params on both sides uses 'x'.
  assert.deepEqual(run({ routes: 'GET\t/a/*t\nGET\t/a/:x/:y' }), {
    ok: true,
    result: {
      routeCount: 2,
      overlaps: [{ method: 'GET', first: 1, second: 2, witness: '/a/x/x' }],
    },
  });
  // A tail cannot match zero segments: '/a' and '/a/*t' share no length.
  assert.deepEqual(run({ routes: 'GET\t/a\nGET\t/a/*t' }), { ok: true, result: { routeCount: 2, overlaps: [] } });
  // Root against a tail: no common length either.
  assert.deepEqual(run({ routes: 'GET\t/\nGET\t/*t' }), { ok: true, result: { routeCount: 2, overlaps: [] } });
});

// ---- Exhaustive property check over a small vocabulary ----
test('exhaustive: run() agrees with brute-force matching over {a,b,x}', () => {
  const literals = ['a', 'b'];
  const patterns = ['/'];
  const firstSegments = [...literals, ':p'];
  const secondSegments = [...literals, ':p', ':q', '*t'];
  for (const first of firstSegments) {
    patterns.push(`/${first}`);
    for (const second of secondSegments) {
      if (first === ':p' && second === ':p') continue; // duplicate param name
      patterns.push(`/${first}/${second}`);
    }
  }
  patterns.push('/*t');
  const paths = ['/'];
  const values = ['a', 'b', 'x'];
  for (let len = 1; len <= 3; len += 1) {
    const build = (prefix) => {
      if (prefix.length === len) {
        paths.push(`/${prefix.join('/')}`);
        return;
      }
      for (const value of values) build([...prefix, value]);
    };
    build([]);
  }
  let pairCount = 0;
  for (const patternA of patterns) {
    for (const patternB of patterns) {
      const routes = `GET\t${patternA}\nGET\t${patternB}`;
      const outcome = run({ routes });
      assert.equal(outcome.ok, true, routes);
      const bruteOverlap = paths.some(
        (path) => matchesPattern(patternA, path) && matchesPattern(patternB, path),
      );
      pairCount += 1;
      if (bruteOverlap) {
        assert.equal(outcome.result.overlaps.length, 1, `${routes} should overlap`);
        const witness = outcome.result.overlaps[0].witness;
        assert.equal(matchesPattern(patternA, witness), true, `${routes} witness ${witness}`);
        assert.equal(matchesPattern(patternB, witness), true, `${routes} witness ${witness}`);
      } else {
        assert.equal(outcome.result.overlaps.length, 0, `${routes} should not overlap`);
      }
    }
  }
  assert.ok(pairCount > 200, `expected many pairs, got ${pairCount}`);
});

// ---- Report serialization ----
test('serializeReport: canonical key order, trailing LF, exact bytes', () => {
  const result = {
    routeCount: 4,
    overlaps: [
      { method: 'GET', first: 1, second: 2, witness: '/users/new' },
      { method: 'GET', first: 1, second: 4, witness: '/users/x' },
      { method: 'GET', first: 2, second: 4, witness: '/users/new' },
    ],
  };
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"overlaps":[{"first":1,"method":"GET","second":2,"witness":"/users/new"},{"first":1,"method":"GET","second":4,"witness":"/users/x"},{"first":2,"method":"GET","second":4,"witness":"/users/new"}],"routeCount":4}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
});

test('serializeReport: OUTPUT_LIMIT on a synthetic oversized result', () => {
  const overlaps = Array.from({ length: 10000 }, (_, i) => ({
    method: 'GET',
    first: 1,
    second: i + 2,
    witness: `/${'a'.repeat(200)}`,
  }));
  const serialized = serializeReport({ routeCount: 100, overlaps });
  assert.equal(serialized.ok, false);
  assert.deepEqual(serialized.error, { code: 'OUTPUT_LIMIT', field: null, row: null });
});
