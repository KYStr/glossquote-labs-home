// URL Slug Generator — pure core.
// run(input) is a synchronous pure data transform:
//   input  {title, maxLength} — strings, exact own data properties.
//   output {ok:true, result:{slug, length, maxLength, truncated}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
// Validation order (SPEC): capacity (title, maxLength) → surrogate
// (title) → per-field grammar (title, maxLength) → empty slug after
// conversion. Lengths are UTF-16 code units (JS String.length).
// Conversion (pinned, in order): NFKD → strip combining marks
// U+0300–U+036F → closed 14-item special Latin map → lowercase →
// runs of non-[a-z0-9] fold to one "-" → trim leading/trailing "-" →
// empty means EMPTY_SLUG → truncate to maxLength, then strip any
// trailing "-" left by the cut. CJK characters are separators and are
// dropped, never transliterated; a title with only CJK yields
// EMPTY_SLUG (no "untitled" fallback).

export const TITLE_MAX_LENGTH = 1000;
export const MAXLENGTH_MAX_RAW = 8;
export const DEFAULT_MAX_LENGTH = 50;
export const MAX_LENGTH_MIN = 1;
export const MAX_LENGTH_MAX = 100;
export const REPORT_FILENAME = "url-slug-generator-report.json";
export const MAX_REPORT_BYTES = 2097152;

// Closed special-letter map: the 14 items pinned by the SPEC. ß has no
// uppercase entry; capital ẞ (U+1E9E) is not in the table and is treated
// as a separator (it lowercases to ß, which is itself not [a-z0-9]).
const SPECIAL_MAP = new Map([
  ["æ", "ae"],
  ["Æ", "AE"],
  ["œ", "oe"],
  ["Œ", "OE"],
  ["ø", "o"],
  ["Ø", "O"],
  ["đ", "d"],
  ["Đ", "D"],
  ["ð", "d"],
  ["Ð", "D"],
  ["þ", "th"],
  ["Þ", "TH"],
  ["ł", "l"],
  ["Ł", "L"],
  ["ß", "ss"],
]);

// ASCII decimal integer grammar: "0" or a non-zero leading digit, no
// whitespace, sign, decimal point or exponent.
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

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

// The pinned 8-step conversion. Returns the result object, or null when
// the converted slug is empty.
function convert(title, maxLength) {
  // 1. NFKD: fullwidth letters/digits fold to ASCII, ligatures expand,
  // accented letters split into a base letter plus combining marks.
  let s = title.normalize("NFKD");
  // 2. Remove combining diacritical marks U+0300–U+036F.
  s = s.replace(/[\u0300-\u036f]/g, "");
  // 3. Closed special-letter map (applied before lowercasing, so Æ → AE).
  let mapped = "";
  for (const ch of s) mapped += SPECIAL_MAP.get(ch) ?? ch;
  s = mapped;
  // 4. Lowercase (Unicode default casing).
  s = s.toLowerCase();
  // 5. Each maximal run of non-[a-z0-9] becomes one hyphen. This is the
  // Chinese handling: CJK characters are separators and are dropped.
  s = s.replace(/[^a-z0-9]+/g, "-");
  // 6. Trim leading/trailing hyphens.
  s = s.replace(/^-+|-+$/g, "");
  // 7. Empty after conversion.
  if (s === "") return null;
  // 8. Truncate: only when longer than the cap; a slug exactly at the
  // cap is not truncated. Strip any trailing hyphen left by the cut.
  let truncated = false;
  if (s.length > maxLength) {
    s = s.slice(0, maxLength).replace(/-+$/, "");
    truncated = true;
  }
  return { slug: s, length: s.length, maxLength, truncated };
}

export function run(input) {
  // SCHEMA: plain object, exactly the two own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (keys.length !== 2 || !keys.includes("title") || !keys.includes("maxLength")) {
    return fail("SCHEMA", null);
  }
  for (const key of ["title", "maxLength"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { title, maxLength } = input;
  if (typeof title !== "string" || typeof maxLength !== "string") {
    return fail("SCHEMA", null);
  }

  // 1. Capacity, title then maxLength.
  if (title.length > TITLE_MAX_LENGTH) return fail("INPUT_LIMIT", "title");
  if (maxLength.length > MAXLENGTH_MAX_RAW) return fail("INPUT_LIMIT", "maxLength");
  // 2. Unpaired surrogate in the title.
  if (hasUnpairedSurrogate(title)) return fail("UNICODE", "title");
  // 3. Per-field grammar, title then maxLength.
  if (title === "") return fail("EMPTY", "title");
  let cap;
  if (maxLength === "") {
    cap = DEFAULT_MAX_LENGTH;
  } else {
    if (!INTEGER_RE.test(maxLength)) return fail("INTEGER_FORMAT", "maxLength");
    cap = Number(maxLength);
    if (cap < MAX_LENGTH_MIN || cap > MAX_LENGTH_MAX) {
      return fail("RANGE", "maxLength");
    }
  }

  // 4. Conversion; an empty converted slug is EMPTY_SLUG on title.
  const result = convert(title, cap);
  if (result === null) return fail("EMPTY_SLUG", "title");
  return { ok: true, result };
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
