// Pure core for the Daily Water Intake Calculator (SPEC section 4).
// No DOM, network or storage access. All arithmetic is exact integer math
// in units of 1/40 ml, so the pinned decimal model never drifts.

export const MODEL = Object.freeze({
  baselineLowMlPerKg: 30,
  baselineHighMlPerKg: 35,
  cupMl: 250,
  weightMinKg: 20,
  weightMaxKg: 300,
  activityMl: Object.freeze({ sedentary: 0, light: 350, moderate: 700, high: 1050 }),
  activityOrder: Object.freeze(['sedentary', 'light', 'moderate', 'high']),
  // factor is the printed decimal; num/den is the same value as an exact
  // fraction used by the computation.
  climate: Object.freeze({
    temperate: Object.freeze({ factor: 1.0, num: 1, den: 1 }),
    warm: Object.freeze({ factor: 1.1, num: 11, den: 10 }),
    hot: Object.freeze({ factor: 1.25, num: 5, den: 4 }),
  }),
  climateOrder: Object.freeze(['temperate', 'warm', 'hot']),
});

// Parse a raw weight value (string from the input, or a number in tests).
// Returns { ok: true, kgTenths } or { ok: false, reason } where reason is
// 'empty' | 'format' | 'decimals' | 'range'. Nothing is guessed or truncated.
export function parseWeight(raw) {
  const text = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim();
  if (text === '') return { ok: false, reason: 'empty' };
  if (!/^\d+(\.\d+)?$/.test(text)) return { ok: false, reason: 'format' };
  const dot = text.indexOf('.');
  if (dot !== -1 && text.length - dot - 1 > 1) return { ok: false, reason: 'decimals' };
  const kgTenths = Math.round(Number(text) * 10);
  if (kgTenths < MODEL.weightMinKg * 10 || kgTenths > MODEL.weightMaxKg * 10) {
    return { ok: false, reason: 'range' };
  }
  return { ok: true, kgTenths };
}

// Exact value in 1/40 ml units.
// low base  = 30 * (t/10) = 3t            -> *40 = (3t + A) * 40
// high base = 35 * (t/10) = 7t/2          -> *40 = 140t + 40A
// climate num/den then divides exactly for every pinned combination.
function exact40(kgTenths, activityMl, climate, rate) {
  const base40 = rate === MODEL.baselineLowMlPerKg
    ? (3 * kgTenths + activityMl) * 40
    : 140 * kgTenths + 40 * activityMl;
  const numerator = base40 * climate.num;
  if (numerator % climate.den !== 0) throw new Error('non-exact model arithmetic');
  return numerator / climate.den;
}

export function roundHalfUpMl(exact40Value) {
  return Math.floor((exact40Value + 20) / 40);
}

// Cups are computed from the exact (unrounded) value, per SPEC section 4:
// cups = exactMl / 250, displayed at one decimal, half-up.
// exactMl = n40 / 40, so tenths-of-a-cup = roundHalfUp(n40 / 1000).
export function cupsTenthsFromExact40(exact40Value) {
  return Math.floor((exact40Value + 500) / 1000);
}

export function computeRange(kgTenths, activity, climateKey) {
  if (!Object.hasOwn(MODEL.activityMl, activity)) throw new RangeError('unknown activity: ' + activity);
  if (!Object.hasOwn(MODEL.climate, climateKey)) throw new RangeError('unknown climate: ' + climateKey);
  const activityMl = MODEL.activityMl[activity];
  const climate = MODEL.climate[climateKey];
  const lowExact40 = exact40(kgTenths, activityMl, climate, MODEL.baselineLowMlPerKg);
  const highExact40 = exact40(kgTenths, activityMl, climate, MODEL.baselineHighMlPerKg);
  return Object.freeze({
    kgTenths,
    activity,
    climate: climateKey,
    lowExact40,
    highExact40,
    lowMl: roundHalfUpMl(lowExact40),
    highMl: roundHalfUpMl(highExact40),
    lowCupsTenths: cupsTenthsFromExact40(lowExact40),
    highCupsTenths: cupsTenthsFromExact40(highExact40),
  });
}

// Stateful calculator implementing the SPEC section 3 lifecycle: an invalid
// weight freezes the result at its last valid state instead of clearing it.
export function createCalculator() {
  let lastResult = null;
  return {
    update({ weightRaw, activity, climate }) {
      const parsed = parseWeight(weightRaw);
      if (!parsed.ok) return { status: 'error', reason: parsed.reason, result: lastResult };
      lastResult = computeRange(parsed.kgTenths, activity, climate);
      return { status: 'ok', result: lastResult };
    },
    get lastResult() { return lastResult; },
  };
}

export function formatMl(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatCupsTenths(tenths) {
  return Math.floor(tenths / 10) + '.' + (tenths % 10);
}
