// Pure core for the TV Viewing Distance Calculator.
// No DOM, network, or storage access. Implements SPEC.md
// (spec-tv-viewing-distance-20261109): fixed 16:9 geometry, THX/SMPTE
// rule-of-thumb multipliers, exact BigInt decimal arithmetic for the
// distances and the inverse inches, float only for the irrational
// screen width/height (16/sqrt(337), 9/sqrt(337)) as the SPEC pins.

export const FIELDS = ["diagonalIn", "roomDistanceCm", "resolution"];

// Numeric ranges in whole units (compared exactly in tenths internally).
export const RANGES = {
  diagonalIn: [10, 120],
  roomDistanceCm: [30, 1500],
};

export const RESOLUTIONS = ["FHD", "UHD4K"];

// Distance multipliers in tenths: minimum depends on the resolution
// (FHD 1.2, UHD 4K 1.0); idealLow 1.5, idealHigh 2.0, maximum 2.5.
export const MULTIPLIERS_TENTHS = {
  FHD: { minimum: 12, idealLow: 15, idealHigh: 20, maximum: 25 },
  UHD4K: { minimum: 10, idealLow: 15, idealHigh: 20, maximum: 25 },
};

export const DEFAULTS = {
  diagonalIn: "55",
  roomDistanceCm: "",
  resolution: "FHD",
};

// The first fixture in fixtures.json; "Load example" fills this in.
export const EXAMPLE = {
  diagonalIn: "55",
  roomDistanceCm: "",
  resolution: "FHD",
};

export const MAX_RAW_UNITS = 8;
export const REPORT_BYTE_LIMIT = 2097152;
export const REPORT_FILENAME = "tv-viewing-distance-report.json";

const DECIMAL_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9])?$/;

function fail(code, field, path) {
  return { ok: false, error: { code, field, path } };
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

// Parse a grammar-valid decimal string (at most one decimal place) into
// exact tenths as a BigInt: "55" -> 550n, "54.6" -> 546n.
function parseTenths(raw) {
  const dot = raw.indexOf(".");
  if (dot === -1) return BigInt(raw) * 10n;
  const whole = raw.slice(0, dot);
  const frac = raw.slice(dot + 1);
  return BigInt(whole) * 10n + BigInt(frac);
}

// Half-up division for non-negative BigInts: floor((2n + d) / 2d).
function halfUpDiv(numerator, denominator) {
  return (2n * numerator + denominator) / (2n * denominator);
}

// Validate the whole input object per the SPEC's fixed order:
// 0. structure (plain object, no unknown fields, own data string values)
// 1. per field in FIELDS order: capacity, unpaired surrogate, then
//    grammar/range for the numeric fields or ENUM for resolution
//    (a missing resolution defaults to "FHD"; a present empty string is
//    ENUM; missing numeric fields count as not filled)
// 2. cross-field: both numeric fields empty -> EMPTY at "/"
export function validateInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return fail("SCHEMA", null, null);
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) {
    return fail("SCHEMA", null, null);
  }
  let keys;
  try {
    keys = Object.keys(input);
  } catch {
    return fail("SCHEMA", null, null);
  }
  for (const key of keys) {
    if (!FIELDS.includes(key)) return fail("SCHEMA", null, `/${key}`);
  }
  const values = {};
  for (const field of FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      values[field] = undefined;
      continue;
    }
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(input, field);
    } catch {
      return fail("SCHEMA", field, `/${field}`);
    }
    if (descriptor === undefined || !("value" in descriptor)) {
      return fail("SCHEMA", field, `/${field}`);
    }
    if (typeof descriptor.value !== "string") {
      return fail("SCHEMA", field, `/${field}`);
    }
    values[field] = descriptor.value;
  }
  for (const field of FIELDS) {
    let raw = values[field];
    if (raw === undefined) raw = field === "resolution" ? "FHD" : "";
    if (raw.length > MAX_RAW_UNITS) return fail("INPUT_LIMIT", field, `/${field}`);
    if (hasUnpairedSurrogate(raw)) return fail("UNICODE", field, `/${field}`);
    if (field === "resolution") {
      if (!RESOLUTIONS.includes(raw)) return fail("ENUM", field, `/${field}`);
    } else if (raw !== "") {
      if (!DECIMAL_PATTERN.test(raw)) return fail("DECIMAL_FORMAT", field, `/${field}`);
      const tenths = parseTenths(raw);
      const [min, max] = RANGES[field];
      if (tenths < BigInt(min) * 10n || tenths > BigInt(max) * 10n) {
        return fail("RANGE", field, `/${field}`);
      }
    }
    values[field] = raw;
  }
  if (values.diagonalIn === "" && values.roomDistanceCm === "") {
    return fail("EMPTY", null, "/");
  }
  return { ok: true, values };
}

// Screen width/height: the only float step, using the SPEC's exact
// expressions d * 2.54 * 16 / sqrt(337) and d * 2.54 * 9 / sqrt(337),
// rounded half-up to 0.1 cm. All fixture values sit far from a tie.
function screenSize(diagonal) {
  const roundHalfUp1 = (x) => Math.floor(x * 10 + 0.5) / 10;
  return {
    widthCm: roundHalfUp1(diagonal * 2.54 * 16 / Math.sqrt(337)),
    heightCm: roundHalfUp1(diagonal * 2.54 * 9 / Math.sqrt(337)),
  };
}

export function run(input) {
  const validated = validateInput(input);
  if (!validated.ok) return validated;
  const { diagonalIn, roomDistanceCm, resolution } = validated.values;
  const multipliers = MULTIPLIERS_TENTHS[resolution];

  if (diagonalIn !== "") {
    const d10 = parseTenths(diagonalIn);
    // Exact distance in cm: d10/10 * mult10/10 * 254/100 = N / 10000.
    const exact = {};
    const distances = {};
    for (const name of ["minimum", "idealLow", "idealHigh", "maximum"]) {
      const numerator = d10 * BigInt(multipliers[name]) * 254n;
      exact[name] = numerator;
      const cm = halfUpDiv(numerator, 10000n);
      // m is the exact cm / 100 rounded half-up to 2 decimals, which is
      // the same integer as the rounded cm, divided by 100.
      distances[name] = { cm: Number(cm), m: Number(cm) / 100 };
    }
    let fit = null;
    if (roomDistanceCm !== "") {
      const r10 = parseTenths(roomDistanceCm);
      // Compare R (= r10/10 cm) against N/10000 cm on a common scale.
      const scaled = r10 * 1000n;
      let status;
      if (scaled < exact.minimum) status = "TOO_CLOSE";
      else if (scaled < exact.idealLow) status = "NEAR";
      else if (scaled <= exact.idealHigh) status = "IDEAL";
      else if (scaled <= exact.maximum) status = "FAR";
      else status = "TOO_FAR";
      fit = { status, roomDistanceCm: Number(r10) / 10 };
    }
    return {
      ok: true,
      result: {
        mode: "diagonal",
        diagonalIn: Number(d10) / 10,
        resolution,
        screen: screenSize(Number(d10) / 10),
        distances,
        fit,
      },
    };
  }

  // Inverse mode: R / 2.54 is the diagonal in inches (exact rational
  // r10 * 50 / 127). Each output divides by a multiplier and rounds
  // half-up to 0.1 inch, all in BigInt: tenths = halfUp(r10*500 /
  // (127 * mult10)).
  const r10 = parseTenths(roomDistanceCm);
  const inverseTenths = (mult10) =>
    Number(halfUpDiv(r10 * 500n, 127n * BigInt(mult10))) / 10;
  return {
    ok: true,
    result: {
      mode: "distance",
      roomDistanceCm: Number(r10) / 10,
      resolution,
      diagonalRangeIn: { low: inverseTenths(20), high: inverseTenths(15) },
      diagonalMaxIn: inverseTenths(multipliers.minimum),
      diagonalMinIn: inverseTenths(25),
    },
  };
}

// Canonical compact JSON: object own keys sorted by UTF-16 code units,
// recursively; array order preserved; strings JSON-escaped; no toJSON calls.
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
    return { ok: false, error: { code: "OUTPUT_LIMIT", field: null, path: null } };
  }
  return { ok: true, text, bytes };
}
