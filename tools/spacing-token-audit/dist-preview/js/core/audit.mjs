// Spacing Token Audit — pure core.
// Implements docs/specs/spacing-token-audit/SPEC.md (spec-spacing-token-audit-20261109).
// No DOM, network, or storage access. All arithmetic is exact BigInt thousandths
// of a pixel; no floating point is used anywhere in validation or matching.

export const SPEC_ID = "spec-spacing-token-audit-20261109";
export const REPORT_FILENAME = "spacing-token-audit-report.json";
export const REPORT_MAX_BYTES = 2097152;
export const MAX_INPUT_UNITS = 8192;
export const MAX_TOKEN_ROWS = 64;
export const MAX_MEASUREMENT_ROWS = 100;
export const MAX_PX_THOUSANDTHS = 2048000n;

// Reset default draft (SPEC userFlow) and the load-example draft
// (fixtures.json first core case).
export const DEFAULT_DRAFT = Object.freeze({
  tokens: "",
  measurements: "",
  tolerance: "1",
});
export const EXAMPLE_DRAFT = Object.freeze({
  tokens: "large\t12\nsmall\t8\nzero\t0",
  measurements: "gap\t10\ncard\t12\npad\t14.001",
  tolerance: "2",
});

// Unsigned ASCII decimal, 0–2048, at most three fractional digits.
// Grammar: (0|[1-9][0-9]{0,3})(\.[0-9]{1,3})? — no trim, no suffix, no
// exponent, no comma, no sign, no unit inference.
const DECIMAL_RE = /^(0|[1-9][0-9]{0,3})(\.[0-9]{1,3})?$/;
const NAME_RE = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/;

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Parse a decimal string to BigInt thousandths of a pixel.
// Returns null when the grammar or the 0–2048 range fails.
export function parsePxThousandths(text) {
  const match = DECIMAL_RE.exec(text);
  if (match === null) return null;
  const intPart = match[1];
  const fracPart = match[2] === undefined ? "" : match[2].slice(1);
  const thousandths =
    BigInt(intPart) * 1000n + BigInt(fracPart.padEnd(3, "0") || "0");
  if (thousandths > MAX_PX_THOUSANDTHS) return null;
  return thousandths;
}

// Canonical ASCII decimal: no rounding, no trailing zeros, no "-0".
export function formatThousandths(value) {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const intPart = abs / 1000n;
  const fracPart = abs % 1000n;
  if (fracPart === 0n) return (negative ? "-" : "") + intPart.toString();
  const frac = fracPart.toString().padStart(3, "0").replace(/0+$/, "");
  return (negative ? "-" : "") + intPart.toString() + "." + frac;
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Validate and parse one name/px table.
// Returns { ok: true, rows: [{ name, thousandths }] } or a failure object.
// Check order per SPEC: capacity, unpaired surrogate, empty, row count,
// then per row in source order: column count / name syntax (ROW_FORMAT),
// duplicate name (DUP_NAME), px grammar or range (PIXELS).
function parseTable(text, field, maxRows) {
  if (text.length > MAX_INPUT_UNITS) {
    return fail("INPUT_LIMIT", field, null);
  }
  if (hasUnpairedSurrogate(text)) {
    return fail("UNICODE", field, null);
  }
  const body = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (body === "") {
    return fail("EMPTY", field, null);
  }
  const lines = body.split("\n");
  if (lines.length > maxRows) {
    return fail("ROW_LIMIT", field, null);
  }
  const seen = new Set();
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const rowNumber = i + 1;
    const parts = lines[i].split("\t");
    if (parts.length !== 2 || !NAME_RE.test(parts[0])) {
      return fail("ROW_FORMAT", field, rowNumber);
    }
    const name = parts[0];
    if (seen.has(name)) {
      return fail("DUP_NAME", field, rowNumber);
    }
    seen.add(name);
    const thousandths = parsePxThousandths(parts[1]);
    if (thousandths === null) {
      return fail("PIXELS", field, rowNumber);
    }
    rows.push({ name, thousandths });
  }
  return { ok: true, rows };
}

// Core transform: run(input) -> { ok: true, result: { rows, outsideCount } }
// or { ok: false, error: { code, field, row } }.
// input must be a plain object with exact own fields tokens and measurements
// (strings) and optional tolerance (string, defaults to "1"). Unknown fields,
// missing tokens/measurements, wrong types, and accessor properties are SCHEMA.
// Validation order: schema, tolerance grammar (TOLERANCE), tokens, measurements.
export function run(input) {
  if (!isPlainObject(input)) {
    return fail("SCHEMA", null, null);
  }
  const ownKeys = Object.keys(input);
  for (const key of ownKeys) {
    if (key !== "tokens" && key !== "measurements" && key !== "tolerance") {
      return fail("SCHEMA", null, null);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || "get" in descriptor || "set" in descriptor) {
      return fail("SCHEMA", null, null);
    }
  }
  if (!("tokens" in input) || !("measurements" in input)) {
    return fail("SCHEMA", null, null);
  }
  if (typeof input.tokens !== "string" || typeof input.measurements !== "string") {
    return fail("SCHEMA", null, null);
  }
  const toleranceText = "tolerance" in input ? input.tolerance : "1";
  if (typeof toleranceText !== "string") {
    return fail("SCHEMA", null, null);
  }
  const tolerance = parsePxThousandths(toleranceText);
  if (tolerance === null) {
    return fail("TOLERANCE", "tolerance", null);
  }

  const tokens = parseTable(input.tokens, "tokens", MAX_TOKEN_ROWS);
  if (!tokens.ok) return tokens;
  const measurements = parseTable(
    input.measurements,
    "measurements",
    MAX_MEASUREMENT_ROWS,
  );
  if (!measurements.ok) return measurements;

  const rows = [];
  let outsideCount = 0;
  for (const measurement of measurements.rows) {
    let best = null;
    let bestDiff = null;
    for (let i = 0; i < tokens.rows.length; i += 1) {
      const token = tokens.rows[i];
      const diff =
        measurement.thousandths >= token.thousandths
          ? measurement.thousandths - token.thousandths
          : token.thousandths - measurement.thousandths;
      if (
        best === null ||
        diff < bestDiff ||
        (diff === bestDiff && token.thousandths < best.thousandths)
      ) {
        best = token;
        bestDiff = diff;
      }
    }
    const delta = measurement.thousandths - best.thousandths;
    const absDelta = delta < 0n ? -delta : delta;
    let status;
    if (delta === 0n) {
      status = "exact";
    } else if (absDelta <= tolerance) {
      status = "within";
    } else {
      status = "outside";
      outsideCount += 1;
    }
    rows.push({
      label: measurement.name,
      px: formatThousandths(measurement.thousandths),
      token: best.name,
      tokenPx: formatThousandths(best.thousandths),
      delta: formatThousandths(delta),
      status,
    });
  }
  return { ok: true, result: { rows, outsideCount } };
}

// Canonical JSON: object own keys sorted by UTF-16 code units, recursively;
// array order unchanged; strings via JSON literal escaping.
function canonicalStringify(value) {
  if (value === null) return "null";
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new TypeError("report numbers must be integers");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalStringify).join(",") + "]";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return (
      "{" +
      keys.map((k) => JSON.stringify(k) + ":" + canonicalStringify(value[k])).join(",") +
      "}"
    );
  }
  throw new TypeError("unsupported report value");
}

function isWellFormedResult(result) {
  if (!isPlainObject(result)) return false;
  if (!Array.isArray(result.rows)) return false;
  if (typeof result.outsideCount !== "number") return false;
  if (!Number.isInteger(result.outsideCount) || result.outsideCount < 0) {
    return false;
  }
  for (const row of result.rows) {
    if (!isPlainObject(row)) return false;
    for (const key of ["label", "px", "token", "tokenPx", "delta", "status"]) {
      if (typeof row[key] !== "string") return false;
    }
  }
  return true;
}

// Serialize a run() result into the fixed report bytes:
// compact canonical JSON + one trailing LF, UTF-8, no BOM.
// Returns { ok: true, text } or { ok: false, error } with OUTPUT_LIMIT when
// the report exceeds REPORT_MAX_BYTES, SCHEMA for a malformed result.
export function serializeReport(result) {
  if (!isWellFormedResult(result)) {
    return fail("SCHEMA", null, null);
  }
  const text = canonicalStringify(result) + "\n";
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_MAX_BYTES) {
    return fail("OUTPUT_LIMIT", null, null);
  }
  return { ok: true, text };
}
