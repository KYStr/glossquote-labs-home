// Pure core for the Taiwan Water Bill Calculator.
// No DOM, network, storage, clock, randomness, or locale-sensitive
// formatting access. Implements SPEC.md (spec-taiwan-water-bill-20261109):
// Taiwan Water Corporation tariff in force since 1 May 1997, prices
// including 5% business tax. All money is integer milli-NT (0.001 NT);
// the only divisions are the SPEC's pinned round-half-up divisions,
// implemented as exact integer arithmetic. roundHalfUp(n/d) for
// non-negative integers is floor((2n + d) / (2d)).

export const FIELDS = ["cycle", "diameterMm", "usageM3", "sewerRateNt", "wasteRateNt"];

// Maximum raw length per field, in UTF-16 code units (SPEC inputsOutputs
// says 8 for every field, but the pinned enum value "bimonthly" is 9
// units long, so the cycle limit must be 9 for the pinned value to be
// admissible at all; see HANDOFF.md spec-errata candidate 1).
export const RAW_LIMITS = {
  cycle: 9,
  diameterMm: 8,
  usageM3: 8,
  sewerRateNt: 8,
  wasteRateNt: 8,
};

export const DEFAULTS = {
  cycle: "bimonthly",
  diameterMm: "20",
  usageM3: "30",
  sewerRateNt: "",
  wasteRateNt: "",
};

// The example draft; identical to the default draft by design (SPEC
// userFlow) and to the bimonthly-typical fixture input.
export const EXAMPLE = {
  cycle: "bimonthly",
  diameterMm: "20",
  usageM3: "30",
  sewerRateNt: "",
  wasteRateNt: "",
};

export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "taiwan-water-bill-report.json";

export const CYCLES = ["monthly", "bimonthly"];
export const DIAMETERS = [
  "13",
  "20",
  "25",
  "40",
  "50",
  "75",
  "100",
  "150",
  "200",
  "250",
  "300",
  "350",
  "400+",
];

export const USAGE_MIN = 0;
export const USAGE_MAX = 999999;
export const RATE_MAX_HUNDREDTHS = 9999; // 99.99 NT per degree.

// Basic charge (milli-NT), transcribed literally from the official
// Taiwan Water Corporation tariff table, retrieved 2026-11-09.
// The bimonthly column is NOT derived by doubling in the core: each
// column is looked up literally so the two columns can move
// independently if the tariff is revised (SPEC inputsOutputs step 1).
export const BASIC_FEE_MILLI_NT = {
  monthly: {
    13: 17850,
    20: 35700,
    25: 66150,
    40: 196350,
    50: 357000,
    75: 963900,
    100: 1909950,
    150: 5301450,
    200: 10531500,
    250: 18599700,
    300: 29184750,
    350: 41626200,
    "400+": 58119600,
  },
  bimonthly: {
    13: 35700,
    20: 71400,
    25: 132300,
    40: 392700,
    50: 714000,
    75: 1927800,
    100: 3819900,
    150: 10602900,
    200: 21063000,
    250: 37199400,
    300: 58369500,
    350: 83252400,
    "400+": 116239200,
  },
};

// Four-tier usage prices (milli-NT per degree) and the per-cycle tier
// upper bounds (inclusive) plus the official progressive differences
// (milli-NT). The progressive differences are pinned for audit; the
// implementation computes the usage charge by summing tier subtotals,
// which the SPEC defines as identically equal to the official
// price x usage - difference formula.
export const TIER_UNIT_PRICE_MILLI_NT = [7350, 9450, 11550, 12075];
export const TIER_LIMITS = {
  monthly: [10, 30, 50, Infinity],
  bimonthly: [20, 60, 100, Infinity],
};
export const TIER_PROGRESSIVE_DIFF_MILLI_NT = {
  monthly: [0, 21000, 84000, 110250],
  bimonthly: [0, 42000, 168000, 220500],
};

// Water conservation and feedback levy: 5% of the tax-excluded usage
// charge, i.e. usage charge (NT) / 21, rounded half-up to the yuan
// (SPEC inputsOutputs step 5).
export const WRCC_DIVISOR = 21;
// Business tax (information row only, never added to the total):
// (basic + usage) / 1.05 x 5%, rounded to the tenth of a yuan, i.e.
// milli-NT = roundHalfUp((basic + usage) / 2100) x 100 (step 7).
export const BUSINESS_TAX_DIVISOR = 2100;

// Pinned status announcements (SPEC userFlow state table).
export const STATUS_TEXT = {
  empty: { zh: "請輸入用水度數，或載入範例。", en: "Enter the usage, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

// Exact round-half-up of n/d for non-negative integers, in integer
// arithmetic: floor((2n + d) / (2d)).
function roundHalfUpDiv(n, d) {
  return Math.floor((2 * n + d) / (2 * d));
}

function schemaError() {
  return { ok: false, error: { code: "SCHEMA", field: null, row: null } };
}

function fieldError(code, field) {
  return { ok: false, error: { code, field, row: null } };
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

// Schema gate only: the input must be a non-null, non-array plain object
// whose own enumerable string-key properties are exactly the three
// required fields plus the two optional levy-rate fields when present,
// each an own data property (no accessors) holding a primitive string.
// Symbol keys are rejected. Returns the field values (absent optional
// fields read as ""), or null.
function readSchema(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return null;
  let keys;
  try {
    keys = Object.keys(input);
    if (Object.getOwnPropertySymbols(input).length !== 0) return null;
  } catch {
    return null;
  }
  if (keys.length < 3 || keys.length > FIELDS.length) return null;
  const values = {};
  for (const field of FIELDS) {
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return null;
    }
    if (descriptor === undefined) {
      if (field === "sewerRateNt" || field === "wasteRateNt") {
        values[field] = "";
        continue;
      }
      return null;
    }
    if (!("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    values[field] = descriptor.value;
  }
  for (const key of keys) {
    if (!FIELDS.includes(key)) return null;
  }
  return values;
}

// True when the value passes the schema gate only.
export function isDraftShapeValid(input) {
  return readSchema(input) !== null;
}

// The capacity and unpaired-surrogate checks shared by every field, in
// the SPEC's order: INPUT_LIMIT first, then UNICODE.
function checkCapacityAndUnicode(field, raw) {
  if (raw.length > RAW_LIMITS[field]) return fieldError("INPUT_LIMIT", field);
  if (hasUnpairedSurrogate(raw)) return fieldError("UNICODE", field);
  return null;
}

// Validate an optional levy rate string (non-empty): grammar
// (DECIMAL_FORMAT), then range 0-99.99 NT/degree (RANGE). Returns the
// rate in hundredths of a yuan, or a field error.
function parseRate(raw, field) {
  if (!DECIMAL_PATTERN.test(raw)) return fieldError("DECIMAL_FORMAT", field);
  const [whole, fraction = ""] = raw.split(".");
  const hundredths = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (hundredths < 0 || hundredths > RATE_MAX_HUNDREDTHS) {
    return fieldError("RANGE", field);
  }
  return { ok: true, hundredths };
}

// Validate the whole input: schema first, then fields in the fixed
// order cycle, diameterMm, usageM3, sewerRateNt, wasteRateNt; the
// first error wins. Per field: capacity, surrogate, EMPTY (required
// fields; an empty optional rate means "not levied" and skips the
// remaining checks), grammar, range.
export function validateInput(input) {
  const values = readSchema(input);
  if (values === null) return schemaError();

  let failure = checkCapacityAndUnicode("cycle", values.cycle);
  if (failure !== null) return failure;
  if (values.cycle === "") return fieldError("EMPTY", "cycle");
  if (!CYCLES.includes(values.cycle)) return fieldError("ENUM", "cycle");

  failure = checkCapacityAndUnicode("diameterMm", values.diameterMm);
  if (failure !== null) return failure;
  if (values.diameterMm === "") return fieldError("EMPTY", "diameterMm");
  if (!DIAMETERS.includes(values.diameterMm)) return fieldError("ENUM", "diameterMm");

  failure = checkCapacityAndUnicode("usageM3", values.usageM3);
  if (failure !== null) return failure;
  if (values.usageM3 === "") return fieldError("EMPTY", "usageM3");
  if (!INTEGER_PATTERN.test(values.usageM3)) {
    return fieldError("INTEGER_FORMAT", "usageM3");
  }
  const usage = Number(values.usageM3);
  if (usage < USAGE_MIN || usage > USAGE_MAX) return fieldError("RANGE", "usageM3");

  failure = checkCapacityAndUnicode("sewerRateNt", values.sewerRateNt);
  if (failure !== null) return failure;
  let sewerHundredths = null;
  if (values.sewerRateNt !== "") {
    const parsed = parseRate(values.sewerRateNt, "sewerRateNt");
    if (!parsed.ok) return parsed;
    sewerHundredths = parsed.hundredths;
  }

  failure = checkCapacityAndUnicode("wasteRateNt", values.wasteRateNt);
  if (failure !== null) return failure;
  let wasteHundredths = null;
  if (values.wasteRateNt !== "") {
    const parsed = parseRate(values.wasteRateNt, "wasteRateNt");
    if (!parsed.ok) return parsed;
    wasteHundredths = parsed.hundredths;
  }

  return {
    ok: true,
    values: {
      cycle: values.cycle,
      diameterMm: values.diameterMm,
      usageM3: usage,
      sewerRateNt: values.sewerRateNt === "" ? null : values.sewerRateNt,
      sewerHundredths,
      wasteRateNt: values.wasteRateNt === "" ? null : values.wasteRateNt,
      wasteHundredths,
    },
  };
}

// Tier breakdown: the tiers actually used (degrees > 0), each with its
// degree count, unit price and subtotal in milli-NT. The subtotals sum
// to exactly the official formula value (SPEC step 3).
function buildTiers(cycle, usage) {
  const limits = TIER_LIMITS[cycle];
  const tiers = [];
  let previousLimit = 0;
  for (let index = 0; index < 4; index += 1) {
    const upper = limits[index];
    const degrees = Math.min(usage, upper) - previousLimit;
    if (degrees > 0) {
      tiers.push({
        tier: index + 1,
        degrees,
        unitPriceMilliNt: TIER_UNIT_PRICE_MILLI_NT[index],
        subtotalMilliNt: degrees * TIER_UNIT_PRICE_MILLI_NT[index],
      });
    }
    previousLimit = upper;
    if (usage <= upper) break;
  }
  return tiers;
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { cycle, diameterMm, usageM3, sewerRateNt, sewerHundredths, wasteRateNt, wasteHundredths } =
    validated.values;

  // Step 1: basic charge, literal table lookup.
  const basicFeeMilliNt = BASIC_FEE_MILLI_NT[cycle][diameterMm];

  // Steps 2-3: usage charge by tier subtotals (identically equal to the
  // official unit-price x usage - progressive-difference formula).
  const tiers = buildTiers(cycle, usageM3);
  const usageChargeMilliNt = tiers.reduce((sum, tier) => sum + tier.subtotalMilliNt, 0);

  // Step 4: water subtotal, exact milli-NT, no rounding.
  const waterSubtotalMilliNt = basicFeeMilliNt + usageChargeMilliNt;

  // Step 5: conservation levy = roundHalfUp(usage charge in NT / 21)
  // yuan, in milli-NT. Zero usage gives zero.
  const wrccMilliNt = roundHalfUpDiv(usageChargeMilliNt, WRCC_DIVISOR * 1000) * 1000;

  // Step 6: sewer and waste levies, each roundHalfUp(rate x usage)
  // yuan when a rate was entered, otherwise null (not levied).
  const sewerFeeMilliNt =
    sewerHundredths === null
      ? null
      : roundHalfUpDiv(sewerHundredths * usageM3, 100) * 1000;
  const wasteFeeMilliNt =
    wasteHundredths === null
      ? null
      : roundHalfUpDiv(wasteHundredths * usageM3, 100) * 1000;

  // Step 7: business tax, information row only. Milli-NT value =
  // roundHalfUp((basic + usage) / 2100) x 100.
  const businessTaxMilliNt = roundHalfUpDiv(waterSubtotalMilliNt, BUSINESS_TAX_DIVISOR) * 100;

  // Step 8: total payable. The water subtotal is rounded half-up to
  // the yuan first, then the three already-whole-yuan levies are
  // added; this equals rounding the exact sum once.
  const totalPayableMilliNt =
    (roundHalfUpDiv(waterSubtotalMilliNt, 1000) +
      wrccMilliNt / 1000 +
      (sewerFeeMilliNt === null ? 0 : sewerFeeMilliNt / 1000) +
      (wasteFeeMilliNt === null ? 0 : wasteFeeMilliNt / 1000)) *
    1000;

  const result = {
    cycle,
    diameterMm,
    usageM3,
    tiers,
    basicFeeMilliNt,
    usageChargeMilliNt,
    waterSubtotalMilliNt,
    wrccMilliNt,
    sewerRateNt,
    sewerFeeMilliNt,
    wasteRateNt,
    wasteFeeMilliNt,
    businessTaxMilliNt,
    totalPayableMilliNt,
  };

  // Report cap backstop: a result over the cap is an OUTPUT_LIMIT
  // error instead of a success. With the pinned ranges a real result
  // is a few hundred bytes, so this never fires for a genuine
  // calculation.
  const serialized = serializeReport(result);
  if (!serialized.ok) return serialized;

  return { ok: true, result };
}

// Display formatting (app layer, never feeds back into machine
// values): money in NT, grouped thousands, at most two decimals,
// half-up on the third decimal. Whole-yuan values show no decimals.
export function formatMoneyMilliNt(milliNt) {
  const roundedHundredths = roundHalfUpDiv(milliNt, 10);
  const whole = Math.floor(roundedHundredths / 100);
  const fraction = roundedHundredths % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fraction === 0) return grouped;
  if (fraction % 10 === 0) return `${grouped}.${fraction / 10}`;
  return `${grouped}.${String(fraction).padStart(2, "0")}`;
}

// Format a per-degree rate for display: the user's own string, trimmed
// of a trailing ".0" only when it came from a whole number is NOT done
// here — the app echoes the literal input string instead.
export function formatUsage(usageM3) {
  return String(usageM3).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls.
function canonicalJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// Serialize a successful result for download: canonical compact JSON
// plus one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report
// limit the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
