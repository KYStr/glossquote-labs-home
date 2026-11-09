// Pure core for Event Battery Swap Plan (spec-battery-swap-plan-20261109 v1).
// No DOM, network or storage imports. All minutes are integers; no floats
// are used anywhere in this module.
//
// solve(data) -> {status:"ok",result:{required,extra,unused,firstMissing,
// events:[{minute,device,kind,pack}]}} or {status:"error",error:{code,path}}.
// Validation order (SPEC inputsOutputs): overall SIZE, then object SHAPE,
// then fields in table order and array input order; cross-field rules only
// after every field type is legal, in implementation order:
// DUPLICATE names, then ORDER (end>start), then OVERLAP.

export const MAX_INPUT_BYTES = 65536;
export const MAX_DEVICES = 8;
export const MAX_RUNS_PER_DEVICE = 16;
export const MAX_CHARGED = 100;
export const MIN_RUNTIME = 10;
export const MAX_RUNTIME = 1440;
export const MAX_START = 1439;
export const MAX_END = 1440;
export const MAX_NAME_CODE_POINTS = 24;

const ROOT_KEYS = ['charged', 'devices'];
const DEVICE_KEYS = ['name', 'runtime', 'runs'];
const RUN_KEYS = ['start', 'end'];

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

// Normalize a device name per the SPEC: strip leading/trailing U+0020,
// NFC-normalize. Returns the normalized name (a string).
export function normalizeName(value) {
  return value.replace(/^ +/, '').replace(/ +$/, '').normalize('NFC');
}

// Validate one device name. Returns an error object {code,path} or null.
// Non-string -> TYPE; empty or over 24 code points after normalization ->
// RANGE; first character not a Unicode letter/digit, or any later character
// outside letters / combining marks / digits / ASCII space / hyphen /
// underscore -> TYPE.
export function validateName(value, path) {
  if (typeof value !== 'string') return { code: 'TYPE', path };
  const name = normalizeName(value);
  const points = [...name];
  if (points.length < 1 || points.length > MAX_NAME_CODE_POINTS) {
    return { code: 'RANGE', path };
  }
  if (!/^[\p{L}\p{N}]$/u.test(points[0])) return { code: 'TYPE', path };
  for (let i = 1; i < points.length; i += 1) {
    if (!/^[\p{L}\p{M}\p{N} \-_]$/u.test(points[i])) {
      return { code: 'TYPE', path };
    }
  }
  return null;
}

// Validate the whole input object. Returns null when valid, otherwise the
// error object {status:"error",error:{code,path}}.
export function validate(data) {
  let text;
  try {
    text = JSON.stringify(data);
  } catch {
    return err('TYPE', '');
  }
  if (typeof text !== 'string') return err('TYPE', '');
  if (new TextEncoder().encode(text).length > MAX_INPUT_BYTES) {
    return err('SIZE', '');
  }

  if (!isPlainObject(data)) return err('TYPE', '');

  for (const key of Object.keys(data)) {
    if (!ROOT_KEYS.includes(key)) return err('SHAPE', `/${key}`);
  }
  for (const key of ROOT_KEYS) {
    if (!(key in data)) return err('SHAPE', `/${key}`);
  }

  const c = checkInt(data.charged, 0, MAX_CHARGED, '/charged');
  if (c) return c;

  const devices = data.devices;
  if (!Array.isArray(devices)) return err('TYPE', '/devices');
  if (devices.length < 1 || devices.length > MAX_DEVICES) {
    return err('RANGE', '/devices');
  }

  for (let i = 0; i < devices.length; i += 1) {
    const device = devices[i];
    const base = `/devices/${i}`;
    if (!isPlainObject(device)) return err('TYPE', base);
    for (const key of Object.keys(device)) {
      if (!DEVICE_KEYS.includes(key)) return err('SHAPE', `${base}/${key}`);
    }
    for (const key of DEVICE_KEYS) {
      if (!(key in device)) return err('SHAPE', `${base}/${key}`);
    }

    const nameError = validateName(device.name, `${base}/name`);
    if (nameError) return err(nameError.code, nameError.path);

    const r = checkInt(device.runtime, MIN_RUNTIME, MAX_RUNTIME, `${base}/runtime`);
    if (r) return r;

    const runs = device.runs;
    if (!Array.isArray(runs)) return err('TYPE', `${base}/runs`);
    if (runs.length < 1 || runs.length > MAX_RUNS_PER_DEVICE) {
      return err('RANGE', `${base}/runs`);
    }

    for (let j = 0; j < runs.length; j += 1) {
      const run = runs[j];
      const runBase = `${base}/runs/${j}`;
      if (!isPlainObject(run)) return err('TYPE', runBase);
      for (const key of Object.keys(run)) {
        if (!RUN_KEYS.includes(key)) return err('SHAPE', `${runBase}/${key}`);
      }
      for (const key of RUN_KEYS) {
        if (!(key in run)) return err('SHAPE', `${runBase}/${key}`);
      }
      const s = checkInt(run.start, 0, MAX_START, `${runBase}/start`);
      if (s) return s;
      const e = checkInt(run.end, 1, MAX_END, `${runBase}/end`);
      if (e) return e;
    }
  }

  // Cross-field, in implementation order. Name duplicates first (the name
  // set is fixed by the field pass above); then ORDER over every run; then
  // OVERLAP per device on runs sorted by start, end, original input index.
  const seenNames = new Map();
  for (let i = 0; i < devices.length; i += 1) {
    const name = normalizeName(devices[i].name);
    if (seenNames.has(name)) return err('DUPLICATE', `/devices/${i}/name`);
    seenNames.set(name, i);
  }

  for (let i = 0; i < devices.length; i += 1) {
    const runs = devices[i].runs;
    for (let j = 0; j < runs.length; j += 1) {
      if (runs[j].end <= runs[j].start) {
        return err('ORDER', `/devices/${i}/runs/${j}/end`);
      }
    }
  }

  for (let i = 0; i < devices.length; i += 1) {
    const sorted = devices[i].runs
      .map((run, idx) => ({ ...run, idx }))
      .sort((a, b) => a.start - b.start || a.end - b.end || a.idx - b.idx);
    for (let k = 1; k < sorted.length; k += 1) {
      if (sorted[k].start < sorted[k - 1].end) {
        return err('OVERLAP', `/devices/${i}/runs/${sorted[k].idx}/start`);
      }
    }
  }

  return null;
}

// Compute one device's load/swap events. Runs are sorted by start, end,
// original input index. The first working minute loads a fresh pack with
// full runtime; working minutes are consumed; closed gaps do not deduct.
// When the remaining minutes hit 0 and there is further work, a swap is
// placed at the next working minute with full runtime. No swap is emitted
// when the pack runs out exactly as the last working minute ends.
function deviceEvents(device) {
  const name = normalizeName(device.name);
  const sorted = device.runs
    .map((run, idx) => ({ ...run, idx }))
    .sort((a, b) => a.start - b.start || a.end - b.end || a.idx - b.idx);
  const events = [];
  let remaining = null;
  for (const run of sorted) {
    let pos = run.start;
    if (remaining === null) {
      events.push({ minute: pos, kind: 'load' });
      remaining = device.runtime;
    } else if (remaining === 0) {
      events.push({ minute: pos, kind: 'swap' });
      remaining = device.runtime;
    }
    while (pos < run.end) {
      const take = Math.min(remaining, run.end - pos);
      pos += take;
      remaining -= take;
      if (remaining === 0 && pos < run.end) {
        events.push({ minute: pos, kind: 'swap' });
        remaining = device.runtime;
      }
    }
  }
  return events.map((e) => ({ minute: e.minute, device: name, kind: e.kind }));
}

export function solve(data) {
  const invalid = validate(data);
  if (invalid) return invalid;

  const charged = data.charged;
  const all = [];
  data.devices.forEach((device, deviceIndex) => {
    for (const e of deviceEvents(device)) {
      all.push({ ...e, deviceIndex });
    }
  });
  // Time order; same minute in device input order.
  all.sort((a, b) => a.minute - b.minute || a.deviceIndex - b.deviceIndex);

  const events = all.map((e, i) => ({
    minute: e.minute,
    device: e.device,
    kind: e.kind,
    pack: i + 1 <= charged ? i + 1 : null,
  }));

  const required = events.length;
  const firstMissingIndex = events.findIndex((e) => e.pack === null);

  return {
    status: 'ok',
    result: {
      required,
      extra: Math.max(0, required - charged),
      unused: Math.max(0, charged - required),
      firstMissing: firstMissingIndex === -1 ? null : firstMissingIndex + 1,
      events,
    },
  };
}
