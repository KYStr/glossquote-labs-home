// Pure core for the Air Purifier Calculator
// (spec-air-purifier-calculator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// AHAM rule (SPEC inputsOutputs, pinned): required smoke CADR
// (CFM) = ceil(room volume in ft^3 x target ACH / 60); suggested
// room (sq ft) = CADR x 1.55. The 2/3 rule (required CADR >= area
// in sq ft x 2/3) is the same relationship in the other direction
// at an 8 ft ceiling, exactly 5.0 ACH, which is this tool's
// default; 4.8 ACH is the Verifide-directory figure, 7.5 ACH the
// wildfire-smoke figure. Only smoke CADR is used for sizing.
//
// All arithmetic is exact decimal arithmetic on BigInt rationals.
// No binary floating point ever participates: the SPEC's pinned
// counter-example is 37 x 1.55 = 57.35, which must round half-up
// to 57.4 (binary floating point gives 57.3). Intermediates keep
// full precision; rounding (decimal half-up, applied once, at the
// output step only) and the ceiling for requiredCadrCfm happen at
// the end. Constants are the SPEC's pinned 4-decimal values.
//
// Validation order (SPEC inputsOutputs): shape (SCHEMA) first — a
// missing or mistyped field cannot be measured — then per field in
// the order areaValue, areaUnit, ceilingHeightM, targetAch,
// purifierCadrCfm: capacity INPUT_LIMIT, unpaired surrogate
// UNICODE, EMPTY, grammar (DECIMAL_FORMAT / INTEGER_FORMAT /
// ENUM), range (RANGE). The areaValue range is checked on the
// converted area in m^2 (1-200); the conversion needs areaUnit,
// which is validated after areaValue, so the range uses the given
// unit when it is valid ("m2"/"ping") and falls back to m^2 when
// the unit itself is invalid or empty — see HANDOFF.md note 2.

export const FIELDS = [
  "areaValue",
  "areaUnit",
  "ceilingHeightM",
  "targetAch",
  "purifierCadrCfm",
];

export const DEFAULTS = {
  areaValue: "",
  areaUnit: "m2",
  ceilingHeightM: "2.8",
  targetAch: "5.0",
  purifierCadrCfm: "",
};

// The worked example is fixtures.json case 1 (standard-bedroom)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  areaValue: "15",
  areaUnit: "m2",
  ceilingHeightM: "2.8",
  targetAch: "5.0",
  purifierCadrCfm: "",
};

export const MAX_RAW_UNITS = 12;

// Decimal-place limits pinned by the SPEC: areaValue at most 4
// fractional digits (fixture area-too-many-decimals), targetAch at
// most 1 fractional digit ("小數至多 1 位"). ceilingHeightM has no
// pinned place limit (the 8 ft fixture uses "2.4384"), so any
// number of fractional digits is accepted in its grammar.
export const AREA_DECIMAL_MAX_PLACES = 4;
export const ACH_DECIMAL_MAX_PLACES = 1;

// Pinned constants (SPEC constant table), as decimal strings.
export const SQFT_PER_M2 = "10.7639";
export const M2_PER_PING = "3.3058";
export const FT_PER_M = "3.2808";
export const M3H_PER_CFM = "1.6990";
export const SQFT_PER_CFM = "1.55";
export const DEFAULT_CEILING_M = "2.8";
export const DEFAULT_ACH = "5.0";

// Converted-area and field ranges, pinned by the SPEC.
export const AREA_M2_MIN = 1;
export const AREA_M2_MAX = 200;
export const CEILING_M_MIN = 2.0;
export const CEILING_M_MAX = 4.0;
export const ACH_MIN = 1.0;
export const ACH_MAX = 10.0;
export const CADR_CFM_MIN = 10;
export const CADR_CFM_MAX = 2000;

const DECIMAL_PATTERN = /^[0-9]+(\.[0-9]+)?$/;
const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only own data properties; accessors are never invoked.
// Returns the raw string map, or null when the shape is not
// exactly the five fields.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== FIELDS.length) return null;
  const raw = {};
  for (const field of FIELDS) {
    if (!keys.includes(field)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[field] = descriptor.value;
  }
  return raw;
}

function hasLoneSurrogate(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// ---- Exact decimal arithmetic (BigInt rationals) ----
// A rational is { num: BigInt, den: BigInt } with den > 0 and
// value num / den. All inputs here are non-negative, so num >= 0.

function ratFromDecimalString(text) {
  const dot = text.indexOf(".");
  if (dot === -1) {
    return { num: BigInt(text), den: 1n };
  }
  const digits = text.slice(0, dot) + text.slice(dot + 1);
  const scale = text.length - dot - 1;
  return { num: BigInt(digits), den: 10n ** BigInt(scale) };
}

function ratFromInteger(value) {
  return { num: BigInt(value), den: 1n };
}

function ratMul(a, b) {
  return { num: a.num * b.num, den: a.den * b.den };
}

function ratDiv(a, b) {
  return { num: a.num * b.den, den: a.den * b.num };
}

// Compare a with a plain integer bound: -1, 0, or 1.
function ratCompareInt(a, bound) {
  const scaled = BigInt(bound) * a.den;
  if (a.num < scaled) return -1;
  if (a.num > scaled) return 1;
  return 0;
}

// Round half-up (0.5 rounds up) to `places` fractional digits.
// Returns the rounded rational with denominator 10^places.
function ratRoundHalfUp(a, places) {
  const factor = 10n ** BigInt(places);
  const scaledNum = a.num * factor;
  let quotient = scaledNum / a.den;
  const remainder = scaledNum % a.den;
  if (remainder * 2n >= a.den) quotient += 1n;
  return { num: quotient, den: factor };
}

// Ceiling to a whole integer, returned as a Number.
function ratCeilInt(a) {
  let quotient = a.num / a.den;
  if (a.num % a.den !== 0n) quotient += 1n;
  return Number(quotient);
}

// Format a rounded rational (denominator 10^places) as a decimal
// string with exactly `places` fractional digits, then as a JSON
// number. The string has at most a few significant digits, so the
// nearest double round-trips through JSON.stringify exactly.
function ratToNumber(a, places) {
  const factor = 10n ** BigInt(places);
  const integerPart = a.num / factor;
  if (places === 0) return Number(integerPart);
  const fracPart = (a.num % factor).toString().padStart(places, "0");
  return Number(`${integerPart}.${fracPart}`);
}

const R_SQFT_PER_M2 = ratFromDecimalString(SQFT_PER_M2);
const R_M2_PER_PING = ratFromDecimalString(M2_PER_PING);
const R_FT_PER_M = ratFromDecimalString(FT_PER_M);
const R_M3H_PER_CFM = ratFromDecimalString(M3H_PER_CFM);
const R_SQFT_PER_CFM = ratFromDecimalString(SQFT_PER_CFM);

// Per-field validation shared by the decimal fields: capacity,
// surrogate, empty (unless the field is optional and empty means
// "use the default"), grammar, fractional-digit limit, range.
// Returns { value: rational } or { error }.
function validateDecimalField(field, value, { optional, maxPlaces, min, max }) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field) };
  if (value.length === 0) {
    if (optional) return { value: null };
    return { error: failure("EMPTY", field) };
  }
  if (!DECIMAL_PATTERN.test(value)) return { error: failure("DECIMAL_FORMAT", field) };
  if (maxPlaces !== null) {
    const dot = value.indexOf(".");
    if (dot !== -1 && value.length - dot - 1 > maxPlaces) {
      return { error: failure("DECIMAL_FORMAT", field) };
    }
  }
  const parsed = ratFromDecimalString(value);
  if (min !== null && ratCompareInt(parsed, min) < 0) {
    return { error: failure("RANGE", field) };
  }
  if (max !== null && ratCompareInt(parsed, max) > 0) {
    return { error: failure("RANGE", field) };
  }
  return { value: parsed };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);

  // areaValue: grammar and fractional digits first; the range is
  // on the converted m^2 area, so it is decided after the unit is
  // known (see the module header note).
  if (raw.areaValue.length > MAX_RAW_UNITS) return failure("INPUT_LIMIT", "areaValue");
  if (hasLoneSurrogate(raw.areaValue)) return failure("UNICODE", "areaValue");
  if (raw.areaValue.length === 0) return failure("EMPTY", "areaValue");
  if (!DECIMAL_PATTERN.test(raw.areaValue)) {
    return failure("DECIMAL_FORMAT", "areaValue");
  }
  {
    const dot = raw.areaValue.indexOf(".");
    if (dot !== -1 && raw.areaValue.length - dot - 1 > AREA_DECIMAL_MAX_PLACES) {
      return failure("DECIMAL_FORMAT", "areaValue");
    }
  }
  const areaParsed = ratFromDecimalString(raw.areaValue);

  // areaValue range, on the converted area in m^2. The conversion
  // needs areaUnit, which is validated after areaValue, so the range
  // uses the given unit when it is "ping" and falls back to m^2 for
  // any other unit string (valid "m2", invalid, or empty) — the
  // unit's own error is reported next, after areaValue is fully
  // decided, preserving the SPEC's field order.
  const areaM2Rat =
    raw.areaUnit === "ping" ? ratMul(areaParsed, R_M2_PER_PING) : areaParsed;
  if (
    ratCompareInt(areaM2Rat, AREA_M2_MIN) < 0 ||
    ratCompareInt(areaM2Rat, AREA_M2_MAX) > 0
  ) {
    return failure("RANGE", "areaValue");
  }

  // areaUnit: required; empty is EMPTY, anything outside the
  // enumeration is ENUM.
  if (raw.areaUnit.length > MAX_RAW_UNITS) return failure("INPUT_LIMIT", "areaUnit");
  if (hasLoneSurrogate(raw.areaUnit)) return failure("UNICODE", "areaUnit");
  if (raw.areaUnit.length === 0) return failure("EMPTY", "areaUnit");
  if (raw.areaUnit !== "m2" && raw.areaUnit !== "ping") {
    return failure("ENUM", "areaUnit");
  }

  // ceilingHeightM: optional, empty uses the default.
  const ceilingOutcome = validateDecimalField("ceilingHeightM", raw.ceilingHeightM, {
    optional: true,
    maxPlaces: null,
    min: CEILING_M_MIN,
    max: CEILING_M_MAX,
  });
  if (ceilingOutcome.error) return ceilingOutcome.error;
  const ceilingRat =
    ceilingOutcome.value ?? ratFromDecimalString(DEFAULT_CEILING_M);

  // targetAch: optional, empty uses the default; at most 1
  // fractional digit.
  const achOutcome = validateDecimalField("targetAch", raw.targetAch, {
    optional: true,
    maxPlaces: ACH_DECIMAL_MAX_PLACES,
    min: ACH_MIN,
    max: ACH_MAX,
  });
  if (achOutcome.error) return achOutcome.error;
  const achRat = achOutcome.value ?? ratFromDecimalString(DEFAULT_ACH);

  // purifierCadrCfm: optional, empty means "not provided";
  // otherwise an ASCII decimal integer in 10-2000 CFM.
  let purifierCfm = null;
  if (raw.purifierCadrCfm.length > MAX_RAW_UNITS) {
    return failure("INPUT_LIMIT", "purifierCadrCfm");
  }
  if (hasLoneSurrogate(raw.purifierCadrCfm)) {
    return failure("UNICODE", "purifierCadrCfm");
  }
  if (raw.purifierCadrCfm.length !== 0) {
    if (!INTEGER_PATTERN.test(raw.purifierCadrCfm)) {
      return failure("INTEGER_FORMAT", "purifierCadrCfm");
    }
    purifierCfm = Number(raw.purifierCadrCfm);
    if (
      !Number.isSafeInteger(purifierCfm) ||
      purifierCfm < CADR_CFM_MIN ||
      purifierCfm > CADR_CFM_MAX
    ) {
      return failure("RANGE", "purifierCadrCfm");
    }
  }

  // Derivation (full precision throughout; rounding only at the
  // output step, exactly as the SPEC pins).
  const areaSqftRat = ratMul(areaM2Rat, R_SQFT_PER_M2);
  const ceilingFtRat = ratMul(ceilingRat, R_FT_PER_M);
  const volumeFt3Rat = ratMul(areaSqftRat, ceilingFtRat);
  const requiredCadrCfm = ratCeilInt(
    ratDiv(ratMul(volumeFt3Rat, achRat), ratFromInteger(60)),
  );
  const requiredCadrM3h = ratToNumber(
    ratRoundHalfUp(ratMul(ratFromInteger(requiredCadrCfm), R_M3H_PER_CFM), 0),
    0,
  );
  const ahamSqftRounded = ratRoundHalfUp(
    ratMul(ratFromInteger(requiredCadrCfm), R_SQFT_PER_CFM),
    1,
  );
  const ahamM2Rounded = ratRoundHalfUp(ratDiv(ahamSqftRounded, R_SQFT_PER_M2), 1);

  let owned = null;
  if (purifierCfm !== null) {
    const ownedSqftRounded = ratRoundHalfUp(
      ratMul(ratFromInteger(purifierCfm), R_SQFT_PER_CFM),
      1,
    );
    const ownedM2Rounded = ratRoundHalfUp(ratDiv(ownedSqftRounded, R_SQFT_PER_M2), 1);
    const ownedAchRounded = ratRoundHalfUp(
      ratDiv(
        ratMul(ratFromInteger(purifierCfm), ratFromInteger(60)),
        volumeFt3Rat,
      ),
      1,
    );
    owned = {
      cadrCfm: purifierCfm,
      ahamRoomSqft: ratToNumber(ownedSqftRounded, 1),
      ahamRoomM2: ratToNumber(ownedM2Rounded, 1),
      ach: ratToNumber(ownedAchRounded, 1),
      adequate: purifierCfm >= requiredCadrCfm,
      shortfallCfm: Math.max(0, requiredCadrCfm - purifierCfm),
    };
  }

  return {
    ok: true,
    result: {
      areaM2: ratToNumber(ratRoundHalfUp(areaM2Rat, 1), 1),
      areaSqft: ratToNumber(ratRoundHalfUp(areaSqftRat, 1), 1),
      ceilingFt: ratToNumber(ratRoundHalfUp(ceilingFtRat, 2), 2),
      volumeFt3: ratToNumber(ratRoundHalfUp(volumeFt3Rat, 1), 1),
      targetAch: ratToNumber(ratRoundHalfUp(achRat, 1), 1),
      requiredCadrCfm,
      requiredCadrM3h,
      ahamSuggestedRoomSqft: ratToNumber(ahamSqftRounded, 1),
      ahamSuggestedRoomM2: ratToNumber(ahamM2Rounded, 1),
      owned,
    },
  };
}

// Fixed report download: air-purifier-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, finite numbers, strings, arrays, plain
// objects). Numbers are written with JSON.stringify, whose shortest
// round-trip form reproduces exactly the 1-2 decimal places the
// core emits (e.g. 17.9, 8, 1483.2).
export const REPORT_FILENAME = "air-purifier-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("report values must be finite numbers");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (isPlainObject(value)) {
    // Default string sort compares UTF-16 code units, as the SPEC pins.
    const keys = Object.keys(value).sort();
    const parts = keys.map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new Error("report objects must hold plain data only");
      }
      return `${JSON.stringify(key)}:${serializeValue(descriptor.value)}`;
    });
    return `{${parts.join(",")}}`;
  }
  throw new Error("unsupported report value");
}

export function buildReport(result) {
  if (!isPlainObject(result)) {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  let text;
  try {
    text = `${serializeValue(result)}\n`;
  } catch {
    return { ok: false, error: { code: "INTERNAL", field: null, row: null } };
  }
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > REPORT_LIMIT_BYTES) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, filename: REPORT_FILENAME, text, byteLength };
}
