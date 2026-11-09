import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages } from '../public/js/i18n.mjs';
import { reportText } from '../public/js/core/report.mjs';
test('locale dictionaries have parity; static UI ids and labels match controller', async () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages['zh-Hant']).sort());
  assert.deepEqual(Object.keys(reportText.en).sort(), Object.keys(reportText['zh-Hant']).sort());
  const ids = ['bill-form', 'workflow-quick', 'workflow-advanced', 'advanced-options', 'quick-help', 'calculate', 'precision', 'mode', 'people', 'add-person', 'clear', 'example', 'copy', 'download', 'output', 'report', 'form-error', 'draft-state', 'calculation-status', 'output-status', 'empty-result'];
  for (const file of ['index.html', 'en/index.html']) {
    const html = await readFile(new URL('../public/' + file, import.meta.url), 'utf8');
    for (const id of ids) assert.ok(html.includes(`id="${id}"`), id);
    const allIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); assert.equal(allIds.length, new Set(allIds).size);
    for (const id of ['workflow-quick','workflow-advanced', 'precision', 'mode', 'report']) assert.ok(html.includes(`for="${id}"`));
    assert.ok(!html.includes('id="total"')&&!html.includes('id="paid-toggle"'));assert.ok(!html.includes('Shared costs are split equally.'));
    assert.ok(html.includes('type="radio" value="quick" checked'));assert.equal((html.match(/name="workflow" type="radio"/g)??[]).length,2);assert.ok(!html.includes('role="tab"'));
    assert.ok(html.includes('autocomplete="off"')); assert.ok(html.includes('novalidate'));
  }
});
