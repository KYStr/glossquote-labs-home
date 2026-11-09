// Pure core for Studio Visit Fee Breakpoints
// (SPEC spec-service-block-breakpoints-20261109 v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Input: { maxVisits: I[0,240], plans: [planA, planB] }.
// A plan has { name, type, baseMinor, included } plus, for
// type "progressive", { bands: [{ upTo: I[1,240] | null, rateMinor }] }
// (1-5 rows, only the last upTo is null, finite bounds strictly
// increasing), and for type "blocks",
// { blockSize: I[1,240], blockMinor }.
// Output: { status: "ok", result: { visits, spans } } where visits lists
// { count, aMinor, bMinor, relation } for count 0..maxVisits and spans
// merges adjacent counts with the same relation into maximal closed
// intervals { from, to, relation }.
// Errors: { status: "error", error: { code, path } } with a JSON Pointer
// path ("" for the root). Validation order: whole-input SIZE, then
// object SHAPE, then fields in table/array input order, then cross-field
// constraints (plan names unique, then BAND_ORDER per plan).

export const MAX_JSON_BYTES = 65536;
export const MAX_VISITS = 240;
export const MAX_PLANS = 2;
export const MAX_BANDS = 5;
export const MIN_BANDS = 1;
export const MAX_MINOR = 1000000;
export const MAX_INCLUDED = 240;
export const MAX_BLOCK_SIZE = 240;
export const MIN_BLOCK_SIZE = 1;

const PLAN_KEYS = new Set([
  "name",
  "type",
  "baseMinor",
  "included",
  "bands",
  "blockSize",
  "blockMinor",
]);
const BAND_KEYS = new Set(["upTo", "rateMinor"]);
// First character: Unicode letter or digit; the rest may also be Unicode
// marks, ASCII space, hyphen or underscore. The hyphen sits last in the
// class so it is literal, never a range.
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} _-]*$/u;

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSafeInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function error(code, path) {
  return { status: "error", error: { code, path } };
}

// Validate a short name N: trim U+0020 at both ends, NFC-normalize,
// 1-24 Unicode code points, first character a letter or digit.
// Returns { ok: true, name } or { ok: false, code: "TYPE" | "RANGE" }.
export function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  const trimmed = value.replace(/^ +/, "").replace(/ +$/, "").normalize("NFC");
  const length = [...trimmed].length;
  if (length < 1 || length > 24) return { ok: false, code: "RANGE" };
  if (!NAME_PATTERN.test(trimmed)) return { ok: false, code: "RANGE" };
  return { ok: true, name: trimmed };
}

function checkIntField(value, min, max, path) {
  if (Object.is(value, -0) || !isSafeInt(value)) return error("TYPE", path);
  if (value < min || value > max) return error("RANGE", path);
  return null;
}

// Validate one plan's fields in table order. Returns an error reply or
// null. Assumes plans[i] is a plain object whose type field is valid.
function validatePlan(plan, i) {
  const base = `/plans/${i}`;
  // Unknown keys are a shape error at the plan object.
  for (const key of Object.keys(plan)) {
    if (!PLAN_KEYS.has(key)) return error("SHAPE", base);
  }
  const name = normalizeName(plan.name);
  if (!name.ok) return error(name.code, `${base}/name`);
  if (plan.type !== "progressive" && plan.type !== "blocks") {
    return error("ENUM", `${base}/type`);
  }
  const baseErr = checkIntField(plan.baseMinor, 0, MAX_MINOR, `${base}/baseMinor`);
  if (baseErr) return baseErr;
  const includedErr = checkIntField(
    plan.included,
    0,
    MAX_INCLUDED,
    `${base}/included`,
  );
  if (includedErr) return includedErr;
  // Each type only accepts its own extra fields.
  if (plan.type === "progressive") {
    if ("blockSize" in plan || "blockMinor" in plan) {
      return error("SHAPE", base);
    }
    if (!("bands" in plan)) return error("SHAPE", `${base}/bands`);
    const bands = plan.bands;
    if (!Array.isArray(bands)) return error("TYPE", `${base}/bands`);
    if (bands.length < MIN_BANDS || bands.length > MAX_BANDS) {
      return error("RANGE", `${base}/bands`);
    }
    for (let j = 0; j < bands.length; j += 1) {
      const band = bands[j];
      const bandPath = `${base}/bands/${j}`;
      if (!isPlainObject(band)) return error("TYPE", bandPath);
      for (const key of Object.keys(band)) {
        if (!BAND_KEYS.has(key)) return error("SHAPE", bandPath);
      }
      if (!("upTo" in band)) return error("SHAPE", `${bandPath}/upTo`);
      if (!("rateMinor" in band)) return error("SHAPE", `${bandPath}/rateMinor`);
      if (band.upTo !== null) {
        const upToErr = checkIntField(band.upTo, 1, MAX_VISITS, `${bandPath}/upTo`);
        if (upToErr) return upToErr;
      }
      const rateErr = checkIntField(
        band.rateMinor,
        0,
        MAX_MINOR,
        `${bandPath}/rateMinor`,
      );
      if (rateErr) return rateErr;
    }
  } else {
    if ("bands" in plan) return error("SHAPE", base);
    if (!("blockSize" in plan)) return error("SHAPE", `${base}/blockSize`);
    if (!("blockMinor" in plan)) return error("SHAPE", `${base}/blockMinor`);
    const sizeErr = checkIntField(
      plan.blockSize,
      MIN_BLOCK_SIZE,
      MAX_BLOCK_SIZE,
      `${base}/blockSize`,
    );
    if (sizeErr) return sizeErr;
    const minorErr = checkIntField(
      plan.blockMinor,
      0,
      MAX_MINOR,
      `${base}/blockMinor`,
    );
    if (minorErr) return minorErr;
  }
  return null;
}

// Validate the whole input. Returns { ok: true, data } or
// { ok: false, error: { code, path } }.
export function validate(data) {
  let jsonBytes;
  try {
    jsonBytes = new TextEncoder().encode(JSON.stringify(data)).length;
  } catch {
    return { ok: false, error: { code: "SHAPE", path: "" } };
  }
  if (jsonBytes > MAX_JSON_BYTES) {
    return { ok: false, error: { code: "SIZE", path: "" } };
  }
  if (!isPlainObject(data)) {
    return { ok: false, error: { code: "SHAPE", path: "" } };
  }
  for (const key of Object.keys(data)) {
    if (key !== "maxVisits" && key !== "plans") {
      return { ok: false, error: { code: "SHAPE", path: "" } };
    }
  }
  if (!("maxVisits" in data)) {
    return { ok: false, error: { code: "SHAPE", path: "/maxVisits" } };
  }
  if (!("plans" in data)) {
    return { ok: false, error: { code: "SHAPE", path: "/plans" } };
  }
  const maxErr = checkIntField(data.maxVisits, 0, MAX_VISITS, "/maxVisits");
  if (maxErr) return { ok: false, error: maxErr.error };
  if (!Array.isArray(data.plans)) {
    return { ok: false, error: { code: "TYPE", path: "/plans" } };
  }
  if (data.plans.length !== MAX_PLANS) {
    return { ok: false, error: { code: "RANGE", path: "/plans" } };
  }
  for (let i = 0; i < data.plans.length; i += 1) {
    const plan = data.plans[i];
    if (!isPlainObject(plan)) {
      return { ok: false, error: { code: "TYPE", path: `/plans/${i}` } };
    }
    const planErr = validatePlan(plan, i);
    if (planErr) return { ok: false, error: planErr.error };
  }
  // Cross-field constraints, after all field types are legal: plan
  // names unique first, then band order per plan.
  const nameA = normalizeName(data.plans[0].name).name;
  const nameB = normalizeName(data.plans[1].name).name;
  if (nameA === nameB) {
    return { ok: false, error: { code: "DUPLICATE", path: "/plans/1/name" } };
  }
  for (let i = 0; i < data.plans.length; i += 1) {
    const plan = data.plans[i];
    if (plan.type !== "progressive") continue;
    const bands = plan.bands;
    let prev = 0;
    for (let j = 0; j < bands.length; j += 1) {
      const upTo = bands[j].upTo;
      const path = `/plans/${i}/bands/${j}/upTo`;
      if (j === bands.length - 1) {
        if (upTo !== null) {
          return { ok: false, error: { code: "BAND_ORDER", path } };
        }
      } else if (upTo === null) {
        return { ok: false, error: { code: "BAND_ORDER", path } };
      } else if (upTo <= prev) {
        return { ok: false, error: { code: "BAND_ORDER", path } };
      }
      if (upTo !== null) prev = upTo;
    }
  }
  return { ok: true, data };
}

// Price of one plan at v visits, in minor units (integer arithmetic).
export function planCost(plan, v) {
  const x = Math.max(0, v - plan.included);
  if (plan.type === "blocks") {
    if (x === 0) return plan.baseMinor;
    return plan.baseMinor + Math.ceil(x / plan.blockSize) * plan.blockMinor;
  }
  let total = plan.baseMinor;
  let prev = 0;
  for (const band of plan.bands) {
    const bound = band.upTo === null ? x : band.upTo;
    const n = Math.max(0, Math.min(x, bound) - prev);
    total += n * band.rateMinor;
    prev = bound;
  }
  return total;
}

export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return { status: "error", error: checked.error };
  const { maxVisits, plans } = checked.data;
  const visits = [];
  for (let v = 0; v <= maxVisits; v += 1) {
    const aMinor = planCost(plans[0], v);
    const bMinor = planCost(plans[1], v);
    const relation = aMinor < bMinor ? "A" : bMinor < aMinor ? "B" : "equal";
    visits.push({ count: v, aMinor, bMinor, relation });
  }
  const spans = [];
  for (const visit of visits) {
    const last = spans[spans.length - 1];
    if (last && last.relation === visit.relation && last.to === visit.count - 1) {
      last.to = visit.count;
    } else {
      spans.push({ from: visit.count, to: visit.count, relation: visit.relation });
    }
  }
  return { status: "ok", result: { visits, spans } };
}
