import { error, hasOwnDataFields, ok, shortStringError, verifyFixtures } from '../fixture-review.mjs';

const fields = ['mode', 'lengthM', 'widthM', 'areaUnit', 'areaValue', 'roomType', 'bulbLumens'];
const places = { lengthM: 1, widthM: 1, areaValue: 2, bulbLumens: 0 };
const targetLuxByRoom = { living: 100n, bedroom: 75n, kitchen: 100n, bathroom: 100n, study: 300n, corridor: 100n };
const defaultDraft = {
  mode: 'dimensions', lengthM: '4.0', widthM: '3.5', areaUnit: 'm2',
  areaValue: '20.00', roomType: 'living', bulbLumens: '800',
};
const halfUp = (n, d) => (2n * n + d) / (2n * d);
const ceil = (n, d) => (n + d - 1n) / d;

function scaleInteger(raw, digits) {
  const [whole, fraction = ''] = raw.split('.');
  return BigInt(whole + fraction.padEnd(digits, '0'));
}

function exactArea(values, mode, unit) {
  if (mode === 'dimensions') return [values.lengthM * values.widthM, 100n];
  if (unit === 'ping') return [values.areaValue * 4n, 121n];
  return [values.areaValue, 100n];
}

function derive(input) {
  if (!hasOwnDataFields(input, fields) || fields.some((field) => typeof input[field] !== 'string')) return error('SCHEMA');
  const { mode, areaUnit } = input;
  const inactive = mode === 'area' ? ['lengthM', 'widthM'] : ['areaUnit', 'areaValue'];
  const choices = {
    mode: ['dimensions', 'area'], areaUnit: ['m2', 'ping'], roomType: Object.keys(targetLuxByRoom),
  };
  const limits = {
    lengthM: [5n, 1000n],
    widthM: [5n, 1000n],
    areaValue: areaUnit === 'ping' ? [8n, 300_000n] : [25n, 1_000_000n],
    bulbLumens: [1n, 100_000n],
  };
  const values = {};
  for (const field of fields) {
    const raw = input[field];
    const numeric = Object.hasOwn(places, field);
    if (numeric && raw.length > 8) return error('INPUT_LIMIT', field);
    if (inactive.includes(field)) continue;
    const code = shortStringError(raw, Infinity);
    if (code) return error(code, field);
    if (!numeric) {
      if (!choices[field].includes(raw)) return error('ENUM', field);
      continue;
    }
    const digits = places[field];
    const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(raw);
    if (!match || (match[2]?.length ?? 0) > digits) {
      return error(digits === 0 ? 'INTEGER_FORMAT' : 'DECIMAL_FORMAT', field);
    }
    const scaled = scaleInteger(raw, digits);
    const [min, max] = limits[field];
    if (scaled < min || scaled > max) return error('RANGE', field);
    values[field] = scaled;
  }

  const [areaN, areaD] = exactArea(values, mode, areaUnit);
  const targetLux = targetLuxByRoom[input.roomType];
  const total = halfUp(areaN * targetLux, areaD);
  const count = ceil(total, values.bulbLumens);
  const installed = count * values.bulbLumens;
  return ok({
    areaM2: Number(halfUp(areaN * 100n, areaD)) / 100,
    targetLux: Number(targetLux), totalLumens: Number(total),
    bulbCount: Number(count), installedLumens: Number(installed),
    achievedLux: Number(halfUp(installed * areaD * 10n, areaN)) / 10,
  });
}

function probes() {
  const justOver = { ...defaultDraft, mode: 'area', areaUnit: 'ping', areaValue: '1.09', roomType: 'kitchen', bulbLumens: '360' };
  const areaN = 436n;
  const areaD = 121n;
  const requirement = areaN * 100n;
  const exactCount = ceil(requirement, areaD * 360n);
  const equality = { ...defaultDraft, lengthM: '5.0', widthM: '4.0', roomType: 'kitchen', bulbLumens: '1000' };
  const corridor = { ...defaultDraft, roomType: 'corridor' };
  const historicTarget = 50n;
  const hiddenOversize = { ...defaultDraft, areaValue: '123456789' };
  return [
    { id: 'LIGHT-01', input: justOver, exactArea: '436/121', exactLumens: '43600/121',
      stated: derive(justOver).result, countFromExactRequirement: Number(exactCount),
      estimateFromExactCount: Number(halfUp(exactCount * 360n * areaD * 10n, areaN)) / 10,
      exactBulbMultiple: { input: equality, output: derive(equality).result } },
    { id: 'LIGHT-02', input: corridor,
      pinnedAndGb2024: derive(corridor).result,
      oldGb2013Corridor: { targetLux: Number(historicTarget), lumens: Number(14n * historicTarget), bulbCount: Number(ceil(14n * historicTarget, 800n)) } },
    { id: 'LIGHT-04', input: hiddenOversize, output: derive(hiddenOversize),
      note: 'areaValue is inactive in dimensions mode under the stated UI rules.' },
  ];
}
await verifyFixtures('lighting-lumen-calculator', derive, defaultDraft, probes);
