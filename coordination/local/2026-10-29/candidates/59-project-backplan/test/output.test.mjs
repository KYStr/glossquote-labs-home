import test from 'node:test';
import assert from 'node:assert/strict';
import { serializePlan, MAX_OUTPUT_BYTES } from '../public/js/core/output.mjs';
import { calculateBackplan } from '../public/js/core/backplan.mjs';
import { task, project } from './helpers.mjs';

test('A14: literal markup is data; JSON/TXT contain every required field and Unicode UTF-8 byte counts', () => {
  const name = '<script>alert(1)</script>';
  const p = calculateBackplan(project([task('A', 2, [], name), task('B', 3, ['A'], '審稿😀')]));
  const out = serializePlan(p);
  assert.equal(out.ok, true);
  assert.deepEqual(JSON.parse(out.json.text), {
    schema: 'gq.backplan', version: 1,
    settings: { deadline: '2026-10-23', effectiveDeadline: '2026-10-23', deadlineAdjusted: false, deadlineAdjustmentDays: 0, workweek: [1, 2, 3, 4, 5], holidays: [] },
    anchor: '2026-10-19', longestPathWorkdays: 5,
    tasks: [
      { id: 'A', name, durationWorkdays: 2, predecessors: [], ES: '2026-10-19', EF: '2026-10-20', LS: '2026-10-19', LF: '2026-10-20', slackWorkdays: 0, critical: true },
      { id: 'B', name: '審稿😀', durationWorkdays: 3, predecessors: ['A'], ES: '2026-10-21', EF: '2026-10-23', LS: '2026-10-21', LF: '2026-10-23', slackWorkdays: 0, critical: true }
    ], criticalTaskIds: ['A', 'B']
  });
  assert.ok(out.txt.text.includes(`A\t${name}\t2\t無\t2026-10-19\t2026-10-20\t2026-10-19\t2026-10-20\t0\t是`));
  assert.ok(out.txt.text.includes('B\t審稿😀\t3\tA\t2026-10-21\t2026-10-23\t2026-10-21\t2026-10-23\t0\t是'));
  assert.equal(out.json.filename, 'project-backplan.json');
  assert.equal(out.txt.filename, 'project-backplan.txt');
  assert.equal(out.totalBytes, Buffer.byteLength(out.json.text, 'utf8') + Buffer.byteLength(out.txt.text, 'utf8'));
  assert.ok(out.totalBytes > out.json.text.length + out.txt.text.length);
});
test('A15: combined 2 MiB exact byte boundary and +1 byte are atomic, with no truncation', () => {
  // Valid 100-task inputs cannot reach 2 MiB. Inject synthetic padding at the serializer boundary.
  const p = calculateBackplan(project([task('A')]));
  const baseline = serializePlan(p, { locale: 'en' });
  let remaining = MAX_OUTPUT_BYTES - baseline.totalBytes;
  // ASCII x contributes two bytes (once per file); a quote contributes three due to JSON escaping.
  if (remaining % 2) { p.tasks[0].name += '"'; remaining -= 3; }
  p.tasks[0].name += 'x'.repeat(remaining / 2);
  const out = serializePlan(p, { locale: 'en' });
  assert.equal(out.ok, true);
  assert.equal(Buffer.byteLength(out.json.text) + Buffer.byteLength(out.txt.text), MAX_OUTPUT_BYTES);
  const parsed = JSON.parse(out.json.text);
  assert.equal(parsed.tasks[0].name, p.tasks[0].name);
  // Replacing one x by a quote adds one combined UTF-8 byte; no partial descriptors may escape.
  p.tasks[0].name = p.tasks[0].name.slice(0, -1) + '"';
  assert.deepEqual(serializePlan(p, { locale: 'en' }), { ok: false, code: 'OUTPUT_LIMIT' });
});
test('localized TXT headers, adjustment delta, JSON identity, quotes and backslashes', () => {
  const p = calculateBackplan(project([task('A', 1, [], 'Review "quotes" \\ docs')], { deadline: '2026-10-24' }));
  const zh = serializePlan(p, { locale: 'zh-Hant' });
  const en = serializePlan(p, { locale: 'en' });
  assert.equal(zh.json.text, en.json.text);
  assert.ok(en.txt.text.includes('Early start ES\tEarly finish EF\tLate start LS\tLate finish LF\tSlack (workdays)'));
  assert.ok(en.txt.text.includes('Calendar days moved earlier: 1'));
  assert.ok(zh.txt.text.includes('向前調整曆日數: 1'));
  assert.equal(JSON.parse(en.json.text).tasks[0].name, p.tasks[0].name);
  assert.deepEqual(serializePlan(p, { maxBytes: en.totalBytes - 1, locale: 'en' }), { ok: false, code: 'OUTPUT_LIMIT' });
  assert.deepEqual(serializePlan(p, { maxBytes: -1 }), { ok: false, code: 'OUTPUT_OPTIONS' });
});
