// String-table tests: SPEC 7(d) forbidden-language audit and the SPEC 5.1
// disclaimer content requirements, over both locales including meta text.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STRINGS, modelStatement, auditableStrings, auditText } from '../public/js/core/strings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const locale of ['zh-Hant', 'en']) {
  test(locale + ': no forbidden diagnosis/assessment language outside the disclaimer', () => {
    for (const text of auditableStrings(locale)) {
      assert.deepEqual(auditText(text), [], 'forbidden term in: ' + text);
    }
  });

  test(locale + ': page text (minus disclaimer) passes the audit', async () => {
    const html = await readFile(path.join(root, 'public', locale === 'en' ? 'en/index.html' : 'index.html'), 'utf8');
    const stripped = html.split(STRINGS[locale].disclaimer).join('');
    assert.deepEqual(auditText(stripped), []);
  });

  test(locale + ': on-page model statement equals the generated statement', async () => {
    const html = await readFile(path.join(root, 'public', locale === 'en' ? 'en/index.html' : 'index.html'), 'utf8');
    const match = html.match(/<p id="model-statement">([^<]*)<\/p>/);
    assert.ok(match, 'model statement element present');
    assert.equal(match[1], modelStatement(locale));
  });

  test(locale + ': model statement prints every pinned constant', () => {
    const stmt = modelStatement(locale);
    for (const token of ['30', '35', '350', '700', '1,050', '1.0', '1.1', '1.25', '250']) {
      assert.ok(stmt.includes(token), 'model statement missing ' + token);
    }
  });

  test(locale + ': title and description present a range, never a single figure', () => {
    const s = STRINGS[locale];
    assert.ok(s.title.includes('30') === false); // title carries no figure at all
    assert.ok(s.description.includes('30–35') || s.description.includes('30-35'));
  });
}

test('en disclaimer carries every SPEC 5.1 content point', () => {
  const d = STRINGS.en.disclaimer;
  assert.ok(d.includes('general educational estimate'));
  assert.ok(d.includes('simple model'));
  assert.ok(d.includes('health, medication, diet'));
  assert.ok(d.includes('does not model'));
  assert.ok(d.includes('not medical advice'));
  assert.ok(d.includes('qualified professional'));
});

test('zh disclaimer carries every SPEC 5.1 content point', () => {
  const d = STRINGS['zh-Hant'].disclaimer;
  assert.ok(d.includes('一般教育性估算'));
  assert.ok(d.includes('簡單模型'));
  assert.ok(d.includes('健康狀況、藥物、飲食'));
  assert.ok(d.includes('未納入'));
  assert.ok(d.includes('不是醫療建議'));
  assert.ok(d.includes('合格的專業人員'));
});
