import assert from 'node:assert/strict';
import { error, hasOwnDataFields, ok, shortStringError, verifyFixtures } from '../fixture-review.mjs';

const fields = ['diagonalIn', 'widthPx', 'heightPx'];
const defaultDraft = { diagonalIn: '27', widthPx: '2560', heightPx: '1440' };
const integer = /^(0|[1-9][0-9]*)$/;
const decimal = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,2}))?$/;

function gcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function roundBinary(value, places) {
  const scale = 10 ** places;
  return Math.floor(value * scale + 0.5) / scale;
}

function rawDimensions(diagonalIn, widthPx, heightPx) {
  const pixelDiagonal = Math.sqrt(widthPx ** 2 + heightPx ** 2);
  const ppi = pixelDiagonal / diagonalIn;
  return { pixelDiagonal, ppi, widthCm: (widthPx / ppi) * 2.54, heightCm: (heightPx / ppi) * 2.54 };
}

function integerSqrt(n) {
  let low = 0n;
  let high = 1n;
  while (high * high <= n) high *= 2n;
  while (high - low > 1n) {
    const middle = (high + low) / 2n;
    if (middle * middle <= n) low = middle;
    else high = middle;
  }
  return low;
}

// Round the square root of a squared rational by comparing directly to the half-unit boundary.
function roundExactRoot(n, d, places) {
  const scale = 10n ** BigInt(places);
  const scaled = n * scale * scale;
  const floor = integerSqrt(scaled / d);
  const up = 4n * scaled >= d * (2n * floor + 1n) ** 2n;
  return Number(floor + (up ? 1n : 0n)) / Number(scale);
}

function exactRoundedMeasures(rawInput, w, h) {
  const [whole, decimalDigits = ''] = rawInput.diagonalIn.split('.');
  const dHundredths = BigInt(whole) * 100n + BigInt(decimalDigits.padEnd(2, '0'));
  const width = BigInt(w);
  const height = BigInt(h);
  const sqDiag = width ** 2n + height ** 2n;
  const pixelToCm = dHundredths * 254n;
  const wholeProduct = width * height;
  const roundCentimegapixels = (2n * wholeProduct + 10000n) / 20000n;
  return {
    ppi: roundExactRoot(sqDiag * 10000n, dHundredths ** 2n, 1),
    widthCm: roundExactRoot((width * pixelToCm) ** 2n, 10000n ** 2n * sqDiag, 1),
    heightCm: roundExactRoot((height * pixelToCm) ** 2n, 10000n ** 2n * sqDiag, 1),
    dotPitchMm: roundExactRoot(pixelToCm ** 2n, 1000n ** 2n * sqDiag, 3),
    megapixels: Number(roundCentimegapixels) / 100,
  };
}

function derive(input, checkExact = true) {
  if (!hasOwnDataFields(input, fields) || fields.some((field) => typeof input[field] !== 'string')) return error('SCHEMA');
  const values = {};
  for (const field of fields) {
    const raw = input[field];
    const code = shortStringError(raw, 8);
    if (code) return error(code, field);
    const isDiagonal = field === 'diagonalIn';
    const regex = isDiagonal ? decimal : integer;
    if (!regex.test(raw)) return error(isDiagonal ? 'DECIMAL_FORMAT' : 'INTEGER_FORMAT', field);
    const n = Number(raw);
    const [min, max] = isDiagonal ? [0.1, 200] : [1, 16384];
    if (n < min || n > max) return error('RANGE', field);
    values[field] = n;
  }
  const { diagonalIn, widthPx, heightPx } = values;
  const raw = rawDimensions(diagonalIn, widthPx, heightPx);
  const divisor = gcd(widthPx, heightPx);
  const measured = {
    ppi: roundBinary(raw.ppi, 1),
    widthCm: roundBinary(raw.widthCm, 1),
    heightCm: roundBinary(raw.heightCm, 1),
    dotPitchMm: roundBinary(25.4 / raw.ppi, 3),
    megapixels: roundBinary((widthPx * heightPx) / 1_000_000, 2),
  };
  if (checkExact) assert.deepEqual(measured, exactRoundedMeasures(input, widthPx, heightPx));
  return ok({ ...values, ...measured, aspectRatio: widthPx / divisor + ':' + heightPx / divisor });
}

function probes() {
  const fhd = { diagonalIn: '24', widthPx: '1920', heightPx: '1080' };
  const raw = rawDimensions(24, 1920, 1080);
  const recoveredDiagonalIn = Math.sqrt(raw.widthCm ** 2 + raw.heightCm ** 2) / 2.54;
  const phone = { diagonalIn: '6.10', widthPx: '1179', heightPx: '2556' };
  const tie = { diagonalIn: '24', widthPx: '1000', heightPx: '1005' };
  const smallest = { diagonalIn: '200', widthPx: '1', heightPx: '1' };
  return [
    { id: 'PPI-01', input: fhd, raw, recoveredDiagonalIn,
      statedComparisonPpi: raw.ppi, correctedComparisonDiagonalIn: 24,
      independentWidthBasedPpi: 1920 / (raw.widthCm / 2.54) },
    { id: 'PPI-02', input: phone, outputUnderGrammar: derive(phone),
      sameNumericOutputAsShorterInput: derive({ ...phone, diagonalIn: '6.1' }) },
    { id: 'PPI-MP-TIE', input: tie,
      displayUsingPinnedBinary64: derive(tie, false).result.megapixels,
      displayUsingExactDecimalHalfUp: exactRoundedMeasures(tie, 1000, 1005).megapixels },
    { id: 'PPI-LOW-DENSITY', input: smallest, output: derive(smallest).result },
  ];
}
await verifyFixtures('screen-ppi-calculator', derive, defaultDraft, probes);
