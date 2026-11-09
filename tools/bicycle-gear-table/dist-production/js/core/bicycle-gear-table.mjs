// Bicycle Gear Rollout Table — pure core (no DOM, network or storage).
// Implements SPEC spec-bicycle-gear-table-20261109 v1 exactly:
// exact reduced ratios, equal-ratio grouping, rollout and theoretical
// speed rounded half-up to 0.1 exactly once, with BigInt exact arithmetic.

export const SPEC_ID = 'spec-bicycle-gear-table-20261109';
export const MAX_INPUT_BYTES = 65536;
export const MAX_FRONT = 3;
export const MAX_REAR = 16;

// The fixture used by "load example" (bicycle-gear-table.group-ratios).
export const EXAMPLE = {
  wheelMm: 2100,
  cadence: 80,
  front: [40, 20],
  rear: [10, 20],
};

const ROOT_KEYS = ['wheelMm', 'cadence', 'front', 'rear'];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function err(code, path) {
  return { status: 'error', error: { code, path } };
}

// Half-up tenths of an exact non-negative fraction num/den (BigInt).
// tenths = floor(10*num/den + 1/2) = floor((20*num + den) / (2*den)).
// The SPEC pins this formula for every value called "one decimal place".
function tenthsOf(num, den) {
  const n = BigInt(num);
  const d = BigInt(den);
  return Number((20n * n + d) / (2n * d));
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

// Validate one integer field: TYPE for non safe-integer (incl. -0 and
// strings), RANGE for outside [min, max].
function checkInt(value, min, max, path) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || Object.is(value, -0)) {
    return err('TYPE', path);
  }
  if (value < min || value > max) return err('RANGE', path);
  return null;
}

// Exact key set: unknown key -> SHAPE at the containing object's path;
// missing key -> SHAPE at the missing key's path.
function checkShape(obj, keys, path) {
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) return err('SHAPE', path);
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return err('SHAPE', path === '' ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

// Validate one tooth array in input order: TYPE for a non-array, RANGE for
// a length outside [minLen, maxLen], then per element TYPE/RANGE and
// DUPLICATE (pointing at the second occurrence) in input order.
function checkTeeth(value, minLen, maxLen, path) {
  if (!Array.isArray(value)) return err('TYPE', path);
  if (value.length < minLen || value.length > maxLen) return err('RANGE', path);
  const seen = new Set();
  for (let i = 0; i < value.length; i++) {
    const p = `${path}/${i}`;
    const e = checkInt(value[i], 1, 120, p);
    if (e) return e;
    if (seen.has(value[i])) return err('DUPLICATE', p);
    seen.add(value[i]);
  }
  return null;
}

export function solve(data) {
  // 1. Overall size first (JSON UTF-8 bytes).
  let bytes = 0;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(data)).length;
  } catch {
    return err('TYPE', '');
  }
  if (bytes > MAX_INPUT_BYTES) return err('SIZE', '');

  // 2. Root shape.
  if (!isPlainObject(data)) return err('TYPE', '');
  const shapeErr = checkShape(data, ROOT_KEYS, '');
  if (shapeErr) return shapeErr;

  // 3. Fields in table order.
  let e = checkInt(data.wheelMm, 100, 5000, '/wheelMm');
  if (e) return e;
  e = checkInt(data.cadence, 0, 300, '/cadence');
  if (e) return e;
  e = checkTeeth(data.front, 1, MAX_FRONT, '/front');
  if (e) return e;
  e = checkTeeth(data.rear, 1, MAX_REAR, '/rear');
  if (e) return e;

  // 4. Groups. Every (front, rear) pair reduces f/r by gcd; groups keyed
  // by the reduced (n, d); combos keep front-index then rear-index order;
  // groups sort ascending by the exact ratio via cross-multiplication.
  const groupsByKey = new Map();
  for (let fi = 0; fi < data.front.length; fi++) {
    for (let ri = 0; ri < data.rear.length; ri++) {
      const f = data.front[fi];
      const r = data.rear[ri];
      const g = gcd(f, r);
      const n = f / g;
      const d = r / g;
      const key = `${n}/${d}`;
      let group = groupsByKey.get(key);
      if (!group) {
        group = { ratio: [n, d], combos: [] };
        groupsByKey.set(key, group);
      }
      group.combos.push([f, r]);
    }
  }
  const groups = [...groupsByKey.values()];
  groups.sort((a, b) => {
    const left = BigInt(a.ratio[0]) * BigInt(b.ratio[1]);
    const right = BigInt(b.ratio[0]) * BigInt(a.ratio[1]);
    return left < right ? -1 : left > right ? 1 : 0;
  });

  // 5. Rollout and speed, each rounded half-up to tenths exactly once.
  // Rollout mm per crank turn: wheelMm*n/d.
  // Speed km/h: wheelMm*n*cadence*60/(d*1_000_000). The largest possible
  // speed numerator is 5000*120*300*60 = 10,800,000,000 (SPEC bound).
  const result = {
    groups: groups.map((group) => {
      const [n, d] = group.ratio;
      return {
        ratio: [n, d],
        combos: group.combos,
        rollTenthsMm: tenthsOf(data.wheelMm * n, d),
        speedTenthsKmh: tenthsOf(data.wheelMm * n * data.cadence * 60, d * 1000000),
      };
    }),
  };
  return { status: 'ok', result };
}

// Form-level helper sharing the core's exact rules (the form maps verified
// text to the core types; this returns the same fixed error codes/paths).
// Number fields: ASCII decimal integers only, no sign, no leading zeros,
// no blanks, at most 12 characters; then the same range check as solve().
export function parseIntegerField(text, min, max, path) {
  if (typeof text !== 'string' || text === '' || text.length > 12 || !/^(0|[1-9][0-9]*)$/.test(text)) {
    return { error: { code: 'TYPE', path } };
  }
  const value = Number(text);
  if (!Number.isSafeInteger(value)) return { error: { code: 'TYPE', path } };
  if (value < min || value > max) return { error: { code: 'RANGE', path } };
  return { value };
}

// Format an already-computed tenths integer as one-decimal text.
export function formatTenths(tenths, locale) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(tenths / 10);
}

// Controlled flow executor (SPEC tests §flow): edit invalidates the active
// runId at once; settle only applies when the runId matches and the flow is
// still busy; a stale reply can never overwrite a newer result.
export function createFlow() {
  let phase = 'empty';
  let draft = null;
  let result = null;
  let error = null;
  let activeRunId = null;

  return {
    snapshot() {
      return { phase, result, error };
    },
    edit(nextDraft) {
      draft = nextDraft;
      result = null;
      error = null;
      activeRunId = null;
      phase = 'dirty';
    },
    run(runId) {
      if (phase === 'busy') return;
      if (phase !== 'dirty') return;
      phase = 'busy';
      activeRunId = runId;
    },
    settle(runId) {
      if (phase !== 'busy' || runId !== activeRunId) return;
      activeRunId = null;
      const out = solve(draft);
      if (out.status === 'ok') {
        result = out.result;
        error = null;
        phase = 'ready';
      } else {
        result = null;
        error = out.error;
        phase = 'error';
      }
    },
    cancel() {
      if (phase === 'busy') {
        phase = 'dirty';
        activeRunId = null;
      }
    },
    reset() {
      phase = 'empty';
      draft = null;
      result = null;
      error = null;
      activeRunId = null;
    },
  };
}
