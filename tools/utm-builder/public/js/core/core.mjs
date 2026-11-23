// UTM Builder — pure core.
// run(input) is a synchronous pure data transform:
//   input  {baseUrl, source, medium, campaign, term, content} — strings,
//          exact own data properties.
//   output {ok:true, result:{taggedUrl, params:[{key, value}...]}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
// Validation order (SPEC): capacity (baseUrl, source, medium, campaign,
// term, content) → unpaired surrogate (same field order) → URL parse &
// duplicate check (baseUrl) → per-field value checks (source, medium,
// campaign, term, content). Lengths are UTF-16 code units
// (JS String.length). Trimming removes only the pinned ASCII whitespace
// set (U+0020, Tab, CR, LF) from both ends.
// Encoding is ECMAScript encodeURIComponent semantics: a space is %20,
// never "+"; the only unencoded characters are A–Z a–z 0–9 - _ . ! ~ * '
// ( ); "%" is encoded as %25 with no pre-decoding.
// Merging (pinned): the existing query string is kept verbatim first,
// UTM parameters follow in the fixed order source→medium→campaign→
// term→content, and the existing fragment (if any) is kept verbatim
// after the UTM parameters. No slash is added, no case normalization.

export const BASE_URL_MAX_RAW = 2048;
export const VALUE_MAX_RAW = 200;
export const VALUE_MAX_TRIMMED = 100;
export const REPORT_FILENAME = "utm-builder-report.json";
export const MAX_REPORT_BYTES = 2097152;

export const UTM_KEYS = Object.freeze([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
]);

// The five UTM fields, in the fixed SPEC order.
export const VALUE_FIELDS = Object.freeze([
  "source",
  "medium",
  "campaign",
  "term",
  "content",
]);

// All six input fields, in the fixed SPEC order.
export const INPUT_FIELDS = Object.freeze([
  "baseUrl",
  "source",
  "medium",
  "campaign",
  "term",
  "content",
]);

const REQUIRED_FIELDS = new Set(["source", "medium", "campaign"]);

// ASCII whitespace pinned by the SPEC for trimming: U+0020, Tab, CR, LF.
const ASCII_WS = new Set([" ", "\t", "\r", "\n"]);

function trimAscii(s) {
  let start = 0;
  let end = s.length;
  while (start < end && ASCII_WS.has(s[start])) start++;
  while (end > start && ASCII_WS.has(s[end - 1])) end--;
  return s.slice(start, end);
}

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

function hasControlChar(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c >= 0x0000 && c <= 0x001f) || c === 0x007f) return true;
  }
  return false;
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, exactly the six own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (keys.length !== 6 || !INPUT_FIELDS.every((f) => keys.includes(f))) {
    return fail("SCHEMA", null);
  }
  for (const key of INPUT_FIELDS) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
    if (typeof input[key] !== "string") return fail("SCHEMA", null);
  }

  // 1. Capacity, in fixed field order, on raw lengths.
  if (input.baseUrl.length > BASE_URL_MAX_RAW) {
    return fail("INPUT_LIMIT", "baseUrl");
  }
  for (const field of VALUE_FIELDS) {
    if (input[field].length > VALUE_MAX_RAW) {
      return fail("INPUT_LIMIT", field);
    }
  }

  // 2. Unpaired surrogate, in fixed field order. encodeURIComponent
  // throws on a lone surrogate, so this must precede any encoding; the
  // SPEC's general code table maps an unpaired surrogate to UNICODE.
  for (const field of INPUT_FIELDS) {
    if (hasUnpairedSurrogate(input[field])) return fail("UNICODE", field);
  }

  // 3a. URL parse: trim ASCII whitespace, then WHATWG URL. Must be
  // http or https, host non-empty, no username or password.
  const base = trimAscii(input.baseUrl);
  let parsed;
  try {
    parsed = new URL(base);
  } catch {
    return fail("INVALID_URL", "baseUrl");
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.host === "" ||
    parsed.username !== "" ||
    parsed.password !== ""
  ) {
    return fail("INVALID_URL", "baseUrl");
  }

  // 3b. Duplicate check: split the existing query (between "?" and "#")
  // on "&"; each segment's key is the raw text before the first "="
  // (the whole segment when there is no "="), compared exactly
  // (case-sensitive, no decoding) against the five utm_* names.
  const hashIndex = base.indexOf("#");
  const main = hashIndex === -1 ? base : base.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? "" : base.slice(hashIndex);
  const queryIndex = main.indexOf("?");
  const prefix = queryIndex === -1 ? main : main.slice(0, queryIndex);
  const existingQuery = queryIndex === -1 ? null : main.slice(queryIndex + 1);
  if (existingQuery !== null && existingQuery !== "") {
    for (const segment of existingQuery.split("&")) {
      const eq = segment.indexOf("=");
      const key = eq === -1 ? segment : segment.slice(0, eq);
      if (UTM_KEYS.includes(key)) return fail("DUPLICATE_UTM", "baseUrl");
    }
  }

  // 4. Per-field value checks, in fixed field order. Optional fields
  // whose trimmed value is empty are not provided and output nothing.
  const params = [];
  for (let i = 0; i < VALUE_FIELDS.length; i++) {
    const field = VALUE_FIELDS[i];
    const value = trimAscii(input[field]);
    if (value === "") {
      if (REQUIRED_FIELDS.has(field)) return fail("EMPTY", field);
      continue;
    }
    if (hasControlChar(value)) return fail("INVALID_CHAR", field);
    if (value.length > VALUE_MAX_TRIMMED) {
      return fail("VALUE_TOO_LONG", field);
    }
    params.push({ key: UTM_KEYS[i], value });
  }

  // Merge: existing query verbatim first (an empty existing query counts
  // as no query, so no empty segment is left), UTM parameters appended
  // with "&" in fixed order, fragment verbatim last. The output takes
  // the trimmed raw base string: no case normalization, no added slash.
  const utmQuery = params
    .map((p) => `${p.key}=${encodeURIComponent(p.value)}`)
    .join("&");
  let taggedUrl;
  if (existingQuery === null || existingQuery === "") {
    taggedUrl = `${prefix}?${utmQuery}${fragment}`;
  } else {
    taggedUrl = `${prefix}?${existingQuery}&${utmQuery}${fragment}`;
  }
  return { ok: true, result: { taggedUrl, params } };
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
