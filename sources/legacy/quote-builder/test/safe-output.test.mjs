import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtmlText, renderQuoteHtml, serializeQuoteJson, makeExportPair } from '../public/js/core/safe-output.mjs';
import { calculateQuote, validateQuoteInput } from '../public/js/core/quote.mjs';
import { quote } from './fixtures.mjs';
test('A13/A14: exact escaped text and no executable export structure', () => {
  const dangerous = '</td><script>alert(1)</script>&"\'';
  const input = quote({ items: [{ description: dangerous, quantity: '1', unitPrice: '1' }], note: 'Line one\r\nEND:VCARD\r\n<img onerror=x>' });
  const html = renderQuoteHtml(input, calculateQuote(input));
  assert.equal(escapeHtmlText('&<>"\''), '&amp;&lt;&gt;&quot;&#39;');
  assert.ok(html.includes('&lt;/td&gt;&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;&#39;'));
  assert.ok(html.includes('Line one\r\nEND:VCARD\r\n&lt;img onerror=x&gt;'));
  assert.ok(html.includes('white-space:pre-wrap'));
  assert.doesNotMatch(html, /<(?:script|iframe|form|img|object|embed|a)\b|https?:|http-equiv="refresh"/i);
  for (const tag of html.match(/<[^>]+>/g)) assert.doesNotMatch(tag, /\s(?:src|href|on\w+)\s*=/i);
  assert.equal(JSON.parse(serializeQuoteJson(input)).note, 'Line one\r\nEND:VCARD\r\n<img onerror=x>');
});
test('actual bilingual export contents and editable-input-only JSON', () => {
  const input = quote({ discount: '9.98', taxRate: '5', items: [quote().items[0], { description: 'Second', quantity: '1', unitPrice: '10' }] });
  const totals = calculateQuote(input);
  for (const lang of ['zh-Hant', 'en']) {
    const pair = makeExportPair(input, totals, { lang });
    assert.equal(pair.ok, true);
    const html = new TextDecoder().decode(pair.html);
    assert.ok(html.includes('TWD 52.50'));
    assert.ok(html.includes('TWD 2.50'));
    assert.ok(html.includes(`lang="${lang}"`));
    assert.deepEqual(JSON.parse(new TextDecoder().decode(pair.json)), input);
    assert.doesNotMatch(new TextDecoder().decode(pair.json), /totalMinor|taxMinor|lineMinor/);
  }
});
test('A16: exact real 524288 / 524289-byte export boundary using VALID padded decimals', () => {
  // Leading zeros are allowed by the contract. They remain editable in JSON,
  // while the displayed quantity is normalized. Each added ASCII zero adds
  // exactly one serialized byte, without breaking text or numeric field caps.
  // Fixed fixture: the reviewed template is 3318 HTML bytes + 301 JSON bytes
  // without padding. Do not derive padding/expected from the tested function.
  const exact = quote({ items: [{ description: 'Boundary', quantity: `${'0'.repeat(520669)}1`, unitPrice: '1' }] });
  assert.equal(validateQuoteInput(exact).ok, true);
  const allowed = makeExportPair(exact, calculateQuote(exact));
  assert.equal(allowed.ok, true);
  assert.equal(allowed.html.byteLength + allowed.json.byteLength, 524288);
  const over = structuredClone(exact);
  over.items[0].quantity = `0${over.items[0].quantity}`;
  assert.equal(validateQuoteInput(over).ok, true);
  assert.deepEqual(makeExportPair(over, calculateQuote(over)), { ok: false, code: 'EXPORT_LIMIT', actualBytes: 524289, maxBytes: 524288 });
});
test('UTF-8 byte length and atomic failure do not truncate either output', () => {
  const input = quote({ note: '😀中文' });
  const pair = makeExportPair(input, calculateQuote(input));
  assert.ok(pair.html.byteLength > renderQuoteHtml(input, calculateQuote(input)).length);
  const denied = makeExportPair(input, calculateQuote(input), { maxBytes: 1 });
  assert.equal(denied.ok, false);
  assert.equal(Object.hasOwn(denied, 'html'), false);
  assert.equal(Object.hasOwn(denied, 'json'), false);
});
