// Pure core for the Deal Comparator (spec-deal-comparator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind. All
// money is integer cents (BigInt); percentage discounts are exact
// rationals (numerator / denominator as BigInts). Rounding happens
// exactly once, at the end, with round-half-up (half away from zero
// for negative values, per the SPEC); the unit price is computed
// from the unrounded exact paid amount, never from the rounded
// total. No floating-point arithmetic is used anywhere.
//
// Ranking: ascending (rounded unit price in cents, rounded total
// paid in cents, input index); ranks are consecutive 1..n with no
// ties; rank 1 is best.
//
// Validation follows the SPEC order: whole-input capacity, then
// productName, unitBasis, packSize, packPrice, offers count, then
// per-offer checks in input order (object, label, type, extra
// fields, type fields in table order, cross-field fixed-off rule).
// Only the first error is returned: { ok:false, error:{code, field,
// row } } with row always null. Top-level SCHEMA failures carry
// field null (per the SPEC intro); offer-level failures carry the
// offers[i].<field> path.

export const SPEC_ID = "spec-deal-comparator-20261121";

export const INPUT_LIMIT_CHARS = 65536;
export const PRODUCT_NAME_MAX = 80;
export const LABEL_MAX = 40;
export const INTEGER_MAX_CHARS = 6;
export const MONEY_MAX_CHARS = 12;

export const UNIT_BASES = ["g", "ml", "piece"];
export const UNIT_LABELS = { g: "每 100 g", ml: "每 100 mL", piece: "每件" };
export const OFFER_TYPES = ["buyNGetM", "percentOff", "fixedOff", "bundle"];
export const DEFAULT_LABELS = ["方案 A", "方案 B", "方案 C", "方案 D"];

export const PACK_SIZE_RANGES = { g: [1, 100000], ml: [1, 100000], piece: [1, 1000] };
export const PACK_PRICE_MIN_CENTS = 1n;
export const PACK_PRICE_MAX_CENTS = 99999999n;
export const COUNT_MIN = 1;
export const COUNT_MAX = 99;

// Reset default (SPEC userFlow): two offers, buy-two-get-one plus
// 20% off.
export const DEFAULTS = {
  productName: "咖啡豆",
  unitBasis: "g",
  packSize: "500",
  packPrice: "150.00",
  offers: [
    { type: "buyNGetM", buyN: "2", getM: "1" },
    { type: "percentOff", percent: "20", quantity: "1" },
  ],
};

// The load-example draft is fixtures.json case 1 (buy-n-get-m-wins)
// input, vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  productName: "咖啡豆",
  unitBasis: "g",
  packSize: "500",
  packPrice: "150.00",
  offers: [
    { type: "buyNGetM", buyN: "2", getM: "1" },
    { type: "percentOff", percent: "20", quantity: "1" },
    { type: "fixedOff", amountOff: "30.00", quantity: "1" },
    { type: "bundle", bundlePrice: "360.00", quantity: "3" },
  ],
};

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const MONEY_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

const TOP_LEVEL_FIELDS = ["productName", "unitBasis", "packSize", "packPrice", "offers"];
// Allowed fields per offer type, in the SPEC's table order for the
// type-specific fields; label and type are common to all.
const TYPE_FIELDS = {
  buyNGetM: ["buyN", "getM"],
  percentOff: ["quantity", "percent"],
  fixedOff: ["quantity", "amountOff"],
  bundle: ["quantity", "bundlePrice"],
};
function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

// Reads only an own data property; accessors are never invoked.
// Returns { found:false } when absent, { accessor:true } for an
// accessor property, otherwise { value }.
function ownData(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined) return { found: false };
  if (!("value" in descriptor)) return { found: true, accessor: true };
  return { found: true, value: descriptor.value };
}

// Whole-input capacity: the length of the input's JSON text. The
// measure is taken on a sanitized own-data copy (accessors and
// non-plain values become null placeholders) so measuring never
// invokes user code and never masks the precise validation below,
// which reports accessors with their exact field.
function sanitizedCopy(value) {
  if (typeof value === "string" || typeof value === "boolean" || value === null) return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    const out = [];
    for (let index = 0; index < value.length; index += 1) {
      const entry = ownData(value, String(index));
      out.push(entry.found && !entry.accessor ? sanitizedCopy(entry.value) : null);
    }
    return out;
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value)) {
      const entry = ownData(value, key);
      out[key] = entry.found && !entry.accessor ? sanitizedCopy(entry.value) : null;
    }
    return out;
  }
  return null;
}

function wholeInputLength(input) {
  try {
    return JSON.stringify(sanitizedCopy(input)).length;
  } catch {
    return 0;
  }
}

// Exact rational round-half-up: round(n / d) with d > 0; halves go
// away from zero (negative values: absolute value first, then
// negate), per the SPEC's roundHalfUp definition.
function roundHalfUpDiv(numerator, denominator) {
  if (numerator < 0n) return -roundHalfUpDiv(-numerator, denominator);
  return (2n * numerator + denominator) / (2n * denominator);
}

function parseMoneyCents(text) {
  const dot = text.indexOf(".");
  const whole = dot === -1 ? text : text.slice(0, dot);
  const fraction = dot === -1 ? "" : text.slice(dot + 1);
  return BigInt(whole) * 100n + BigInt((fraction + "00").slice(0, 2));
}

function formatMoney(cents) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;
  return `${sign}${whole}.${fraction < 10n ? "0" : ""}${fraction}`;
}

function formatPercentTenths(tenths) {
  const sign = tenths < 0n ? "-" : "";
  const absolute = tenths < 0n ? -tenths : tenths;
  return `${sign}${absolute / 10n}.${absolute % 10n}`;
}

// Validates one integer-string field (already known to be a string).
// Returns { value: BigInt } or { error }.
function validateIntegerField(field, text, min, max) {
  if (text.length > INTEGER_MAX_CHARS) return { error: failure("INPUT_LIMIT", field) };
  if (!INTEGER_PATTERN.test(text)) return { error: failure("INTEGER_FORMAT", field) };
  const value = BigInt(text);
  if (value < BigInt(min) || value > BigInt(max)) return { error: failure("RANGE", field) };
  return { value };
}

// Validates one money-string field (already known to be a string).
// Returns { value: BigInt cents } or { error }.
function validateMoneyField(field, text) {
  if (text.length > MONEY_MAX_CHARS) return { error: failure("INPUT_LIMIT", field) };
  if (!MONEY_PATTERN.test(text)) return { error: failure("MONEY_FORMAT", field) };
  const value = parseMoneyCents(text);
  if (value < PACK_PRICE_MIN_CENTS || value > PACK_PRICE_MAX_CENTS) {
    return { error: failure("RANGE", field) };
  }
  return { value };
}

function validateOffer(offer, index, packPriceCents) {
  const prefix = `offers[${index}]`;
  if (!isPlainObject(offer)) return { error: failure("SCHEMA", prefix) };

  // (b) label, when present.
  const labelEntry = ownData(offer, "label");
  let label;
  if (labelEntry.found) {
    if (labelEntry.accessor || typeof labelEntry.value !== "string") {
      return { error: failure("SCHEMA", `${prefix}.label`) };
    }
    if (labelEntry.value.length > LABEL_MAX) {
      return { error: failure("INPUT_LIMIT", `${prefix}.label`) };
    }
    if (labelEntry.value.trim() === "") {
      return { error: failure("EMPTY", `${prefix}.label`) };
    }
    label = labelEntry.value;
  }

  // (c) type.
  const typeEntry = ownData(offer, "type");
  if (!typeEntry.found || typeEntry.accessor || typeof typeEntry.value !== "string") {
    return { error: failure("SCHEMA", `${prefix}.type`) };
  }
  const type = typeEntry.value;
  if (!OFFER_TYPES.includes(type)) return { error: failure("ENUM", `${prefix}.type`) };

  // (d) extra fields for this type.
  const allowed = new Set(["label", "type", ...TYPE_FIELDS[type]]);
  for (const key of Object.keys(offer)) {
    if (!allowed.has(key)) return { error: failure("SCHEMA", `${prefix}.${key}`) };
  }

  // (e) type fields in the SPEC's table order.
  const checked = {};
  for (const field of TYPE_FIELDS[type]) {
    const entry = ownData(offer, field);
    const path = `${prefix}.${field}`;
    if (field === "quantity" && !entry.found) {
      checked.quantity = 1n;
      continue;
    }
    if (!entry.found || entry.accessor || typeof entry.value !== "string") {
      return { error: failure("SCHEMA", path) };
    }
    if (field === "quantity" || field === "buyN" || field === "getM" || field === "percent") {
      const outcome = validateIntegerField(path, entry.value, COUNT_MIN, COUNT_MAX);
      if (outcome.error) return outcome;
      checked[field] = outcome.value;
    } else {
      const outcome = validateMoneyField(path, entry.value);
      if (outcome.error) return outcome;
      checked[field] = outcome.value;
    }
  }

  // (f) cross-field: fixedOff amount must be below the total list price.
  if (type === "fixedOff") {
    const quantity = checked.quantity;
    if (checked.amountOff >= quantity * packPriceCents) {
      return { error: failure("DISCOUNT_EXCEEDS_PRICE", `${prefix}.amountOff`) };
    }
  }

  return {
    offer: {
      index,
      label: label ?? DEFAULT_LABELS[index],
      type,
      ...checked,
    },
  };
}

export function run(input) {
  if (!isPlainObject(input)) return failure("SCHEMA", null);

  // 1. Capacity: whole input first.
  if (wholeInputLength(input) > INPUT_LIMIT_CHARS) return failure("INPUT_LIMIT", null);

  // Top-level shape: exactly the five fields, own data.
  const keys = Object.keys(input);
  if (keys.length !== TOP_LEVEL_FIELDS.length) return failure("SCHEMA", null);
  for (const field of TOP_LEVEL_FIELDS) {
    if (!keys.includes(field)) return failure("SCHEMA", null);
  }

  // 2. productName.
  const nameEntry = ownData(input, "productName");
  if (nameEntry.accessor || typeof nameEntry.value !== "string") return failure("SCHEMA", null);
  const rawName = nameEntry.value;
  if (rawName.length > PRODUCT_NAME_MAX) return failure("INPUT_LIMIT", "productName");
  const productName = rawName.trim();
  if (productName === "") return failure("EMPTY", "productName");

  // 3. unitBasis.
  const basisEntry = ownData(input, "unitBasis");
  if (basisEntry.accessor || typeof basisEntry.value !== "string") return failure("SCHEMA", null);
  const unitBasis = basisEntry.value;
  if (!UNIT_BASES.includes(unitBasis)) return failure("ENUM", "unitBasis");

  // 4. packSize.
  const sizeEntry = ownData(input, "packSize");
  if (sizeEntry.accessor || typeof sizeEntry.value !== "string") return failure("SCHEMA", null);
  const [sizeMin, sizeMax] = PACK_SIZE_RANGES[unitBasis];
  const sizeOutcome = validateIntegerField("packSize", sizeEntry.value, sizeMin, sizeMax);
  if (sizeOutcome.error) return sizeOutcome.error;
  const packSize = sizeOutcome.value;

  // 5. packPrice.
  const priceEntry = ownData(input, "packPrice");
  if (priceEntry.accessor || typeof priceEntry.value !== "string") return failure("SCHEMA", null);
  const priceOutcome = validateMoneyField("packPrice", priceEntry.value);
  if (priceOutcome.error) return priceOutcome.error;
  const packPriceCents = priceOutcome.value;

  // 6. offers count.
  const offersEntry = ownData(input, "offers");
  if (offersEntry.accessor || !Array.isArray(offersEntry.value)) return failure("SCHEMA", null);
  const rawOffers = offersEntry.value;
  if (rawOffers.length < 2 || rawOffers.length > 4) {
    return failure("OFFER_COUNT", "offers");
  }

  // 7. Per-offer validation, in input order.
  const validated = [];
  for (let index = 0; index < rawOffers.length; index += 1) {
    const element = ownData(rawOffers, String(index));
    if (!element.found || element.accessor) {
      return failure("SCHEMA", `offers[${index}]`);
    }
    const outcome = validateOffer(element.value, index, packPriceCents);
    if (outcome.error) return outcome.error;
    validated.push(outcome.offer);
  }

  // Core computation. P = pack price in cents, S = pack size.
  // paid is an exact rational (numerator / denominator); list is an
  // integer number of cents.
  const computed = validated.map((offer) => {
    let paidNumerator;
    let paidDenominator = 1n;
    let totalQuantity;
    let listCents;
    if (offer.type === "buyNGetM") {
      paidNumerator = offer.buyN * packPriceCents;
      totalQuantity = (offer.buyN + offer.getM) * packSize;
      listCents = (offer.buyN + offer.getM) * packPriceCents;
    } else if (offer.type === "percentOff") {
      paidNumerator = offer.quantity * packPriceCents * (100n - offer.percent);
      paidDenominator = 100n;
      totalQuantity = offer.quantity * packSize;
      listCents = offer.quantity * packPriceCents;
    } else if (offer.type === "fixedOff") {
      paidNumerator = offer.quantity * packPriceCents - offer.amountOff;
      totalQuantity = offer.quantity * packSize;
      listCents = offer.quantity * packPriceCents;
    } else {
      paidNumerator = offer.bundlePrice;
      totalQuantity = offer.quantity * packSize;
      listCents = offer.quantity * packPriceCents;
    }
    const unitPriceCents =
      unitBasis === "piece"
        ? roundHalfUpDiv(paidNumerator, paidDenominator * totalQuantity)
        : roundHalfUpDiv(paidNumerator * 100n, paidDenominator * totalQuantity);
    const totalPaidCents = roundHalfUpDiv(paidNumerator, paidDenominator);
    const savingsNumerator = listCents * paidDenominator - paidNumerator;
    const savingsCents = roundHalfUpDiv(savingsNumerator, paidDenominator);
    const savingsTenths = roundHalfUpDiv(savingsNumerator * 1000n, paidDenominator * listCents);
    return {
      index: offer.index,
      label: offer.label,
      type: offer.type,
      totalPaid: formatMoney(totalPaidCents),
      totalQuantity: Number(totalQuantity),
      unitPrice: formatMoney(unitPriceCents),
      savings: formatMoney(savingsCents),
      savingsPercent: formatPercentTenths(savingsTenths),
      unitPriceCents,
      totalPaidCents,
    };
  });

  // Ranking: (unit price, total paid, input index), all ascending.
  // Ranks are consecutive 1..n; rank 1 is best.
  const ranked = [...computed].sort((a, b) => {
    if (a.unitPriceCents !== b.unitPriceCents) {
      return a.unitPriceCents < b.unitPriceCents ? -1 : 1;
    }
    if (a.totalPaidCents !== b.totalPaidCents) {
      return a.totalPaidCents < b.totalPaidCents ? -1 : 1;
    }
    return a.index - b.index;
  });
  const offers = ranked.map((entry, position) => ({
    index: entry.index,
    label: entry.label,
    type: entry.type,
    totalPaid: entry.totalPaid,
    totalQuantity: entry.totalQuantity,
    unitPrice: entry.unitPrice,
    savings: entry.savings,
    savingsPercent: entry.savingsPercent,
    rank: position + 1,
    best: position === 0,
  }));

  return {
    ok: true,
    result: {
      productName,
      unitBasis,
      unitLabel: UNIT_LABELS[unitBasis],
      packSize: Number(packSize),
      packPrice: formatMoney(packPriceCents),
      offers,
    },
  };
}

// Fixed report download: deal-comparator-report.json. The content is
// the result's compact JSON with object keys sorted recursively by
// UTF-16 code units, array order unchanged, exactly one trailing LF,
// UTF-8 without BOM. The serializer is hand-written: it never calls
// a value's toJSON and accepts only the plain data shapes a result
// can hold (null, booleans, safe integers, strings, arrays, plain
// objects).
export const REPORT_FILENAME = "deal-comparator-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("report values must be safe integers");
    }
    return String(value);
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
