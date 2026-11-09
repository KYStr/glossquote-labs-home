// Core tests for Binary Record Inspector.
// Expected values come from docs/specs/binary-record-inspector/fixtures.json
// and from hand-derived cases below — never from the implementation output.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { run, serializeReport } from '../public/js/core/inspector.mjs';

const fixturesUrl = new URL(
  '../../../docs/specs/binary-record-inspector/fixtures.json',
  import.meta.url,
);
const fixtures = JSON.parse(await readFile(fixturesUrl, 'utf8'));

const coreCases = fixtures.cases.filter((c) => c.kind === 'core');
for (const c of coreCases) {
  test(`fixture ${c.id}: ${c.purpose}`, () => {
    assert.deepEqual(run(c.input), c.expected);
  });
}

test('hex capacity: 16,385 units is INPUT_LIMIT', () => {
  assert.deepEqual(run({ hex: 'A'.repeat(16385), layout: 'a\t0\tu8' }), {
    ok: false,
    error: { code: 'INPUT_LIMIT', field: 'hex', row: null },
  });
});

test('hex capacity: exactly 16,384 units passes capacity, then BYTE_LIMIT', () => {
  assert.deepEqual(run({ hex: 'AA'.repeat(8192), layout: 'a\t0\tu8' }), {
    ok: false,
    error: { code: 'BYTE_LIMIT', field: 'hex', row: null },
  });
});

test('byte limit: exactly 4,096 bytes is accepted', () => {
  const outcome = run({ hex: 'AA'.repeat(4096), layout: 'a\t0\tu8' });
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      byteCount: 4096,
      fields: [{ label: 'a', offset: 0, type: 'u8', hex: 'aa', value: '170' }],
    },
  });
});

test('byte limit: 4,097 bytes is BYTE_LIMIT', () => {
  assert.deepEqual(run({ hex: 'AA'.repeat(4097), layout: 'a\t0\tu8' }), {
    ok: false,
    error: { code: 'BYTE_LIMIT', field: 'hex', row: null },
  });
});

test('layout capacity: 4,097 units is INPUT_LIMIT', () => {
  assert.deepEqual(run({ hex: 'ff', layout: 'a'.repeat(4097) }), {
    ok: false,
    error: { code: 'INPUT_LIMIT', field: 'layout', row: null },
  });
});

test('layout rows: exactly 64 rows are accepted', () => {
  const rows = [];
  const expectedFields = [];
  for (let i = 0; i < 64; i += 1) {
    rows.push(`f${i}\t${i}\tu8`);
    expectedFields.push({ label: `f${i}`, offset: i, type: 'u8', hex: '00', value: '0' });
  }
  assert.deepEqual(run({ hex: '00 '.repeat(64).trim(), layout: rows.join('\n') }), {
    ok: true,
    result: { byteCount: 64, fields: expectedFields },
  });
});

test('layout rows: 65 rows is ROW_LIMIT', () => {
  const rows = [];
  for (let i = 0; i < 65; i += 1) rows.push(`f${i}\t0\tu8`);
  assert.deepEqual(run({ hex: 'ff', layout: rows.join('\n') }), {
    ok: false,
    error: { code: 'ROW_LIMIT', field: 'layout', row: null },
  });
});

test('lone surrogate in hex is UNICODE', () => {
  assert.deepEqual(run({ hex: '\uD800', layout: 'a\t0\tu8' }), {
    ok: false,
    error: { code: 'UNICODE', field: 'hex', row: null },
  });
});

test('lone surrogate in layout is UNICODE', () => {
  assert.deepEqual(run({ hex: 'ff', layout: 'a\t0\tu8\n\uD800' }), {
    ok: false,
    error: { code: 'UNICODE', field: 'layout', row: null },
  });
});

test('empty hex is EMPTY, including separators only', () => {
  for (const hex of ['', '  \n\t ']) {
    assert.deepEqual(run({ hex, layout: 'a\t0\tu8' }), {
      ok: false,
      error: { code: 'EMPTY', field: 'hex', row: null },
    });
  }
});

test('empty layout is EMPTY', () => {
  assert.deepEqual(run({ hex: 'ff', layout: '' }), {
    ok: false,
    error: { code: 'EMPTY', field: 'layout', row: null },
  });
});

test('hex format: 0x prefix, odd nibble, CR separator are HEX_FORMAT', () => {
  for (const hex of ['0x12', '123', '12\r34', 'zz', '1 2']) {
    assert.deepEqual(run({ hex, layout: 'a\t0\tu8' }), {
      ok: false,
      error: { code: 'HEX_FORMAT', field: 'hex', row: null },
    });
  }
});

test('layout format: leading-zero offset, 5-digit offset, negative offset', () => {
  for (const layout of ['a\t01\tu8', 'a\t10000\tu8', 'a\t-1\tu8']) {
    assert.deepEqual(run({ hex: 'ff', layout }), {
      ok: false,
      error: { code: 'LAYOUT_FORMAT', field: 'layout', row: 1 },
    });
  }
});

test('layout format: bad label and wrong field count', () => {
  const cases = ['1a\t0\tu8', 'a'.repeat(25) + '\t0\tu8', 'a\t0', 'a\t0\tu8\textra', ''];
  for (const layout of cases) {
    if (layout === '') continue; // empty layout is EMPTY, tested above
    assert.deepEqual(run({ hex: 'ff', layout }), {
      ok: false,
      error: { code: 'LAYOUT_FORMAT', field: 'layout', row: 1 },
    });
  }
});

test('duplicate label is DUP_LABEL on the later row', () => {
  assert.deepEqual(run({ hex: 'ff00', layout: 'a\t0\tu8\na\t1\tu8' }), {
    ok: false,
    error: { code: 'DUP_LABEL', field: 'layout', row: 2 },
  });
});

test('unknown types are TYPE', () => {
  for (const type of ['u8le', 'f32', 'u15le', 'i8be']) {
    assert.deepEqual(run({ hex: 'ff', layout: `a\t0\t${type}` }), {
      ok: false,
      error: { code: 'TYPE', field: 'layout', row: 1 },
    });
  }
});

test('bounds: offset exactly at the end is BOUNDS, last byte is fine', () => {
  assert.deepEqual(run({ hex: 'ff', layout: 'a\t1\tu8' }), {
    ok: false,
    error: { code: 'BOUNDS', field: 'layout', row: 1 },
  });
  assert.deepEqual(run({ hex: 'ff', layout: 'a\t0\tu8' }), {
    ok: true,
    result: {
      byteCount: 1,
      fields: [{ label: 'a', offset: 0, type: 'u8', hex: 'ff', value: '255' }],
    },
  });
});

test('signed extremes: i16be min, u32le max, i64le min', () => {
  assert.deepEqual(run({ hex: '8000', layout: 'a\t0\ti16be' }).result.fields[0].value, '-32768');
  assert.deepEqual(run({ hex: 'ffffffff', layout: 'a\t0\tu32le' }).result.fields[0].value, '4294967295');
  assert.deepEqual(
    run({ hex: '0000000000000080', layout: 'a\t0\ti64le' }).result.fields[0].value,
    '-9223372036854775808',
  );
});

test('fields keep layout order and may overlap', () => {
  const outcome = run({ hex: 'FF 80 00 01', layout: 'c\t1\ti8\na\t0\tu16be' });
  assert.deepEqual(outcome, {
    ok: true,
    result: {
      byteCount: 4,
      fields: [
        { label: 'c', offset: 1, type: 'i8', hex: '80', value: '-128' },
        { label: 'a', offset: 0, type: 'u16be', hex: 'ff80', value: '65408' },
      ],
    },
  });
});

test('schema: null, array, missing field, extra field, wrong type, accessor', () => {
  const expected = { ok: false, error: { code: 'SCHEMA', field: null, row: null } };
  assert.deepEqual(run(null), expected);
  assert.deepEqual(run([]), expected);
  assert.deepEqual(run({}), expected);
  assert.deepEqual(run({ hex: 'ff' }), expected);
  assert.deepEqual(run({ hex: 'ff', layout: 'a\t0\tu8', extra: 1 }), expected);
  assert.deepEqual(run({ hex: 1, layout: 'a\t0\tu8' }), expected);
  const withGetter = {};
  Object.defineProperty(withGetter, 'hex', { get: () => 'ff', enumerable: true });
  Object.defineProperty(withGetter, 'layout', { value: 'a\t0\tu8', enumerable: true });
  assert.deepEqual(run(withGetter), expected);
});

test('serializeReport: canonical key order, trailing LF', () => {
  const result = {
    byteCount: 4,
    fields: [
      { label: 'a', offset: 0, type: 'u16be', hex: 'ff80', value: '65408' },
      { label: 'b', offset: 0, type: 'u16le', hex: 'ff80', value: '33023' },
      { label: 'c', offset: 1, type: 'i8', hex: '80', value: '-128' },
    ],
  };
  assert.deepEqual(serializeReport(result), {
    ok: true,
    text:
      '{"byteCount":4,"fields":[' +
      '{"hex":"ff80","label":"a","offset":0,"type":"u16be","value":"65408"},' +
      '{"hex":"ff80","label":"b","offset":0,"type":"u16le","value":"33023"},' +
      '{"hex":"80","label":"c","offset":1,"type":"i8","value":"-128"}' +
      ']}\n',
  });
});

test('serializeReport: nested keys sorted by UTF-16 code units', () => {
  assert.deepEqual(serializeReport({ b: 1, a: { d: 2, c: 3 } }), {
    ok: true,
    text: '{"a":{"c":3,"d":2},"b":1}\n',
  });
});

test('serializeReport: over the 2 MB cap is OUTPUT_LIMIT', () => {
  assert.deepEqual(serializeReport({ value: '9'.repeat(2097152) }), {
    ok: false,
    error: { code: 'OUTPUT_LIMIT', field: null, row: null },
  });
});
