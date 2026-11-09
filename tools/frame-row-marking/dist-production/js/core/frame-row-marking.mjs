// Frame Row Marking — pure core (no DOM, network or storage).
// Implements SPEC spec-frame-row-marking-20261109 v1 exactly:
// equal end/inter-frame gaps from one exact fraction, top or center
// alignment, one hook per frame, all coordinates half-up to 0.1 mm.

export const SPEC_ID = 'spec-frame-row-marking-20261109';
export const MAX_INPUT_BYTES = 65536;
export const MAX_FRAMES = 12;
export const MIN_FRAMES = 2;

const ROOT_KEYS = ['spanMm', 'minGapMm', 'align', 'frames'];
const FRAME_KEYS = ['name', 'wMm', 'hMm', 'hookLeftMm', 'hookTopMm'];

// The fixture used by "load example" (frame-row-marking.center).
export const EXAMPLE = {
  spanMm: 1000,
  minGapMm: 100,
  align: 'center',
  frames: [
    { name: 'A', wMm: 200, hMm: 300, hookLeftMm: 100, hookTopMm: 40 },
    { name: 'B', wMm: 300, hMm: 200, hookLeftMm: 150, hookTopMm: 20 },
  ],
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function err(code, path) {
  return { status: 'error', error: { code, path } };
}

// Half-up tenths of an exact non-negative fraction num/den (BigInt).
// tenths = floor(10*num/den + 1/2) = floor((20*num + den) / (2*den)).
function tenthsOf(num, den) {
  const n = BigInt(num);
  const d = BigInt(den);
  return Number((20n * n + d) / (2n * d));
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

// N: short custom name. Trim U+0020 only, NFC, 1-24 Unicode code points,
// first char a Unicode letter or number, rest letters/marks/numbers/ASCII
// space/hyphen/underscore. Returns {name} or {error:{code,path}} — the
// inner error object, matching parseIntegerField's convention.
function normalizeName(value, path) {
  if (typeof value !== 'string') return { error: { code: 'TYPE', path } };
  const trimmed = value.replace(/^ +/, '').replace(/ +$/, '');
  const name = trimmed.normalize('NFC');
  const points = [...name];
  if (points.length === 0) return { error: { code: 'TYPE', path } };
  if (points.length > 24) return { error: { code: 'RANGE', path } };
  if (!/^[\p{L}\p{N}]$/u.test(points[0])) return { error: { code: 'TYPE', path } };
  for (const ch of points.slice(1)) {
    if (!/^[\p{L}\p{M}\p{N} \-_]$/u.test(ch)) return { error: { code: 'TYPE', path } };
  }
  return { name };
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
  let e = checkInt(data.spanMm, 1, 20000, '/spanMm');
  if (e) return e;
  e = checkInt(data.minGapMm, 0, 2000, '/minGapMm');
  if (e) return e;
  if (typeof data.align !== 'string') return err('TYPE', '/align');
  if (data.align !== 'top' && data.align !== 'center') return err('ENUM', '/align');
  if (!Array.isArray(data.frames)) return err('TYPE', '/frames');
  if (data.frames.length < MIN_FRAMES || data.frames.length > MAX_FRAMES) {
    return err('RANGE', '/frames');
  }

  // Frames in input order: shape, then fields in table order.
  const names = new Map();
  const frames = [];
  for (let i = 0; i < data.frames.length; i++) {
    const base = `/frames/${i}`;
    const f = data.frames[i];
    if (!isPlainObject(f)) return err('TYPE', base);
    const fShape = checkShape(f, FRAME_KEYS, base);
    if (fShape) return fShape;
    const nameRes = normalizeName(f.name, `${base}/name`);
    if (nameRes.error) return { status: 'error', error: nameRes.error };
    if (names.has(nameRes.name)) return err('DUPLICATE', `${base}/name`);
    names.set(nameRes.name, i);
    e = checkInt(f.wMm, 1, 5000, `${base}/wMm`);
    if (e) return e;
    e = checkInt(f.hMm, 1, 5000, `${base}/hMm`);
    if (e) return e;
    e = checkInt(f.hookLeftMm, 0, 5000, `${base}/hookLeftMm`);
    if (e) return e;
    e = checkInt(f.hookTopMm, 0, 5000, `${base}/hookTopMm`);
    if (e) return e;
    frames.push({
      name: nameRes.name,
      wMm: f.wMm,
      hMm: f.hMm,
      hookLeftMm: f.hookLeftMm,
      hookTopMm: f.hookTopMm,
    });
  }

  // 4. Cross-field constraints (implementation order): hook offsets.
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.hookLeftMm > f.wMm) return err('OFFSET', `/frames/${i}/hookLeftMm`);
    if (f.hookTopMm > f.hMm) return err('OFFSET', `/frames/${i}/hookTopMm`);
  }

  // 5. Layout. Exact fractions; each absolute coordinate and the gap is
  // rounded half-up to tenths exactly once, never from a displayed value.
  const n = frames.length;
  const W = frames.reduce((sum, f) => sum + f.wMm, 0);
  const H = Math.max(...frames.map((f) => f.hMm));
  const threshold = W + (n + 1) * data.minGapMm;
  if (data.spanMm < threshold) {
    return {
      status: 'ok',
      result: { feasible: false, deficitMm: threshold - data.spanMm, gapTenths: null, marks: [] },
    };
  }

  const rest = data.spanMm - W;
  const gapTenths = tenthsOf(rest, n + 1);
  const marks = [];
  let prefixW = 0;
  for (let i = 0; i < n; i++) {
    const f = frames[i];
    // left = ((i+1)*rest + (n+1)*prefixW) / (n+1)
    const leftNum = (i + 1) * rest + (n + 1) * prefixW;
    const leftTenths = tenthsOf(leftNum, n + 1);
    const hookXTenths = tenthsOf(leftNum + f.hookLeftMm * (n + 1), n + 1);
    const topTenths = data.align === 'top' ? 0 : tenthsOf(H - f.hMm, 2);
    const hookYTenths =
      data.align === 'top'
        ? tenthsOf(f.hookTopMm, 1)
        : tenthsOf(H - f.hMm + 2 * f.hookTopMm, 2);
    marks.push({ name: f.name, leftTenths, topTenths, hookXTenths, hookYTenths });
    prefixW += f.wMm;
  }

  return {
    status: 'ok',
    result: { feasible: true, deficitMm: 0, gapTenths, marks },
  };
}

// Form-level helpers sharing the core's exact rules (the form maps verified
// text to the core types; these return the same fixed error codes/paths).
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

// Name fields: at most 128 UTF-16 code units, then the N rules of solve().
export function validateNameField(text, path) {
  if (typeof text !== 'string' || text.length > 128) return { error: { code: 'TYPE', path } };
  return normalizeName(text, path);
}

// Format an already-computed tenths integer as one-decimal mm text.
export function formatMm(tenths, locale) {
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
