// Pure core for the Shared Electricity Split.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-shared-electricity-split-20261109): a known total bill is split
// across 2-10 rooms by submeter usage; common-area usage (total meter
// delta minus the rooms' sum) is shared equally first by folding it into
// each room's weight, and amounts are allocated with the largest
// remainder method so they always sum exactly to the total bill.
// All arithmetic is exact integer math: readings are tenths of a kWh and
// amount weights use BigInt. No floating point anywhere.

export const REPORT_FILENAME = "shared-electricity-split-report.json";
export const REPORT_BYTE_LIMIT = 2097152;
export const MAX_INPUT_BYTES = 65536;
export const MAX_BILL_TWD = 99999999;
export const MAX_READING_TENTHS = 9999999; // 999,999.9 kWh
export const MIN_ROOMS = 2;
export const MAX_ROOMS = 10;
export const MAX_NAME_CODE_POINTS = 24;

export const DEFAULTS = {
  totalBill: "",
  totalDelta: "",
  rooms: [
    { name: "", start: "", end: "" },
    { name: "", start: "", end: "" },
  ],
};

// The first fixture in fixtures.json ("proportional-basic"); "Load
// example" fills this in.
export const EXAMPLE = {
  totalBill: "3000",
  totalDelta: "",
  rooms: [
    { name: "101房", start: "100", end: "220" },
    { name: "102房", start: "50", end: "110" },
    { name: "103房", start: "0", end: "20" },
  ],
};

const INTEGER_PATTERN = /^(0|[1-9][0-9]*)$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;
const NAME_PATTERN = /^[\p{L}\p{Nd}][\p{L}\p{M}\p{Nd} _-]*$/u;
const RAW_LIMIT = 16;
const NAME_RAW_LIMIT = 64;

function error(code, field, row) {
  return { ok: false, error: { code, field, row } };
}

function schemaError(row = null) {
  return error("SCHEMA", null, row);
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

// NFC, then strip leading/trailing U+0020 only (SPEC-pinned).
function normalizeName(raw) {
  return raw.normalize("NFC").replace(/^ +| +$/g, "");
}

// Parse a grammar-valid decimal string (at most one fraction digit) into
// tenths, exactly.
function parseTenths(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return Number(raw) * 10;
  return Number(raw.slice(0, dot)) * 10 + Number(raw.slice(dot + 1));
}

// Validate a reading-like field (totalDelta, start, end): capacity,
// surrogate, empty, grammar, range. Returns { error } or { tenths }.
function validateReading(field, row, raw) {
  if (raw.length > RAW_LIMIT) return { error: error("INPUT_LIMIT", field, row).error };
  if (hasUnpairedSurrogate(raw)) return { error: error("UNICODE", field, row).error };
  if (raw === "") return { error: error("EMPTY", field, row).error };
  if (!DECIMAL_PATTERN.test(raw)) return { error: error("DECIMAL_FORMAT", field, row).error };
  const tenths = parseTenths(raw);
  if (tenths > MAX_READING_TENTHS) return { error: error("RANGE", field, row).error };
  return { tenths };
}

// Validate the whole input in the SPEC's fixed order and return either
// the first error or the parsed values. Only own data properties are
// read; unknown/missing/wrongly typed fields and accessors are SCHEMA.
export function validateInput(input) {
  // Step 0: serialized size limit.
  let serialized;
  try {
    serialized = JSON.stringify(input);
  } catch {
    return schemaError();
  }
  if (typeof serialized !== "string") return schemaError();
  if (new TextEncoder().encode(serialized).length > MAX_INPUT_BYTES) {
    return error("INPUT_LIMIT", null, null);
  }

  // Step 1: shape.
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return schemaError();
  }
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return schemaError();
  }
  for (const key of keys) {
    if (key !== "totalBill" && key !== "totalDelta" && key !== "rooms") {
      return schemaError();
    }
  }
  if (!Object.prototype.hasOwnProperty.call(input, "totalBill")) return schemaError();
  if (!Object.prototype.hasOwnProperty.call(input, "rooms")) return schemaError();
  let totalBillRaw;
  let totalDeltaRaw = "";
  let hasTotalDelta = false;
  let roomsRaw;
  try {
    totalBillRaw = input.totalBill;
    if (Object.prototype.hasOwnProperty.call(input, "totalDelta")) {
      totalDeltaRaw = input.totalDelta;
      hasTotalDelta = true;
    }
    roomsRaw = input.rooms;
  } catch {
    return schemaError();
  }
  if (typeof totalBillRaw !== "string") return schemaError();
  if (hasTotalDelta && typeof totalDeltaRaw !== "string") return schemaError();
  if (!Array.isArray(roomsRaw)) return schemaError();
  const roomRaws = [];
  for (let i = 0; i < roomsRaw.length; i += 1) {
    const room = roomsRaw[i];
    if (room === null || typeof room !== "object" || Array.isArray(room)) {
      return schemaError(i + 1);
    }
    let roomKeys;
    let name;
    let start;
    let end;
    try {
      roomKeys = Object.keys(room);
      name = room.name;
      start = room.start;
      end = room.end;
    } catch {
      return schemaError(i + 1);
    }
    if (
      roomKeys.length !== 3 ||
      !roomKeys.includes("name") ||
      !roomKeys.includes("start") ||
      !roomKeys.includes("end") ||
      typeof name !== "string" ||
      typeof start !== "string" ||
      typeof end !== "string"
    ) {
      return schemaError(i + 1);
    }
    roomRaws.push({ name, start, end });
  }

  // Step 2: totalBill.
  if (totalBillRaw.length > RAW_LIMIT) return error("INPUT_LIMIT", "totalBill", null);
  if (hasUnpairedSurrogate(totalBillRaw)) return error("UNICODE", "totalBill", null);
  if (totalBillRaw === "") return error("EMPTY", "totalBill", null);
  if (!INTEGER_PATTERN.test(totalBillRaw)) return error("INTEGER_FORMAT", "totalBill", null);
  const totalBill = Number(totalBillRaw);
  if (totalBill > MAX_BILL_TWD) return error("RANGE", "totalBill", null);

  // Step 3: totalDelta, only when provided and non-empty.
  let totalDeltaTenths = null;
  if (hasTotalDelta && totalDeltaRaw !== "") {
    const checked = validateReading("totalDelta", null, totalDeltaRaw);
    if (checked.error) return { ok: false, error: checked.error };
    totalDeltaTenths = checked.tenths;
  }

  // Step 4: room count.
  if (roomRaws.length < MIN_ROOMS || roomRaws.length > MAX_ROOMS) {
    return error("ROOM_COUNT", "rooms", null);
  }

  // Step 5: per-room fields, in input order: name, then start, then end.
  const rooms = [];
  for (let i = 0; i < roomRaws.length; i += 1) {
    const row = i + 1;
    const raw = roomRaws[i];
    if (raw.name.length > NAME_RAW_LIMIT) return error("INPUT_LIMIT", "name", row);
    if (hasUnpairedSurrogate(raw.name)) return error("UNICODE", "name", row);
    const name = normalizeName(raw.name);
    if (name === "") return error("EMPTY", "name", row);
    if ([...name].length > MAX_NAME_CODE_POINTS) return error("RANGE", "name", row);
    if (!NAME_PATTERN.test(name)) return error("NAME_CHARS", "name", row);
    const startChecked = validateReading("start", row, raw.start);
    if (startChecked.error) return { ok: false, error: startChecked.error };
    const endChecked = validateReading("end", row, raw.end);
    if (endChecked.error) return { ok: false, error: endChecked.error };
    rooms.push({ name, startTenths: startChecked.tenths, endTenths: endChecked.tenths });
  }

  // Step 6: duplicate normalized names; the second occurrence is blamed.
  const seen = new Set();
  for (let i = 0; i < rooms.length; i += 1) {
    if (seen.has(rooms[i].name)) return error("DUPLICATE", "name", i + 1);
    seen.add(rooms[i].name);
  }

  // Step 7: reading regression, per room in order.
  for (let i = 0; i < rooms.length; i += 1) {
    if (rooms[i].endTenths < rooms[i].startTenths) {
      return error("READING_REGRESSION", "end", i + 1);
    }
  }

  // Step 8: rooms must not exceed the total meter delta.
  const totalUsageTenths = rooms.reduce((sum, room) => sum + (room.endTenths - room.startTenths), 0);
  if (totalDeltaTenths !== null && totalUsageTenths > totalDeltaTenths) {
    return error("TOTAL_DELTA_UNDER", "totalDelta", null);
  }

  return { ok: true, values: { totalBill, totalDeltaTenths, rooms, totalUsageTenths } };
}

// roundHalfUp(a, b) = floor((2a + b) / (2b)) for a >= 0, b > 0, computed
// in BigInt so no rounding is ever approximate.
function roundHalfUp(a, b) {
  const numerator = 2n * BigInt(a) + BigInt(b);
  const denominator = 2n * BigInt(b);
  return Number(numerator / denominator);
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { totalBill, totalDeltaTenths, rooms, totalUsageTenths } = validated.values;
  const count = rooms.length;

  const usages = rooms.map((room) => room.endTenths - room.startTenths);
  let commonTenths = null;
  let weights;
  if (totalDeltaTenths !== null) {
    commonTenths = totalDeltaTenths - totalUsageTenths;
    // Common usage is shared equally first: each room's weight is its own
    // usage scaled by N plus the full common amount, i.e. each room gets
    // one N-th of the common usage before the proportional split.
    weights = usages.map((usage) => usage * count + commonTenths);
  } else {
    weights = usages.slice();
  }
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let amounts;
  let equalSplitFallback = false;
  if (totalWeight > 0) {
    const bill = BigInt(totalBill);
    const totalWeightBig = BigInt(totalWeight);
    const parts = weights.map((weight) => {
      const numerator = bill * BigInt(weight);
      return { floor: numerator / totalWeightBig, remainder: numerator % totalWeightBig };
    });
    const floorSum = parts.reduce((sum, part) => sum + part.floor, 0n);
    const leftover = Number(bill - floorSum); // 0 <= leftover < count
    const order = parts
      .map((part, index) => ({ index, remainder: part.remainder }))
      .sort((a, b) => {
        if (a.remainder !== b.remainder) return a.remainder > b.remainder ? -1 : 1;
        return a.index - b.index;
      });
    amounts = parts.map((part) => Number(part.floor));
    for (let i = 0; i < leftover; i += 1) {
      amounts[order[i].index] += 1;
    }
  } else {
    equalSplitFallback = true;
    const base = Math.floor(totalBill / count);
    const extra = totalBill % count;
    amounts = rooms.map((unused, index) => base + (index < extra ? 1 : 0));
  }

  const resultRooms = rooms.map((room, index) => ({
    name: room.name,
    usageTenths: usages[index],
    commonShareTenths: commonTenths === null ? null : roundHalfUp(commonTenths, count),
    billableTenths:
      commonTenths === null ? usages[index] : roundHalfUp(weights[index], count),
    sharePercentTenths: equalSplitFallback
      ? roundHalfUp(1000, count)
      : roundHalfUp(weights[index] * 1000, totalWeight),
    amountTwd: amounts[index],
  }));

  return {
    ok: true,
    result: {
      rooms: resultRooms,
      totalUsageTenths,
      commonTenths,
      totalDeltaTenths,
      totalAmountTwd: totalBill,
      equalSplitFallback,
    },
  };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON
// calls on the values.
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
// one trailing LF, UTF-8, no BOM. Over the 2,097,152-byte report limit
// the result is OUTPUT_LIMIT and no artifact is produced.
export function serializeReport(result) {
  const text = `${canonicalJson(result)}\n`;
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > REPORT_BYTE_LIMIT) {
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } };
  }
  return { ok: true, text, bytes };
}
