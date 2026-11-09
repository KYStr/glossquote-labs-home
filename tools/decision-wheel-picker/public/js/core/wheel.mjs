// Decision Wheel Picker — pure core (SPEC section 4 and 5).
// No DOM, no network, no storage. The only randomness in the product is
// the rejection-sampling draw below, fed by an injectable uint32 source
// so tests can script exact byte streams (SPEC section 4 fixtures).

export const MIN_ENTRIES = 2;
export const MAX_ENTRIES = 50;
export const MAX_ENTRY_CHARS = 60;
export const UINT32_RANGE = 4294967296; // 2^32

// Split the textarea text into entries: one per line, each trimmed of
// leading/trailing Unicode whitespace, empty results dropped, original
// order kept, duplicates kept as separate entries (SPEC section 4).
// Returns { entries, errors } where an error is
// { code: "entry_too_long", line } with the 1-based line number in the
// original (untrimmed) text.
export function parseEntries(text) {
  if (typeof text !== "string") {
    throw new TypeError("parseEntries expects a string.");
  }
  const lines = text.split(/\r\n|\n|\r/);
  const entries = [];
  const errors = [];
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "") continue;
    // Length is counted in Unicode code points after trimming.
    if ([...trimmed].length > MAX_ENTRY_CHARS) {
      errors.push({ code: "entry_too_long", line: i + 1 });
      continue;
    }
    entries.push(trimmed);
  }
  return { entries, errors };
}

// Count rule: the active list must hold 2..50 entries to spin.
// Returns null when valid, otherwise { code, count }.
export function validateCount(count) {
  if (!Number.isInteger(count) || count < 0) {
    throw new TypeError("validateCount expects a non-negative integer.");
  }
  if (count < MIN_ENTRIES) return { code: "too_few", count };
  if (count > MAX_ENTRIES) return { code: "too_many", count };
  return null;
}

// limit = floor(2^32 / n) * n, computed exactly (2^32 and all results
// here are exactly representable as doubles for 2 <= n <= 50).
export function drawLimit(n) {
  if (!Number.isInteger(n) || n < 1 || n > UINT32_RANGE) {
    throw new RangeError("drawLimit expects an integer n in 1..2^32.");
  }
  return Math.floor(UINT32_RANGE / n) * n;
}

// One uniform draw over n entries by rejection sampling (SPEC section 4):
// repeatedly take one unsigned 32-bit integer v from nextUint32 until
// v < limit; the pick index is v mod n. Returns { index, rejected }
// where rejected counts the discarded values (exposed for tests; the
// product UI does not display it).
export function drawIndex(n, nextUint32) {
  if (typeof nextUint32 !== "function") {
    throw new TypeError("drawIndex expects a uint32 source function.");
  }
  const limit = drawLimit(n);
  let rejected = 0;
  for (;;) {
    const v = nextUint32();
    if (!Number.isInteger(v) || v < 0 || v >= UINT32_RANGE) {
      throw new RangeError("uint32 source returned a value outside 0..2^32-1.");
    }
    if (v < limit) return { index: v % n, rejected };
    rejected += 1;
  }
}

// True when the platform crypto source required by the SPEC exists.
// Its absence is a hard error state in the UI, never a fallback.
export function isCryptoAvailable() {
  return (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.getRandomValues === "function"
  );
}

// A uint32 source backed by crypto.getRandomValues (one value per call).
export function createCryptoSource() {
  if (!isCryptoAvailable()) {
    throw new Error("crypto.getRandomValues is not available.");
  }
  const buffer = new Uint32Array(1);
  return () => {
    globalThis.crypto.getRandomValues(buffer);
    return buffer[0];
  };
}

// Elimination state machine (SPEC sections 2-4).
// - setEntries replaces the parsed list and clears any run.
// - spin draws first (nothing here animates; presentation is the DOM
//   layer's job and cannot change the drawn slice).
// - In elimination mode the drawn occurrence (that index, not every
//   equal text) is removed after the pick; when exactly one entry
//   remains it becomes finalRemaining and is never itself drawn.
// - The editor lock is derived: an elimination run with at least one
//   pick is in progress until reset or setEntries.
export function createSession({ elimination = false } = {}) {
  let parsed = [];
  let active = [];
  let history = [];
  let finalRemaining = null;
  let elim = Boolean(elimination);

  function setEntries(entries) {
    parsed = [...entries];
    active = [...entries];
    history = [];
    finalRemaining = null;
  }

  function setElimination(on) {
    elim = Boolean(on);
    // Changing mode starts a fresh run over the full parsed list.
    active = [...parsed];
    history = [];
    finalRemaining = null;
  }

  function reset() {
    active = [...parsed];
    history = [];
    finalRemaining = null;
  }

  function spin(nextUint32) {
    if (finalRemaining !== null) {
      throw new Error("The elimination run is finished; reset to spin again.");
    }
    if (active.length < MIN_ENTRIES) {
      throw new Error("At least 2 active entries are required to spin.");
    }
    const { index, rejected } = drawIndex(active.length, nextUint32);
    const text = active[index];
    const pick = history.length + 1;
    history.push({ text, pick });
    if (elim) {
      active.splice(index, 1);
      if (active.length === 1) finalRemaining = active[0];
    }
    return { text, index, pick, rejected, finalRemaining };
  }

  function getState() {
    return {
      elimination: elim,
      active: [...active],
      history: history.map((entry) => ({ ...entry })),
      finalRemaining,
      locked: elim && history.length > 0,
      finished: finalRemaining !== null,
      canSpin: finalRemaining === null && active.length >= MIN_ENTRIES,
    };
  }

  return { setEntries, setElimination, reset, spin, getState };
}
