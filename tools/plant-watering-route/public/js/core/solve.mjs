// Pure core for Plant Watering Route (spec-plant-watering-route-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{plants:[{name,leftMl}],
//                  refills:[{before,addMl}], blockedAt, missingMl}}
//                | {status:"error", error:{code, path}}
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE
// (SYNTAX is a form-level raw-text error and is produced by the app, not
// by solve). path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// table/array input order (duplicates detected at the second occurrence).
//
// Algorithm (SPEC.md implementation 1-4): start with a full can. Scan
// forward from the segment's first plant, accumulating the amount needed
// to water each plant completely. Before checking a plant's requirement,
// record any reachable tap point (the tap must be at a plant later than
// the segment's first plant). At the first plant that does not fit, take
// the farthest recorded tap: settle the plants up to the one before it,
// refill the amount used in this segment so far, and restart the next
// segment with a full can at that tap. With no reachable tap, keep the
// completable prefix and report blockedAt and missingMl. Because every
// amount is positive, the farthest reachable tap dominates any earlier
// one, so this greedy scan uses the fewest refill stops when the route
// can be completed.

export const MAX_JSON_BYTES = 65536;
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 20000;
export const AMOUNT_MIN = 1;
export const AMOUNT_MAX = 20000;
export const MIN_PLANTS = 1;
export const MAX_PLANTS = 60;
export const MAX_NAME_CODE_POINTS = 24;

const ROOT_KEYS = ["capacityMl", "plants"];
const PLANT_KEYS = ["name", "amountMl", "tapBefore"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function err(code, path) {
  return { status: "error", error: { code, path } };
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

// N: short name. Trim U+0020 on both ends, NFC-normalize, 1-24 Unicode
// code points, first char a Unicode letter or digit, the rest letters,
// combining marks, digits, ASCII space, hyphen or underscore.
// Returns {ok:true, name} or {ok:false, code} (TYPE for non-string,
// RANGE for length / character violations).
const NAME_FIRST = /[\p{L}\p{N}]/u;
const NAME_REST = /[\p{L}\p{M}\p{N} \-_]/u;

export function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  let name = value;
  // Trim only U+0020, not other whitespace.
  let start = 0;
  let end = name.length;
  while (start < end && name.charCodeAt(start) === 0x20) start += 1;
  while (end > start && name.charCodeAt(end - 1) === 0x20) end -= 1;
  name = name.slice(start, end).normalize("NFC");
  const codePoints = [...name].length;
  if (codePoints < 1 || codePoints > MAX_NAME_CODE_POINTS) {
    return { ok: false, code: "RANGE" };
  }
  const chars = [...name];
  if (!NAME_FIRST.test(chars[0])) return { ok: false, code: "RANGE" };
  for (let i = 1; i < chars.length; i += 1) {
    if (!NAME_REST.test(chars[i])) return { ok: false, code: "RANGE" };
  }
  return { ok: true, name };
}

// I[a,b]: JavaScript safe integer within endpoints. Rejects -0, string
// numbers and non-integers with TYPE; out-of-range integers with RANGE.
function checkInteger(value, min, max) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Object.is(value, -0)
  ) {
    return { ok: false, code: "TYPE" };
  }
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return { ok: false, code: "RANGE" };
  }
  return { ok: true };
}

function checkShape(object, keys, path) {
  for (const key of Object.keys(object)) {
    if (!keys.includes(key)) return err("SHAPE", path);
  }
  for (const key of keys) {
    if (!hasOwn(object, key)) {
      return err("SHAPE", path === "" ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

// Full validation. Returns {ok:true, data} with normalized names, or
// {ok:false, reply} where reply is the error envelope.
export function validate(data) {
  if (!isPlainObject(data)) return { ok: false, reply: err("TYPE", "") };

  // SIZE first (measured on the JSON serialization of the input).
  let serialized;
  try {
    serialized = JSON.stringify(data);
  } catch {
    return { ok: false, reply: err("TYPE", "") };
  }
  if (serialized === undefined) return { ok: false, reply: err("TYPE", "") };
  if (new TextEncoder().encode(serialized).length > MAX_JSON_BYTES) {
    return { ok: false, reply: err("SIZE", "") };
  }

  const shapeError = checkShape(data, ROOT_KEYS, "");
  if (shapeError) return { ok: false, reply: shapeError };

  const capacity = checkInteger(data.capacityMl, CAPACITY_MIN, CAPACITY_MAX);
  if (!capacity.ok) {
    return { ok: false, reply: err(capacity.code, "/capacityMl") };
  }
  if (!Array.isArray(data.plants)) {
    return { ok: false, reply: err("TYPE", "/plants") };
  }
  if (data.plants.length < MIN_PLANTS || data.plants.length > MAX_PLANTS) {
    return { ok: false, reply: err("RANGE", "/plants") };
  }

  const plants = [];
  const plantNames = new Map();
  for (let i = 0; i < data.plants.length; i += 1) {
    const row = data.plants[i];
    const base = `/plants/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, PLANT_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) {
      return { ok: false, reply: err(name.code, `${base}/name`) };
    }
    if (plantNames.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    plantNames.set(name.name, true);
    const amount = checkInteger(row.amountMl, AMOUNT_MIN, AMOUNT_MAX);
    if (!amount.ok) {
      return { ok: false, reply: err(amount.code, `${base}/amountMl`) };
    }
    if (typeof row.tapBefore !== "boolean") {
      return { ok: false, reply: err("TYPE", `${base}/tapBefore`) };
    }
    plants.push({
      name: name.name,
      amountMl: row.amountMl,
      tapBefore: row.tapBefore,
    });
  }

  return { ok: true, data: { capacityMl: data.capacityMl, plants } };
}

// Full entry point: validate, then plan the refill stops. Returns the
// exact SPEC envelope.
export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  const { capacityMl, plants } = checked.data;

  const plantsOut = [];
  const refills = [];
  let left = capacityMl;
  let segStart = 0; // index of the first plant in the current segment
  let segUsed = 0; // millilitres used in the current segment
  let farthestTap = null; // {index, usedBefore} or null
  let i = 0;

  while (i < plants.length) {
    const plant = plants[i];
    // Before checking this plant's requirement, record any reachable
    // tap point. The tap must be at a plant later than the segment's
    // first plant, so a tap at the departure point or at a just-refilled
    // position is never listed as a duplicate refill.
    if (i > segStart && plant.tapBefore) {
      farthestTap = { index: i, usedBefore: segUsed };
    }
    if (plant.amountMl <= left) {
      left -= plant.amountMl;
      segUsed += plant.amountMl;
      plantsOut.push({ name: plant.name, leftMl: left });
      i += 1;
    } else if (farthestTap !== null) {
      // First over-capacity plant in this segment, with a reachable tap:
      // settle up to the plant before the farthest tap, refill the
      // amount used in this segment so far, and restart with a full can
      // at that tap. Plants watered past the tap in the lookahead scan
      // are re-watered from the full can.
      const { index, usedBefore } = farthestTap;
      plantsOut.length = index;
      refills.push({ before: plants[index].name, addMl: usedBefore });
      segStart = index;
      segUsed = 0;
      left = capacityMl;
      farthestTap = null;
      i = index;
    } else {
      // No reachable later tap before the first over-capacity plant:
      // keep the completable prefix and report the first blocked plant.
      return {
        status: "ok",
        result: {
          plants: plantsOut,
          refills,
          blockedAt: plant.name,
          missingMl: plant.amountMl - left,
        },
      };
    }
  }

  return {
    status: "ok",
    result: { plants: plantsOut, refills, blockedAt: null, missingMl: 0 },
  };
}
