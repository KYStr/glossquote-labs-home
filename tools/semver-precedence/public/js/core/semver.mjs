// Pure SemVer 2.0.0 parsing and precedence comparison.
//
// Fixed contract: docs/specs/semver-precedence/SPEC.md (spec
// spec-semver-precedence-20261109). No DOM, network, or storage access.
// All expected values in tests come from fixtures.json and hand-derived
// cases, never from this module's own output.

export const LIMITS = Object.freeze({
  /** Maximum raw input length, UTF-16 code units, per version string. */
  INPUT_MAX_UTF16: 256,
  /** Maximum digits in one core field (major/minor/patch). */
  MAIN_MAX_DIGITS: 32,
  /** Maximum identifiers in one prerelease or build list. */
  MAX_IDENTIFIERS: 16,
  /** Maximum characters in one prerelease or build identifier. */
  IDENTIFIER_MAX_CHARS: 32,
  /** Maximum report size in bytes. */
  REPORT_MAX_BYTES: 2097152,
});

export const ERROR_CODES = Object.freeze([
  "SCHEMA",
  "EMPTY",
  "INPUT_LIMIT",
  "UNICODE",
  "SEMVER_SYNTAX",
  "IDENTIFIER_LIMIT",
  "OUTPUT_LIMIT",
  "INTERNAL",
  "WORKER_ERROR",
]);

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isDigits(text) {
  if (text.length === 0) return false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return true;
}

function isAsciiAlnumHyphen(text) {
  if (text.length === 0) return false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    const digit = c >= 48 && c <= 57;
    const upper = c >= 65 && c <= 90;
    const lower = c >= 97 && c <= 122;
    if (!digit && !upper && !lower && c !== 45) return false;
  }
  return true;
}

/** Core field: "0" or a positive integer with no leading zero. */
function isMainNumber(text) {
  if (!isDigits(text)) return false;
  return text.length === 1 || text.charCodeAt(0) !== 48;
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      if (
        i + 1 >= text.length ||
        text.charCodeAt(i + 1) < 0xdc00 ||
        text.charCodeAt(i + 1) > 0xdfff
      ) {
        return true;
      }
      i += 1;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/**
 * Compare two canonical digit strings by numeric value: shorter is
 * smaller, otherwise ASCII order. Both strings are validated digit-only
 * with no leading zero (except "0" itself), so this is exact.
 */
function compareDigitStrings(a, b) {
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Parse one version string. Returns { ok: true, value } or
 * { ok: false, error: { code, field: null, row: null } }.
 * value: { major, minor, patch (canonical digit strings),
 *          prerelease: string[] | null, build: string[] | null }.
 * Deliberately uses no regex with `$`: in JavaScript `$` matches before a
 * final LF, which would silently accept a trailing line feed.
 */
export function parseVersion(raw) {
  if (typeof raw !== "string") {
    return fail("SEMVER_SYNTAX", null, null);
  }
  if (raw.length === 0) return fail("EMPTY", null, null);
  if (raw.length > LIMITS.INPUT_MAX_UTF16) {
    return fail("INPUT_LIMIT", null, null);
  }
  if (hasUnpairedSurrogate(raw)) return fail("UNICODE", null, null);

  let rest = raw;
  let build = null;
  const plus = rest.indexOf("+");
  if (plus !== -1) {
    build = rest.slice(plus + 1);
    rest = rest.slice(0, plus);
  }
  let prerelease = null;
  const dash = rest.indexOf("-");
  if (dash !== -1) {
    prerelease = rest.slice(dash + 1);
    rest = rest.slice(0, dash);
  }

  const core = rest.split(".");
  if (core.length !== 3) return fail("SEMVER_SYNTAX", null, null);
  for (const part of core) {
    if (!isMainNumber(part)) return fail("SEMVER_SYNTAX", null, null);
  }

  let prereleaseTokens = null;
  if (prerelease !== null) {
    prereleaseTokens = prerelease.split(".");
    for (const token of prereleaseTokens) {
      if (!isAsciiAlnumHyphen(token)) {
        return fail("SEMVER_SYNTAX", null, null);
      }
      if (isDigits(token) && token.length > 1 && token.charCodeAt(0) === 48) {
        return fail("SEMVER_SYNTAX", null, null);
      }
    }
  }

  let buildTokens = null;
  if (build !== null) {
    buildTokens = build.split(".");
    for (const token of buildTokens) {
      if (!isAsciiAlnumHyphen(token)) {
        return fail("SEMVER_SYNTAX", null, null);
      }
    }
  }

  // Identifier limits are checked only after the grammar passes.
  for (const part of core) {
    if (part.length > LIMITS.MAIN_MAX_DIGITS) {
      return fail("IDENTIFIER_LIMIT", null, null);
    }
  }
  if (prereleaseTokens !== null) {
    if (
      prereleaseTokens.length > LIMITS.MAX_IDENTIFIERS ||
      prereleaseTokens.some((t) => t.length > LIMITS.IDENTIFIER_MAX_CHARS)
    ) {
      return fail("IDENTIFIER_LIMIT", null, null);
    }
  }
  if (buildTokens !== null) {
    if (
      buildTokens.length > LIMITS.MAX_IDENTIFIERS ||
      buildTokens.some((t) => t.length > LIMITS.IDENTIFIER_MAX_CHARS)
    ) {
      return fail("IDENTIFIER_LIMIT", null, null);
    }
  }

  return {
    ok: true,
    value: {
      major: core[0],
      minor: core[1],
      patch: core[2],
      prerelease: prereleaseTokens,
      build: buildTokens,
    },
  };
}

function equalResult() {
  return { relation: "eq", reason: { kind: "equal", index: null } };
}

/**
 * Compare two parsed versions (parseVersion values). Direction is left
 * against right. Build metadata is ignored entirely.
 */
export function compareParsed(left, right) {
  for (const kind of ["major", "minor", "patch"]) {
    const order = compareDigitStrings(left[kind], right[kind]);
    if (order !== 0) {
      return {
        relation: order < 0 ? "lt" : "gt",
        reason: { kind, index: null },
      };
    }
  }

  const aPre = left.prerelease;
  const bPre = right.prerelease;
  if (aPre === null && bPre === null) return equalResult();
  if (aPre === null) {
    return { relation: "gt", reason: { kind: "release", index: null } };
  }
  if (bPre === null) {
    return { relation: "lt", reason: { kind: "release", index: null } };
  }

  const shared = Math.min(aPre.length, bPre.length);
  for (let i = 0; i < shared; i += 1) {
    const a = aPre[i];
    const b = bPre[i];
    if (a === b) continue;
    const aNumeric = isDigits(a);
    const bNumeric = isDigits(b);
    if (aNumeric && bNumeric) {
      const order = compareDigitStrings(a, b);
      return {
        relation: order < 0 ? "lt" : "gt",
        reason: { kind: "prerelease-number", index: i + 1 },
      };
    }
    if (aNumeric && !bNumeric) {
      return { relation: "lt", reason: { kind: "prerelease-type", index: i + 1 } };
    }
    if (!aNumeric && bNumeric) {
      return { relation: "gt", reason: { kind: "prerelease-type", index: i + 1 } };
    }
    // Both alphanumeric: ASCII order. Tokens are ASCII-only, so UTF-16
    // code-unit order is exactly ASCII order.
    return {
      relation: a < b ? "lt" : "gt",
      reason: { kind: "prerelease-text", index: i + 1 },
    };
  }

  if (aPre.length === bPre.length) return equalResult();
  return aPre.length < bPre.length
    ? { relation: "lt", reason: { kind: "prerelease-length", index: null } }
    : { relation: "gt", reason: { kind: "prerelease-length", index: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Core entry point: run({ left, right }) -> { ok: true, result } or
 * { ok: false, error: { code, field, row } }.
 * Validation order per field: schema, EMPTY, INPUT_LIMIT, UNICODE,
 * SEMVER_SYNTAX, IDENTIFIER_LIMIT. The left field is fully validated
 * before the right field.
 */
export function run(input) {
  if (!isPlainObject(input)) return fail("SCHEMA", null, null);
  const keys = Reflect.ownKeys(input);
  if (keys.length !== 2 || !keys.includes("left") || !keys.includes("right")) {
    return fail("SCHEMA", null, null);
  }
  for (const field of ["left", "right"]) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (!descriptor || "value" in descriptor === false) {
      return fail("SCHEMA", null, null);
    }
    if (typeof descriptor.value !== "string") {
      return fail("SCHEMA", null, null);
    }
  }

  let leftParsed = null;
  let rightParsed = null;
  for (const field of ["left", "right"]) {
    const parsed = parseVersion(input[field]);
    if (!parsed.ok) {
      return fail(parsed.error.code, field, null);
    }
    if (field === "left") {
      leftParsed = parsed.value;
    } else {
      rightParsed = parsed.value;
    }
  }
  return { ok: true, result: compareParsed(leftParsed, rightParsed) };
}

/**
 * Canonical JSON: compact, object own keys sorted by UTF-16 code unit
 * ascending recursively, array order unchanged. Strings use JSON literal
 * escaping. Only plain data is serialized; user input is never passed
 * through here (the report covers the result object only).
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`,
  );
  return `{${parts.join(",")}}`;
}

/**
 * Serialize a result into the fixed report bytes: compact canonical JSON
 * plus exactly one trailing LF, UTF-8, no BOM. Returns
 * { ok: true, text, bytes } or { ok: false, error } with OUTPUT_LIMIT.
 */
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > LIMITS.REPORT_MAX_BYTES) {
    return fail("OUTPUT_LIMIT", null, null);
  }
  return { ok: true, text, bytes };
}
