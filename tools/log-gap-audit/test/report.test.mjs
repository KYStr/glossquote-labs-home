// Report serialization tests: canonical key order (UTF-16 code units,
// recursive), compact JSON, one trailing LF, UTF-8 without BOM, and the
// 2,097,152-byte OUTPUT_LIMIT. Expected bytes are hand-derived, never
// produced by the implementation under test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, serializeReport } from '../public/js/core/audit.mjs';

test('both-gaps report serializes to the exact canonical bytes', () => {
  const out = run({ records: '10\t0\n13\t1500\n14\t2500', threshold: '1000' });
  assert.equal(out.ok, true);
  const report = serializeReport(out.result);
  const expected =
    '{"findings":[{"issues":[{"code":"SEQ_GAP","count":"2","from":"11","to":"12"},' +
    '{"code":"TIME_GAP"}],"line":2,"prevLine":1,"sequenceDelta":"3","timeDelta":"1500"}],' +
    '"rowCount":3}\n';
  assert.equal(report.ok, true);
  assert.equal(report.text, expected);
  assert.equal(report.bytes, Buffer.byteLength(expected, 'utf8'));
  assert.equal(report.text.endsWith('\n'), true);
  assert.equal(report.text.endsWith('\n\n'), false);
  assert.equal(report.text.charCodeAt(0), 0x7b); // '{', no BOM
});

test('keys sort by UTF-16 code units at every depth', () => {
  const report = serializeReport({
    rowCount: 1,
    findings: [{
      timeDelta: '0', sequenceDelta: '0', prevLine: 1, line: 2,
      issues: [{ to: '9', from: '5', count: '5', code: 'SEQ_GAP' }],
    }],
  });
  assert.equal(
    report.text,
    '{"findings":[{"issues":[{"code":"SEQ_GAP","count":"5","from":"5","to":"9"}],' +
      '"line":2,"prevLine":1,"sequenceDelta":"0","timeDelta":"0"}],"rowCount":1}\n',
  );
});

test('empty result serializes with an empty findings array', () => {
  const report = serializeReport({ rowCount: 1, findings: [] });
  assert.deepEqual(report, { ok: true, text: '{"findings":[],"rowCount":1}\n', bytes: 29 });
});

test('report over 2,097,152 bytes is OUTPUT_LIMIT', () => {
  const findings = [];
  for (let i = 2; i <= 20001; i += 1) {
    findings.push({
      line: i, prevLine: i - 1, sequenceDelta: '2', timeDelta: '0',
      issues: [{ code: 'SEQ_GAP', from: '1', to: '1', count: '1' }],
    });
  }
  const report = serializeReport({ rowCount: 20001, findings });
  assert.deepEqual(report, {
    ok: false, error: { code: 'OUTPUT_LIMIT', field: null, row: null },
  });
});

test('a just-under-limit report still succeeds', () => {
  const findings = [];
  for (let i = 2; i <= 999; i += 1) {
    findings.push({
      line: i, prevLine: i - 1, sequenceDelta: '2', timeDelta: '0',
      issues: [{ code: 'SEQ_GAP', from: '1', to: '1', count: '1' }],
    });
  }
  const report = serializeReport({ rowCount: 999, findings });
  assert.equal(report.ok, true);
  assert.ok(report.bytes < 2097152);
});
