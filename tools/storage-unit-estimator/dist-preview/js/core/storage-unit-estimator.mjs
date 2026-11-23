// Pure core for the Storage Unit Estimator
// (spec-storage-unit-estimator-20261121).
// Synchronous data-in / data-out only: no DOM, no network, no
// storage, and no host clock or timezone access of any kind.
//
// Pinned data (SPEC implementation, verbatim):
// - 21-item volume table: each unit volume in m^3 is derived from
//   the pinned typical outer dimensions (length x width x height cm
//   / 1,000,000), half-up to 2 decimals. Volumes are stored here as
//   integer hundredths of a cubic metre so every total is an exact
//   integer sum (no binary floating point anywhere in the maths).
// - 6 storage-unit sizes (5x5 to 10x30 ft, 8 ft high): floor area
//   m^2, floor area in ping, and capacity m^3 are the SPEC's pinned
//   2-decimal literals, cross-checked in the SPEC (m^3 from
//   ft x 0.3048 and from cu ft x 0.028316846592 agree to 2 decimals).
// - 25% aisle/stacking allowance: requiredM3 = totalM3 x 1.25, a
//   fixed empirical coefficient disclosed as such by the SPEC, not a
//   measured packing efficiency.
//
// Exact-arithmetic rules (SPEC inputsOutputs):
// - totalM3 is the exact integer sum in 0.01 m^3 units.
// - requiredM3 and allowanceM3 are exact rationals (total x 5/4 and
//   total x 1/4); they are half-up rounded to 2 decimals only for
//   display. The unit recommendation compares the UNROUNDED required
//   volume against the pinned 2-decimal capacities.
// - fillPct = required / (unitsNeeded x capacity) x 100, half-up to
//   1 decimal, computed from the unrounded required volume and the
//   pinned capacity literals.
// - unitsNeeded is 1 when a unit fits; otherwise
//   ceil(required / largest capacity), exact rational.
// The result shape follows fixtures.json exactly.

export const MAX_ROWS = 30;
export const MAX_ITEM_ID_UNITS = 32;
export const MAX_RAW_UNITS = 8;
export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 99;
export const DIM_MIN_CM = 1;
export const DIM_MAX_CM = 300;

// Pinned volume table. unitVolumeHundredths is the SPEC's 2-decimal
// m^3 literal x 100. group is used only by the UI to group the item
// selector (furniture / appliances / boxes).
export const ITEMS = {
  "sofa-3-seat": { nameZh: "三人沙發", nameEn: "Three-seat sofa", group: "furniture", dimsCm: [210, 90, 90], unitVolumeHundredths: 170 },
  "sofa-2-seat": { nameZh: "雙人沙發", nameEn: "Two-seat sofa", group: "furniture", dimsCm: [160, 90, 90], unitVolumeHundredths: 130 },
  armchair: { nameZh: "單人扶手椅", nameEn: "Armchair", group: "furniture", dimsCm: [90, 90, 90], unitVolumeHundredths: 73 },
  "double-bed": { nameZh: "雙人床架+床墊", nameEn: "Double bed frame + mattress", group: "furniture", dimsCm: [190, 160, 60], unitVolumeHundredths: 182 },
  "single-bed": { nameZh: "單人床架+床墊", nameEn: "Single bed frame + mattress", group: "furniture", dimsCm: [190, 100, 60], unitVolumeHundredths: 114 },
  "dining-table": { nameZh: "餐桌（四人）", nameEn: "Dining table (4-person)", group: "furniture", dimsCm: [140, 80, 75], unitVolumeHundredths: 84 },
  "dining-chair": { nameZh: "餐椅", nameEn: "Dining chair", group: "furniture", dimsCm: [45, 50, 90], unitVolumeHundredths: 20 },
  wardrobe: { nameZh: "衣櫃（雙門）", nameEn: "Wardrobe (double-door)", group: "furniture", dimsCm: [120, 60, 200], unitVolumeHundredths: 144 },
  "chest-drawers": { nameZh: "五斗櫃", nameEn: "Chest of drawers", group: "furniture", dimsCm: [100, 50, 110], unitVolumeHundredths: 55 },
  bookshelf: { nameZh: "書櫃", nameEn: "Bookshelf", group: "furniture", dimsCm: [100, 35, 180], unitVolumeHundredths: 63 },
  desk: { nameZh: "書桌", nameEn: "Desk", group: "furniture", dimsCm: [120, 60, 75], unitVolumeHundredths: 54 },
  "coffee-table": { nameZh: "茶几", nameEn: "Coffee table", group: "furniture", dimsCm: [110, 55, 45], unitVolumeHundredths: 27 },
  "refrigerator-large": { nameZh: "大冰箱（雙門）", nameEn: "Large refrigerator (double-door)", group: "appliance", dimsCm: [90, 75, 180], unitVolumeHundredths: 122 },
  "refrigerator-small": { nameZh: "小冰箱", nameEn: "Small refrigerator", group: "appliance", dimsCm: [60, 60, 140], unitVolumeHundredths: 50 },
  "washing-machine": { nameZh: "洗衣機", nameEn: "Washing machine", group: "appliance", dimsCm: [60, 60, 85], unitVolumeHundredths: 31 },
  dryer: { nameZh: "烘衣機", nameEn: "Dryer", group: "appliance", dimsCm: [60, 60, 85], unitVolumeHundredths: 31 },
  "tv-55": { nameZh: "55吋電視", nameEn: '55" TV', group: "appliance", dimsCm: [125, 10, 78], unitVolumeHundredths: 10 },
  microwave: { nameZh: "微波爐", nameEn: "Microwave oven", group: "appliance", dimsCm: [50, 40, 30], unitVolumeHundredths: 6 },
  "box-small": { nameZh: "小紙箱", nameEn: "Small box", group: "box", dimsCm: [40, 40, 40], unitVolumeHundredths: 6 },
  "box-medium": { nameZh: "中紙箱", nameEn: "Medium box", group: "box", dimsCm: [50, 50, 50], unitVolumeHundredths: 13 },
  "box-large": { nameZh: "大紙箱", nameEn: "Large box", group: "box", dimsCm: [60, 60, 60], unitVolumeHundredths: 22 },
};

export const CUSTOM_ITEM_ID = "custom";
export const CUSTOM_NAME_ZH = "自訂物品";
export const CUSTOM_NAME_EN = "Custom item";

// Pinned unit-size table, in ascending capacity order. Volumes and
// areas are the SPEC's 2-decimal literals, stored as integer
// hundredths.
export const UNITS = [
  { unitId: "5x5", unitLabelFt: "5 × 5 ft", floorAreaHundredths: 232, floorAreaPingHundredths: 70, capacityHundredths: 566 },
  { unitId: "5x10", unitLabelFt: "5 × 10 ft", floorAreaHundredths: 465, floorAreaPingHundredths: 141, capacityHundredths: 1133 },
  { unitId: "10x10", unitLabelFt: "10 × 10 ft", floorAreaHundredths: 929, floorAreaPingHundredths: 281, capacityHundredths: 2265 },
  { unitId: "10x15", unitLabelFt: "10 × 15 ft", floorAreaHundredths: 1394, floorAreaPingHundredths: 422, capacityHundredths: 3398 },
  { unitId: "10x20", unitLabelFt: "10 × 20 ft", floorAreaHundredths: 1858, floorAreaPingHundredths: 562, capacityHundredths: 4531 },
  { unitId: "10x30", unitLabelFt: "10 × 30 ft", floorAreaHundredths: 2787, floorAreaPingHundredths: 843, capacityHundredths: 6796 },
];

export const DEFAULTS = {
  items: [
    { itemId: "single-bed", quantity: "1" },
    { itemId: "wardrobe", quantity: "1" },
    { itemId: "box-medium", quantity: "2" },
  ],
};

// The worked example is fixtures.json case 1 (studio-basics) input,
// vendored verbatim in test/fixtures.json.
export const EXAMPLE = {
  items: [
    { itemId: "single-bed", quantity: "1" },
    { itemId: "wardrobe", quantity: "1" },
    { itemId: "box-medium", quantity: "2" },
    { itemId: "washing-machine", quantity: "1" },
  ],
};

export const ROW_FIELDS = ["itemId", "quantity", "lengthCm", "widthCm", "heightCm"];
export const DIM_FIELDS = ["lengthCm", "widthCm", "heightCm"];

const ASCII_INTEGER_PATTERN = /^[0-9]+$/;

function failure(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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

// Reads one own string data property without invoking accessors.
// Returns the string, or null when the property is absent, is an
// accessor, or is not a string. A caller that needs to distinguish
// "absent" from "present but wrong-typed" checks hasOwnProperty
// first; both cases are SCHEMA here except where the SPEC pins EMPTY
// for a missing required custom dimension (handled by the caller).
function readOwnString(object, field) {
  const descriptor = Object.getOwnPropertyDescriptor(object, field);
  if (descriptor === undefined || !("value" in descriptor)) return null;
  if (typeof descriptor.value !== "string") return null;
  return descriptor.value;
}

// Per-field validation in the SPEC's order: capacity, unpaired
// surrogate, empty, grammar, range/enum. Returns the parsed integer
// (or the itemId string) or an { error } outcome. `row` is the
// 1-based source row for the error triple.
function validateIntegerField(value, field, row, min, max) {
  if (value.length > MAX_RAW_UNITS) return { error: failure("INPUT_LIMIT", field, row) };
  if (hasLoneSurrogate(value)) return { error: failure("UNICODE", field, row) };
  if (value.length === 0) return { error: failure("EMPTY", field, row) };
  if (!ASCII_INTEGER_PATTERN.test(value)) return { error: failure("INTEGER_FORMAT", field, row) };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return { error: failure("RANGE", field, row) };
  }
  return { value: parsed };
}

// Half-up rounding of a non-negative rational num/den to an integer:
// floor(num/den + 1/2). All values here are small safe integers.
function roundHalfUpDiv(num, den) {
  return Math.floor((2 * num + den) / (2 * den));
}

function formatHundredths(hundredths) {
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

function formatTenths(tenths) {
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return `${whole}.${frac}`;
}

export function run(input) {
  // Top-level shape: exactly one own field, `items`, holding an
  // array. Unknown / missing / wrong-typed / accessor cases are
  // SCHEMA with field and row null (SPEC inputsOutputs).
  if (!isPlainObject(input)) return failure("SCHEMA", null, null);
  const inputKeys = Object.keys(input);
  if (inputKeys.length !== 1 || inputKeys[0] !== "items") return failure("SCHEMA", null, null);
  const itemsDescriptor = Object.getOwnPropertyDescriptor(input, "items");
  if (itemsDescriptor === undefined || !("value" in itemsDescriptor)) {
    return failure("SCHEMA", null, null);
  }
  const items = itemsDescriptor.value;
  if (!Array.isArray(items)) return failure("SCHEMA", "items", null);

  // Row count first (SPEC step 1): 0 rows EMPTY, over 30 ROW_LIMIT.
  if (items.length === 0) return failure("EMPTY", "items", null);
  if (items.length > MAX_ROWS) return failure("ROW_LIMIT", "items", null);

  // Per-row validation, in row order; within a row in
  // itemId, quantity, lengthCm, widthCm, heightCm order.
  const parsedRows = [];
  for (let index = 0; index < items.length; index += 1) {
    const rowNumber = index + 1;
    const row = items[index];
    if (!isPlainObject(row)) return failure("SCHEMA", null, rowNumber);
    for (const key of Object.keys(row)) {
      if (!ROW_FIELDS.includes(key)) return failure("SCHEMA", key, rowNumber);
    }
    if (!Object.prototype.hasOwnProperty.call(row, "itemId")) {
      return failure("SCHEMA", "itemId", rowNumber);
    }
    if (!Object.prototype.hasOwnProperty.call(row, "quantity")) {
      return failure("SCHEMA", "quantity", rowNumber);
    }
    const itemId = readOwnString(row, "itemId");
    if (itemId === null) return failure("SCHEMA", "itemId", rowNumber);
    if (itemId.length > MAX_ITEM_ID_UNITS) {
      return failure("INPUT_LIMIT", "itemId", rowNumber);
    }
    if (hasLoneSurrogate(itemId)) return failure("UNICODE", "itemId", rowNumber);
    if (itemId.length === 0) return failure("EMPTY", "itemId", rowNumber);
    const isCustom = itemId === CUSTOM_ITEM_ID;
    if (!isCustom && !Object.prototype.hasOwnProperty.call(ITEMS, itemId)) {
      return failure("ENUM", "itemId", rowNumber);
    }

    const quantityRaw = readOwnString(row, "quantity");
    if (quantityRaw === null) return failure("SCHEMA", "quantity", rowNumber);
    const quantityOutcome = validateIntegerField(
      quantityRaw,
      "quantity",
      rowNumber,
      QUANTITY_MIN,
      QUANTITY_MAX,
    );
    if (quantityOutcome.error) return quantityOutcome.error;
    const quantity = quantityOutcome.value;

    // Custom dimensions: required on custom rows (absent or empty is
    // EMPTY), forbidden with a non-empty value on pinned rows
    // (SCHEMA). Empty-string dimensions on a pinned row are treated
    // as absent, per the SPEC.
    const dims = {};
    for (const field of DIM_FIELDS) {
      const present = Object.prototype.hasOwnProperty.call(row, field);
      const raw = present ? readOwnString(row, field) : null;
      if (present && raw === null) return failure("SCHEMA", field, rowNumber);
      if (isCustom) {
        if (!present || raw === "") return failure("EMPTY", field, rowNumber);
        const outcome = validateIntegerField(raw, field, rowNumber, DIM_MIN_CM, DIM_MAX_CM);
        if (outcome.error) return outcome.error;
        dims[field] = outcome.value;
      } else if (present && raw !== "") {
        return failure("SCHEMA", field, rowNumber);
      }
    }

    // Per-row unit volume in hundredths of a m^3.
    let unitVolumeHundredths;
    if (isCustom) {
      const cubicCm = dims.lengthCm * dims.widthCm * dims.heightCm;
      // m^3 = cubicCm / 1,000,000; hundredths = cubicCm / 10,000,
      // half-up: floor((cubicCm + 5000) / 10000).
      unitVolumeHundredths = Math.floor((cubicCm + 5000) / 10000);
    } else {
      unitVolumeHundredths = ITEMS[itemId].unitVolumeHundredths;
    }
    parsedRows.push({ itemId, isCustom, quantity, unitVolumeHundredths });
  }

  const rows = parsedRows.map((row) => {
    const pinned = row.isCustom
      ? { nameZh: CUSTOM_NAME_ZH, nameEn: CUSTOM_NAME_EN }
      : ITEMS[row.itemId];
    const rowVolumeHundredths = row.unitVolumeHundredths * row.quantity;
    return {
      itemId: row.itemId,
      nameZh: pinned.nameZh,
      nameEn: pinned.nameEn,
      quantity: row.quantity,
      unitVolumeM3: formatHundredths(row.unitVolumeHundredths),
      rowVolumeM3: formatHundredths(rowVolumeHundredths),
    };
  });

  // Exact total in hundredths.
  const totalHundredths = parsedRows.reduce(
    (sum, row) => sum + row.unitVolumeHundredths * row.quantity,
    0,
  );
  // Exact rationals, half-up only for display:
  // required = total x 5/4, allowance = total x 1/4.
  const requiredHundredths = roundHalfUpDiv(totalHundredths * 5, 4);
  const allowanceHundredths = roundHalfUpDiv(totalHundredths, 4);

  // Recommendation compares the UNROUNDED required volume
  // (totalHundredths x 5/4) with the pinned capacities: a unit fits
  // when capacityHundredths x 4 >= totalHundredths x 5.
  const requiredQuarters = totalHundredths * 5;
  let chosen = null;
  for (const unit of UNITS) {
    if (unit.capacityHundredths * 4 >= requiredQuarters) {
      chosen = unit;
      break;
    }
  }
  const fits = chosen !== null;
  const largest = UNITS[UNITS.length - 1];
  const unit = fits ? chosen : largest;
  const unitsNeeded = fits
    ? 1
    : Math.ceil(requiredQuarters / (largest.capacityHundredths * 4));
  // fillPct tenths = roundHalfUp(total x 1250 / (units x capacity)),
  // from the unrounded required volume and the pinned capacity.
  const fillTenths = roundHalfUpDiv(
    totalHundredths * 1250,
    unitsNeeded * unit.capacityHundredths,
  );

  return {
    ok: true,
    result: {
      rows,
      totalM3: formatHundredths(totalHundredths),
      allowanceM3: formatHundredths(allowanceHundredths),
      requiredM3: formatHundredths(requiredHundredths),
      unitId: unit.unitId,
      unitLabelFt: unit.unitLabelFt,
      floorAreaM2: formatHundredths(unit.floorAreaHundredths),
      floorAreaPing: formatHundredths(unit.floorAreaPingHundredths),
      capacityM3: formatHundredths(unit.capacityHundredths),
      unitsNeeded,
      fillPct: formatTenths(fillTenths),
      fits,
    },
  };
}

// Fixed report download: storage-unit-estimator-report.json. The
// content is the result's compact JSON with object keys sorted
// recursively by UTF-16 code units, array order unchanged, exactly
// one trailing LF, UTF-8 without BOM. The serializer is hand-written:
// it never calls a value's toJSON and accepts only the plain data
// shapes a result can hold (null, booleans, safe integers, strings,
// arrays, plain objects).
export const REPORT_FILENAME = "storage-unit-estimator-report.json";
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
