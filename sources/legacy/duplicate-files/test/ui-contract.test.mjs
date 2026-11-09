import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { COPY, groupModels, formatBytes, formatError, visibleReport } from '../public/js/ui.js';
import { ERROR_CODES } from '../public/js/core/limits.js';
import { analyze } from '../public/js/core/analyze.js';
import { chooseKeeper, serializeTXT } from '../public/js/core/report.js';
import { fixture } from './helpers.mjs';
import { ROOT, checkPublic } from '../scripts/check.mjs';

test('T20 bilingual runtime copy covers every fixed error, recovery and group action', () => {
  assert.deepEqual(Object.keys(COPY['zh-Hant']).sort(), Object.keys(COPY.en).sort());
  for (const language of ['zh-Hant', 'en']) {
    assert.deepEqual(Object.keys(COPY[language].errors), ERROR_CODES);
    for (const code of ERROR_CODES) {
      const text = formatError({ code, fileIndexes: [0, 3] }, language);
      assert(text.length > 20); assert.match(text, /0, 3/); assert(!text.includes('undefined'));
    }
    assert.equal(formatBytes(0, language), '0 bytes');
    assert.match(formatBytes(33_554_432, language), /^32 MiB/);
  }
  assert.equal(COPY.en.selected('1', '3 bytes'), '1 file selected, 3 bytes total.');
});

test('T20 Node view models keep source indexes, hide singleton choices and update same-group mapping', async () => {
  const result = await analyze(fixture()), models = groupModels(result);
  assert.deepEqual(models.map(group => group.canChoose), [true, false, true]);
  assert.deepEqual(models[0].members, [{ sourceIndex: 0, visibleName: 'a', isKeeper: true }, { sourceIndex: 1, visibleName: 'b', isKeeper: false }]);
  const next = groupModels(chooseKeeper(result, 'group-001', 1));
  assert.deepEqual(next[0].members.map(item => item.isKeeper), [false, true]);
  assert.equal(next[1].members[0].sourceIndex, 2);
  assert.equal(visibleReport('a\u202eb\nrow\tend'), 'a\\u202eb\nrow\tend');
  assert.match(visibleReport(serializeTXT(result)), /KEEP\t0\t"a"/);
});

test('T20 static bilingual workflow, FAQ, semantic controls and noindex; not rendered UI evidence', async () => {
  await checkPublic();
  for (const path of ['index.html', 'en/index.html']) {
    const source = await readFile(resolve(ROOT, 'public', path), 'utf8');
    assert.match(source, /<input id="files"[^>]*type="file" multiple/);
    assert.equal((source.match(/<details><summary>/g) ?? []).length, 5);
    assert.match(source, /id="feedback" role="status" aria-live="polite"/);
    assert.match(source, /id="error"[^>]*role="alert"/);
    assert.match(source, /id="results"[^>]*hidden/);
    assert.match(source, /id="scan"[^>]*disabled/);
  }
  const css = await readFile(resolve(ROOT, 'public/css/app.css'), 'utf8');
  assert.match(css, /min-width: 48rem/); assert.match(css, /min-width: 75rem/);
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /focus-visible/);
});
