import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeBatch, FILENAMES } from '../public/js/core/export.mjs';
const decode = bytes => new TextDecoder().decode(bytes);
const result = (text, blankFields = []) => ({ records: [{ row: 1, text, blankFields }] });
const options = { template: '{{姓名}}', headers: ['姓名'], allowBlank: false, language: 'en' };

test('A17: filenames never derive from names or paths', () => {
  const output = serializeBatch(result('../../evil.html'), options);
  assert.deepEqual(FILENAMES, { txt: 'personalized-text.txt', json: 'personalized-text.json' });
  assert.equal(decode(output.txt), '--- Row 1 ---\n../../evil.html\n');
});
test('A18: exact envelope, Unicode/newline and blank metadata', () => {
  const output = serializeBatch(result('王\n😀', ['ID']), { template: '{{姓名}}\n{{ID}}', headers: ['姓名', 'ID'], allowBlank: true, language: 'zh-Hant' });
  assert.deepEqual(JSON.parse(decode(output.json)), {
    schemaVersion: 1, tool: 'template-merge', template: '{{姓名}}\n{{ID}}', headers: ['姓名', 'ID'],
    options: { allowBlank: true, language: 'zh-Hant' }, records: [{ row: 1, text: '王\n😀', blankFields: ['ID'] }],
    counts: { records: 1, blankCells: 1, recordsWithBlanks: 1 },
  });
  assert.equal(decode(output.txt), '--- 第 1 筆 ---\n王\n😀\n');
  assert.equal(output.combinedBytes, output.txt.byteLength + output.json.byteLength);
});
test('A19: authoritative exact 8 MiB accepts; one-byte metadata increment blocks both', () => {
  // Independently written wire format, not a serializer-produced expected value.
  const emptyJson = '{"schemaVersion":1,"tool":"template-merge","template":"","headers":["x"],"options":{"allowBlank":false,"language":"en"},"records":[{"row":1,"text":"","blankFields":[]}],"counts":{"records":1,"blankCells":0,"recordsWithBlanks":0}}';
  const base = new TextEncoder().encode(`--- Row 1 ---\n\n${emptyJson}`).byteLength;
  const template = (8_388_608 - base) % 2 === 0 ? '' : 'T';
  const n = (8_388_608 - base - template.length) / 2;
  assert.ok(Number.isInteger(n));
  const input = result('x'.repeat(n));
  const exactOptions = { template, headers: ['x'], allowBlank: false, language: 'en' };
  const output = serializeBatch(input, exactOptions);
  assert.equal(output.combinedBytes, 8_388_608);
  assert.throws(() => serializeBatch(input, { ...exactOptions, template: `${template}T` }), error => error.code === 'OUTPUT_TOO_LARGE');
});
test('JSON escaping and every TXT separator are counted, not just record bytes', () => {
  const input = { records: [{ row: 1, text: '"\\\n', blankFields: [] }, { row: 2, text: 'é', blankFields: [] }] };
  const expectedJson = '{"schemaVersion":1,"tool":"template-merge","template":"","headers":["x"],"options":{"allowBlank":false,"language":"en"},"records":[{"row":1,"text":"\\\"\\\\\\n","blankFields":[]},{"row":2,"text":"é","blankFields":[]}],"counts":{"records":2,"blankCells":0,"recordsWithBlanks":0}}';
  const expectedTxt = '--- Row 1 ---\n"\\\n\n\n--- Row 2 ---\né\n';
  const expectedBytes = new TextEncoder().encode(expectedTxt + expectedJson).byteLength;
  const config = { template: '', headers: ['x'], allowBlank: false, language: 'en' };
  const output = serializeBatch(input, config, { maxCombinedBytes: expectedBytes });
  assert.equal(decode(output.txt), expectedTxt);
  assert.equal(decode(output.json), expectedJson);
  assert.equal(output.combinedBytes, expectedBytes);
  assert.throws(() => serializeBatch(input, config, { maxCombinedBytes: expectedBytes - 1 }), error => error.code === 'OUTPUT_TOO_LARGE');
});
