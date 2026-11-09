// Paint Coverage Calculator — pure validation and computation core.
// Implements docs/specs/paint-coverage-calculator/SPEC.md section 4 exactly:
// exact rational arithmetic, display rounding half-up to 2 dp, can count as
// the exact mathematical ceiling of exact litres / can size.
// Pure module: no DOM, no network, no storage imports.

import { frac, fAdd, fSub, fMulInt, fDiv, fCmp, fCeilDiv, formatHalfUp2 } from './fractions.mjs';

// ---- Auditable constants (SPEC section 4; appear exactly once) ----
// Standard opening sizes: door 0.9 m x 2.1 m, window 1.5 m x 1.2 m.
export const DOOR_AREA = frac(189, 100); // exactly 1.89 m²
export const WINDOW_AREA = frac(180, 100); // exactly 1.80 m²

// Field bounds, in hundredths of the field unit (metres, m² or m²/L).
export const DECIMAL_FIELDS = {
  length: { minH: 10n, maxH: 10000n }, // 0.1–100 m
  width: { minH: 10n, maxH: 10000n }, // 0.1–100 m
  height: { minH: 10n, maxH: 1000n }, // 0.1–10 m
  customOpenings: { minH: 0n, maxH: 100000n }, // 0–1,000 m²
  coverage: { minH: 100n, maxH: 3000n }, // 1–30 m²/L
};

export const WHOLE_FIELDS = {
  doors: { min: 0, max: 20 },
  windows: { min: 0, max: 20 },
  coats: { min: 1, max: 4 },
};

// Closed can-size list, in hundredths of a litre: 0.5 / 1 / 2.5 / 5 / 10 L.
export const CAN_SIZE_HUNDREDTHS = [50n, 100n, 250n, 500n, 1000n];

// SPEC section 3 initial state (fixture P1 inputs).
export const INITIAL_INPUTS = {
  length: '4',
  width: '5',
  height: '2.8',
  doors: '1',
  windows: '2',
  customOpenings: '0',
  ceiling: false,
  coats: '2',
  coverage: '10',
  canSize: '5',
};

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

function splitDecimal(text) {
  const negative = text.startsWith('-');
  const body = negative ? text.slice(1) : text;
  const dot = body.indexOf('.');
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? '' : body.slice(dot + 1);
  return { negative, intPart, fracPart };
}

/**
 * Parse a raw field string as a decimal with at most two decimal places.
 * Returns { ok: true, hundredths: BigInt } or { ok: false, code } where
 * code is 'empty' | 'not-a-number' | 'too-many-decimals'.
 */
export function parseDecimal(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: false, code: 'empty' };
  if (!DECIMAL_RE.test(text)) return { ok: false, code: 'not-a-number' };
  const { negative, intPart, fracPart } = splitDecimal(text);
  if (fracPart.length > 2) return { ok: false, code: 'too-many-decimals' };
  let hundredths = BigInt(intPart) * 100n + BigInt((fracPart + '00').slice(0, 2));
  if (negative) hundredths = -hundredths;
  return { ok: true, hundredths };
}

/** Validate a decimal field against its bounds (hundredths integers). */
export function validateDecimalField(name, raw) {
  const bounds = DECIMAL_FIELDS[name];
  if (!bounds) throw new RangeError(`unknown decimal field: ${name}`);
  const parsed = parseDecimal(raw);
  if (!parsed.ok) return parsed;
  if (parsed.hundredths < bounds.minH || parsed.hundredths > bounds.maxH) {
    return { ok: false, code: 'out-of-range' };
  }
  return parsed;
}

/**
 * Validate a whole-number field (counts, coats).
 * Returns { ok: true, value: number } or { ok: false, code } where code is
 * 'empty' | 'not-a-number' | 'too-many-decimals' | 'not-whole' | 'out-of-range'.
 */
export function validateWholeField(name, raw) {
  const bounds = WHOLE_FIELDS[name];
  if (!bounds) throw new RangeError(`unknown whole field: ${name}`);
  const text = String(raw ?? '').trim();
  if (text === '') return { ok: false, code: 'empty' };
  if (!DECIMAL_RE.test(text)) return { ok: false, code: 'not-a-number' };
  const { negative, intPart, fracPart } = splitDecimal(text);
  if (fracPart.length > 2) return { ok: false, code: 'too-many-decimals' };
  if (/[1-9]/.test(fracPart)) return { ok: false, code: 'not-whole' };
  let value = Number(intPart);
  if (negative) value = -value;
  if (value < bounds.min || value > bounds.max) return { ok: false, code: 'out-of-range' };
  return { ok: true, value };
}

/** Validate a can-size choice (string from the closed list, e.g. "2.5"). */
export function validateCanSize(raw) {
  const parsed = parseDecimal(raw);
  if (!parsed.ok) return parsed;
  if (!CAN_SIZE_HUNDREDTHS.includes(parsed.hundredths)) {
    return { ok: false, code: 'out-of-range' };
  }
  return parsed;
}

/**
 * Exact purchase for an exact litres fraction and a can size in hundredths
 * of a litre. Returns { cans: BigInt, purchased: frac, leftover: frac }.
 * cans is the exact mathematical ceiling; an exactly divisible litres value
 * buys exactly that many cans.
 */
export function purchaseForLitres(litres, canSizeHundredths) {
  const canSize = frac(canSizeHundredths, 100n);
  const cans = fCeilDiv(litres, canSize);
  const purchased = fMulInt(canSize, cans);
  const leftover = fSub(purchased, litres);
  return { cans, purchased, leftover };
}

/**
 * Full computation from already-validated exact inputs:
 * { lengthH, widthH, heightH, customH, coverageH, canSizeH } are hundredths
 * BigInts; doors/windows/coats are Numbers; ceiling is boolean.
 * Returns { ok: true, gross, deductions, ceilingArea, paintable, litres,
 * cans, purchased, leftover } (all fractions except cans, a BigInt), or
 * { ok: false, code: 'openings-exceed-walls', gross, deductions } when total
 * deductions reach or exceed the gross wall area (SPEC sections 3–4); the
 * ceiling never rescues the comparison, which is against gross walls alone.
 */
export function computePaint(v) {
  const gross = frac(2n * (v.lengthH + v.widthH) * v.heightH, 10000n);
  const deductions = fAdd(
    fAdd(fMulInt(DOOR_AREA, v.doors), fMulInt(WINDOW_AREA, v.windows)),
    frac(v.customH, 100n),
  );
  if (fCmp(deductions, gross) >= 0) {
    return { ok: false, code: 'openings-exceed-walls', gross, deductions };
  }
  const ceilingArea = v.ceiling ? frac(v.lengthH * v.widthH, 10000n) : frac(0);
  const paintable = fAdd(fSub(gross, deductions), ceilingArea);
  const litres = fDiv(fMulInt(paintable, v.coats), frac(v.coverageH, 100n));
  const { cans, purchased, leftover } = purchaseForLitres(litres, v.canSizeH);
  return {
    ok: true,
    gross,
    deductions,
    ceilingArea,
    paintable,
    litres,
    cans,
    purchased,
    leftover,
  };
}

/** Display formatters: every area/litre figure at 2 dp half-up (SPEC s.4). */
export const display2 = (value) => formatHalfUp2(value);
export const displayCans = (cans) => cans.toString();
