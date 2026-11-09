import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root } from './files.mjs';
import { calculateQuote, validateQuoteInput } from '../public/js/core/quote.mjs';
import { makeExportPair } from '../public/js/core/safe-output.mjs';
import { parseQuoteImport } from '../public/js/core/import.mjs';

const directory = path.join(root, 'evidence/m1/outputs');
await mkdir(directory, { recursive: true });
const input = { schema: 'gq.quote', version: 1, currency: 'TWD', parties: { from: '範例設計工作室 / Example Studio', to: '合成測試客戶 / Example Client' }, items: [{ description: '視覺設計 / Visual design', quantity: '2.5', unitPrice: '19.99' }, { description: '校稿 / Review', quantity: '1', unitPrice: '10.00' }], discount: '9.98', taxRate: '5.00', note: '此為合成測試報價。\r\nSynthetic fixture only. END:VCARD <img onerror=x>' };
assert.equal(validateQuoteInput(input).ok, true);
const totals = calculateQuote(input);
assert.equal(totals.subtotalMinor, 5998n);
assert.equal(totals.afterDiscountMinor, 5000n);
assert.equal(totals.taxMinor, 250n);
assert.equal(totals.totalMinor, 5250n);
const files = [];
for (const lang of ['zh-Hant', 'en']) {
  const pair = makeExportPair(input, totals, { lang });
  assert.equal(pair.ok, true);
  for (const type of ['html', 'json']) {
    const name = `quote-${lang}.${type}`;
    const target = path.join(directory, name);
    await writeFile(target, pair[type]);
    const actual = await readFile(target);
    assert.deepEqual(actual, Buffer.from(pair[type]));
    if (type === 'html') {
      const text = actual.toString('utf8');
      assert.ok(text.includes('TWD 52.50'));
      assert.ok(text.includes('TWD 2.50'));
      assert.ok(text.includes('&lt;img onerror=x&gt;'));
      assert.doesNotMatch(text, /<(?:script|img|iframe|form|object|embed)\b|\s(?:src|href)=/i);
    } else {
      const restored = parseQuoteImport(actual);
      assert.equal(restored.ok, true);
      assert.deepEqual(restored.validatedInput, input);
      assert.equal(calculateQuote(restored.validatedInput).totalMinor, 5250n);
    }
    files.push({ path: `outputs/${name}`, bytes: actual.byteLength, sha256: createHash('sha256').update(actual).digest('hex') });
  }
}
await writeFile(path.join(root, 'evidence/m1/output-receipt.json'), JSON.stringify({ status: 'PASS', evidenceKind: 'Node-generated real UTF-8 artifacts, reopened and content-asserted; NOT browser downloads or rendered appearance', expectedMinor: { subtotal: '5998', afterDiscount: '5000', tax: '250', total: '5250' }, files }, null, 2) + '\n');
console.log('PASS: 4 real output files; reopened bytes / SHA-256 / fixed totals / text safety / JSON restore.');
