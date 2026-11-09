import { readRecord, decimalPattern, parseHundredths, displayNumerator, derive } from './exact.js';

const fail = (code, field) => ({ ok: false, error: { code, field } });
function numeric(raw, kind, field) {
  if (typeof raw !== 'string') return { error: fail(`invalid_${kind}_format`, field) };
  if (raw.length > 32) return { error: fail('raw_too_long', field) };
  if (!decimalPattern.test(raw)) return { error: fail(`invalid_${kind}_format`, field) };
  const value = parseHundredths(raw);
  if (value > 10000n || (kind === 'weight' && value === 0n)) return { error: fail(`${kind}_out_of_range`, field) };
  return { value };
}
function validName(raw) {
  if (typeof raw !== 'string' || raw.length > 320 || /\p{Cc}/u.test(raw) || !raw.isWellFormed()) return false;
  if ([...raw].length > 160) return false;
  const length = [...raw.trim()].length;
  return length >= 1 && length <= 80;
}

export function calculateTarget(request) {
  const root = readRecord(request, ['targetRaw', 'rows'], 'request');
  if (root.error) return fail('invalid_schema', root.error);
  const target = numeric(root.values.targetRaw, 'target', 'targetRaw');
  if (target.error) return target.error;
  const rows = root.values.rows;
  let rowValues;
  try {
    if (!Array.isArray(rows) || Object.getPrototypeOf(rows) !== Array.prototype) return fail('invalid_rows_count', 'rows');
    const lengthDescriptor = Object.getOwnPropertyDescriptor(rows, 'length');
    if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')) return fail('invalid_schema', 'rows');
    const length = lengthDescriptor.value;
    if (length < 1 || length > 40) return fail('invalid_rows_count', 'rows');
    const keys = Reflect.ownKeys(rows);
    if (keys.length !== length + 1 || keys.some(key => key !== 'length' && (typeof key !== 'string' || !/^(?:0|[1-9][0-9]*)(?![\s\S])/u.test(key) || BigInt(key) >= BigInt(length)))) return fail('invalid_schema', 'rows');
    rowValues = [];
    for (let i = 0; i < length; i++) {
      const d = Object.getOwnPropertyDescriptor(rows, String(i));
      if (!d || !d.enumerable || !Object.hasOwn(d, 'value')) return fail('invalid_schema', 'rows');
      rowValues.push(d.value);
    }
  } catch { return fail('invalid_schema', 'rows'); }
  const ids = new Set();
  let total = 0n;
  let earned = 0n;
  let remaining = 0n;
  for (let i = 0; i < rowValues.length; i++) {
    const path = `rows.${i}`;
    const checked = readRecord(rowValues[i], ['id', 'nameRaw', 'weightRaw', 'scoreRaw'], path);
    if (checked.error) return fail('invalid_schema', checked.error);
    const row = checked.values;
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}(?![\s\S])/u.test(row.id)) return fail('invalid_id', `${path}.id`);
    if (ids.has(row.id)) return fail('duplicate_id', `${path}.id`);
    ids.add(row.id);
    if (!validName(row.nameRaw)) return fail('invalid_name', `${path}.nameRaw`);
    const weight = numeric(row.weightRaw, 'weight', `${path}.weightRaw`);
    if (weight.error) return weight.error;
    total += weight.value;
    if (row.scoreRaw === '') remaining += weight.value;
    else {
      const score = numeric(row.scoreRaw, 'score', `${path}.scoreRaw`);
      if (score.error) return score.error;
      earned += weight.value * score.value;
    }
  }
  if (total !== 10000n) return fail('weight_total_mismatch', 'rows');
  const { status, required, maximum } = derive(target.value, earned, remaining);
  return { ok: true, result: {
    schemaVersion: 1, status,
    targetHundredths: target.value.toString(), earnedNumerator: earned.toString(),
    earnedDisplay: displayNumerator(earned), remainingWeightBp: remaining.toString(),
    requiredAverageHundredths: required === null ? null : required.toString(),
    maximumPossibleNumerator: maximum.toString(), maximumPossibleDisplay: displayNumerator(maximum)
  } };
}
