// Pure core for the Red Envelope Guide.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-red-envelope-guide-20261109): five occasions with fixed market
// tables, an exact integer validity predicate for amounts, snap alignment,
// the wedding extra-attendee increment and the not-attending 60% scaling.
// All arithmetic is integer-only; the midpoint is kept as (low + high) and
// compared doubled, so no floating point ever enters the derivation.

export const FIELDS = [
  "occasion",
  "relationship",
  "tier",
  "giverStage",
  "ageBand",
  "attending",
  "attendeeCount",
];

// Every raw string field is capped at 32 UTF-16 code units (SPEC).
export const RAW_LIMIT = 32;

export const DEFAULTS = {
  occasion: "wedding",
  relationship: "colleague",
  tier: "restaurant",
  giverStage: null,
  ageBand: null,
  attending: true,
  attendeeCount: "1",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  occasion: "wedding",
  relationship: "colleague",
  tier: "restaurant",
  giverStage: null,
  ageBand: null,
  attending: true,
  attendeeCount: "1",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "red-envelope-report.json";

export const OCCASIONS = ["wedding", "full-month", "new-year-elder", "new-year-junior", "housewarming"];
export const RELATIONSHIPS = ["colleague", "friend", "relative", "senior"];
export const TIERS = ["restaurant", "hotel", "five-star"];
export const GIVER_STAGES = ["student", "early-career", "established"];
export const AGE_BANDS = ["preschool", "elementary", "junior-high", "senior-high", "university"];

const ENUMS = {
  occasion: OCCASIONS,
  relationship: RELATIONSHIPS,
  tier: TIERS,
  giverStage: GIVER_STAGES,
  ageBand: AGE_BANDS,
};
// occasion may not be null; the other enum fields are nullable.
const NULLABLE = new Set(["relationship", "tier", "giverStage", "ageBand"]);

// Fixed market tables (NT$, pre-adjustment ranges), SPEC section 4.
export const WEDDING_TABLE = {
  colleague: { restaurant: [1200, 2000], hotel: [1800, 2600], "five-star": [2400, 3200] },
  friend: { restaurant: [2600, 3600], hotel: [3200, 4200], "five-star": [3800, 4800] },
  relative: { restaurant: [2600, 6600], hotel: [3200, 7200], "five-star": [3800, 7800] },
  senior: { restaurant: [2000, 3600], hotel: [2600, 4200], "five-star": [3200, 4800] },
};
export const FULL_MONTH_TABLE = {
  colleague: [1200, 2000],
  friend: [2000, 3600],
  relative: [2600, 6600],
  senior: [2000, 3600],
};
export const HOUSEWARMING_TABLE = {
  colleague: [1200, 2000],
  friend: [2000, 3600],
  relative: [2600, 3600],
  senior: [2000, 3600],
};
export const ELDER_TABLE = {
  student: [600, 2000],
  "early-career": [2000, 3600],
  established: [3600, 6600],
};
export const JUNIOR_TABLE = {
  preschool: [200, 600],
  elementary: [600, 1200],
  "junior-high": [800, 1600],
  "senior-high": [1200, 3600],
  university: [1200, 3600],
};
// Per-extra-attendee increment by wedding venue tier (SPEC step 2).
export const TIER_INCREMENT = { restaurant: 1000, hotel: 1200, "five-star": 1600 };

// Applicability matrix (SPEC validation step 2): which field each occasion
// requires beyond occasion itself. Every other enum field must be null,
// attending must be true, and attendeeCount must be "1".
const REQUIRED_BY_OCCASION = {
  wedding: ["relationship", "tier"],
  "full-month": ["relationship"],
  housewarming: ["relationship"],
  "new-year-elder": ["giverStage"],
  "new-year-junior": ["ageBand"],
};
const APPLICABILITY_ORDER = ["relationship", "tier", "giverStage", "ageBand", "attending", "attendeeCount"];

const COUNT_PATTERN = /^(0|[1-9][0-9]*)$/;

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function hasUnpairedSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = i + 1 < text.length ? text.charCodeAt(i + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return true;
      i += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Schema gate: the input must be a plain object whose own properties are
// exactly the seven fields, each an own data property (no accessors).
// Field value types are NOT checked here — a wrong type is the per-field
// TYPE error in step 1, not SCHEMA.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return null;
  }
  if (keys.length !== FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined || !("value" in descriptor)) return null;
    values[field] = descriptor.value;
  }
  return values;
}

// Per-field checks in the SPEC's order: TYPE, INPUT_LIMIT, UNICODE, then
// ENUM for enum fields / INTEGER_FORMAT and RANGE for attendeeCount.
function validateField(field, value) {
  if (field === "attending") {
    if (typeof value !== "boolean") return { code: "TYPE", field, row: null };
    return null;
  }
  if (value === null) {
    if (!NULLABLE.has(field)) return { code: "TYPE", field, row: null };
    return null;
  }
  if (typeof value !== "string") return { code: "TYPE", field, row: null };
  if (value.length > RAW_LIMIT) return { code: "INPUT_LIMIT", field, row: null };
  if (hasUnpairedSurrogate(value)) return { code: "UNICODE", field, row: null };
  if (field === "attendeeCount") {
    if (!COUNT_PATTERN.test(value)) return { code: "INTEGER_FORMAT", field, row: null };
    const count = Number(value);
    if (count < 1 || count > 6) return { code: "RANGE", field, row: null };
    return null;
  }
  if (!ENUMS[field].includes(value)) return { code: "ENUM", field, row: null };
  return null;
}

// Applicability (SPEC step 2), checked in the fixed field order. A required
// field that is null is EMPTY; a non-required field carrying a non-default
// value is NOT_APPLICABLE (for attending/attendeeCount the "default" is the
// attending-true / count-"1" baseline the SPEC pins for other occasions).
function validateApplicability(values) {
  const required = new Set(REQUIRED_BY_OCCASION[values.occasion]);
  for (const field of APPLICABILITY_ORDER) {
    if (field === "attending") {
      if (values.occasion !== "wedding" && values.attending !== true) {
        return { code: "NOT_APPLICABLE", field, row: null };
      }
      continue;
    }
    if (field === "attendeeCount") {
      if (values.occasion !== "wedding" && values.attendeeCount !== "1") {
        return { code: "NOT_APPLICABLE", field, row: null };
      }
      continue;
    }
    if (required.has(field)) {
      if (values[field] === null) return { code: "EMPTY", field, row: null };
    } else if (values[field] !== null) {
      return { code: "NOT_APPLICABLE", field, row: null };
    }
  }
  return null;
}

// Validate the whole input in the SPEC's fixed order: schema, per-field,
// applicability, then the wedding consistency rule. First error wins.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();
  for (const field of FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) return { ok: false, error };
  }
  const applicabilityError = validateApplicability(values);
  if (applicabilityError !== null) return { ok: false, error: applicabilityError };
  if (values.occasion === "wedding" && values.attending === false && values.attendeeCount !== "1") {
    return { ok: false, error: { code: "RANGE", field: "attendeeCount", row: null } };
  }
  return { ok: true, values };
}

// The validity predicate (SPEC): x is a valid amount iff x >= 200, x is a
// multiple of 100, the decimal string of x contains no digit 4, and — below
// 10,000 — the hundreds digit is in {0,2,6,8}; at or above 10,000 the
// thousands figure T = x div 1000 contains no digit 4 and T mod 10 is in
// {0,2,6,8}. Pure integer/string inspection, no floating point.
export function isValidAmount(x) {
  if (!Number.isSafeInteger(x) || x < 200 || x % 100 !== 0) return false;
  const digits = String(x);
  if (digits.includes("4")) return false;
  if (x < 10000) {
    const hundreds = Math.floor(x / 100) % 10;
    return hundreds === 0 || hundreds === 2 || hundreds === 6 || hundreds === 8;
  }
  const thousands = Math.floor(x / 1000);
  if (String(thousands).includes("4")) return false;
  const last = thousands % 10;
  return last === 0 || last === 2 || last === 6 || last === 8;
}

// Snap functions. y is an exact rational given as numerator/denominator
// (positive integers); the search starts at the nearest multiple of 100
// and steps by 100, exactly as the SPEC defines. The step count is tiny:
// in the sub-10,000 band a valid amount occurs at least every 400, and
// above 10,000 the valid thousands figures recur within a few steps.
export function snapUpRational(numerator, denominator) {
  let candidate = Math.floor((numerator + denominator * 100 - 1) / (denominator * 100)) * 100;
  if (candidate < 200) candidate = 200;
  while (!isValidAmount(candidate)) candidate += 100;
  return candidate;
}

export function snapDownRational(numerator, denominator) {
  let candidate = Math.floor(numerator / (denominator * 100)) * 100;
  while (candidate >= 200 && !isValidAmount(candidate)) candidate -= 100;
  if (candidate < 200) return snapUpRational(numerator, denominator);
  return candidate;
}

// Nearest valid amount; ties go up (SPEC). Distances are compared on the
// doubled scale (2y vs a + b) so a .5 midpoint stays exact.
export function snapNearestRational(numerator, denominator) {
  const down = snapDownRational(numerator, denominator);
  const up = snapUpRational(numerator, denominator);
  const twiceY = 2 * numerator;
  const twiceDownDist = twiceY - 2 * down * denominator;
  const twiceUpDist = 2 * up * denominator - twiceY;
  return twiceDownDist < twiceUpDist ? down : up;
}

function baseRange(values) {
  switch (values.occasion) {
    case "wedding":
      return WEDDING_TABLE[values.relationship][values.tier];
    case "full-month":
      return FULL_MONTH_TABLE[values.relationship];
    case "housewarming":
      return HOUSEWARMING_TABLE[values.relationship];
    case "new-year-elder":
      return ELDER_TABLE[values.giverStage];
    default:
      return JUNIOR_TABLE[values.ageBand];
  }
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const values = validated.values;
  const count = Number(values.attendeeCount);

  let [low, high] = baseRange(values);
  // Step 2: wedding, attending — per-extra-attendee increment on both ends.
  if (values.occasion === "wedding" && values.attending === true && count > 1) {
    const increment = TIER_INCREMENT[values.tier] * (count - 1);
    low += increment;
    high += increment;
  }
  // Step 3: wedding, not attending — 60% scaling, round-half-up via the
  // SPEC's fixed integer form floor((6x + 5) / 10).
  if (values.occasion === "wedding" && values.attending === false) {
    low = Math.floor((6 * low + 5) / 10);
    high = Math.floor((6 * high + 5) / 10);
  }
  // Steps 4-5: snap the ends; the midpoint is the exact rational
  // (low + high) / 2 over the adjusted ends. If the snapped ends cross,
  // both collapse to the snapped midpoint (the SPEC's defensive rule).
  let rangeLow = snapUpRational(low, 1);
  let rangeHigh = snapDownRational(high, 1);
  const recommended = snapNearestRational(low + high, 2);
  if (rangeLow > rangeHigh) {
    rangeLow = recommended;
    rangeHigh = recommended;
  }
  // Step 6: notes in the fixed order, only those that apply.
  const notes = ["customs-vary"];
  if (values.occasion === "wedding" && values.attending === false) notes.push("not-attending-discount");
  if (values.occasion === "wedding" && values.attending === true && count > 1) notes.push("extra-attendees");
  if (values.occasion === "housewarming") notes.push("gift-alternative");

  return {
    ok: true,
    result: {
      occasion: values.occasion,
      relationship: values.relationship,
      tier: values.tier,
      giverStage: values.giverStage,
      ageBand: values.ageBand,
      attending: values.attending,
      attendeeCount: count,
      rangeLow,
      rangeHigh,
      recommended,
      currency: "TWD",
      unit: "per-envelope",
      notes,
    },
  };
}

// Display formatting (never feeds back into machine values): NT$ prefix
// and thousands grouping, fixed across locales.
export function formatAmount(amount) {
  const grouped = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `NT$${grouped}`;
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls on the input (values are read as plain data only).
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON plus
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit the
// result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
