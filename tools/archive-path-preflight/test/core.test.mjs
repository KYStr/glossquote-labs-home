// Core tests: SPEC fixtures.json (read live) plus hand-derived boundary and
// attack cases. Expected values are derived from the SPEC rules, never from
// the implementation's own output.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { run } from '../public/js/core/validate.mjs';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  readFileSync(
    path.join(toolRoot, '../../docs/specs/archive-path-preflight/fixtures.json'),
    'utf8',
  ),
);

test('SPEC core fixtures match run() exactly', () => {
  for (const fixture of fixtures.cases) {
    if (fixture.kind !== 'core') continue;
    assert.deepEqual(
      run(fixture.input),
      fixture.expected,
      `fixture ${fixture.id}`,
    );
  }
});

test('SCHEMA: wrong envelope', () => {
  const schema = { ok: false, error: { code: 'SCHEMA', field: null, row: null } };
  for (const bad of [null, undefined, 'F\ta', 42, true, [], ['F\ta'], {}, { entries: 'F\ta', extra: 1 }, { entries: 42 }, { entries: null }, { entries: ['F\ta'] }]) {
    assert.deepEqual(run(bad), schema, JSON.stringify(bad));
  }
  const accessor = {};
  Object.defineProperty(accessor, 'entries', { get: () => 'F\ta', enumerable: true });
  assert.deepEqual(run(accessor), schema, 'accessor entries');
  const inherited = Object.create({ entries: 'F\ta' });
  assert.deepEqual(run(inherited), schema, 'inherited entries is missing');
  // A null-prototype plain object with exactly one own data field is fine.
  const nullProto = Object.create(null);
  nullProto.entries = 'F\ta';
  assert.equal(run(nullProto).ok, true);
});

test('capacity: INPUT_LIMIT, UNICODE, EMPTY, ROW_LIMIT in order', () => {
  assert.deepEqual(run({ entries: 'x'.repeat(65537) }), {
    ok: false, error: { code: 'INPUT_LIMIT', field: 'entries', row: null },
  });
  // Exactly 65,536 units passes capacity (structure fails next).
  assert.deepEqual(run({ entries: 'x'.repeat(65536) }), {
    ok: false, error: { code: 'ROW_FORMAT', field: 'entries', row: 1 },
  });
  // Lone surrogates, both kinds.
  assert.deepEqual(run({ entries: 'F\ta\uD800b' }), {
    ok: false, error: { code: 'UNICODE', field: 'entries', row: null },
  });
  assert.deepEqual(run({ entries: 'F\ta\uDC00b' }), {
    ok: false, error: { code: 'UNICODE', field: 'entries', row: null },
  });
  // A valid surrogate pair passes the Unicode check.
  assert.equal(run({ entries: 'F\t\uD83D\uDE00' }).ok, true);
  assert.deepEqual(run({ entries: '' }), {
    ok: false, error: { code: 'EMPTY', field: 'entries', row: null },
  });
  assert.deepEqual(run({ entries: '\n' }), {
    ok: false, error: { code: 'EMPTY', field: 'entries', row: null },
  });
  const rows500 = `${'F\ta\n'.repeat(499)}F\ta`;
  assert.equal(run({ entries: rows500 }).ok, true);
  const rows501 = `${'F\ta\n'.repeat(500)}F\ta`;
  assert.deepEqual(run({ entries: rows501 }), {
    ok: false, error: { code: 'ROW_LIMIT', field: 'entries', row: null },
  });
  // One trailing LF is stripped, so 500 rows + trailing LF is still 500.
  assert.equal(run({ entries: `${rows500}\n` }).ok, true);
});

test('ROW_FORMAT: structure of every line is checked before any path', () => {
  const format = (row) => ({ ok: false, error: { code: 'ROW_FORMAT', field: 'entries', row } });
  assert.deepEqual(run({ entries: 'L\tx' }), format(1));
  assert.deepEqual(run({ entries: 'f\ta' }), format(1));
  assert.deepEqual(run({ entries: 'F' }), format(1));
  assert.deepEqual(run({ entries: 'F\t' }), format(1));
  assert.deepEqual(run({ entries: 'F\ta\tb' }), format(1));
  assert.deepEqual(run({ entries: 'F\ta\n\nF\tb' }), format(2));
  // Structure phase beats path phase: line 1 has a bad path, line 2 is malformed.
  assert.deepEqual(run({ entries: 'F\t../x\nL\ty' }), format(2));
  // First malformed line wins.
  assert.deepEqual(run({ entries: 'F\ta\nX\tb\nL\tc' }), format(2));
});

test('path-level errors: PATH_LIMIT, ABSOLUTE, BACKSLASH, DEPTH', () => {
  const unsafe = (line, code) => ({
    ok: true,
    result: {
      rowCount: 1,
      unsafe: [{ line, code, segment: null }],
      conflicts: [],
      safeWithinPolicy: false,
    },
  });
  assert.deepEqual(run({ entries: `F\t${'a'.repeat(241)}` }), unsafe(1, 'PATH_LIMIT'));
  // 240 units passes the length check, then fails the segment length check.
  assert.deepEqual(run({ entries: `F\t${'a'.repeat(240)}` }), {
    ok: true,
    result: {
      rowCount: 1,
      unsafe: [{ line: 1, code: 'SEGMENT_LIMIT', segment: 1 }],
      conflicts: [],
      safeWithinPolicy: false,
    },
  });
  for (const bad of ['/etc/x', '\\server\\share', 'C:foo', 'c:/x', 'Z:', 'a:b']) {
    assert.deepEqual(run({ entries: `F\t${bad}` }), unsafe(1, 'ABSOLUTE'), bad);
  }
  for (const bad of ['x\\y', 'a/b\\c']) {
    assert.deepEqual(run({ entries: `F\t${bad}` }), unsafe(1, 'BACKSLASH'), bad);
  }
  const seventeen = Array.from({ length: 17 }, () => 'a').join('/');
  assert.deepEqual(run({ entries: `F\t${seventeen}` }), unsafe(1, 'DEPTH'));
  const sixteen = Array.from({ length: 16 }, () => 'a').join('/');
  assert.equal(run({ entries: `F\t${sixteen}` }).ok, true);
  // PATH_LIMIT beats ABSOLUTE; ABSOLUTE beats DEPTH.
  assert.deepEqual(run({ entries: `F\t/${'a'.repeat(250)}` }), unsafe(1, 'PATH_LIMIT'));
  assert.deepEqual(run({ entries: `F\t/${seventeen}` }), unsafe(1, 'ABSOLUTE'));
});

test('segment errors: priority and boundaries', () => {
  const check = (path) => run({ entries: `F\t${path}` }).result.unsafe[0];
  assert.deepEqual(check('a//b'), { line: 1, code: 'EMPTY_SEGMENT', segment: 2 });
  assert.deepEqual(check('a/'), { line: 1, code: 'EMPTY_SEGMENT', segment: 2 });
  assert.deepEqual(check('.'), { line: 1, code: 'DOT_SEGMENT', segment: 1 });
  assert.deepEqual(check('a/..'), { line: 1, code: 'DOT_SEGMENT', segment: 2 });
  assert.deepEqual(check('a'.repeat(65)), { line: 1, code: 'SEGMENT_LIMIT', segment: 1 });
  assert.equal(run({ entries: `F\t${'a'.repeat(64)}` }).ok, true);
  // SEGMENT_LIMIT beats SEGMENT_CHAR within one segment.
  assert.deepEqual(check(`${'a'.repeat(64)} `), { line: 1, code: 'SEGMENT_LIMIT', segment: 1 });
  for (const bad of ['a b', 'ab:c', 'a%b', 'aé', 'a\x01b']) {
    assert.deepEqual(check(bad), { line: 1, code: 'SEGMENT_CHAR', segment: 1 }, JSON.stringify(bad));
  }
  assert.deepEqual(check('a.'), { line: 1, code: 'TRAILING_DOT', segment: 1 });
  assert.deepEqual(check('...'), { line: 1, code: 'TRAILING_DOT', segment: 1 });
  assert.equal(run({ entries: 'F\t.a' }).ok, true, 'leading dot is allowed');
  for (const bad of ['NUL', 'nul.txt', 'CON', 'con', 'PRN', 'AUX', 'COM1', 'COM9', 'LPT1', 'LPT9.zip']) {
    assert.deepEqual(check(bad), { line: 1, code: 'DEVICE_NAME', segment: 1 }, bad);
  }
  for (const good of ['COM10', 'LPT0', 'NULx', 'CONSOLE', 'AUX1', 'nul2.txt']) {
    assert.equal(run({ entries: `F\t${good}` }).ok, true, good);
  }
  // TRAILING_DOT beats DEVICE_NAME within one segment.
  assert.deepEqual(check('NUL.'), { line: 1, code: 'TRAILING_DOT', segment: 1 });
  // Left-to-right: first bad segment wins; one unsafe entry per row.
  assert.deepEqual(check('../NUL'), { line: 1, code: 'DOT_SEGMENT', segment: 1 });
  assert.deepEqual(check('ok/NUL/../x'), { line: 1, code: 'DEVICE_NAME', segment: 2 });
});

test('conflicts: aliases, same members, file parents, ordering', () => {
  // Intermediate directory alias, three spellings.
  assert.deepEqual(
    run({ entries: 'F\tDATA/x\nF\tData/y\nF\tdata/z' }).result.conflicts,
    [{ kind: 'CASE_ALIAS', key: 'data', lines: [1, 2, 3] }],
  );
  // Same member three times.
  assert.deepEqual(
    run({ entries: 'F\ta\nD\ta\nF\ta' }).result.conflicts,
    [{ kind: 'SAME_MEMBER', key: 'a', lines: [1, 2, 3] }],
  );
  // File parent with a directory descendant and multiple F lines.
  assert.deepEqual(
    run({ entries: 'F\ta\nF\ta\nF\ta/b\nD\ta/c' }).result.conflicts,
    [
      { kind: 'SAME_MEMBER', key: 'a', lines: [1, 2] },
      { kind: 'PARENT_FILE', key: 'a', lines: [1, 2, 3, 4] },
    ],
  );
  // Deep descendant still makes the file an ancestor.
  assert.deepEqual(
    run({ entries: 'F\ta\nF\ta/b/c' }).result.conflicts,
    [{ kind: 'PARENT_FILE', key: 'a', lines: [1, 2] }],
  );
  // A directory parent with descendants is fine.
  assert.deepEqual(run({ entries: 'D\ta\nF\ta/b' }).result.conflicts, []);
  // Alias at an intermediate node plus same member at the terminal node.
  assert.deepEqual(
    run({ entries: 'F\tData/a.txt\nF\tdata/a.txt' }).result.conflicts,
    [
      { kind: 'CASE_ALIAS', key: 'data', lines: [1, 2] },
      { kind: 'SAME_MEMBER', key: 'data/a.txt', lines: [1, 2] },
    ],
  );
  // All three kinds at one node, in kind order.
  assert.deepEqual(
    run({ entries: 'F\tA\nF\ta\nF\ta/b' }).result.conflicts,
    [
      { kind: 'CASE_ALIAS', key: 'a', lines: [1, 2, 3] },
      { kind: 'SAME_MEMBER', key: 'a', lines: [1, 2] },
      { kind: 'PARENT_FILE', key: 'a', lines: [1, 2, 3] },
    ],
  );
  // Keys sort in ASCII order before kind order.
  assert.deepEqual(
    run({ entries: 'F\tB/x\nF\tb/y\nF\tA/p\nF\ta/q' }).result.conflicts,
    [
      { kind: 'CASE_ALIAS', key: 'a', lines: [3, 4] },
      { kind: 'CASE_ALIAS', key: 'b', lines: [1, 2] },
    ],
  );
  // Unsafe rows never enter the trie.
  assert.deepEqual(
    run({ entries: 'F\tData/../x\nF\tdata/b.txt' }).result,
    {
      rowCount: 2,
      unsafe: [{ line: 1, code: 'DOT_SEGMENT', segment: 2 }],
      conflicts: [],
      safeWithinPolicy: false,
    },
  );
  // rowCount counts unsafe rows; safeWithinPolicy needs both arrays empty.
  assert.deepEqual(run({ entries: 'F\ta\nF\tb' }).result, {
    rowCount: 2,
    unsafe: [],
    conflicts: [],
    safeWithinPolicy: true,
  });
});

test('run() does not mutate its input', () => {
  const input = { entries: 'F\ta\nF\ta/b' };
  const frozen = JSON.stringify(input);
  run(input);
  assert.equal(JSON.stringify(input), frozen);
});
