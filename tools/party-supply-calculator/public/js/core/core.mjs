// Party Supply Calculator — pure core.
// All arithmetic is exact integer / rational arithmetic; no floating-point
// math is used on operands or results (division by 2 of a half-kilogram or
// half-hour count, and the three fixed JSON literals 1 / 1.2 / 1.5 / 0.5 /
// 0.6 / 0.75, are exact in the sense the SPEC pins them as JSON numbers).
// run(input) is a synchronous pure data transform:
//   input  {guests, durationHours, mealType} — decimal strings, exact own
//            data properties, validated in that field order.
//   output {ok:true, result:{mealType, durationHours, durationFactor,
//            perPerson, totals}}
//        | {ok:false, error:{code, field, row}} — row is always null here.
//
// Rules (SPEC §inputsOutputs):
//   h2 = durationHours x 2 (integer 1-24). Duration factor f:
//     h2 <= 4 (<= 2 h)  -> 1;  4 < h2 <= 8 (2-4 h) -> 6/5;
//     h2 > 8 (> 4 h)    -> 3/2.
//   Per person: foodG = meal base (snacks 200 / light 350 / full 500) x f;
//     drinksMl = 350 x (h2 + 2) / 2 (2-1 rule: 2 servings first hour,
//     1 per hour after, 350 ml per serving); cups = 2 if h2 <= 6 else 3;
//     plates = 1 (snacks/light) or 2 (full); iceKg = 0.5 x f.
//   Totals, all rounded up to buyable units: food to 100 g, drinks to
//     500 ml, bottles = ceil(drinks total / 2000 ml), cups = guests x cups,
//     plates = ceil(guests x plates x 6/5) (+20% spare), ice to 0.5 kg.

export const GUESTS_MIN = 1;
export const GUESTS_MAX = 500;
export const MAX_RAW_LENGTH = 8;
export const REPORT_FILENAME = "party-supply-report.json";
export const MAX_REPORT_BYTES = 2097152;

export const MEAL_TYPES = ["snacks", "light", "full"];
const MEAL_BASE_G = { snacks: 200, light: 350, full: 500 };
const MEAL_PLATES = { snacks: 1, light: 1, full: 2 };

// guests: "0" or a non-zero leading digit, no sign/space/decimal/exponent.
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;
// durationHours: at least one integer digit, at most one fraction digit.
// The fraction digit is checked for the 0.5 step separately (STEP), so
// "2.3" is a STEP error, not a grammar error (per fixtures.json).
const DECIMAL_RE = /^[0-9]+(\.[0-9])?$/;

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

// Integer ceiling division for non-negative integers.
function ceilDiv(a, b) {
  return Math.floor((a + b - 1) / b);
}

// Validate guests: capacity, surrogate, empty, grammar, range (SPEC order).
function validateGuests(raw) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", "guests") };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", "guests") };
  if (raw === "") return { error: fail("EMPTY", "guests") };
  if (!INTEGER_RE.test(raw)) return { error: fail("INTEGER_FORMAT", "guests") };
  const value = Number(raw);
  if (value < GUESTS_MIN || value > GUESTS_MAX) {
    return { error: fail("RANGE", "guests") };
  }
  return { value };
}

// Validate durationHours: capacity, surrogate, empty, grammar, step, range.
// Returns h2 = durationHours x 2 as an integer (1-24).
function validateDuration(raw) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", "durationHours") };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", "durationHours") };
  if (raw === "") return { error: fail("EMPTY", "durationHours") };
  if (!DECIMAL_RE.test(raw)) return { error: fail("DECIMAL_FORMAT", "durationHours") };
  const dot = raw.indexOf(".");
  const intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  // Step: the single fraction digit must be 0 or 5 (a 0.5 multiple).
  if (fracPart !== "" && fracPart !== "0" && fracPart !== "5") {
    return { error: fail("STEP", "durationHours") };
  }
  const h2 = Number(intPart) * 2 + (fracPart === "5" ? 1 : 0);
  if (h2 < 1 || h2 > 24) return { error: fail("RANGE", "durationHours") };
  return { value: h2 };
}

// Validate mealType: capacity, surrogate, then ENUM (an empty string is
// simply not one of the three values, so it is ENUM, not EMPTY).
function validateMealType(raw) {
  if (raw.length > MAX_RAW_LENGTH) return { error: fail("INPUT_LIMIT", "mealType") };
  if (hasUnpairedSurrogate(raw)) return { error: fail("UNICODE", "mealType") };
  if (!MEAL_TYPES.includes(raw)) return { error: fail("ENUM", "mealType") };
  return { value: raw };
}

// Normalized echo of a grammar-valid input string: leading zeros stripped,
// a trailing ".0" fraction dropped. Null when invalid.
export function normalizeEcho(raw) {
  if (typeof raw !== "string") return null;
  if (INTEGER_RE.test(raw)) return String(Number(raw));
  if (!DECIMAL_RE.test(raw)) return null;
  const dot = raw.indexOf(".");
  let intPart = dot === -1 ? raw : raw.slice(0, dot);
  const fracPart = dot === -1 ? "" : raw.slice(dot + 1);
  intPart = intPart.replace(/^0+(?=[0-9])/, "");
  if (fracPart === "" || fracPart === "0") return intPart;
  return intPart + "." + fracPart;
}

function isPlainObject(x) {
  if (typeof x !== "object" || x === null || Array.isArray(x)) return false;
  const proto = Object.getPrototypeOf(x);
  return proto === Object.prototype || proto === null;
}

export function run(input) {
  // SCHEMA: plain object, exactly the three own data properties.
  if (!isPlainObject(input)) return fail("SCHEMA", null);
  const keys = Object.keys(input);
  if (
    keys.length !== 3 ||
    !keys.includes("guests") ||
    !keys.includes("durationHours") ||
    !keys.includes("mealType")
  ) {
    return fail("SCHEMA", null);
  }
  for (const key of ["guests", "durationHours", "mealType"]) {
    const desc = Object.getOwnPropertyDescriptor(input, key);
    if (!desc || !("value" in desc)) return fail("SCHEMA", null);
  }
  const { guests, durationHours, mealType } = input;
  if (
    typeof guests !== "string" ||
    typeof durationHours !== "string" ||
    typeof mealType !== "string"
  ) {
    return fail("SCHEMA", null);
  }

  // guests first, then durationHours, then mealType; first error wins.
  const g = validateGuests(guests);
  if (g.error) return g.error;
  const d = validateDuration(durationHours);
  if (d.error) return d.error;
  const m = validateMealType(mealType);
  if (m.error) return m.error;

  const guestsN = g.value;
  const h2 = d.value;

  // Duration factor as an exact fraction fNum/fDen.
  let fNum;
  let fDen;
  let durationFactor;
  let iceKgPerPerson;
  if (h2 <= 4) {
    fNum = 1; fDen = 1; durationFactor = 1; iceKgPerPerson = 0.5;
  } else if (h2 <= 8) {
    fNum = 6; fDen = 5; durationFactor = 1.2; iceKgPerPerson = 0.6;
  } else {
    fNum = 3; fDen = 2; durationFactor = 1.5; iceKgPerPerson = 0.75;
  }

  const baseG = MEAL_BASE_G[m.value];
  const foodGPer = (baseG * fNum) / fDen; // exact integer
  const drinksMlPer = (350 * (h2 + 2)) / 2; // exact integer
  const cupsPer = h2 <= 6 ? 2 : 3;
  const platesPer = MEAL_PLATES[m.value];

  // Totals, all rounded up to buyable units (exact integer ceilDiv).
  const foodTotal = ceilDiv(guestsN * foodGPer, 100) * 100;
  const drinksTotal = ceilDiv(guestsN * drinksMlPer, 500) * 500;
  const bottlesTotal = ceilDiv(drinksTotal, 2000);
  const cupsTotal = guestsN * cupsPer;
  const platesTotal = ceilDiv(guestsN * platesPer * 6, 5);
  // Ice: ceil(guests x f) half-kilogram units, then / 2 (exact .5 steps).
  const iceTotal = ceilDiv(guestsN * fNum, fDen) / 2;

  return {
    ok: true,
    result: {
      mealType: m.value,
      durationHours: h2 / 2, // exact: a 0.5 multiple
      durationFactor,
      perPerson: {
        foodG: foodGPer,
        drinksMl: drinksMlPer,
        cups: cupsPer,
        plates: platesPer,
        iceKg: iceKgPerPerson,
      },
      totals: {
        foodG: foodTotal,
        drinksMl: drinksTotal,
        drinksBottles2L: bottlesTotal,
        cups: cupsTotal,
        plates: platesTotal,
        iceKg: iceTotal,
      },
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
