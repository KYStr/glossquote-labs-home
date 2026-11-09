// Pure core for Cash Float Tray (spec-cash-float-tray-20261109 v1).
// No DOM, network or storage imports. All money is integer minor units;
// no floats are used for money anywhere in this module.

export const MAX_INPUT_BYTES = 65536;
export const MAX_DENOMINATIONS = 8;
export const MAX_TARGET_MINOR = 10000;
export const MAX_VALUE_MINOR = 10000;
export const MAX_COUNT = 99;

const KNOWN_KEYS = ['targetMinor', 'denominations'];
const ROW_KEYS = ['valueMinor', 'count'];

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v) && !Object.is(v, -0);
}

function err(code, path) {
  return { status: 'error', error: { code, path } };
}

function checkInt(value, min, max, path) {
  if (!isInt(value)) return err('TYPE', path);
  if (value < min || value > max) return err('RANGE', path);
  return null;
}

// Validate the whole input object. Returns null when valid, otherwise the
// error object {status:"error",error:{code,path}}.
// Order (SPEC inputsOutputs): overall size, then object shape, then fields
// in table order and array input order; cross-field rules only after every
// field type is legal.
export function validate(data) {
  let bytes = 0;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(data)).length;
  } catch {
    return err('TYPE', '');
  }
  if (bytes > MAX_INPUT_BYTES) return err('SIZE', '');

  if (!isPlainObject(data)) return err('TYPE', '');

  for (const key of Object.keys(data)) {
    if (!KNOWN_KEYS.includes(key)) return err('SHAPE', `/${key}`);
  }
  for (const key of KNOWN_KEYS) {
    if (!(key in data)) return err('SHAPE', `/${key}`);
  }

  const t = checkInt(data.targetMinor, 0, MAX_TARGET_MINOR, '/targetMinor');
  if (t) return t;

  const denoms = data.denominations;
  if (!Array.isArray(denoms)) return err('TYPE', '/denominations');
  if (denoms.length < 1 || denoms.length > MAX_DENOMINATIONS) {
    return err('RANGE', '/denominations');
  }

  for (let i = 0; i < denoms.length; i += 1) {
    const row = denoms[i];
    const base = `/denominations/${i}`;
    if (!isPlainObject(row)) return err('TYPE', base);
    for (const key of Object.keys(row)) {
      if (!ROW_KEYS.includes(key)) return err('SHAPE', `${base}/${key}`);
    }
    for (const key of ROW_KEYS) {
      if (!(key in row)) return err('SHAPE', `${base}/${key}`);
    }
    const v = checkInt(row.valueMinor, 1, MAX_VALUE_MINOR, `${base}/valueMinor`);
    if (v) return v;
    const c = checkInt(row.count, 0, MAX_COUNT, `${base}/count`);
    if (c) return c;
  }

  // Cross-field: duplicate denominations, pointing at the second row.
  const seen = new Map();
  for (let i = 0; i < denoms.length; i += 1) {
    const v = denoms[i].valueMinor;
    if (seen.has(v)) return err('DUPLICATE', `/denominations/${i}/valueMinor`);
    seen.set(v, i);
  }
  return null;
}

// Compare two candidate kept-vectors for the same reachable sum.
// Fewer pieces wins; on a tie the vector compared in descending-denomination
// order wins at the first differing position with the larger kept count.
function betterCandidate(a, b) {
  if (a.pieces !== b.pieces) return a.pieces < b.pieces;
  for (let i = 0; i < a.vec.length; i += 1) {
    if (a.vec[i] !== b.vec[i]) return a.vec[i] > b.vec[i];
  }
  return false;
}

// solve(data) -> {status:"ok",result:{totalMinor,keptMinor,removedMinor,
// shortfallMinor,rows}} or {status:"error",error:{code,path}}.
// Bounded exact DP over sums 0..targetMinor, one generation per denomination
// (so no denomination is ever used more than its counted pieces).
export function solve(data) {
  const invalid = validate(data);
  if (invalid) return invalid;

  const target = data.targetMinor;
  const sorted = [...data.denominations].sort((a, b) => b.valueMinor - a.valueMinor);
  const totalMinor = sorted.reduce((s, d) => s + d.valueMinor * d.count, 0);

  let prev = new Map();
  prev.set(0, { pieces: 0, vec: sorted.map(() => 0) });

  for (let i = 0; i < sorted.length; i += 1) {
    const { valueMinor: v, count: c } = sorted[i];
    const next = new Map();
    for (const [sum, state] of prev) {
      for (let k = 0; k <= c; k += 1) {
        const ns = sum + k * v;
        if (ns > target) break;
        const cand = { pieces: state.pieces + k, vec: state.vec.slice() };
        cand.vec[i] = k;
        const cur = next.get(ns);
        if (!cur || betterCandidate(cand, cur)) next.set(ns, cand);
      }
    }
    prev = next;
  }

  let keptMinor = 0;
  let keptVec = sorted.map(() => 0);
  for (let s = target; s >= 0; s -= 1) {
    const state = prev.get(s);
    if (state) {
      keptMinor = s;
      keptVec = state.vec;
      break;
    }
  }

  const rows = sorted.map((d, i) => ({
    valueMinor: d.valueMinor,
    kept: keptVec[i],
    removed: d.count - keptVec[i],
  }));

  return {
    status: 'ok',
    result: {
      totalMinor,
      keptMinor,
      removedMinor: totalMinor - keptMinor,
      shortfallMinor: target - keptMinor,
      rows,
    },
  };
}
