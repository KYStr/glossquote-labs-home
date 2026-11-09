// Pure core for Loan Kit Turnover Check (spec-loan-kit-turnover-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{kits:[{name,peak,minExtra,shortages}]}}}
//                | {status:"error", error:{code, path}}
//   shortage: {from, to, demand, extra, loans} — from/to are minutes since
//   midnight; to may exceed 1440 (turnaround may extend past midnight).
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE, REF, ORDER
// (SYNTAX is a form-level raw-text error and is produced by the app, not
// by solve). path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root SHAPE -> per-field in table
// and array input order (kits, then loans; duplicates at the second
// occurrence) -> cross-field: all kit REF checks in loan input order,
// then all end > start ORDER checks in loan input order.
//
// Algorithm: a loan occupies [start, end + turnMin) on its kit. Per kit,
// collect the distinct endpoints, walk each adjacent pair (a, b), and sum
// the qty of loans active at a (start <= a < end + turnMin). Adjacent
// loans release before the next pickup, so touching intervals never
// overlap. peak is the largest segment demand (0 with no loans);
// minExtra = max(0, peak - count); a segment is a shortage exactly when
// demand > count, listed independently per endpoint segment.

export const MAX_JSON_BYTES = 65536;
export const MAX_KITS = 12;
export const MIN_KITS = 1;
export const MAX_LOANS = 60;
export const MAX_COUNT = 1000;
export const MAX_TURN_MIN = 120;
export const MAX_START = 1439;
export const MAX_END = 1440;
export const MAX_QTY = 1000;
export const MAX_NAME_CODE_POINTS = 24;

const ROOT_KEYS = ["kits", "loans"];
const KIT_KEYS = ["name", "count", "turnMin"];
const LOAN_KEYS = ["name", "kit", "start", "end", "qty"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function err(code, path) {
  return { status: "error", error: { code, path } };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// N: short name. Trim U+0020 on both ends, NFC-normalize, 1-24 Unicode
// code points, first char a Unicode letter or digit, the rest letters,
// combining marks, digits, ASCII space, hyphen or underscore.
// Returns {ok:true, name} or {ok:false, code} (TYPE for non-string,
// RANGE for length / character violations).
const NAME_FIRST = /[\p{L}\p{N}]/u;
const NAME_REST = /[\p{L}\p{M}\p{N} \-_]/u;

export function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  let name = value;
  // Trim only U+0020, not other whitespace.
  let start = 0;
  let end = name.length;
  while (start < end && name.charCodeAt(start) === 0x20) start += 1;
  while (end > start && name.charCodeAt(end - 1) === 0x20) end -= 1;
  name = name.slice(start, end).normalize("NFC");
  const codePoints = [...name].length;
  if (codePoints < 1 || codePoints > MAX_NAME_CODE_POINTS) {
    return { ok: false, code: "RANGE" };
  }
  const chars = [...name];
  if (!NAME_FIRST.test(chars[0])) return { ok: false, code: "RANGE" };
  for (let i = 1; i < chars.length; i += 1) {
    if (!NAME_REST.test(chars[i])) return { ok: false, code: "RANGE" };
  }
  return { ok: true, name };
}

// I[a,b]: JavaScript safe integer within endpoints. Rejects -0, string
// numbers and non-integers with TYPE; out-of-range integers with RANGE.
function checkInteger(value, min, max) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Object.is(value, -0)
  ) {
    return { ok: false, code: "TYPE" };
  }
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return { ok: false, code: "RANGE" };
  }
  return { ok: true };
}

function checkShape(object, keys, path) {
  for (const key of Object.keys(object)) {
    if (!keys.includes(key)) return err("SHAPE", path);
  }
  for (const key of keys) {
    if (!hasOwn(object, key)) {
      return err("SHAPE", path === "" ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

// Full validation. Returns {ok:true, data} with normalized names, or
// {ok:false, reply} where reply is the error envelope.
export function validate(data) {
  if (!isPlainObject(data)) return { ok: false, reply: err("TYPE", "") };

  // SIZE first (measured on the JSON serialization of the input).
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return { ok: false, reply: err("TYPE", "") };
  }
  if (serialized === undefined) return { ok: false, reply: err("TYPE", "") };
  if (new TextEncoder().encode(serialized).length > MAX_JSON_BYTES) {
    return { ok: false, reply: err("SIZE", "") };
  }

  const shapeError = checkShape(data, ROOT_KEYS, "");
  if (shapeError) return { ok: false, reply: shapeError };

  if (!Array.isArray(data.kits)) {
    return { ok: false, reply: err("TYPE", "/kits") };
  }
  if (data.kits.length < MIN_KITS || data.kits.length > MAX_KITS) {
    return { ok: false, reply: err("RANGE", "/kits") };
  }
  if (!Array.isArray(data.loans)) {
    return { ok: false, reply: err("TYPE", "/loans") };
  }
  if (data.loans.length > MAX_LOANS) {
    return { ok: false, reply: err("RANGE", "/loans") };
  }

  const kits = [];
  const kitNames = new Map();
  for (let i = 0; i < data.kits.length; i += 1) {
    const row = data.kits[i];
    const base = `/kits/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, KIT_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) {
      return { ok: false, reply: err(name.code, `${base}/name`) };
    }
    if (kitNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    kitNames.set(name.name, true);
    const count = checkInteger(row.count, 0, MAX_COUNT);
    if (!count.ok) {
      return { ok: false, reply: err(count.code, `${base}/count`) };
    }
    const turnMin = checkInteger(row.turnMin, 0, MAX_TURN_MIN);
    if (!turnMin.ok) {
      return { ok: false, reply: err(turnMin.code, `${base}/turnMin`) };
    }
    kits.push({ name: name.name, count: row.count, turnMin: row.turnMin });
  }

  const loans = [];
  const loanNames = new Map();
  for (let i = 0; i < data.loans.length; i += 1) {
    const row = data.loans[i];
    const base = `/loans/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, LOAN_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) {
      return { ok: false, reply: err(name.code, `${base}/name`) };
    }
    if (loanNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    loanNames.set(name.name, true);
    const kit = normalizeName(row.kit);
    if (!kit.ok) {
      return { ok: false, reply: err(kit.code, `${base}/kit`) };
    }
    const start = checkInteger(row.start, 0, MAX_START);
    if (!start.ok) {
      return { ok: false, reply: err(start.code, `${base}/start`) };
    }
    const end = checkInteger(row.end, 1, MAX_END);
    if (!end.ok) {
      return { ok: false, reply: err(end.code, `${base}/end`) };
    }
    const qty = checkInteger(row.qty, 1, MAX_QTY);
    if (!qty.ok) {
      return { ok: false, reply: err(qty.code, `${base}/qty`) };
    }
    loans.push({
      name: name.name,
      kit: kit.name,
      start: row.start,
      end: row.end,
      qty: row.qty,
    });
  }

  // Cross-field, in SPEC implementation order: every kit reference in
  // loan input order first, then every end > start check in loan input
  // order.
  for (let i = 0; i < loans.length; i += 1) {
    if (!kitNames.has(loans[i].kit)) {
      return { ok: false, reply: err("REF", `/loans/${i}/kit`) };
    }
  }
  for (let i = 0; i < loans.length; i += 1) {
    if (!(loans[i].end > loans[i].start)) {
      return { ok: false, reply: err("ORDER", `/loans/${i}/end`) };
    }
  }

  return { ok: true, data: { kits, loans } };
}

// Full entry point: validate, then compute per-kit peaks and shortages.
// Returns the exact SPEC envelope.
export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  const { kits, loans } = checked.data;

  const resultKits = kits.map((kit) => {
    const kitLoans = loans.filter((loan) => loan.kit === kit.name);
    if (kitLoans.length === 0) {
      return { name: kit.name, peak: 0, minExtra: 0, shortages: [] };
    }
    const endpoints = new Set();
    for (const loan of kitLoans) {
      endpoints.add(loan.start);
      endpoints.add(loan.end + kit.turnMin);
    }
    const sorted = [...endpoints].sort((a, b) => a - b);
    let peak = 0;
    const shortages = [];
    for (let s = 0; s + 1 < sorted.length; s += 1) {
      const a = sorted[s];
      const b = sorted[s + 1];
      let demand = 0;
      const active = [];
      for (const loan of kitLoans) {
        if (loan.start <= a && a < loan.end + kit.turnMin) {
          demand += loan.qty;
          active.push(loan.name);
        }
      }
      if (demand > peak) peak = demand;
      if (demand > kit.count) {
        shortages.push({
          from: a,
          to: b,
          demand,
          extra: demand - kit.count,
          loans: active,
        });
      }
    }
    return {
      name: kit.name,
      peak,
      minExtra: Math.max(0, peak - kit.count),
      shortages,
    };
  });

  return { status: "ok", result: { kits: resultKits } };
}
