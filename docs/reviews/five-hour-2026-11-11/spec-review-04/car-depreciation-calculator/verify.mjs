import assert from 'node:assert/strict';
import { error, hasOwnDataFields, ok, shortStringError, verifyFixtures } from '../fixture-review.mjs';

const common = ['method', 'price', 'years', 'salvagePercent'];
const methodField = { declining: 'rate', straight: 'usefulLife', table: 'tableRates' };
const limits = {
  price: { cap: 9, min: 1n, max: 999_999_999n },
  years: { cap: 2, min: 0n, max: 30n },
  salvagePercent: { cap: 5, min: 0n, max: 5000n, percent: true },
  rate: { cap: 5, min: 0n, max: 9000n, percent: true },
  usefulLife: { cap: 2, min: 1n, max: 30n },
};
const defaultDraft = {
  method: 'declining', price: '880000', years: '5', salvagePercent: '10',
  rate: '15', usefulLife: '10', tableRates: '20\n18\n15\n12\n10\n8\n8\n6\n6\n5',
};

function roundRatio(numerator, denominator) {
  const remainder = numerator % denominator;
  return (numerator - remainder) / denominator + (remainder * 2n >= denominator ? 1n : 0n);
}
function percentHundredths(raw) {
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}
const displayPercent = (n) => (n / 100n).toString() + '.' + (n % 100n).toString().padStart(2, '0');

function derive(input) {
  const known = [...common, ...Object.values(methodField)];
  const present = known.filter((field) => input && Object.hasOwn(input, field));
  if (!hasOwnDataFields(input, present) || common.some((field) => !present.includes(field)) ||
      present.some((field) => typeof input[field] !== 'string')) return error('SCHEMA');
  const { method } = input;
  const methodError = shortStringError(method, 9);
  if (methodError) return error(methodError, 'method');
  if (!Object.hasOwn(methodField, method)) return error('ENUM', 'method');
  const special = methodField[method];
  if (present.length !== 5 || !present.includes(special)) return error('SCHEMA');

  const values = {};
  for (const field of ['price', 'years', 'salvagePercent', special]) {
    const raw = input[field];
    const limit = limits[field];
    const code = shortStringError(raw, limit?.cap ?? 256);
    if (code) return error(code, field);
    if (field === 'tableRates') {
      const rows = (raw.endsWith('\n') ? raw.slice(0, -1) : raw).split('\n');
      if (rows.length > 30) return error('ROW_LIMIT', field);
      const rates = [];
      for (const [i, row] of rows.entries()) {
        if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(row)) return error('DECIMAL_FORMAT', field, i + 1);
        const rate = percentHundredths(row);
        if (rate > 9000n) return error('RANGE', field, i + 1);
        rates.push(rate);
      }
      values[field] = rates;
      continue;
    }

    const regex = limit.percent ? /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/ : /^(0|[1-9][0-9]*)$/;
    if (!regex.test(raw)) return error(limit.percent ? 'DECIMAL_FORMAT' : 'INTEGER_FORMAT', field);
    const value = limit.percent ? percentHundredths(raw) : BigInt(raw);
    if (value < limit.min || value > limit.max) return error('RANGE', field);
    values[field] = value;
  }

  const price = values.price;
  const floor = roundRatio(price * values.salvagePercent, 10_000n);
  const schedule = [];
  let value = price;
  let floorReachedYear = null;
  const annualDep = method === 'straight' ? roundRatio(price - floor, values.usefulLife) : null;
  for (let i = 0; i < Number(values.years); i++) {
    const rate = method === 'table' ? values.tableRates[Math.min(i, values.tableRates.length - 1)] : values.rate;
    const raw = annualDep !== null ? value - annualDep : roundRatio(value * (10_000n - rate), 10_000n);
    const floored = raw < floor;
    const next = floored ? floor : raw;
    const year = i + 1;
    if (next === floor && floorReachedYear === null) floorReachedYear = year;
    schedule.push({
      year, ratePercent: annualDep !== null ? null : displayPercent(rate),
      depreciation: Number(value - next), endValue: Number(next), floored,
    });
    value = next;
  }

  const dep = price - value;
  assert.equal(schedule.reduce((total, row) => total + row.depreciation, 0), Number(dep));
  return ok({
    method, floorValue: Number(floor), currentValue: Number(value),
    totalDepreciation: Number(dep), totalDepreciationPercent: displayPercent(roundRatio(dep * 10_000n, price)),
    floorReachedYear, schedule,
  });
}

const deriveDraft = (draft) => {
  const fields = [...common, methodField[draft.method]];
  return derive(Object.fromEntries(fields.map((field) => [field, draft[field]])));
};

function probes() {
  const late = { method: 'straight', price: '880003', years: '10', salvagePercent: '10', usefulLife: '10' };
  const early = { method: 'straight', price: '2', years: '3', salvagePercent: '0', usefulLife: '3' };
  const noDep = { ...early, price: '1', years: '30' };
  const stalled = { method: 'declining', price: '100000', years: '20', salvagePercent: '0', rate: '50' };
  const result = derive(late).result;
  const subsequent = derive({ ...late, years: '11' }).result;
  const zero = derive(stalled).result;
  const exactFloor = derive({ method: 'straight', price: '500000', years: '10', salvagePercent: '10', usefulLife: '10' }).result;
  return [
    { id: 'CAR-01', input: late,
      resultAtLife: { floor: result.floorValue, value: result.currentValue, floorReachedYear: result.floorReachedYear },
      yearAfterLife: subsequent.schedule.at(-1),
      tooEarly: { input: early, result: derive(early).result },
      neverReaches: { input: noDep, valueAfter30: derive(noDep).result.currentValue } },
    { id: 'CAR-FAQ', input: stalled, floor: zero.floorValue, floorReachedYear: zero.floorReachedYear,
      lateRows: zero.schedule.slice(-4) },
    { id: 'exact-floor-ui', floor: exactFloor.floorValue, exactFloorRow: exactFloor.schedule.at(-1) },
  ];
}
await verifyFixtures('car-depreciation-calculator', derive, defaultDraft, probes, undefined, deriveDraft);
