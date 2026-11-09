// Pure conversion core for the Shoe Size Converter.
// No DOM, no network, no storage: row selection and readout over the shipped
// tables only (SPEC sections 4-5). Every conversion selects exactly one row
// and reads every system off that row; the only computed value is JP, which
// is mondo / 10 by definition. No formulas, no interpolation, no extrapolation.

import { ADULT_ROWS, KIDS_ROWS } from "./tables.mjs";

export const CATEGORIES = ["men", "women", "kids"];
export const SYSTEMS = ["us", "uk", "eur", "jp"];

// Foot-length field bounds (SPEC section 2): 10.0-35.0 cm in 0.1 cm steps.
// All length arithmetic is done in integer tenths of a centimetre, which are
// exactly millimetres, so no floating-point rounding can enter a lookup.
export const FOOT_MIN_TENTHS = 100;
export const FOOT_MAX_TENTHS = 350;

// Normalise the raw tables into one row shape per category:
// { mondo, eur, uk, us } where us is the category's own US column.
// A null cell means the source table assigns no label for that system on
// that row (kids only; see DATA-SOURCE.md). Adult cells are never null.
function adultRows(usKey) {
  return ADULT_ROWS.map((r) => ({ mondo: r.mondo, eur: r.eur, uk: r.uk, us: r[usKey] }));
}

const TABLES = {
  men: adultRows("usMen"),
  women: adultRows("usWomen"),
  kids: KIDS_ROWS.map((r) => ({ mondo: r.mondo, eur: r.eur, uk: r.uk, us: r.us })),
};

export function isCategory(value) {
  return CATEGORIES.includes(value);
}

export function tableFor(category) {
  if (!isCategory(category)) return null;
  return TABLES[category];
}

// JP label: the Japanese size is the foot length in cm, one decimal exactly.
export function jpLabel(mondo) {
  return (mondo / 10).toFixed(1);
}

// The row's foot length in cm, one decimal exactly (270 -> "27.0").
export function footCmLabel(mondo) {
  return (mondo / 10).toFixed(1);
}

// Display form for a stored numeric label: integers without a decimal point,
// half sizes with one decimal (9 -> "9", 42.5 -> "42.5"). null stays null.
export function formatLabel(value) {
  if (value === null || value === undefined) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function labelOf(row, system) {
  if (system === "jp") return jpLabel(row.mondo);
  return formatLabel(row[system]);
}

// Parse a foot-length field value into integer millimetres.
// Returns { ok: true, mm } or { ok: false, error } with error one of
// "empty" | "format" | "step" | "below-min" | "above-max".
// Refusals are deliberate: no silent truncation, no guessed decimals.
export function parseFootLength(raw) {
  if (typeof raw !== "string") return { ok: false, error: "format" };
  const text = raw.trim();
  if (text === "") return { ok: false, error: "empty" };
  const match = /^(\d{1,3})(?:\.(\d+))?$/.exec(text);
  if (!match) return { ok: false, error: "format" };
  const frac = match[2] ?? "";
  if (frac.length > 1) return { ok: false, error: "step" };
  const tenths = Number(match[1]) * 10 + (frac === "" ? 0 : Number(frac));
  if (tenths < FOOT_MIN_TENTHS) return { ok: false, error: "below-min" };
  if (tenths > FOOT_MAX_TENTHS) return { ok: false, error: "above-max" };
  return { ok: true, mm: tenths };
}

// Foot length -> row (SPEC section 4 lookup): the smallest row whose mondo
// is >= the length (round UP to the next size step). Out of range when the
// length exceeds the last row, or is <= (first mondo - 5), i.e. it would
// round up past the first row's step from below the table's intended span.
export function selectRowByFoot(rows, mm) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (mm > last.mondo || mm <= first.mondo - 5) return { status: "out-of-range" };
  const index = rows.findIndex((r) => r.mondo >= mm);
  return { status: "ok", row: rows[index], index };
}

// Label -> row: exact selection of the row carrying that label in that
// system. Returns the row, or null when the label is not in the table.
export function selectRowByLabel(rows, system, label) {
  const wanted = String(label);
  for (const row of rows) {
    if (labelOf(row, system) === wanted) return row;
  }
  return null;
}

// The labels a select may offer for one system: exactly the table's labels,
// in row order, duplicates removed, unassigned (null) cells skipped.
export function labelsFor(rows, system) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const label = labelOf(row, system);
    if (label === null || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

// The foot-length range a category's table covers, in cm strings, derived
// from the coverage rule: the smallest resolvable length is first mondo - 4
// (one millimetre above the out-of-range bound), the largest is the last row.
export function coveredRangeCm(rows) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  return {
    min: ((first.mondo - 4) / 10).toFixed(1),
    max: (last.mondo / 10).toFixed(1),
  };
}

// Full readout of one selected row for one category.
export function rowResult(category, row) {
  return {
    category,
    mondo: row.mondo,
    footCm: footCmLabel(row.mondo),
    jp: jpLabel(row.mondo),
    us: formatLabel(row.us),
    uk: formatLabel(row.uk),
    eur: formatLabel(row.eur),
  };
}

// Structural validation of the shipped tables (used by tests and check):
// strictly increasing mondo in exact 5 mm steps, plausible label shapes,
// adult rows complete, kids cells either numbers or explicit nulls.
export function validateTables() {
  const problems = [];
  const checkSteps = (name, rows) => {
    for (let i = 0; i < rows.length; i += 1) {
      if (rows[i].mondo % 5 !== 0) problems.push(`${name} row ${i}: mondo not a 5 mm step`);
      if (i > 0 && rows[i].mondo - rows[i - 1].mondo !== 5) {
        problems.push(`${name} row ${i}: mondo step is not exactly 5 mm`);
      }
    }
  };
  checkSteps("adult", ADULT_ROWS);
  checkSteps("kids", KIDS_ROWS);
  for (const r of ADULT_ROWS) {
    for (const key of ["eur", "uk", "usMen", "usWomen"]) {
      if (typeof r[key] !== "number" || !(r[key] > 0)) {
        problems.push(`adult ${r.mondo}: ${key} missing or not a positive number`);
      }
    }
  }
  for (const r of KIDS_ROWS) {
    if (typeof r.eur !== "number" || !(r.eur > 0)) {
      problems.push(`kids ${r.mondo}: eur missing or not a positive number`);
    }
    for (const key of ["uk", "us"]) {
      if (r[key] !== null && (typeof r[key] !== "number" || !(r[key] > 0))) {
        problems.push(`kids ${r.mondo}: ${key} is neither a positive number nor null`);
      }
    }
  }
  return problems;
}
