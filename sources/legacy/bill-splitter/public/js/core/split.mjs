import { BillError, fail, parseAmount, assertPrecision } from './money.mjs';

function count(array) {
  if (!Array.isArray(array) || array.length < 2 || array.length > 50) fail('PEOPLE_COUNT', 'people');
}
export function splitAmount(total, weights) {
  if (typeof total !== 'bigint' || total <= 0n) fail('TOTAL_INVALID', 'total');
  count(weights);
  if (weights.some(w => !Number.isSafeInteger(w) || w < 0 || w > 1000)) fail('WEIGHT_RANGE', 'people');
  const denominator = weights.reduce((sum, w) => sum + BigInt(w), 0n);
  if (denominator === 0n) fail('WEIGHTS_ZERO', 'people');
  const rows = weights.map((w, index) => ({ index, base: total * BigInt(w) / denominator, remainder: total * BigInt(w) % denominator }));
  const shares = rows.map(row => row.base);
  const remaining = total - shares.reduce((sum, n) => sum + n, 0n);
  rows.sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (let i = 0; BigInt(i) < remaining; i++) shares[rows[i].index] += 1n;
  return shares;
}
export function settle(shares, paid) {
  count(shares);
  if (!Array.isArray(paid) || paid.length !== shares.length || [...shares, ...paid].some(n => typeof n !== 'bigint' || n < 0n)) fail('INPUT_SCHEMA', 'people');
  const difference = paid.reduce((sum, n) => sum + n, 0n) - shares.reduce((sum, n) => sum + n, 0n);
  if (difference !== 0n) fail(difference < 0n ? 'PAID_SHORT' : 'PAID_EXCESS', 'paid-toggle', { amount: difference < 0n ? -difference : difference });
  const balances = paid.map((n, i) => n - shares[i]);
  const debtors = [], creditors = [], transfers = [];
  balances.forEach((n, index) => { if (n < 0n) debtors.push({ index, left: -n }); if (n > 0n) creditors.push({ index, left: n }); });
  let d = 0, c = 0;
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d], creditor = creditors[c];
    const amount = debtor.left < creditor.left ? debtor.left : creditor.left;
    transfers.push({ fromIndex: debtor.index, toIndex: creditor.index, amount });
    debtor.left -= amount; creditor.left -= amount;
    if (debtor.left === 0n) d++;
    if (creditor.left === 0n) c++;
  }
  return { balances, transfers };
}
function exactObject(value, keys, fieldId = 'form') {
  if (value === null || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(k => !Object.hasOwn(value, k))) fail('INPUT_SCHEMA', fieldId);
}
export function validateName(raw, fieldId = 'form') {
  if (typeof raw !== 'string') fail('INPUT_SCHEMA', fieldId);
  // Inspect separators BEFORE trimming: they must never silently disappear.
  if (/[\x00-\x1f\x7f\u0085\u2028\u2029]/u.test(raw)) fail('NAME_CONTROL', fieldId);
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = raw.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) fail('NAME_UNICODE', fieldId);
    } else if (code >= 0xdc00 && code <= 0xdfff) fail('NAME_UNICODE', fieldId);
  }
  const name = raw.trim();
  if (!name) fail('NAME_EMPTY', fieldId);
  if ([...name].length > 40) fail('NAME_LENGTH', fieldId);
  return name;
}
function amountAt(raw, precision, options, fieldId) {
  try { return parseAmount(raw, precision, options); }
  catch (error) { if (error instanceof BillError) error.fieldId = fieldId; throw error; }
}
export function calculateBill(draft) {
  exactObject(draft, ['total', 'precision', 'mode', 'settlement', 'people']);
  assertPrecision(draft.precision);
  if (!['equal', 'shares'].includes(draft.mode)) fail('MODE', 'mode');
  if (typeof draft.settlement !== 'boolean') fail('INPUT_SCHEMA', 'paid-toggle');
  count(draft.people);
  const total = amountAt(draft.total, draft.precision, {}, 'total');
  let lastId = 0;
  const people = draft.people.map(person => {
    exactObject(person, ['id', 'name', 'weight', 'paid'], 'people');
    if (!Number.isSafeInteger(person.id) || person.id <= lastId) fail('PERSON_ID', 'people');
    lastId = person.id;
    const name = validateName(person.name, `name-${person.id}`);
    let weight = 1;
    if (draft.mode === 'shares') {
      if (typeof person.weight !== 'string' || !/^[0-9]+$/.test(person.weight)) fail('WEIGHT_FORMAT', `weight-${person.id}`);
      weight = Number(person.weight);
      if (!Number.isSafeInteger(weight) || weight < 0 || weight > 1000) fail('WEIGHT_RANGE', `weight-${person.id}`);
    }
    const row = { id: person.id, name, weight };
    if (draft.settlement) row.paid = amountAt(person.paid, draft.precision, { allowZero: true, emptyAsZero: true }, `paid-${person.id}`);
    return row;
  });
  const shares = splitAmount(total, people.map(p => p.weight));
  people.forEach((p, i) => { p.share = shares[i]; });
  const result = { total, precision: draft.precision, mode: draft.mode, settlement: draft.settlement, people };
  if (draft.settlement) Object.assign(result, settle(shares, people.map(p => p.paid)));
  return result;
}

export function calculateQuickSettlement(draft) {
  exactObject(draft, ['precision', 'people']);
  count(draft.people);
  const result = calculatePaidSettlement({ precision: draft.precision, mode: 'equal', people: draft.people.map(person => {
    exactObject(person, ['id', 'name', 'paid'], 'people');
    return { id: person.id, name: person.name, paid: person.paid, weight: '1' };
  }) });
  return { ...result, workflow: 'quick' };
}

export function calculatePaidSettlement(draft) {
  exactObject(draft, ['precision', 'mode', 'people']);
  assertPrecision(draft.precision); count(draft.people);
  if (!['equal', 'shares'].includes(draft.mode)) fail('MODE', 'mode');
  let lastId = 0;
  const people = draft.people.map(person => {
    exactObject(person, ['id', 'name', 'paid', 'weight'], 'people');
    if (!Number.isSafeInteger(person.id) || person.id <= lastId) fail('PERSON_ID', 'people');
    lastId = person.id;
    let weight = 1;
    if (draft.mode === 'shares') {
      if (typeof person.weight !== 'string' || !/^[0-9]+$/.test(person.weight)) fail('WEIGHT_FORMAT', `weight-${person.id}`);
      weight = Number(person.weight);
      if (!Number.isSafeInteger(weight) || weight < 0 || weight > 1000) fail('WEIGHT_RANGE', `weight-${person.id}`);
    }
    return { id: person.id, name: validateName(person.name, `name-${person.id}`), weight,
      paid: amountAt(person.paid, draft.precision, { allowZero: true, emptyAsZero: true }, `paid-${person.id}`) };
  });
  const total = people.reduce((sum, person) => sum + person.paid, 0n);
  if (total > (draft.precision === 0 ? 99999999n : 9999999999n)) fail('PAID_TOTAL_MAX', 'people');
  if (people.every(person => person.weight === 0)) fail('WEIGHTS_ZERO', 'people');
  // Validate weights even when total is zero; legacy calculateBill remains compatible.
  const shares = total === 0n ? people.map(() => 0n) : splitAmount(total, people.map(person => person.weight));
  people.forEach((person, i) => { person.share = shares[i]; });
  return { workflow: 'advanced', total, precision: draft.precision, mode: draft.mode, settlement: true, people,
    ...settle(shares, people.map(person => person.paid)) };
}
