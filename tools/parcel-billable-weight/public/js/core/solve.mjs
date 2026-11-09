// Pure core for Parcel Billable Weight (spec-parcel-billable-weight-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{services:[{name,totalChargeG,pieces:[...]}]}}
//                | {status:"error", error:{code, path}}
// Piece: {name, volumeNumerator, volumeDenominator, wrapMm, reasons, chargeG}
//   reasons is a subset of ["LENGTH","WRAP","MASS"] in that fixed order.
//   chargeG (and a service totalChargeG) is null when any reason applies.
// Error codes: SIZE, SHAPE, TYPE, RANGE, DUPLICATE
// (SYNTAX is a form-level raw-text error and is produced by the app, not
// by solve). path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// table/array input order -> cross-field duplicates (parcels, then
// services, at the second occurrence).
//
// Algorithm (SPEC.md implementation, exact integer arithmetic):
//   sides sorted desc L>=M>=S; V = L*M*S; wrapMm = L + 2*(M+S).
//   Volume grams are the unreduced fraction V/divisor.
//   A non-empty limit is a violation only when strictly exceeded.
//   Otherwise num = max(actualG*divisor, V, minG*divisor) and
//   chargeG = ceil(num / (stepG*divisor)) * stepG (exact multiple stays).
//   A service total sums the per-piece chargeG values only when every
//   piece of that service is chargeable.
// Bounds: 12 parcels x 4 services = 48 combinations; single volume at
// most 27,000,000,000 mm^3; all products stay inside the safe integer
// range (the ceiling division is done with BigInt so it is exact).

export const MAX_JSON_BYTES = 65536;
export const MAX_PARCELS = 12;
export const MIN_PARCELS = 1;
export const MAX_SERVICES = 4;
export const MIN_SERVICES = 1;
export const MAX_NAME_CODE_POINTS = 24;
export const SIDE_MIN = 1;
export const SIDE_MAX = 3000;
export const ACTUAL_MIN = 1;
export const ACTUAL_MAX = 100000;
export const DIVISOR_MIN = 1;
export const DIVISOR_MAX = 100000;
export const STEP_MIN = 1;
export const STEP_MAX = 100000;
export const MIN_G_MIN = 0;
export const MIN_G_MAX = 100000;
export const MAX_LENGTH_MIN = 1;
export const MAX_LENGTH_MAX = 3000;
export const MAX_WRAP_MIN = 1;
export const MAX_WRAP_MAX = 15000;
export const MAX_ACTUAL_LIMIT_MIN = 1;
export const MAX_ACTUAL_LIMIT_MAX = 100000;
export const MAX_VOLUME_MM3 = 27000000000;

const ROOT_KEYS = ["parcels", "services"];
const PARCEL_KEYS = ["name", "sidesMm", "actualG"];
const SERVICE_KEYS = [
  "name",
  "divisor",
  "stepG",
  "minG",
  "maxLengthMm",
  "maxWrapMm",
  "maxActualG",
];

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
const NAME_REST = /[\p{L}\p{M}\p{N} _-]/u;

export function normalizeName(value) {
  if (typeof value !== "string") return { ok: false, code: "TYPE" };
  let name = value;
  // Trim only U+0020, not other whitespace.
  let start = 0;
  let end = name.length;
  while (start < end && name.charCodeAt(start) === 0x20) start += 1;
  while (end > start && name.charCodeAt(end - 1) === 0x20) end -= 1;
  name = name.slice(start, end).normalize("NFC");
  const codePoints = [...name];
  if (codePoints.length < 1 || codePoints.length > MAX_NAME_CODE_POINTS) {
    return { ok: false, code: "RANGE" };
  }
  if (!NAME_FIRST.test(codePoints[0])) return { ok: false, code: "RANGE" };
  for (let i = 1; i < codePoints.length; i += 1) {
    if (!NAME_REST.test(codePoints[i])) return { ok: false, code: "RANGE" };
  }
  return { ok: true, name };
}

// I[a,b]: a JSON number that is an integer (rejects -0, string numbers,
// fractions, booleans, null). Returns {ok:true} or {ok:false, code}
// with TYPE for a non-integer type and RANGE for an out-of-range integer.
function checkInteger(value, min, max) {
  if (typeof value !== "number" || !Number.isInteger(value) || Object.is(value, -0)) {
    return { ok: false, code: "TYPE" };
  }
  if (value < min || value > max) return { ok: false, code: "RANGE" };
  return { ok: true };
}

// A nullable integer limit: null is legal, otherwise an integer in range.
function checkNullableInteger(value, min, max) {
  if (value === null) return { ok: true };
  return checkInteger(value, min, max);
}

// Exact key set: an unknown key reports SHAPE at the object path, a
// missing key reports SHAPE at that known key's path.
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

function byteLengthUtf8(text) {
  return new TextEncoder().encode(text).length;
}

// Volume grams as tenths, half-up, computed with integers only:
// tenths = floor((20*n + d) / (2*d)) for the exact fraction n/d grams.
// Exported so the app formats the same value the tests pin.
export function volumeTenths(numerator, denominator) {
  return Math.floor((20 * numerator + denominator) / (2 * denominator));
}

export function solve(data) {
  if (!isPlainObject(data)) return err("TYPE", "");
  let jsonText;
  try {
    jsonText = JSON.stringify(data);
  } catch {
    return err("TYPE", "");
  }
  if (jsonText === undefined || byteLengthUtf8(jsonText) > MAX_JSON_BYTES) {
    return err("SIZE", "");
  }
  const shapeError = checkShape(data, ROOT_KEYS, "");
  if (shapeError) return shapeError;

  // --- parcels: field validation in table/array input order ---
  const { parcels, services } = data;
  if (!Array.isArray(parcels)) return err("TYPE", "/parcels");
  if (parcels.length < MIN_PARCELS || parcels.length > MAX_PARCELS) {
    return err("RANGE", "/parcels");
  }
  const parcelNames = [];
  for (let i = 0; i < parcels.length; i += 1) {
    const base = `/parcels/${i}`;
    const parcel = parcels[i];
    if (!isPlainObject(parcel)) return err("TYPE", base);
    const rowShape = checkShape(parcel, PARCEL_KEYS, base);
    if (rowShape) return rowShape;
    const name = normalizeName(parcel.name);
    if (!name.ok) return err(name.code, `${base}/name`);
    parcelNames.push(name.name);
    if (!Array.isArray(parcel.sidesMm)) return err("TYPE", `${base}/sidesMm`);
    if (parcel.sidesMm.length !== 3) return err("RANGE", `${base}/sidesMm`);
    for (let j = 0; j < 3; j += 1) {
      const side = checkInteger(parcel.sidesMm[j], SIDE_MIN, SIDE_MAX);
      if (!side.ok) return err(side.code, `${base}/sidesMm/${j}`);
    }
    const actual = checkInteger(parcel.actualG, ACTUAL_MIN, ACTUAL_MAX);
    if (!actual.ok) return err(actual.code, `${base}/actualG`);
  }

  // --- services: field validation in table/array input order ---
  if (!Array.isArray(services)) return err("TYPE", "/services");
  if (services.length < MIN_SERVICES || services.length > MAX_SERVICES) {
    return err("RANGE", "/services");
  }
  const serviceNames = [];
  for (let j = 0; j < services.length; j += 1) {
    const base = `/services/${j}`;
    const service = services[j];
    if (!isPlainObject(service)) return err("TYPE", base);
    const rowShape = checkShape(service, SERVICE_KEYS, base);
    if (rowShape) return rowShape;
    const name = normalizeName(service.name);
    if (!name.ok) return err(name.code, `${base}/name`);
    serviceNames.push(name.name);
    const divisor = checkInteger(service.divisor, DIVISOR_MIN, DIVISOR_MAX);
    if (!divisor.ok) return err(divisor.code, `${base}/divisor`);
    const step = checkInteger(service.stepG, STEP_MIN, STEP_MAX);
    if (!step.ok) return err(step.code, `${base}/stepG`);
    const min = checkInteger(service.minG, MIN_G_MIN, MIN_G_MAX);
    if (!min.ok) return err(min.code, `${base}/minG`);
    const maxLength = checkNullableInteger(
      service.maxLengthMm,
      MAX_LENGTH_MIN,
      MAX_LENGTH_MAX,
    );
    if (!maxLength.ok) return err(maxLength.code, `${base}/maxLengthMm`);
    const maxWrap = checkNullableInteger(
      service.maxWrapMm,
      MAX_WRAP_MIN,
      MAX_WRAP_MAX,
    );
    if (!maxWrap.ok) return err(maxWrap.code, `${base}/maxWrapMm`);
    const maxActual = checkNullableInteger(
      service.maxActualG,
      MAX_ACTUAL_LIMIT_MIN,
      MAX_ACTUAL_LIMIT_MAX,
    );
    if (!maxActual.ok) return err(maxActual.code, `${base}/maxActualG`);
  }

  // --- cross-field: duplicate names, at the second occurrence ---
  const seenParcels = new Set();
  for (let i = 0; i < parcelNames.length; i += 1) {
    if (seenParcels.has(parcelNames[i])) {
      return err("DUPLICATE", `/parcels/${i}/name`);
    }
    seenParcels.add(parcelNames[i]);
  }
  const seenServices = new Set();
  for (let j = 0; j < serviceNames.length; j += 1) {
    if (seenServices.has(serviceNames[j])) {
      return err("DUPLICATE", `/services/${j}/name`);
    }
    seenServices.add(serviceNames[j]);
  }

  // --- algorithm ---
  const resultServices = services.map((service, j) => {
    const divisor = BigInt(service.divisor);
    const stepDenominator = BigInt(service.stepG) * divisor;
    let totalChargeG = 0;
    let allChargeable = true;
    const pieces = parcels.map((parcel, i) => {
      const [L, M, S] = [...parcel.sidesMm].sort((a, b) => b - a);
      const volumeNumerator = L * M * S;
      const wrapMm = L + 2 * (M + S);
      const reasons = [];
      if (service.maxLengthMm !== null && L > service.maxLengthMm) {
        reasons.push("LENGTH");
      }
      if (service.maxWrapMm !== null && wrapMm > service.maxWrapMm) {
        reasons.push("WRAP");
      }
      if (service.maxActualG !== null && parcel.actualG > service.maxActualG) {
        reasons.push("MASS");
      }
      let chargeG = null;
      if (reasons.length === 0) {
        const actualPart = BigInt(parcel.actualG) * divisor;
        const volumePart = BigInt(volumeNumerator);
        const minPart = BigInt(service.minG) * divisor;
        let num = actualPart;
        if (volumePart > num) num = volumePart;
        if (minPart > num) num = minPart;
        chargeG = Number(
          ((num + stepDenominator - 1n) / stepDenominator) * BigInt(service.stepG),
        );
        totalChargeG += chargeG;
      } else {
        allChargeable = false;
      }
      return {
        name: parcelNames[i],
        volumeNumerator,
        volumeDenominator: service.divisor,
        wrapMm,
        reasons,
        chargeG,
      };
    });
    return {
      name: serviceNames[j],
      totalChargeG: allChargeable ? totalChargeG : null,
      pieces,
    };
  });

  return { status: "ok", result: { services: resultServices } };
}
