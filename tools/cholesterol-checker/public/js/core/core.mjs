// Cholesterol Checker — pure core.
// NCEP ATP III classification of the four fasting lipid values (mg/dL),
// plus non-HDL cholesterol (total − HDL, reference only, unclassified)
// and an overall summary from the worst item severity.
// run(input) is a synchronous pure data transform:
//   input  {total, ldl, hdl, triglycerides} — all strings, exact own data.
//   output {ok:true, result:{values, classifications, nonHdl, overall}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
// Classification tables are literal constants per SPEC inputsOutputs §2.

export const FIELDS = ["total", "ldl", "hdl", "triglycerides"];
export const MAX_RAW_LENGTH = 5;
export const MIN_VALUE = 1;
export const MAX_VALUE = 9999;
export const REPORT_FILENAME = "cholesterol-checker-report.json";
export const MAX_REPORT_BYTES = 2097152;

const INTEGER_RE = /^(0|[1-9][0-9]*)$/;

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasUnpairedSurrogate(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const next = i + 1 < s.length ? s.charCodeAt(i + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Validate one field in the SPEC order: capacity, surrogate, EMPTY,
// grammar, range. Returns {value} (integer) or {error}.
function validateField(raw, field) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", field) };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", field) };
  if (raw === "") return { error: fail("EMPTY", field) };
  if (!INTEGER_RE.test(raw)) return { error: fail("INTEGER_FORMAT", field) };
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < MIN_VALUE || value > MAX_VALUE) {
    return { error: fail("RANGE", field) };
  }
  return { value };
}

// NCEP ATP III bands. Intervals are left-closed: a cut-point value belongs
// to the higher band (200 is borderline-high, 100 is near-optimal, 40 is
// normal, 150 is borderline-high, 240/190/500 are the top bands).
function classifyTotal(v) {
  if (v < 200) return { band: "desirable", severity: 0 };
  if (v < 240) return { band: "borderline-high", severity: 1 };
  return { band: "high", severity: 2 };
}

function classifyLdl(v) {
  if (v < 100) return { band: "optimal", severity: 0 };
  if (v < 130) return { band: "near-optimal", severity: 1 };
  if (v < 160) return { band: "borderline-high", severity: 2 };
  if (v < 190) return { band: "high", severity: 3 };
  return { band: "very-high", severity: 4 };
}

function classifyHdl(v) {
  if (v < 40) return { band: "low", severity: 2 };
  if (v < 60) return { band: "normal", severity: 0 };
  return { band: "high", severity: 0 };
}

function classifyTriglycerides(v) {
  if (v < 150) return { band: "normal", severity: 0 };
  if (v < 200) return { band: "borderline-high", severity: 1 };
  if (v < 500) return { band: "high", severity: 2 };
  return { band: "very-high", severity: 3 };
}

const CLASSIFIERS = {
  total: classifyTotal,
  ldl: classifyLdl,
  hdl: classifyHdl,
  triglycerides: classifyTriglycerides,
};

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, exactly the four own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (
    keys.length !== FIELDS.length ||
    !FIELDS.every((f) => keys.includes(f))
  ) {
    return fail("SCHEMA", null);
  }
  for (const field of FIELDS) {
    const desc = Object.getOwnPropertyDescriptor(input, field);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { total, ldl, hdl, triglycerides } = input;
  for (const field of FIELDS) {
    if (typeof input[field] !== "string") return fail("SCHEMA", null);
  }

  // Validate in the fixed field order; the first failing field wins.
  const values = {};
  for (const field of FIELDS) {
    const checked = validateField(input[field], field);
    if (checked.error) return checked.error;
    values[field] = checked.value;
  }

  const classifications = {};
  for (const field of FIELDS) {
    classifications[field] = CLASSIFIERS[field](values[field]);
  }

  // Non-HDL cholesterol: plain integer subtraction, no rounding. It may be
  // zero or negative when total <= hdl; it is shown as-is and never graded.
  const nonHdl = values.total - values.hdl;

  const rank = Math.max(
    classifications.total.severity,
    classifications.ldl.severity,
    classifications.hdl.severity,
    classifications.triglycerides.severity
  );
  const label = rank === 0 ? "all-desirable" : rank === 1 ? "borderline" : "needs-attention";

  return {
    ok: true,
    result: {
      values,
      classifications,
      nonHdl,
      overall: { rank, label },
    },
  };
}

// --- Report serialization -------------------------------------------------
// Compact JSON, object own keys sorted ascending by UTF-16 code units
// recursively, array order preserved, one trailing LF, UTF-8 without BOM.
// Built from primitives only; never calls an input's toJSON.

function compareUtf16(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function stableStringify(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort(compareUtf16);
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

export function buildReport(result) {
  const text = stableStringify(result) + "\n";
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_REPORT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
