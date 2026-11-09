// Taiwan Uniform Invoice Prize Check — pure core (no DOM access).
//
// Implements the normative rules of SPEC section 4. Invoice and winning
// numbers are digit STRINGS throughout: leading zeros are data, and
// nothing is ever converted to an integer. Full-width digits are
// normalised to ASCII before validation, as the SPEC requires.

export class InvoiceError extends Error {
  constructor(code, params = {}) {
    super(code);
    this.name = "InvoiceError";
    this.code = code;
    this.params = params;
  }
}

function fail(code, params) {
  throw new InvoiceError(code, params);
}

export const MAX_BATCH_LINES = 500;

export const TIERS = Object.freeze([
  "special", "grand", "first", "second", "third", "fourth", "fifth", "sixth", "none",
]);

export const AMOUNTS = Object.freeze({
  special: 10_000_000,
  grand: 2_000_000,
  first: 200_000,
  second: 40_000,
  third: 10_000,
  fourth: 4_000,
  fifth: 1_000,
  sixth: 200,
  none: 0,
});

const SUFFIX_TIERS = Object.freeze({
  8: "first", 7: "second", 6: "third", 5: "fourth", 4: "fifth", 3: "sixth",
});

// Full-width digits (U+FF10..U+FF19) become ASCII; everything else is
// left untouched so validation can report it precisely.
export function normalizeDigits(text) {
  return String(text).replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30));
}

export function cleanEntry(text) {
  return normalizeDigits(String(text).trim());
}

function validateDigitString(value, length, field) {
  if (value === "") fail("SETUP_REQUIRED", { field });
  if (/[^0-9]/.test(value)) fail("SETUP_NON_DIGIT", { field, value });
  if (value.length !== length) fail("SETUP_LENGTH", { field, expected: length, actual: value.length, value });
  return value;
}

// Validates a raw setup {special, grand, first[], addSixth[]} of user
// strings and returns the frozen setup of clean digit strings.
// Duplicate 8-digit values across special/grand/first are an error.
export function parseSetup(raw) {
  const special = validateDigitString(cleanEntry(raw.special ?? ""), 8, "special");
  const grand = validateDigitString(cleanEntry(raw.grand ?? ""), 8, "grand");
  const firstRaw = (raw.first ?? []).map((v) => cleanEntry(v)).filter((v) => v !== "");
  if (firstRaw.length === 0) fail("SETUP_REQUIRED", { field: "first" });
  if (firstRaw.length > 5) fail("SETUP_COUNT", { field: "first", limit: 5, actual: firstRaw.length });
  const first = firstRaw.map((v) => validateDigitString(v, 8, "first"));
  const seen = new Map();
  const claim = (value, field) => {
    if (seen.has(value)) fail("SETUP_DUPLICATE", { field, value, other: seen.get(value) });
    seen.set(value, field);
  };
  claim(special, "special");
  claim(grand, "grand");
  for (const value of first) claim(value, "first");
  const addRaw = (raw.addSixth ?? []).map((v) => cleanEntry(v)).filter((v) => v !== "");
  if (addRaw.length > 4) fail("SETUP_COUNT", { field: "addSixth", limit: 4, actual: addRaw.length });
  const addSixth = addRaw.map((v) => validateDigitString(v, 3, "addSixth"));
  const addSeen = new Set();
  for (const value of addSixth) {
    if (addSeen.has(value)) fail("SETUP_DUPLICATE", { field: "addSixth", value, other: "addSixth" });
    addSeen.add(value);
  }
  return Object.freeze({
    special,
    grand,
    first: Object.freeze(first),
    addSixth: Object.freeze(addSixth),
  });
}

export function isSetupReady(raw) {
  try {
    parseSetup(raw);
    return true;
  } catch {
    return false;
  }
}

export function suffixMatchLength(a, b) {
  let k = 0;
  while (k < a.length && k < b.length && a[a.length - 1 - k] === b[b.length - 1 - k]) k += 1;
  return k;
}

// Full check of one normalised 8-digit candidate. Precedence per SPEC
// section 4: special, grand, best first-prize suffix (k >= 3), then the
// additional sixth-prize sets, else no prize.
export function checkFull(setup, candidate) {
  if (candidate === setup.special) {
    return { number: candidate, tier: "special", amount: AMOUNTS.special, note: { kind: "special" } };
  }
  if (candidate === setup.grand) {
    return { number: candidate, tier: "grand", amount: AMOUNTS.grand, note: { kind: "grand" } };
  }
  let bestK = 0;
  let bestIndex = -1;
  setup.first.forEach((f, index) => {
    const k = suffixMatchLength(candidate, f);
    if (k > bestK) {
      bestK = k;
      bestIndex = index;
    }
  });
  if (bestK >= 3) {
    const tier = SUFFIX_TIERS[bestK];
    return {
      number: candidate,
      tier,
      amount: AMOUNTS[tier],
      note: { kind: "first-suffix", firstIndex: bestIndex, k: bestK },
    };
  }
  const last3 = candidate.slice(-3);
  if (setup.addSixth.includes(last3)) {
    return { number: candidate, tier: "sixth", amount: AMOUNTS.sixth, note: { kind: "additional" } };
  }
  return { number: candidate, tier: "none", amount: 0, note: { kind: "none" } };
}

// Quick check of a normalised 3-digit suffix: honest possible/cannot
// only — never a definite tier or an amount.
export function checkQuick(setup, q) {
  const channels = [];
  if (setup.special.slice(-3) === q) channels.push({ kind: "special" });
  if (setup.grand.slice(-3) === q) channels.push({ kind: "grand" });
  setup.first.forEach((f, index) => {
    if (f.slice(-3) === q) channels.push({ kind: "first", firstIndex: index });
  });
  if (setup.addSixth.includes(q)) channels.push({ kind: "additional" });
  return { possible: channels.length > 0, channels };
}

// Validates a raw candidate string for full (8) or quick (3) mode.
export function parseCandidate(raw, digits) {
  const value = cleanEntry(raw);
  if (value === "") return { ok: false, code: "CANDIDATE_REQUIRED" };
  if (/[^0-9]/.test(value)) return { ok: false, code: "CANDIDATE_NON_DIGIT" };
  if (value.length !== digits) return { ok: false, code: "CANDIDATE_LENGTH", expected: digits, actual: value.length };
  return { ok: true, value };
}

export function summarize(results) {
  const counts = {
    special: 0, grand: 0, first: 0, second: 0, third: 0, fourth: 0,
    fifth: 0, sixth: 0, none: 0, invalid: 0,
  };
  let totalAmount = 0;
  for (const result of results) {
    if (result.status === "invalid" || result.tier === "invalid") {
      counts.invalid += 1;
      continue;
    }
    counts[result.tier] += 1;
    totalAmount += result.amount;
  }
  return { counts, totalAmount };
}

// Classifies a pasted batch. Lines beyond MAX_BATCH_LINES are a limit
// error, never a silent truncation. A single trailing empty line (from
// a final newline) is ignored; any other line produces a row.
export function classifyBatch(setup, text) {
  const rawLines = String(text).split(/\r\n|\r|\n/);
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") rawLines.pop();
  if (rawLines.length > MAX_BATCH_LINES) {
    fail("BATCH_LIMIT", { limit: MAX_BATCH_LINES, actual: rawLines.length });
  }
  const rows = rawLines.map((raw, index) => {
    const value = cleanEntry(raw);
    const base = { line: index + 1, raw };
    if (value === "") return { ...base, status: "invalid", reason: "EMPTY" };
    if (/[^0-9]/.test(value)) return { ...base, status: "invalid", reason: "NON_DIGIT" };
    if (value.length !== 8) return { ...base, status: "invalid", reason: "LENGTH" };
    const result = checkFull(setup, value);
    return { ...base, status: "ok", number: value, tier: result.tier, amount: result.amount, note: result.note };
  });
  return { rows, summary: summarize(rows) };
}

export function formatAmount(amount) {
  return String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
