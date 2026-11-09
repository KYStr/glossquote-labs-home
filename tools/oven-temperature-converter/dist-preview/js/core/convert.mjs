// Oven Temperature Converter — pure core.
// Synchronous, no imports, no DOM / network / storage access.
// All conversion math uses exact BigInt rationals; rounding happens once,
// at output, and no output is ever derived from another rounded output.
//
// Fixed contract: docs/specs/oven-temperature-converter/SPEC.md
// (spec candidate acfe72ccf073cb5fa8d55281aff8ae262215a24d).

// The pinned standard Gas Mark chart. The °F column holds the published
// paired values; they are NOT formula results and are used verbatim for
// the conventional side of a Gas Mark input.
export const GAS_CHART = [
  { gasMark: '¼', gasHundredths: 25, celsius: 110, fahrenheit: 225 },
  { gasMark: '½', gasHundredths: 50, celsius: 120, fahrenheit: 250 },
  { gasMark: '1', gasHundredths: 100, celsius: 140, fahrenheit: 275 },
  { gasMark: '2', gasHundredths: 200, celsius: 150, fahrenheit: 300 },
  { gasMark: '3', gasHundredths: 300, celsius: 170, fahrenheit: 325 },
  { gasMark: '4', gasHundredths: 400, celsius: 180, fahrenheit: 350 },
  { gasMark: '5', gasHundredths: 500, celsius: 190, fahrenheit: 375 },
  { gasMark: '6', gasHundredths: 600, celsius: 200, fahrenheit: 400 },
  { gasMark: '7', gasHundredths: 700, celsius: 220, fahrenheit: 425 },
  { gasMark: '8', gasHundredths: 800, celsius: 230, fahrenheit: 450 },
  { gasMark: '9', gasHundredths: 900, celsius: 240, fahrenheit: 475 },
  { gasMark: '10', gasHundredths: 1000, celsius: 260, fahrenheit: 500 },
];

const VALUE_LIMIT = 8;
const ENUM_LIMIT = 16;
const VALUE_PATTERN = /^-?(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const UNITS = new Set(['celsius', 'fahrenheit', 'gas']);
const BASES = new Set(['conventional', 'fan']);

// Fan adjustment, applied once, in the entered unit, before conversion.
const FAN_ADJUST_HUNDREDTHS = { celsius: 2000n, fahrenheit: 2500n };
const FAN_ADJUST_CELSIUS = 20n;

// Input ranges, in hundredths of the entered unit.
const RANGE_HUNDREDTHS = {
  celsius: { min: -5000n, max: 35000n },
  fahrenheit: { min: -5800n, max: 66200n },
};

function fail(code, field) {
  return { ok: false, error: { code, field, row: null } };
}

function hasLoneSurrogate(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

// Parse a grammar-valid decimal string to integer hundredths (BigInt).
// "-0" is treated as 0.
function parseHundredths(raw) {
  let body = raw;
  let negative = false;
  if (body.startsWith('-')) {
    negative = true;
    body = body.slice(1);
  }
  const dot = body.indexOf('.');
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? '' : body.slice(dot + 1);
  const fracHundredths = (fracPart + '00').slice(0, 2);
  const value = BigInt(intPart) * 100n + BigInt(fracHundredths);
  return negative ? -value : value;
}

// Round the rational n/d (d > 0) to the nearest integer; exact halves
// round away from zero.
function roundHalfAwayFromZero(n, d) {
  const negative = n < 0n;
  const a = negative ? -n : n;
  const q = (2n * a + d) / (2n * d);
  return Number(negative ? -q : q);
}

// Exact rational helpers: a rational is { n, d } with d > 0.
function rat(n, d) {
  return { n, d };
}

function fahrenheitToCelsius(hundredthsF) {
  // °C = (°F − 32) × 5/9, with °F = hundredthsF / 100.
  return rat((hundredthsF - 3200n) * 5n, 900n);
}

function celsiusToFahrenheit(c) {
  // °F = °C × 9/5 + 32.
  return rat(9n * c.n + 160n * c.d, 5n * c.d);
}

function gasLookup(c) {
  // c is the exact Celsius rational.
  const low = GAS_CHART[0].celsius;
  const high = GAS_CHART[GAS_CHART.length - 1].celsius;
  if (c.n < BigInt(low) * c.d) return { gasMark: null, gasMarkRange: 'below' };
  if (c.n > BigInt(high) * c.d) return { gasMark: null, gasMarkRange: 'above' };
  let best = null;
  let bestDist = null;
  for (const row of GAS_CHART) {
    const dist = c.n - BigInt(row.celsius) * c.d;
    const abs = dist < 0n ? -dist : dist;
    // Strictly smaller wins; on an exact tie the later (hotter) row wins.
    if (bestDist === null || abs <= bestDist) {
      best = row;
      bestDist = abs;
    }
  }
  return { gasMark: best.gasMark, gasMarkRange: 'in' };
}

function buildSide(celsiusRational, tableFahrenheit) {
  const fahrenheit = tableFahrenheit !== null
    ? tableFahrenheit
    : roundHalfAwayFromZero(
      celsiusToFahrenheit(celsiusRational).n,
      celsiusToFahrenheit(celsiusRational).d,
    );
  const gas = gasLookup(celsiusRational);
  return {
    celsius: roundHalfAwayFromZero(celsiusRational.n, celsiusRational.d),
    fahrenheit,
    gasMark: gas.gasMark,
    gasMarkRange: gas.gasMarkRange,
  };
}

function runChecked(input) {
  // 1. SCHEMA: plain object, exactly the three own data fields, all strings.
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return fail('SCHEMA', null);
  }
  const keys = Object.keys(input);
  const fields = ['value', 'unit', 'basis'];
  if (keys.length !== fields.length || !fields.every((f) => keys.includes(f))) {
    return fail('SCHEMA', null);
  }
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(input, field);
    if (descriptor === undefined || !('value' in descriptor)) {
      return fail('SCHEMA', null);
    }
    if (typeof descriptor.value !== 'string') {
      return fail('SCHEMA', null);
    }
  }
  const { value, unit, basis } = input;

  // 2. Per-field raw limits, in field order: INPUT_LIMIT, then UNICODE.
  const rawFields = [
    ['value', value, VALUE_LIMIT],
    ['unit', unit, ENUM_LIMIT],
    ['basis', basis, ENUM_LIMIT],
  ];
  for (const [field, raw, limit] of rawFields) {
    if (raw.length > limit) return fail('INPUT_LIMIT', field);
    if (hasLoneSurrogate(raw)) return fail('UNICODE', field);
  }

  // 3. Value grammar.
  if (value === '') return fail('EMPTY', 'value');
  if (!VALUE_PATTERN.test(value)) return fail('DECIMAL_FORMAT', 'value');

  // 4. Enumerations, unit before basis.
  if (!UNITS.has(unit)) return fail('ENUM', 'unit');
  if (!BASES.has(basis)) return fail('ENUM', 'basis');

  // 5. Cross-field: Gas Mark has no fan setting.
  if (unit === 'gas' && basis === 'fan') return fail('FAN_GAS', 'basis');

  // 6. Value domain.
  const hundredths = parseHundredths(value);
  let gasRow = null;
  if (unit === 'gas') {
    gasRow = GAS_CHART.find((row) => BigInt(row.gasHundredths) === hundredths) ?? null;
    if (gasRow === null) return fail('GAS_VALUE', 'value');
  } else {
    const range = RANGE_HUNDREDTHS[unit];
    if (hundredths < range.min || hundredths > range.max) {
      return fail('RANGE', 'value');
    }
  }

  // Conversion pipeline.
  let conventionalC;
  let fanC;
  let conventionalTableF = null;
  if (unit === 'gas') {
    conventionalC = rat(BigInt(gasRow.celsius), 1n);
    fanC = rat(BigInt(gasRow.celsius) - FAN_ADJUST_CELSIUS, 1n);
    conventionalTableF = gasRow.fahrenheit;
  } else if (unit === 'celsius') {
    const adjust = FAN_ADJUST_HUNDREDTHS.celsius;
    const conventionalH = basis === 'fan' ? hundredths + adjust : hundredths;
    const fanH = basis === 'fan' ? hundredths : hundredths - adjust;
    conventionalC = rat(conventionalH, 100n);
    fanC = rat(fanH, 100n);
  } else {
    const adjust = FAN_ADJUST_HUNDREDTHS.fahrenheit;
    const conventionalH = basis === 'fan' ? hundredths + adjust : hundredths;
    const fanH = basis === 'fan' ? hundredths : hundredths - adjust;
    conventionalC = fahrenheitToCelsius(conventionalH);
    fanC = fahrenheitToCelsius(fanH);
  }

  return {
    ok: true,
    result: {
      conventional: buildSide(conventionalC, conventionalTableF),
      fan: buildSide(fanC, null),
    },
  };
}

export function run(input) {
  try {
    return runChecked(input);
  } catch {
    return fail('INTERNAL', null);
  }
}
