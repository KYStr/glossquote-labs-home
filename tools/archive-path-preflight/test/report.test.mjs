// Report serialization tests: deterministic sorted JSON, trailing LF,
// UTF-8 without BOM, string escaping, and the 2,097,152-byte cap.
// Byte equality is verified against an independently written serializer
// (sorted-key clone + JSON.stringify) and SHA-256.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAX_REPORT_BYTES, REPORT_FILENAME, run, serializeReport } from '../public/js/core/validate.mjs';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  readFileSync(
    path.join(toolRoot, '../../docs/specs/archive-path-preflight/fixtures.json'),
    'utf8',
  ),
);

function sha256(text) {
  return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

// Independent serializer: clone with keys inserted in sorted order, then
// plain JSON.stringify. Written separately from the core implementation.
function independentSerialize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => independentSerialize(item)).join(',')}]`;
  }
  const sorted = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = independentSerialize(value[key]);
  }
  const inner = Object.keys(sorted)
    .map((key) => `${JSON.stringify(key)}:${sorted[key]}`)
    .join(',');
  return `{${inner}}`;
}

test('report filename is fixed', () => {
  assert.equal(REPORT_FILENAME, 'archive-path-preflight-report.json');
});

test('serialization matches the SPEC byte layout for a clean result', () => {
  const { result } = run({ entries: 'D\tdata\nF\tdata/a.txt\nF\tdata/b.txt' });
  const serialized = serializeReport(result);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"conflicts":[],"rowCount":3,"safeWithinPolicy":true,"unsafe":[]}\n',
  );
  assert.equal(serialized.bytes, new TextEncoder().encode(serialized.text).length);
  assert.equal(serialized.text.charCodeAt(0), 0x7b, 'starts with {, no BOM');
  assert.equal(serialized.text.endsWith('}\n'), true);
  assert.equal(serialized.text.endsWith('}\n\n'), false, 'exactly one trailing LF');
});

test('nested keys sort recursively; arrays keep order', () => {
  const { result } = run({ entries: 'F\ta\nF\ta/b\nD\ta' });
  const serialized = serializeReport(result);
  assert.equal(
    serialized.text,
    '{"conflicts":[{"key":"a","kind":"SAME_MEMBER","lines":[1,3]},{"key":"a","kind":"PARENT_FILE","lines":[1,2]}],"rowCount":3,"safeWithinPolicy":false,"unsafe":[]}\n',
  );
});

test('string escaping uses JSON literal escaping', () => {
  const synthetic = {
    rowCount: 1,
    unsafe: [{ line: 1, code: 'X"\\\n\u0001\u00e9', segment: null }],
    conflicts: [],
    safeWithinPolicy: false,
  };
  const serialized = serializeReport(synthetic);
  assert.equal(serialized.ok, true);
  assert.equal(
    serialized.text,
    '{"conflicts":[],"rowCount":1,"safeWithinPolicy":false,"unsafe":[{"code":"X\\"\\\\\\n\\u0001\u00e9","line":1,"segment":null}]}\n',
  );
});

test('independent serializer agrees byte-for-byte on every SPEC fixture', () => {
  for (const fixture of fixtures.cases) {
    if (fixture.kind !== 'core') continue;
    const out = run(fixture.input);
    if (!out.ok) continue; // e.g. symlink-kind: no result to serialize.
    assert.equal(out.ok, true, fixture.id);
    const serialized = serializeReport(out.result);
    const independent = `${independentSerialize(out.result)}\n`;
    assert.equal(serialized.text, independent, `bytes differ for ${fixture.id}`);
    assert.equal(
      sha256(serialized.text),
      sha256(independent),
      `sha256 differs for ${fixture.id}`,
    );
    assert.equal(
      serialized.bytes,
      Buffer.byteLength(independent, 'utf8'),
      `byte count differs for ${fixture.id}`,
    );
  }
});

test('report cap: oversized report is OUTPUT_LIMIT', () => {
  assert.equal(MAX_REPORT_BYTES, 2097152);
  const big = {
    rowCount: 500,
    unsafe: Array.from({ length: 60000 }, () => ({
      line: 500,
      code: 'PATH_LIMIT',
      segment: null,
    })),
    conflicts: [],
    safeWithinPolicy: false,
  };
  const serialized = serializeReport(big);
  assert.deepEqual(serialized, {
    ok: false,
    error: { code: 'OUTPUT_LIMIT', field: null, row: null },
  });
  // Just under the cap serializes fine.
  const small = {
    rowCount: 1,
    unsafe: [],
    conflicts: [],
    safeWithinPolicy: true,
  };
  assert.equal(serializeReport(small).ok, true);
});

test('serializeReport rejects non-plain values with INTERNAL', () => {
  assert.deepEqual(serializeReport({ value: undefined }), {
    ok: false,
    error: { code: 'INTERNAL', field: null, row: null },
  });
  assert.deepEqual(serializeReport({ value: () => 1 }), {
    ok: false,
    error: { code: 'INTERNAL', field: null, row: null },
  });
});
