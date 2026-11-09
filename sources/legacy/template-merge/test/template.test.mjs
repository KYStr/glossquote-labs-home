import test from 'node:test';
import assert from 'node:assert/strict';
import { compileTemplate, inspectMissing } from '../public/js/core/template.mjs';
import { renderBatch } from '../public/js/core/render.mjs';
const code = expected => error => error.code === expected;

test('A08: literal Chinese template, immutable segments and distinct used fields', async () => {
  const compiled = compileTemplate('您好{{姓名}}，編號{{ID}} / {{ID}}', ['姓名', 'ID']);
  assert.deepEqual((await renderBatch([['小王', '001']], compiled)).records, [{ row: 1, text: '您好小王，編號001 / 001', blankFields: [] }]);
  assert.deepEqual(compiled.fields, [{ name: '姓名', index: 0 }, { name: 'ID', index: 1 }]);
  assert.ok(Object.isFrozen(compiled) && Object.isFrozen(compiled.segments[0]));
});
test('A09: report all unknown fields once, including exact whitespace', () => {
  assert.throws(() => compileTemplate('{{地址}} {{Email}} {{地址}} {{ Name }}', ['Name']), error => {
    assert.equal(error.code, 'UNKNOWN_FIELD');
    assert.deepEqual(error.details.fields, ['地址', 'Email', ' Name ']);
    return true;
  });
});
test('A10: unclosed, orphan, empty and nested markers reject', () => {
  for (const value of ['{{姓名', '姓名}}', '{{}}', '{{{姓名}}}', '{{A{B}}', '{{A}B}}', 'a}}b{{x}}']) assert.throws(() => compileTemplate(value, ['姓名', 'x']), code('TEMPLATE_SYNTAX'));
});
test('A11: exact case-sensitive header match without trimming', async () => {
  assert.throws(() => compileTemplate('{{ Name }}', ['Name']), code('UNKNOWN_FIELD'));
  assert.throws(() => compileTemplate('{{name}}', ['Name']), code('UNKNOWN_FIELD'));
  assert.equal((await renderBatch([[' A ']], compileTemplate('{{ Name }}', [' Name ']))).records[0].text, ' A ');
});
test('A12: missing analysis only examines used fields and blocks the whole batch', async () => {
  const compiled = compileTemplate('{{ID}}{{ID}}', ['Name', 'ID', 'Unused']);
  const rows = [['A', '', ''], ['B', '2', '']];
  assert.deepEqual(inspectMissing(rows, compiled.fields), { byField: [{ field: 'ID', count: 1, rowIndexes: [1] }], totalCells: 1 });
  await assert.rejects(renderBatch(rows, compiled), code('MISSING_VALUES'));
});
test('A13: explicit blank option, unique blankFields, whitespace is not empty', async () => {
  const compiled = compileTemplate('{{ID}}', ['ID']);
  const rows = [[''], ['2'], [' '], ['\t'], ['　']];
  assert.deepEqual((await renderBatch(rows, compiled, { allowBlank: true })).records, [
    { row: 1, text: '', blankFields: ['ID'] }, { row: 2, text: '2', blankFields: [] },
    { row: 3, text: ' ', blankFields: [] }, { row: 4, text: '\t', blankFields: [] }, { row: 5, text: '　', blankFields: [] },
  ]);
});
test('missing summary lists each field and only its first 20 row positions', () => {
  const fields = compileTemplate('{{A}}{{B}}', ['A', 'B']).fields;
  const summary = inspectMissing(Array.from({ length: 25 }, () => ['', '']), fields);
  assert.equal(summary.totalCells, 50);
  assert.deepEqual(summary.byField.map(item => [item.field, item.count, item.rowIndexes.length]), [['A', 25, 20], ['B', 25, 20]]);
  assert.deepEqual(summary.byField[0].rowIndexes, Array.from({ length: 20 }, (_, i) => i + 1));
});
test('A14–A16: inserted markers, replacement tokens and malicious markup stay literal', async () => {
  const payload = '<script>alert(1)</script><img src=x onerror=alert(1)>';
  const compiled = compileTemplate('{{A}}', ['A', 'B']);
  const values = ['{{B}}', '$& $1 $$', payload];
  assert.deepEqual((await renderBatch(values.map(value => [value, 'EXPANDED']), compiled)).records.map(record => record.text), values);
});
test('literal-only including single braces/Markdown is allowed, even empty text', async () => {
  const literal = '{name} ${name} <b>hello</b> **plain**';
  assert.equal(compileTemplate(literal, ['x']).fields.length, 0);
  assert.deepEqual((await renderBatch([[''], ['']], compileTemplate(literal, ['x']))).records.map(record => record.text), [literal, literal]);
  assert.equal((await renderBatch([['x']], compileTemplate('', ['x']))).records[0].text, '');
});
test('template UTF-16 cap includes surrogate pairs and exact maximum', () => {
  assert.equal(compileTemplate('😀'.repeat(16384), ['x']).source.length, 32768);
  assert.throws(() => compileTemplate(`${'😀'.repeat(16384)}x`, ['x']), code('TEMPLATE_TOO_LARGE'));
});
test('UTF-8 byte count matches the final string when empty fields bridge surrogate halves', async () => {
  const compiled = compileTemplate('\ud83d{{blank}}\ude00', ['blank']);
  const output = await renderBatch([['']], compiled, { allowBlank: true });
  assert.equal(output.records[0].text, '😀');
  assert.equal(output.recordTextBytes, 4);
});
test('A20: stale generation rejected after the 100-row yield', async () => {
  let generation = 1;
  const progress = [];
  await assert.rejects(renderBatch(Array.from({ length: 101 }, () => ['x']), compileTemplate('{{x}}', ['x']), {
    isCurrent: () => generation === 1, onProgress: value => progress.push(value), yieldControl: async () => { generation = 2; },
  }), code('CANCELLED'));
  assert.deepEqual(progress, [{ completed: 100, total: 101 }]);
});
test('cancel before start and during yields returns no partial result', async () => {
  const controller = new AbortController();
  const rows = Array.from({ length: 200 }, () => ['x']);
  const compiled = compileTemplate('{{x}}', ['x']);
  await assert.rejects(renderBatch(rows, compiled, { signal: controller.signal, yieldControl: async () => controller.abort() }), code('CANCELLED'));
  await assert.rejects(renderBatch(rows, compiled, { signal: controller.signal }), code('CANCELLED'));
});
test('1000-row rendering yields every 100 rows with bounded progress', async () => {
  let yields = 0;
  const output = await renderBatch(Array.from({ length: 1000 }, () => ['王']), compileTemplate('{{x}}', ['x']), { yieldControl: async () => { yields++; } });
  assert.equal(yields, 10);
  assert.equal(output.recordTextBytes, 3000);
  assert.equal(output.records[999].row, 1000);
});
test('record-only byte lower bound can reject oversized batches early', async () => {
  await assert.rejects(renderBatch(Array.from({ length: 300 }, () => ['x'.repeat(32768)]), compileTemplate('{{x}}', ['x'])), code('OUTPUT_TOO_LARGE'));
});
