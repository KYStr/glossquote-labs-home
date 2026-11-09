import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuote, validateQuoteInput, emptyDraft } from '../public/js/core/quote.mjs';
import { quote } from './fixtures.mjs';
test('A01–A04: hand-calculated lines including huge BigInt and zero price', () => {
  assert.equal(calculateQuote(quote()).items[0].lineMinor, 4998n);
  assert.equal(calculateQuote(quote({ items: [{ description: 'Half cent', quantity: '0.001', unitPrice: '5.00' }] })).items[0].lineMinor, 1n);
  assert.equal(calculateQuote(quote({ items: [{ description: 'Maximum', quantity: '1000000', unitPrice: '1000000000.00' }] })).items[0].lineMinor, 100000000000000000n);
  assert.equal(calculateQuote(quote({ items: [{ description: 'Zero', quantity: '0.001', unitPrice: '0' }] })).totalMinor, 0n);
});
test('A05/A06: discount then tax once, both half-up cases', () => {
  const result = calculateQuote(quote({ items: [quote().items[0], { description: 'Second', quantity: '1', unitPrice: '10.00' }], discount: '9.98', taxRate: '5.00' }));
  assert.equal(result.subtotalMinor, 5998n);
  assert.equal(result.afterDiscountMinor, 5000n);
  assert.equal(result.taxMinor, 250n);
  assert.equal(result.totalMinor, 5250n);
  assert.equal(calculateQuote(quote({ items: [{ description: 'Cent', quantity: '1', unitPrice: '0.01' }], taxRate: '50.00' })).totalMinor, 2n);
  const individuallyRounded = calculateQuote(quote({ items: Array.from({ length: 2 }, () => ({ description: 'Half', quantity: '0.001', unitPrice: '5.00' })) }));
  assert.equal(individuallyRounded.subtotalMinor, 2n);
});
test('A10/A11: fixed discount boundary and maximum rate', () => {
  assert.equal(calculateQuote(quote({ discount: '49.98', taxRate: '100.00' })).totalMinor, 0n);
  assert.equal(validateQuoteInput(quote({ discount: '49.99' })).errors[0].code, 'DISCOUNT_EXCEEDS');
  assert.equal(calculateQuote(quote({ taxRate: '100.00' })).totalMinor, 9996n);
});
test('A12: 50 ordered rows and exact total beyond safe floating integers', () => {
  const items = Array.from({ length: 50 }, (_, i) => ({ description: `Item ${i + 1}`, quantity: '1', unitPrice: '0.01' }));
  const checked = validateQuoteInput(quote({ items }));
  assert.equal(checked.ok, true);
  assert.equal(checked.validatedInput.items[49].description, 'Item 50');
  assert.equal(calculateQuote(checked.validatedInput).subtotalMinor, 50n);
  assert.equal(validateQuoteInput(quote({ items: [...items, items[0]] })).errors[0].code, 'ITEM_COUNT');
  assert.equal(validateQuoteInput(quote({ items: [] })).errors[0].code, 'ITEM_COUNT');
  const big = items.map(item => ({ ...item, quantity: '1000000', unitPrice: '1000000000.00' }));
  assert.equal(calculateQuote(quote({ items: big, taxRate: '100' })).totalMinor, 10000000000000000000n);
});
test('Unicode scalars, controls, empty names, whitespace and every field error', () => {
  assert.equal(validateQuoteInput(quote({ parties: { from: '', to: ' ' }, note: '😀'.repeat(2000) })).ok, true);
  assert.equal(validateQuoteInput(quote({ parties: { from: '😀'.repeat(120), to: '' } })).ok, true);
  assert.equal(validateQuoteInput(quote({ parties: { from: '😀'.repeat(121), to: '' } })).errors[0].code, 'TEXT_LIMIT');
  assert.equal(validateQuoteInput(quote({ note: '\ud800' })).errors[0].code, 'TEXT_SURROGATE');
  assert.equal(validateQuoteInput(quote({ note: '\udc00' })).errors[0].code, 'TEXT_SURROGATE');
  assert.equal(validateQuoteInput(quote({ note: 'a\r\nb\tEND:VCARD' })).ok, true);
  assert.equal(validateQuoteInput(quote({ note: '\u0085' })).errors[0].code, 'TEXT_CONTROL');
  assert.equal(validateQuoteInput(quote({ parties: { from: 'a\nb', to: '' } })).errors[0].code, 'TEXT_CONTROL');
  const invalid = quote({ currency: 'usd', note: '\0', discount: '-1', taxRate: '101', items: [{ description: '  \n', quantity: '0', unitPrice: '1e3' }] });
  assert.deepEqual(validateQuoteInput(invalid).errors.map(error => error.field), ['currency', 'items.0.description', 'items.0.quantity', 'items.0.unitPrice', 'discount', 'taxRate', 'note']);
  assert.equal(validateQuoteInput(emptyDraft()).ok, false);
});
test('exact schemas, copies and computed field rejection', () => {
  for (const invalid of [null, [], { ...quote(), totalMinor: '1' }, { ...quote(), version: 2 }, quote({ items: new Array(1) }), quote({ items: [{ ...quote().items[0], extra: 1 }] }), quote({ parties: { from: 'a', to: '', extra: '' } })]) assert.equal(validateQuoteInput(invalid).ok, false);
  const source = quote();
  const checked = validateQuoteInput(source);
  source.items[0].description = 'changed';
  assert.equal(checked.validatedInput.items[0].description, 'Design service');
  assert.throws(() => calculateQuote(emptyDraft()), /QUOTE_INVALID/);
});
