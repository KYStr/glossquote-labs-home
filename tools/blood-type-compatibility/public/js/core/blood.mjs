// Blood Type Compatibility — pure core logic (no DOM, network or storage).
//
// The two compatibility matrices below are vendored verbatim as literal data
// from the fixed spec (docs/specs/blood-type-compatibility/, candidate
// 27343e5d448ef476ba11f09697a8c5f9b30a77e0, spec PR #172). Receive-from lists
// are derived by transposing the donate matrix — there is no second table.

export const TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];

export const MODES = ["single", "pair"];

export const TYPE_FIELDS = ["bloodType", "donor", "recipient"];

// Red-cell compatibility: donor type -> recipient types it can give to,
// in canonical type order. Row sums: 8, 4, 4, 2, 4, 2, 2, 1 = 27 cells.
export const RBC_MATRIX = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
};

// Plasma compatibility by ABO group only (the Rh factor is ignored):
// donor ABO group -> recipient ABO groups it can give to. 9 of 16 cells.
export const PLASMA_MATRIX = {
  O: ["O"],
  A: ["A", "O"],
  B: ["B", "O"],
  AB: ["AB", "A", "B", "O"],
};

// Fixed badge ids, in their fixed display order.
export const BADGES = [
  "rbc-universal-donor",
  "rbc-universal-recipient",
  "plasma-universal-donor",
  "plasma-universal-recipient",
];

export const DEFAULTS = { mode: "single", bloodType: "" };

export const EXAMPLE = { bloodType: "O-", mode: "single" };

// Raw capacity of every string field, in UTF-16 code units.
export const MAX_RAW_UNITS = 8;

const INPUT_KEYS = ["mode", "bloodType", "donor", "recipient"];

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function failure(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

// Whole-shape validation: a plain object whose keys are a subset of the
// known input keys and whose values are own string data properties.
// Accessor properties are rejected without ever being invoked.
function readRawInput(input) {
  if (!isPlainObject(input)) return null;
  const raw = {};
  for (const key of Object.keys(input)) {
    if (!INPUT_KEYS.includes(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !("value" in descriptor)) return null;
    if (typeof descriptor.value !== "string") return null;
    raw[key] = descriptor.value;
  }
  return raw;
}

function hasUnpairedSurrogate(text) {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Per-field pre-grammar checks, in the pinned order:
// INPUT_LIMIT -> UNICODE -> EMPTY. Returns an error code or null.
function preGrammarError(value) {
  if (value.length > MAX_RAW_UNITS) return "INPUT_LIMIT";
  if (hasUnpairedSurrogate(value)) return "UNICODE";
  if (value === "") return "EMPTY";
  return null;
}

function aboGroup(type) {
  return type.slice(0, -1);
}

function rbcDonateTo(type) {
  return [...RBC_MATRIX[type]];
}

// Derived by transposing RBC_MATRIX; never a separately stored table.
function rbcReceiveFrom(type) {
  return TYPES.filter((donor) => RBC_MATRIX[donor].includes(type));
}

// Plasma lists are expanded to the eight types: every type whose ABO group
// is in the donor group's plasma row, in canonical type order.
function plasmaDonateTo(type) {
  const groups = PLASMA_MATRIX[aboGroup(type)];
  return TYPES.filter((candidate) => groups.includes(aboGroup(candidate)));
}

// Derived by transposing the plasma relation over the eight types.
function plasmaReceiveFrom(type) {
  return TYPES.filter((donor) => plasmaDonateTo(donor).includes(type));
}

function singleResult(type) {
  const giveRbc = rbcDonateTo(type);
  const receiveRbc = rbcReceiveFrom(type);
  const givePlasma = plasmaDonateTo(type);
  const receivePlasma = plasmaReceiveFrom(type);
  const badges = [];
  if (giveRbc.length === TYPES.length) badges.push("rbc-universal-donor");
  if (receiveRbc.length === TYPES.length) badges.push("rbc-universal-recipient");
  if (givePlasma.length === TYPES.length) badges.push("plasma-universal-donor");
  if (receivePlasma.length === TYPES.length) badges.push("plasma-universal-recipient");
  return {
    badges,
    bloodType: type,
    mode: "single",
    plasmaDonateTo: givePlasma,
    plasmaReceiveFrom: receivePlasma,
    rbcDonateTo: giveRbc,
    rbcReceiveFrom: receiveRbc,
  };
}

function pairResult(donor, recipient) {
  return {
    donor,
    mode: "pair",
    plasma: PLASMA_MATRIX[aboGroup(donor)].includes(aboGroup(recipient)),
    rbc: RBC_MATRIX[donor].includes(recipient),
    recipient,
  };
}

export function run(input) {
  const raw = readRawInput(input);
  if (raw === null) return failure("SCHEMA", null);
  if (!Object.hasOwn(raw, "mode")) return failure("SCHEMA", null);

  const modeError = preGrammarError(raw.mode);
  if (modeError !== null) return failure(modeError, "mode");
  if (!MODES.includes(raw.mode)) return failure("ENUM", "mode");

  const typeFields = raw.mode === "single" ? ["bloodType"] : ["donor", "recipient"];
  const expectedKeys = ["mode", ...typeFields];
  const actualKeys = Object.keys(raw);
  if (
    actualKeys.length !== expectedKeys.length
    || !expectedKeys.every((key) => Object.hasOwn(raw, key))
  ) {
    return failure("SCHEMA", null);
  }

  for (const field of typeFields) {
    const error = preGrammarError(raw[field]);
    if (error !== null) return failure(error, field);
    if (!TYPES.includes(raw[field])) return failure("ENUM", field);
  }

  if (raw.mode === "single") {
    return { ok: true, result: singleResult(raw.bloodType) };
  }
  return { ok: true, result: pairResult(raw.donor, raw.recipient) };
}

export const REPORT_FILENAME = "blood-type-compatibility-report.json";
export const REPORT_LIMIT_BYTES = 2097152;

function serializeValue(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("report values must be finite");
    return JSON.stringify(value);
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
