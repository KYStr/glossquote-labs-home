// Pregnancy due-date core (SPEC section 4, normative).
//
// All three dating modes reduce to one estimated due date (EDD) and
// one implied day zero (EDD - 280); gestational age and trimesters
// derive from day zero only, so the modes cannot diverge. All math
// is on civil-date day counts from ./civil.mjs — no timestamps.
//
// The constants of SPEC section 4 appear exactly once, here, as
// auditable data. Validation refusals follow SPEC section 3: a date
// after today, a malformed or impossible date, a non-whole or
// out-of-range cycle length, and out-of-range scan gestational age
// are all refused with per-field error codes.

import {
  addDays,
  diffDays,
  formatCivilDate,
  parseCivilDate,
} from "./civil.mjs";

export const CONSTANTS = Object.freeze({
  // Days from day zero to the estimated due date (Naegele's rule).
  GESTATION_DAYS: 280,
  // Days from conception to the estimated due date.
  CONCEPTION_TO_EDD_DAYS: 266,
  // First gestational day of the second trimester (14w0d).
  SECOND_TRIMESTER_START_DAY: 98,
  // First gestational day of the third trimester (28w0d).
  THIRD_TRIMESTER_START_DAY: 196,
  // GA_days strictly greater than this (42w0d) triggers the
  // beyond-42-weeks note; the GA figure is still shown, unclamped.
  BEYOND_TERM_GA_DAYS: 294,
  CYCLE_MIN: 21,
  CYCLE_MAX: 45,
  CYCLE_DEFAULT: 28,
  SCAN_WEEKS_MIN: 4,
  SCAN_WEEKS_MAX: 42,
  SCAN_DAYS_MIN: 0,
  SCAN_DAYS_MAX: 6,
});

// --- Mode reductions (pure; inputs are civil day counts) ---------

export function eddFromLmp(lmpDay, cycleLength) {
  return addDays(lmpDay, CONSTANTS.GESTATION_DAYS + (cycleLength - CONSTANTS.CYCLE_DEFAULT));
}

export function eddFromConception(conceptionDay) {
  return addDays(conceptionDay, CONSTANTS.CONCEPTION_TO_EDD_DAYS);
}

export function eddFromUltrasound(scanDay, gaScanDays) {
  return addDays(scanDay, CONSTANTS.GESTATION_DAYS - gaScanDays);
}

// --- Derivation from an EDD --------------------------------------

export function deriveFromEdd(eddDay, todayDay) {
  const dayZero = addDays(eddDay, -CONSTANTS.GESTATION_DAYS);
  const gaDays = diffDays(todayDay, dayZero);
  const weeks = Math.floor(gaDays / 7);
  const days = gaDays - weeks * 7;
  const trimester =
    gaDays < CONSTANTS.SECOND_TRIMESTER_START_DAY
      ? "first"
      : gaDays < CONSTANTS.THIRD_TRIMESTER_START_DAY
        ? "second"
        : "third";
  return {
    edd: formatCivilDate(eddDay),
    // Internal anchor only; the UI never displays day zero.
    dayZero: formatCivilDate(dayZero),
    gestationalAgeDays: gaDays,
    gestationalWeeks: weeks,
    gestationalDays: days,
    trimester,
    beyondTerm: gaDays > CONSTANTS.BEYOND_TERM_GA_DAYS,
    trimesters: [
      {
        id: "first",
        start: formatCivilDate(dayZero),
        end: formatCivilDate(addDays(dayZero, CONSTANTS.SECOND_TRIMESTER_START_DAY - 1)),
      },
      {
        id: "second",
        start: formatCivilDate(addDays(dayZero, CONSTANTS.SECOND_TRIMESTER_START_DAY)),
        end: formatCivilDate(addDays(dayZero, CONSTANTS.THIRD_TRIMESTER_START_DAY - 1)),
      },
      {
        id: "third",
        start: formatCivilDate(addDays(dayZero, CONSTANTS.THIRD_TRIMESTER_START_DAY)),
        end: formatCivilDate(eddDay),
      },
    ],
  };
}

// --- Input validation (SPEC section 3) ----------------------------
// Error codes: "required" | "invalid" | "future" | "not-whole" | "range".

function checkDateField(value, todayDay) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { error: "required" };
  }
  const day = parseCivilDate(String(value).trim());
  if (day === null) return { error: "invalid" };
  if (day > todayDay) return { error: "future" };
  return { day };
}

function checkWholeField(value, min, max) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { error: "required" };
  }
  const text = String(value).trim();
  if (/^[+-]?\d+$/.test(text)) {
    const n = Number(text);
    if (n < min || n > max) return { error: "range" };
    return { value: n };
  }
  if (/^[+-]?(\d+\.\d*|\.\d+)$/.test(text)) return { error: "not-whole" };
  return { error: "invalid" };
}

// Each compute* returns { ok: true, result } or
// { ok: false, errors: { <field>: <code> } }. `todayDay` is a civil
// day count (tests inject a fixed reference date; the app passes
// the device's local civil date read once at load).

export function computeFromLmp(input, todayDay) {
  const errors = {};
  const lmp = checkDateField(input?.lmpDate, todayDay);
  if (lmp.error) errors.lmpDate = lmp.error;
  const cycle = checkWholeField(input?.cycleLength, CONSTANTS.CYCLE_MIN, CONSTANTS.CYCLE_MAX);
  if (cycle.error) errors.cycleLength = cycle.error;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, result: deriveFromEdd(eddFromLmp(lmp.day, cycle.value), todayDay) };
}

export function computeFromConception(input, todayDay) {
  const errors = {};
  const conception = checkDateField(input?.conceptionDate, todayDay);
  if (conception.error) errors.conceptionDate = conception.error;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, result: deriveFromEdd(eddFromConception(conception.day), todayDay) };
}

export function computeFromUltrasound(input, todayDay) {
  const errors = {};
  const scan = checkDateField(input?.scanDate, todayDay);
  if (scan.error) errors.scanDate = scan.error;
  const weeks = checkWholeField(input?.scanWeeks, CONSTANTS.SCAN_WEEKS_MIN, CONSTANTS.SCAN_WEEKS_MAX);
  if (weeks.error) errors.scanWeeks = weeks.error;
  const days = checkWholeField(input?.scanDays, CONSTANTS.SCAN_DAYS_MIN, CONSTANTS.SCAN_DAYS_MAX);
  if (days.error) errors.scanDays = days.error;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const gaScanDays = weeks.value * 7 + days.value;
  return { ok: true, result: deriveFromEdd(eddFromUltrasound(scan.day, gaScanDays), todayDay) };
}
