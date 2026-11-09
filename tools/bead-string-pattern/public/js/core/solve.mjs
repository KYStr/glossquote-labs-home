// Pure core for Bead String Pattern (spec-bead-string-pattern-20261109, v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// Contract (SPEC.md inputsOutputs + implementation):
//   solve(data) -> {status:"ok", result:{positions, colors, firstMissing}}
//                | {status:"error", error:{code, path}}
// Error codes: SIZE, SHAPE, TYPE, RANGE, ENUM, DUPLICATE, REF (SYNTAX is
// a form-level raw-text error and is produced by the app, not by solve).
// path is a JSON Pointer; the root is "".
// Validation order: root type -> SIZE -> root/row SHAPE -> per-field in
// table and array input order (duplicates detected at the second
// occurrence) -> cross-field references in motif, head, tail order.
// Expansion: head first, then each motif group (even groups reversed
// in alternate mode), then tail. Positions are walked in order, deducting
// stock; a position is available while its colour still has stock left.
// At most 514 positions (2 ends + 32 groups x 16 beads), linear walk.

export const MAX_JSON_BYTES = 65536;
export const MAX_COLORS = 12;
export const MAX_MOTIF = 16;
export const MAX_REPEATS = 32;
export const MAX_STOCK = 1000;
export const MAX_NAME_CODE_POINTS = 24;
export const MAX_POSITIONS = 514;

const ROOT_KEYS = ["colors", "motif", "repeats", "mode", "head", "tail"];
const COLOR_KEYS = ["name", "stock"];
const MODES = ["repeat", "alternate"];

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

  if (!Array.isArray(data.colors)) {
    return { ok: false, reply: err("TYPE", "/colors") };
  }
  if (data.colors.length < 1 || data.colors.length > MAX_COLORS) {
    return { ok: false, reply: err("RANGE", "/colors") };
  }
  if (!Array.isArray(data.motif)) {
    return { ok: false, reply: err("TYPE", "/motif") };
  }
  if (data.motif.length < 1 || data.motif.length > MAX_MOTIF) {
    return { ok: false, reply: err("RANGE", "/motif") };
  }

  const colors = [];
  const colorStock = new Map();
  for (let i = 0; i < data.colors.length; i += 1) {
    const row = data.colors[i];
    const base = `/colors/${i}`;
    if (!isPlainObject(row)) return { ok: false, reply: err("TYPE", base) };
    const rowShape = checkShape(row, COLOR_KEYS, base);
    if (rowShape) return { ok: false, reply: rowShape };
    const name = normalizeName(row.name);
    if (!name.ok) return { ok: false, reply: err(name.code, `${base}/name`) };
    if (colorStock.has(name.name)) {
      return { ok: false, reply: err("DUPLICATE", `${base}/name`) };
    }
    const stock = checkInteger(row.stock, 0, MAX_STOCK);
    if (!stock.ok) {
      return { ok: false, reply: err(stock.code, `${base}/stock`) };
    }
    colorStock.set(name.name, row.stock);
    colors.push({ name: name.name, stock: row.stock });
  }

  const motif = [];
  for (let i = 0; i < data.motif.length; i += 1) {
    const name = normalizeName(data.motif[i]);
    if (!name.ok) {
      return { ok: false, reply: err(name.code, `/motif/${i}`) };
    }
    motif.push(name.name);
  }

  const repeats = checkInteger(data.repeats, 1, MAX_REPEATS);
  if (!repeats.ok) {
    return { ok: false, reply: err(repeats.code, "/repeats") };
  }

  if (typeof data.mode !== "string") {
    return { ok: false, reply: err("TYPE", "/mode") };
  }
  if (!MODES.includes(data.mode)) {
    return { ok: false, reply: err("ENUM", "/mode") };
  }

  let head = null;
  if (data.head !== null) {
    const name = normalizeName(data.head);
    if (!name.ok) return { ok: false, reply: err(name.code, "/head") };
    head = name.name;
  }
  let tail = null;
  if (data.tail !== null) {
    const name = normalizeName(data.tail);
    if (!name.ok) return { ok: false, reply: err(name.code, "/tail") };
    tail = name.name;
  }

  // Cross-field: motif, head, tail references, in that order. Every
  // referenced name must be listed in the colour stock.
  for (let i = 0; i < motif.length; i += 1) {
    if (!colorStock.has(motif[i])) {
      return { ok: false, reply: err("REF", `/motif/${i}`) };
    }
  }
  if (head !== null && !colorStock.has(head)) {
    return { ok: false, reply: err("REF", "/head") };
  }
  if (tail !== null && !colorStock.has(tail)) {
    return { ok: false, reply: err("REF", "/tail") };
  }

  return { ok: true, data: { colors, motif, repeats: data.repeats, mode: data.mode, head, tail } };
}

// Expand the bead sequence: head, then each motif group (even groups
// reversed in alternate mode), then tail. Boundaries keep both groups'
// end beads, so a mirrored boundary can place two equal colours side
// by side.
export function expand(validated) {
  const { motif, repeats, mode, head, tail } = validated;
  const sequence = [];
  if (head !== null) sequence.push(head);
  for (let group = 1; group <= repeats; group += 1) {
    if (mode === "alternate" && group % 2 === 0) {
      for (let i = motif.length - 1; i >= 0; i -= 1) sequence.push(motif[i]);
    } else {
      sequence.push(...motif);
    }
  }
  if (tail !== null) sequence.push(tail);
  return sequence;
}

// Full entry point: validate, then expand and walk the stock in order.
// Returns the exact SPEC envelope.
export function solve(data) {
  const checked = validate(data);
  if (!checked.ok) return checked.reply;
  const { colors, motif, repeats, mode, head, tail } = checked.data;
  const sequence = expand({ motif, repeats, mode, head, tail });

  const remaining = new Map(colors.map((c) => [c.name, c.stock]));
  const needed = new Map(colors.map((c) => [c.name, 0]));
  let firstMissing = null;
  const positions = sequence.map((name, i) => {
    needed.set(name, needed.get(name) + 1);
    const available = remaining.get(name) > 0;
    if (available) remaining.set(name, remaining.get(name) - 1);
    if (!available && firstMissing === null) firstMissing = i + 1;
    return { index: i + 1, name, available };
  });

  return {
    status: "ok",
    result: {
      positions,
      colors: colors.map((c) => ({
        name: c.name,
        needed: needed.get(c.name),
        missing: Math.max(0, needed.get(c.name) - c.stock),
        remaining: remaining.get(c.name),
      })),
      firstMissing,
    },
  };
}
