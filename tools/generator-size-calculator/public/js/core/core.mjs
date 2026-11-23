// Generator Size Calculator — pure core.
// Exact integer arithmetic only; no floating-point math on operands or
// results (string lengths and indexes excepted), per SPEC. run(input) is
// a synchronous pure data transform:
//   input  {appliances: [{name, runningWatts, startingWatts} x 1-12]}
//          watts are ASCII decimal integer strings, 0 or non-zero-leading
//          ("007" is invalid); raw watts at most 8 units, name at most
//          40 units.
//   output {ok:true, result:{rows, totalRunningW, maxSurgeExtraW, peakW,
//            largestSurgeRow, requiredRunningW, requiredKva, peakKva,
//            recommendedKva, recommendedSizeKva, oversize}}
//        | {ok:false, error:{code, field, row}} — row is the 1-based
//          appliance row, or null.
// Rules pinned by the SPEC: total running watts is the plain sum; the
// surge adds only the single largest starting increment (motors start
// one at a time); requiredRunningW = ceil(total x 5/4) (25% margin);
// kVA = W / 0.8 / 1000 ceiled to 0.1 and formatted with exactly one
// decimal; recommendedKva = max(requiredKva, peakKva); the retail table
// runs 1.0-20.0 kVA, above 20 the size is ceiled to 0.5 kVA and flagged
// oversize. The peak kVA carries no extra 25% margin.

export const MAX_ROWS = 12;
export const MAX_RAW_WATTS_LENGTH = 8;
export const MAX_RAW_NAME_LENGTH = 40;
export const RUNNING_MIN_W = 1;
export const RUNNING_MAX_W = 20000;
export const STARTING_MIN_W = 1;
export const STARTING_MAX_W = 30000;
export const REPORT_FILENAME = "generator-size-calculator-report.json";
export const MAX_REPORT_BYTES = 2097152;

// Retail size table in tenths of a kVA: 1.0, 1.5, 2.0, 2.5, 3.0, 3.5,
// 4.0, 5.0, 6.0, 7.5, 10.0, 12.5, 15.0, 20.0.
export const RETAIL_TABLE_TENTHS = [10, 15, 20, 25, 30, 35, 40, 50, 60, 75, 100, 125, 150, 200];

// Preset watts table. Source: Honda Power Equipment wattage estimation
// guide, Home Applications table (starting watts listed first there;
// converted here to running/starting order). Where Honda gives a range,
// the upper bound is used (conservative sizing); non-numeric rows are
// not included. Nameplate values always win over these approximations.
export const PRESETS = [
  { id: "refrigerator", nameZh: "冰箱／冷凍櫃（節能型）", nameEn: "Refrigerator/Freezer (Energy Star)", runningWatts: "192", startingWatts: "1200" },
  { id: "microwave", nameZh: "微波爐 1000 W", nameEn: "Microwave Oven (1000 W)", runningWatts: "1500", startingWatts: "1500" },
  { id: "furnace-fan", nameZh: "暖爐風扇 1/3 HP", nameEn: "Furnace Fan (1/3 HP)", runningWatts: "700", startingWatts: "1400" },
  { id: "sump-pump-1-3", nameZh: "沉水泵 1/3 HP", nameEn: "Sump Pump (1/3 HP)", runningWatts: "800", startingWatts: "1300" },
  { id: "sump-pump-1-2", nameZh: "沉水泵 1/2 HP", nameEn: "Sump Pump (1/2 HP)", runningWatts: "1050", startingWatts: "2150" },
  { id: "window-ac", nameZh: "窗型冷氣 10000 BTU", nameEn: "Window Air Conditioner (10,000 BTU)", runningWatts: "1500", startingWatts: "2200" },
  { id: "dryer", nameZh: "電熱乾衣機", nameEn: "Clothes Dryer (Electric)", runningWatts: "5400", startingWatts: "6750" },
  { id: "water-heater", nameZh: "電熱水器", nameEn: "Hot Water Heater", runningWatts: "4500", startingWatts: "4500" },
  { id: "washer", nameZh: "洗衣機", nameEn: "Automatic Washer", runningWatts: "1200", startingWatts: "1200" },
  { id: "tv", nameZh: "平面電視 46 吋", nameEn: "Flat-Screen TV (46\")", runningWatts: "190", startingWatts: "190" },
  { id: "laptop", nameZh: "筆記型電腦", nameEn: "Laptop", runningWatts: "250", startingWatts: "250" },
  { id: "coffee-maker", nameZh: "咖啡機 4 杯", nameEn: "Coffee Maker (4 cup)", runningWatts: "600", startingWatts: "600" },
];

// Grammar: "0" or a non-zero-leading decimal integer. "007", "00", "+5",
// "1e3", "100.5", whitespace and symbols are rejected.
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;

function fail(code, field, row) {
  return { ok: false, error: { code, field, row } };
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

function isOwnData(obj, key) {
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  return !!desc && "value" in desc;
}

// Validate one appliance row's three fields in SPEC order
// (name, runningWatts, startingWatts), each field capacity, then
// surrogate, then grammar, then range. Returns the parsed row or an
// error outcome. Row numbers here are 1-based.
function validateRow(raw, rowNumber) {
  // Structural: a plain object with exactly the three own data fields,
  // all strings. Any structural problem is SCHEMA (field/row null).
  if (!isPlainObject(raw)) return { error: fail("SCHEMA", null, null) };
  const keys = Object.keys(raw);
  if (
    keys.length !== 3 ||
    !keys.includes("name") ||
    !keys.includes("runningWatts") ||
    !keys.includes("startingWatts")
  ) {
    return { error: fail("SCHEMA", null, null) };
  }
  for (const key of ["name", "runningWatts", "startingWatts"]) {
    if (!isOwnData(raw, key) || typeof raw[key] !== "string") {
      return { error: fail("SCHEMA", null, null) };
    }
  }
  const { name, runningWatts, startingWatts } = raw;

  // name: INPUT_LIMIT -> EMPTY (empty or all-whitespace) -> UNICODE
  // (control chars or unpaired surrogates).
  if (name.length > MAX_RAW_NAME_LENGTH) {
    return { error: fail("INPUT_LIMIT", "name", rowNumber) };
  }
  if (name === "" || /^\s*$/.test(name)) {
    return { error: fail("EMPTY", "name", rowNumber) };
  }
  if (hasControlChar(name) || hasUnpairedSurrogate(name)) {
    return { error: fail("UNICODE", "name", rowNumber) };
  }

  // Watts fields: INPUT_LIMIT -> EMPTY -> UNICODE (unpaired surrogate,
  // per the SPEC's "capacity, then surrogate, then grammar" order) ->
  // INTEGER_FORMAT -> RANGE.
  const watts = [];
  for (const [field, rawWatts, minW, maxW] of [
    ["runningWatts", runningWatts, RUNNING_MIN_W, RUNNING_MAX_W],
    ["startingWatts", startingWatts, STARTING_MIN_W, STARTING_MAX_W],
  ]) {
    if (rawWatts.length > MAX_RAW_WATTS_LENGTH) {
      return { error: fail("INPUT_LIMIT", field, rowNumber) };
    }
    if (rawWatts === "") {
      return { error: fail("EMPTY", field, rowNumber) };
    }
    if (hasUnpairedSurrogate(rawWatts)) {
      return { error: fail("UNICODE", field, rowNumber) };
    }
    if (!INTEGER_RE.test(rawWatts)) {
      return { error: fail("INTEGER_FORMAT", field, rowNumber) };
    }
    const value = Number(rawWatts);
    if (value < minW || value > maxW) {
      return { error: fail("RANGE", field, rowNumber) };
    }
    watts.push(value);
  }
  return { row: { name, runningWatts: watts[0], startingWatts: watts[1] } };
}

// Ceiling of W / 80, in tenths of a kVA: kVA = W / 0.8 / 1000 ceiled
// to 0.1, computed as ceil(W * 10 / 800) = ceil(W / 80) on integers.
function kvaTenths(watts) {
  return Math.floor((watts + 79) / 80);
}

// Format integer tenths of a kVA as exactly one decimal ("0.8", "20.0").
function formatTenths(tenths) {
  return Math.floor(tenths / 10).toString() + "." + (tenths % 10).toString();
}

export function run(input) {
  // SCHEMA: a plain object with exactly the own data property
  // `appliances`, which must be an array.
  if (!isPlainObject(input)) return fail("SCHEMA", null, null);
  const keys = Object.keys(input);
  if (keys.length !== 1 || !keys.includes("appliances") || !isOwnData(input, "appliances")) {
    return fail("SCHEMA", null, null);
  }
  const { appliances } = input;
  if (!Array.isArray(appliances)) return fail("SCHEMA", null, null);

  // Row count: 0 -> EMPTY, > 12 -> ROW_LIMIT.
  if (appliances.length === 0) return fail("EMPTY", "appliances", null);
  if (appliances.length > MAX_ROWS) return fail("ROW_LIMIT", "appliances", null);

  // Per-row validation, row 1 first, fields name, runningWatts,
  // startingWatts.
  const rows = [];
  for (let i = 0; i < appliances.length; i++) {
    const checked = validateRow(appliances[i], i + 1);
    if (checked.error) return checked.error;
    rows.push(checked.row);
  }

  // Duplicate names (compared as entered, case-sensitive, untrimmed):
  // the later duplicate row is the error.
  const seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    if (seen.has(rows[i].name)) {
      return fail("DUPLICATE_NAME", "name", i + 1);
    }
    seen.add(rows[i].name);
  }

  // Cross-field check, in row order: starting watts must not be below
  // running watts.
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].startingWatts < rows[i].runningWatts) {
      return fail("RANGE", "startingWatts", i + 1);
    }
  }

  const totalRunningW = rows.reduce((sum, r) => sum + r.runningWatts, 0);
  const outRows = rows.map((r) => ({
    name: r.name,
    runningWatts: r.runningWatts,
    startingWatts: r.startingWatts,
    surgeExtraW: r.startingWatts - r.runningWatts,
  }));
  let maxSurgeExtraW = 0;
  let largestSurgeRow = null;
  for (const r of outRows) {
    if (r.surgeExtraW > maxSurgeExtraW) {
      maxSurgeExtraW = r.surgeExtraW;
      largestSurgeRow = r.name;
    }
  }
  const peakW = totalRunningW + maxSurgeExtraW;
  // requiredRunningW = ceil(total x 5 / 4), integer arithmetic.
  const requiredRunningW = Math.floor((totalRunningW * 5 + 3) / 4);
  const requiredKvaTenths = kvaTenths(requiredRunningW);
  const peakKvaTenths = kvaTenths(peakW);
  const recommendedTenths = Math.max(requiredKvaTenths, peakKvaTenths);
  let recommendedSizeTenths;
  let oversize;
  if (recommendedTenths <= 200) {
    recommendedSizeTenths = RETAIL_TABLE_TENTHS.find((t) => t >= recommendedTenths);
    oversize = false;
  } else {
    // Above the table: ceil to 0.5 kVA (5 tenths) and flag oversize.
    recommendedSizeTenths = Math.floor((recommendedTenths + 4) / 5) * 5;
    oversize = true;
  }

  return {
    ok: true,
    result: {
      rows: outRows,
      totalRunningW,
      maxSurgeExtraW,
      peakW,
      largestSurgeRow,
      requiredRunningW,
      requiredKva: formatTenths(requiredKvaTenths),
      peakKva: formatTenths(peakKvaTenths),
      recommendedKva: formatTenths(recommendedTenths),
      recommendedSizeKva: formatTenths(recommendedSizeTenths),
      oversize,
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
