import { decimalRules, parseScaledDecimal } from './decimal.mjs';

export const inputKeys = Object.freeze(['schema', 'version', 'currency', 'parties', 'items', 'discount', 'taxRate', 'note']);
export function exactKeys(value, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === null || prototype === Object.prototype) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export function emptyDraft() {
  return { schema: 'gq.quote', version: 1, currency: 'TWD', parties: { from: '', to: '' }, items: [{ description: '', quantity: '', unitPrice: '' }], discount: '0', taxRate: '0', note: '' };
}
const parse = (kind, text, field = kind) => parseScaledDecimal(text, { ...decimalRules[kind], field });

export function validateQuoteInput(input) {
  const errors = [];
  const error = (field, code) => errors.push({ field, code });
  if (!exactKeys(input, inputKeys)) return { ok: false, errors: [{ field: 'root', code: 'SCHEMA_KEYS' }] };
  if (input.schema !== 'gq.quote' || input.version !== 1) error('root', 'SCHEMA_VERSION');
  const text = (value, field, limit, multiline = false, required = false) => {
    if (typeof value !== 'string') return error(field, 'TEXT_TYPE');
    if (!value.isWellFormed()) return error(field, 'TEXT_SURROGATE');
    if ([...value].length > limit) error(field, 'TEXT_LIMIT');
    if ((multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/ : /[\u0000-\u001f\u007f-\u009f]/).test(value)) error(field, 'TEXT_CONTROL');
    if (required && !value.trim()) error(field, 'TEXT_REQUIRED');
  };
  if (typeof input.currency !== 'string' || !/^[A-Z0-9]{1,8}$/.test(input.currency)) error('currency', 'CURRENCY_FORMAT');
  if (!exactKeys(input.parties, ['from', 'to'])) error('parties', 'SCHEMA_KEYS');
  else { text(input.parties.from, 'parties.from', 120); text(input.parties.to, 'parties.to', 120); }
  let subtotal = 0n;
  let itemsValid = true;
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) {
    error('items', 'ITEM_COUNT'); itemsValid = false;
  } else for (const [index, item] of input.items.entries()) {
    const prefix = `items.${index}`;
    if (!exactKeys(item, ['description', 'quantity', 'unitPrice'])) { error(prefix, 'SCHEMA_KEYS'); itemsValid = false; continue; }
    text(item.description, `${prefix}.description`, 200, true, true);
    const quantity = parse('quantity', item.quantity, `${prefix}.quantity`);
    const price = parse('unitPrice', item.unitPrice, `${prefix}.unitPrice`);
    for (const result of [quantity, price]) if (!result.ok) { errors.push(result); itemsValid = false; }
    if (quantity.ok && price.ok) subtotal += (quantity.scaled * price.scaled + 500n) / 1000n;
  }
  const discount = parse('discount', input.discount);
  const rate = parse('taxRate', input.taxRate);
  for (const result of [discount, rate]) if (!result.ok) errors.push(result);
  if (discount.ok && itemsValid && discount.scaled > subtotal) error('discount', 'DISCOUNT_EXCEEDS');
  text(input.note, 'note', 2000, true);
  if (errors.length) return { ok: false, errors: errors.map(({ code, field }) => ({ code, field })) };
  return { ok: true, validatedInput: {
    schema: 'gq.quote', version: 1, currency: input.currency,
    parties: { from: input.parties.from, to: input.parties.to },
    items: input.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
    discount: input.discount, taxRate: input.taxRate, note: input.note,
  } };
}

export function calculateQuote(validatedInput) {
  const checked = validateQuoteInput(validatedInput);
  if (!checked.ok) throw new Error('QUOTE_INVALID');
  const items = validatedInput.items.map(item => {
    const quantityMilli = parse('quantity', item.quantity).scaled;
    const unitPriceMinor = parse('unitPrice', item.unitPrice).scaled;
    return { quantityMilli, unitPriceMinor, lineMinor: (quantityMilli * unitPriceMinor + 500n) / 1000n };
  });
  const subtotalMinor = items.reduce((sum, item) => sum + item.lineMinor, 0n);
  const discountMinor = parse('discount', validatedInput.discount).scaled;
  const taxRateBasisPoints = parse('taxRate', validatedInput.taxRate).scaled;
  const afterDiscountMinor = subtotalMinor - discountMinor;
  const taxMinor = (afterDiscountMinor * taxRateBasisPoints + 5000n) / 10000n;
  return { items, subtotalMinor, discountMinor, afterDiscountMinor, taxRateBasisPoints, taxMinor, totalMinor: afterDiscountMinor + taxMinor };
}
