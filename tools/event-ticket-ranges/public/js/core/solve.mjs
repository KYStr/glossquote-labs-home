// Pure core for Event Ticket Range Check (SPEC.md, spec-event-ticket-ranges-20261109 v1).
// No DOM / network / storage access. Directly importable by node --test.
//
// solve(data) validates a fixed-shape JSON object and audits numbered
// ticket stacks against one issued range, without expanding the ticket
// list: at most 130 scan endpoints (64 bundles x 2 clipped ends + 2).
//
// Input (all fields required):
//   digits   I[1,9] — fixed printed width, form default 4
//   issued   {first: serial, last: serial} — ASCII digits, exactly `digits` long
//   bundles  0..64 rows {name: N, first: serial, last: serial} — names unique
// Output: {status:"ok", result:{uniqueCovered, missingCount, duplicateCopies,
//   outsideCopies, missing:[{first,last}], overlaps:[{first,last,bundles}],
//   outside:[{bundle,first,last}]}} with every serial padded to `digits`.
//   Errors: {status:"error", error:{code, path}} with a JSON Pointer path.
//
// Validation order: SIZE (root) -> shape -> fields in table order
// (digits, issued, bundles in input order) -> cross-field DUPLICATE
// (second occurrence) -> issued ORDER -> bundle ORDER in input order.

export const MAX_JSON_BYTES = 65536;
export const MAX_BUNDLES = 64;
export const MIN_DIGITS = 1;
export const MAX_DIGITS = 9;

const SERIAL_CHARS = /^[0-9]+$/;
const NAME_FIRST = /^[\p{L}\p{N}]$/u;
const NAME_REST = /^[\p{L}\p{M}\p{N} \-_]$/u;

function err(code, path) {
  return { status: "error", error: { code, path } };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// Exact key set: an unknown key reports SHAPE at the object path; a
// missing key reports SHAPE at that known key's path.
function checkKeys(obj, keys, path) {
  for (const key of Object.keys(obj)) {
    if (!keys.includes(key)) return err("SHAPE", path);
  }
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return err("SHAPE", path === "" ? `/${key}` : `${path}/${key}`);
    }
  }
  return null;
}

// A serial is an ASCII digit string of exactly `digits` length. A
// non-string is a TYPE error; wrong width or characters are SYNTAX.
function checkSerial(value, digits, path) {
  if (typeof value !== "string") return err("TYPE", path);
  if (value.length !== digits || !SERIAL_CHARS.test(value)) {
    return err("SYNTAX", path);
  }
  return null;
}

// N: trim U+0020 at both ends, NFC-normalize, 1-24 Unicode code points,
// first code point a Unicode letter or digit, the rest letters, marks,
// digits, ASCII space, hyphen or underscore. Case-sensitive.
// Length failures are RANGE; character-class failures are TYPE.
export function normalizeName(raw) {
  if (typeof raw !== "string") return { ok: false, code: "TYPE" };
  const trimmed = raw.replace(/^ +| +$/g, "");
  const name = trimmed.normalize("NFC");
  const points = [...name];
  if (points.length < 1 || points.length > 24) {
    return { ok: false, code: "RANGE" };
  }
  if (!NAME_FIRST.test(points[0])) return { ok: false, code: "TYPE" };
  for (let i = 1; i < points.length; i += 1) {
    if (!NAME_REST.test(points[i])) return { ok: false, code: "TYPE" };
  }
  return { ok: true, name };
}

export function solve(data) {
  // 1. Whole-input size, before shape.
  let bytes;
  try {
    bytes = new TextEncoder().encode(JSON.stringify(data)).length;
  } catch {
    return err("TYPE", "");
  }
  if (bytes > MAX_JSON_BYTES) return err("SIZE", "");

  // 2. Root shape.
  if (!isPlainObject(data)) return err("TYPE", "");
  const rootShape = checkKeys(data, ["digits", "issued", "bundles"], "");
  if (rootShape) return rootShape;

  // 3. digits: I[1,9].
  const { digits } = data;
  if (
    typeof digits !== "number" ||
    !Number.isInteger(digits) ||
    Object.is(digits, -0)
  ) {
    return err("TYPE", "/digits");
  }
  if (digits < MIN_DIGITS || digits > MAX_DIGITS) {
    return err("RANGE", "/digits");
  }

  // 4. issued {first, last} serials.
  const { issued } = data;
  if (!isPlainObject(issued)) return err("TYPE", "/issued");
  const issuedShape = checkKeys(issued, ["first", "last"], "/issued");
  if (issuedShape) return issuedShape;
  const issuedFirstBad = checkSerial(issued.first, digits, "/issued/first");
  if (issuedFirstBad) return issuedFirstBad;
  const issuedLastBad = checkSerial(issued.last, digits, "/issued/last");
  if (issuedLastBad) return issuedLastBad;

  // 5. bundles: 0..64 rows, validated in input order.
  const { bundles } = data;
  if (!Array.isArray(bundles)) return err("TYPE", "/bundles");
  if (bundles.length > MAX_BUNDLES) return err("RANGE", "/bundles");
  const rows = [];
  for (let i = 0; i < bundles.length; i += 1) {
    const base = `/bundles/${i}`;
    const row = bundles[i];
    if (!isPlainObject(row)) return err("TYPE", base);
    const rowShape = checkKeys(row, ["name", "first", "last"], base);
    if (rowShape) return rowShape;
    const name = normalizeName(row.name);
    if (!name.ok) return err(name.code, `${base}/name`);
    const firstBad = checkSerial(row.first, digits, `${base}/first`);
    if (firstBad) return firstBad;
    const lastBad = checkSerial(row.last, digits, `${base}/last`);
    if (lastBad) return lastBad;
    rows.push({
      name: name.name,
      first: Number.parseInt(row.first, 10),
      last: Number.parseInt(row.last, 10),
    });
  }

  // 6. Cross-field: duplicate normalized names first (second occurrence),
  // then issued first<=last, then each bundle first<=last in input order.
  const seen = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    if (seen.has(rows[i].name)) {
      return err("DUPLICATE", `/bundles/${i}/name`);
    }
    seen.set(rows[i].name, i);
  }
  const issuedFirst = Number.parseInt(issued.first, 10);
  const issuedLast = Number.parseInt(issued.last, 10);
  if (issuedFirst > issuedLast) return err("ORDER", "/issued/last");
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].first > rows[i].last) {
      return err("ORDER", `/bundles/${i}/last`);
    }
  }

  // 7. Outside segments, per bundle in input order (left then right).
  const pad = (n) => String(n).padStart(digits, "0");
  const outside = [];
  let outsideCopies = 0;
  for (const row of rows) {
    const leftLast = Math.min(row.last, issuedFirst - 1);
    if (row.first <= leftLast) {
      outside.push({
        bundle: row.name,
        first: pad(row.first),
        last: pad(leftLast),
      });
      outsideCopies += leftLast - row.first + 1;
    }
    const rightFirst = Math.max(row.first, issuedLast + 1);
    if (rightFirst <= row.last) {
      outside.push({
        bundle: row.name,
        first: pad(rightFirst),
        last: pad(row.last),
      });
      outsideCopies += row.last - rightFirst + 1;
    }
  }

  // 8. Sweep the sorted unique endpoints of the clipped intersections.
  const clipped = rows
    .map((row) => ({
      name: row.name,
      first: Math.max(row.first, issuedFirst),
      last: Math.min(row.last, issuedLast),
    }))
    .filter((row) => row.first <= row.last);
  const points = new Set([issuedFirst, issuedLast + 1]);
  for (const row of clipped) {
    points.add(row.first);
    points.add(row.last + 1);
  }
  const sorted = [...points].sort((a, b) => a - b);

  let uniqueCovered = 0;
  let duplicateCopies = 0;
  let missingCount = 0;
  const missing = [];
  const overlaps = [];
  let open = null; // current mergeable listed segment, if any
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (a >= b) continue;
    const active = clipped.filter((row) => row.first <= a && a <= row.last);
    if (active.length === 0) {
      missingCount += b - a;
      if (open && open.kind === "missing" && open.last === a - 1) {
        open.last = b - 1;
      } else {
        open = { kind: "missing", first: a, last: b - 1 };
        missing.push(open);
      }
    } else if (active.length === 1) {
      uniqueCovered += b - a;
      open = null;
    } else {
      uniqueCovered += b - a;
      duplicateCopies += (b - a) * (active.length - 1);
      const names = active.map((row) => row.name);
      const key = names.join("\u0000");
      if (
        open &&
        open.kind === "overlap" &&
        open.key === key &&
        open.last === a - 1
      ) {
        open.last = b - 1;
      } else {
        open = { kind: "overlap", first: a, last: b - 1, key, names };
        overlaps.push(open);
      }
    }
  }

  return {
    status: "ok",
    result: {
      uniqueCovered,
      missingCount,
      duplicateCopies,
      outsideCopies,
      missing: missing.map((seg) => ({
        first: pad(seg.first),
        last: pad(seg.last),
      })),
      overlaps: overlaps.map((seg) => ({
        first: pad(seg.first),
        last: pad(seg.last),
        bundles: [...seg.names],
      })),
      outside,
    },
  };
}
