// Pure core for the Meeting Cost Calculator: strict input validation,
// exact money arithmetic, the preset fill rule, and the timer state
// machine over an injected monotonic clock. No DOM, no network, no
// storage. All money is exact: rates are integer cents, and every cost is
// a BigInt rational in cents that is rounded half-up exactly once, at
// display time (SPEC section 4). The timer stores only elapsed
// milliseconds derived from a monotonic base; a displayed cost is always
// recomputed as burn x total elapsed, never accumulated tick by tick.

import {
  MAX_GROUPS,
  MAX_HEADCOUNT,
  MAX_RATE_CENTS,
  MAX_RATE_DECIMALS,
  MAX_DURATION_HOURS,
  MAX_DURATION_MINUTES_PART,
  MAX_TOTAL_MINUTES,
  MIN_GROUPS,
  MIN_HEADCOUNT,
  MIN_TOTAL_MINUTES,
  SALARY_DIVISOR,
} from "./data.mjs";

// ---------------------------------------------------------------------------
// Exact rational helpers (values are in cents unless stated otherwise).
// A rational is { num: BigInt, den: BigInt } with den > 0.

function rational(num, den = 1n) {
  return { num: BigInt(num), den: BigInt(den) };
}

// Round a non-negative rational to the nearest integer, half-up.
function roundHalfUp({ num, den }) {
  return (2n * num + den) / (2n * den);
}

function groupThousands(digits) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Format an exact rational amount of cents as symbol + grouped 2dp text,
// applying the single display rounding (half-up) required by SPEC section 4.
export function formatMoney(value, symbol) {
  const cents = roundHalfUp(value);
  const whole = cents / 100n;
  const frac = cents % 100n;
  return `${symbol}${groupThousands(whole.toString())}.${frac
    .toString()
    .padStart(2, "0")}`;
}

// Format an integer number of cents as a plain 2dp string (no symbol).
export function formatCentsPlain(cents) {
  return formatMoney(rational(BigInt(cents)), "");
}

// ---------------------------------------------------------------------------
// Strict field parsing. Inputs are raw strings exactly as typed.

const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const WHOLE_RE = /^-?\d+$/;

function decimalPlaces(text) {
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

// Parse a headcount string. Returns { ok, value } or { ok:false, error }.
export function parseHeadcount(raw) {
  const text = String(raw).trim();
  if (text === "") return { ok: false, error: "required" };
  if (!NUMBER_RE.test(text)) return { ok: false, error: "not-a-number" };
  if (!WHOLE_RE.test(text)) return { ok: false, error: "not-whole" };
  const value = Number(text);
  if (value < MIN_HEADCOUNT || value > MAX_HEADCOUNT) {
    return { ok: false, error: "out-of-range" };
  }
  return { ok: true, value };
}

// Parse an hourly-rate string into exact integer cents.
export function parseRate(raw) {
  const text = String(raw).trim();
  if (text === "") return { ok: false, error: "required" };
  if (!NUMBER_RE.test(text)) return { ok: false, error: "not-a-number" };
  if (decimalPlaces(text) > MAX_RATE_DECIMALS) {
    return { ok: false, error: "too-many-decimals" };
  }
  const negative = text.startsWith("-");
  const body = negative ? text.slice(1) : text;
  const [wholePart, fracPart = ""] = body.split(".");
  let cents = BigInt(wholePart) * 100n + BigInt((fracPart + "00").slice(0, 2));
  if (negative) cents = -cents;
  if (cents < 0n || cents > BigInt(MAX_RATE_CENTS)) {
    return { ok: false, error: "out-of-range" };
  }
  return { ok: true, value: Number(cents) };
}

// Parse the manual duration pair. Returns per-field errors plus, when both
// fields parse, a total-minutes check against 1..1440 (SPEC section 4:
// 24 h requires 0 minutes, which the total cap enforces).
export function parseDuration(rawHours, rawMinutes) {
  const errors = {};
  let hours = null;
  let minutes = null;

  const hText = String(rawHours).trim();
  if (hText === "") errors.hours = "required";
  else if (!NUMBER_RE.test(hText)) errors.hours = "not-a-number";
  else if (!WHOLE_RE.test(hText)) errors.hours = "not-whole";
  else {
    hours = Number(hText);
    if (hours < 0 || hours > MAX_DURATION_HOURS) errors.hours = "out-of-range";
  }

  const mText = String(rawMinutes).trim();
  if (mText === "") errors.minutes = "required";
  else if (!NUMBER_RE.test(mText)) errors.minutes = "not-a-number";
  else if (!WHOLE_RE.test(mText)) errors.minutes = "not-whole";
  else {
    minutes = Number(mText);
    if (minutes < 0 || minutes > MAX_DURATION_MINUTES_PART) {
      errors.minutes = "out-of-range";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes < MIN_TOTAL_MINUTES || totalMinutes > MAX_TOTAL_MINUTES) {
    return { ok: false, errors: { duration: "duration-out-of-range" } };
  }
  return { ok: true, value: totalMinutes };
}

// ---------------------------------------------------------------------------
// Roster validation and preset fill.

// The hourly rate (integer cents) a preset fills in: annual / 2080 exactly,
// rounded half-up to cents at fill time (SPEC section 4).
export function presetRateCents(annual) {
  const num = BigInt(annual) * 100n;
  const den = BigInt(SALARY_DIVISOR);
  return Number(roundHalfUp(rational(num, den)));
}

// Validate a raw roster: an array of { headcount, rate } string pairs.
// Group count outside 1..5 is refused (a 6th group is never accepted).
export function validateRoster(rawGroups) {
  if (
    !Array.isArray(rawGroups) ||
    rawGroups.length < MIN_GROUPS ||
    rawGroups.length > MAX_GROUPS
  ) {
    return { ok: false, errors: { roster: "group-count" }, groups: null };
  }
  const groups = [];
  const fieldErrors = [];
  let ok = true;
  for (const raw of rawGroups) {
    const headcount = parseHeadcount(raw.headcount);
    const rate = parseRate(raw.rate);
    const errors = {};
    if (!headcount.ok) {
      errors.headcount = headcount.error;
      ok = false;
    }
    if (!rate.ok) {
      errors.rate = rate.error;
      ok = false;
    }
    fieldErrors.push(errors);
    groups.push({
      headcount: headcount.ok ? headcount.value : null,
      rateCents: rate.ok ? rate.value : null,
    });
  }
  if (!ok) return { ok: false, errors: { fields: fieldErrors }, groups: null };
  return { ok: true, errors: null, groups };
}

// Combined burn per hour, in exact integer cents: sum of headcount x rate.
export function burnCents(groups) {
  let total = 0n;
  for (const group of groups) {
    total += BigInt(group.headcount) * BigInt(group.rateCents);
  }
  return total;
}

// ---------------------------------------------------------------------------
// Cost computation. hoursNum/hoursDen is the exact duration in hours as a
// rational, so manual minutes (T/60) and timer elapsed (ms/3,600,000) share
// one formula (SPEC section 4).

function computeForHours(groups, hoursNum, hoursDen, symbol) {
  const burn = burnCents(groups);
  const rows = groups.map((group) => {
    const perPerson = rational(
      BigInt(group.rateCents) * BigInt(hoursNum),
      BigInt(hoursDen),
    );
    const subtotal = rational(perPerson.num * BigInt(group.headcount), perPerson.den);
    return {
      headcount: group.headcount,
      rateCents: group.rateCents,
      perPerson,
      subtotal,
      perPersonText: formatMoney(perPerson, symbol),
      subtotalText: formatMoney(subtotal, symbol),
    };
  });
  const total = rational(burn * BigInt(hoursNum), BigInt(hoursDen));
  const costPerMinute = rational(burn, 60n);
  return {
    burnCents: burn,
    burnText: formatMoney(rational(burn), symbol),
    costPerMinute,
    costPerMinuteText: formatMoney(costPerMinute, symbol),
    total,
    totalText: formatMoney(total, symbol),
    rows,
  };
}

// Manual mode: T total minutes (already validated to 1..1440).
export function computeForMinutes(groups, totalMinutes, symbol) {
  return computeForHours(groups, totalMinutes, 60, symbol);
}

// Timer mode: exact elapsed milliseconds from the monotonic base.
export function computeForElapsedMs(groups, elapsedMs, symbol) {
  return computeForHours(groups, elapsedMs, 3600000, symbol);
}

// ---------------------------------------------------------------------------
// Timer state machine (SPEC section 4). The state stores accumulated
// milliseconds from completed running intervals plus, while running, the
// monotonic timestamp at which the current interval began. Callers inject
// timestamps from a monotonic clock (performance.now in the page, a fake
// clock in tests); wall-clock time is never consulted.

export function createTimerState() {
  return { accumulatedMs: 0, intervalStart: null };
}

export function timerIsRunning(state) {
  return state.intervalStart !== null;
}

export function timerStart(state, nowMs) {
  if (state.intervalStart === null) state.intervalStart = nowMs;
  return state;
}

export function timerPause(state, nowMs) {
  if (state.intervalStart !== null) {
    state.accumulatedMs += nowMs - state.intervalStart;
    state.intervalStart = null;
  }
  return state;
}

// Resume is starting again from the frozen accumulated total.
export const timerResume = timerStart;

export function timerReset(state) {
  state.accumulatedMs = 0;
  state.intervalStart = null;
  return state;
}

export function timerElapsedMs(state, nowMs) {
  if (state.intervalStart === null) return state.accumulatedMs;
  return state.accumulatedMs + (nowMs - state.intervalStart);
}

// Elapsed display: H:MM:SS with hours unbounded (SPEC section 4). Hours
// are padded to at least two digits, so a fresh timer reads 00:00:00.
export function formatElapsed(elapsedMs) {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}
