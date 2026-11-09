// Strict input parsing for the GPA core. No silent truncation, no guessing:
// a value is either exactly in bounds and on-step, or it is refused with a code.

function parseHalvesRaw(raw) {
  if (raw === null || raw === undefined) return { ok: false, code: "blank" };
  const s = String(raw).trim();
  if (s === "") return { ok: false, code: "blank" };
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, code: "not-a-number" };
  const doubled = Number(s) * 2;
  if (!Number.isInteger(doubled)) return { ok: false, code: "off-step" };
  return { ok: true, c2: doubled };
}

function inRange(r, minC2, maxC2) {
  if (!r.ok) return r;
  if (r.c2 < minC2 || r.c2 > maxC2) return { ok: false, code: "out-of-range" };
  return r;
}

// Credits per course row: 0.5..30 in 0.5 steps -> integer halves c2 in 1..60.
export function parseCreditsHalves(raw) {
  return inRange(parseHalvesRaw(raw), 1, 60);
}

// Solver credits: halves within [minC2, maxC2] (C0 may be 0; C1 may not).
export function parseSolverCreditsHalves(raw, minC2, maxC2) {
  return inRange(parseHalvesRaw(raw), minC2, maxC2);
}

// A GPA value: 0..scale maximum, at most two decimals -> integer hundredths.
// allowBlank lets the solver leave G0 empty (only valid when C0 = 0; the
// caller enforces that combination).
export function parseGpaHundredths(raw, maxTenths, { allowBlank = false } = {}) {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return allowBlank ? { ok: true, blank: true, h100: 0 } : { ok: false, code: "blank" };
  }
  const s = String(raw).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { ok: false, code: "bad-format" };
  const h100 = Math.round(Number(s) * 100);
  if (h100 < 0 || h100 > maxTenths * 10) return { ok: false, code: "out-of-range" };
  return { ok: true, blank: false, h100 };
}
