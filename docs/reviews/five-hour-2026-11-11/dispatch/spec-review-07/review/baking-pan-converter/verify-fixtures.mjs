import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Document-only reference. Expected fields from fixtures are used only for comparison.
const candidate = '88a5d223d06de8e6a732327a92fed78f94296e74';
const sourceDirectory = process.argv[2];
assert.ok(sourceDirectory, 'Usage: node verify-fixtures.mjs <candidate-source-directory>');
const remoteBlobs = {
  'BRIEF.md': '606c21e8d1770f09e58e166ac9eaa0a5fd756b7e',
  'SPEC.md': '8d47eb70dcc2c7a8209fce987114ffe8f6cb7f82',
  'fixtures.json': 'b24bdc92a78b500e9d4c336d41fc79a2a2e3c8e3',
  'AUTHOR-CHECK.md': 'b53f450dd7df41a3b08d3a89453733f21a7850a2',
};
const source = {};
const provenance = [];
for (const [name, blob] of Object.entries(remoteBlobs)) {
  const bytes = readFileSync(join(sourceDirectory, name));
  const gitBlob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
  assert.equal(gitBlob, blob, name + ' Git blob');
  provenance.push({ name, bytes: bytes.length, gitBlob, sha256: sha256(bytes) });
  source[name] = bytes.toString('utf8');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

const pi = [314159265358979323846264338327950288419716939937510n, 10n ** 50n];
const [piNumerator, piDenominator] = pi;
const scale = 100n;

function hundredths(text) {
  const [integer, decimals = ''] = text.split('.');
  return BigInt(integer) * scale + BigInt(decimals.padEnd(2, '0'));
}

function roundUnits([numerator, denominator], places) {
  const scaled = numerator * 10n ** BigInt(places);
  return (2n * scaled + denominator) / (2n * denominator);
}

function formatUnits(units, places) {
  if (places === 0) return units.toString();
  const digits = units.toString().padStart(places + 1, '0');
  return digits.slice(0, -places) + '.' + digits.slice(-places);
}

function formatRatio(value, places) {
  return formatUnits(roundUnits(value, places), places);
}

function geometry(shape, dimensions) {
  const [length, width, depth] = dimensions;
  if (shape === 'round') {
    return [piNumerator * length * length * depth, 4n * piDenominator * scale ** 3n];
  }
  return [length * width * depth, scale ** 3n];
}

function doubleVolume(shape, dimensions) {
  const [length, width, depth] = dimensions.map(value => Number(value) / Number(scale));
  const radius = length / 2;
  return shape === 'round' ? ((Math.PI * radius) * radius) * depth : (length * width) * depth;
}

// Geometry seeds are nominal inch dimensions. The final two seeds are chart capacities in cups.
const dimensionsInches = [
  ['round-6', 'round', '6', '0', '2'],
  ['round-7', 'round', '7', '0', '2'],
  ['round-8', 'round', '8', '0', '2'],
  ['round-9', 'round', '9', '0', '2'],
  ['round-10', 'round', '10', '0', '2'],
  ['square-8', 'rect', '8', '8', '2'],
  ['square-9', 'rect', '9', '9', '2'],
  ['rect-9x13', 'rect', '9', '13', '2'],
  ['loaf-9x5', 'rect', '9', '5', '2.5'],
];
const chartCups = [['bundt-10', 12], ['tube-10', 16]];
const pinnedRows = new Map();
for (const line of source['SPEC.md'].split('\n')) {
  const [id, , , inches, cm, depth, volume, basis] = line.split('|').slice(1, -1).map(cell => cell.trim());
  if (/^(?:round-|square-|rect-|loaf-|bundt-|tube-)/u.test(id ?? '')) {
    pinnedRows.set(id, { inches, cm, depth, volume: Number(volume), basis });
  }
}
const table = new Map();
const tableEvidence = [];
for (const [id, shape, length, width, depth] of dimensionsInches) {
  const cm = [length, width, depth].map(value => hundredths(value) * 254n / scale);
  const [lengthCm, widthCm, depthCm] = cm.map(value => formatUnits(value, 2));
  const capacity = geometry(shape, cm);
  const volume = Number(roundUnits(capacity, 0));
  const double = doubleVolume(shape, cm);
  assert.equal(volume, Math.floor(double + 0.5), id + ' binary64 rounding');
  const printedCm = shape === 'round' ? '⌀' + lengthCm + ' × ' + depthCm :
    lengthCm + '×' + widthCm + ' × ' + depthCm;
  assert.equal(pinnedRows.get(id).cm, printedCm, id + ' converted dimensions');
  assert.equal(pinnedRows.get(id).depth, depthCm, id + ' depth');
  assert.equal(pinnedRows.get(id).volume, volume, id + ' capacity');
  assert.equal(pinnedRows.get(id).basis, 'geometric', id + ' basis');
  table.set(id, { volume, depthCm, basis: 'geometric' });
  tableEvidence.push({ id, nominalInches: [length, width, depth], cm: printedCm, exactMlTo9dp: formatRatio(capacity, 9), volumeMl: volume });
}
for (const [id, cups] of chartCups) {
  const volume = cups * 237;
  assert.equal(pinnedRows.get(id).volume, volume, id + ' capacity');
  assert.equal(pinnedRows.get(id).depth, 'null', id + ' depth');
  assert.equal(pinnedRows.get(id).basis, 'nominal', id + ' basis');
  table.set(id, { volume, depthCm: null, basis: 'nominal' });
  tableEvidence.push({ id, nominalCups: cups, mlPerCup: 237, volumeMl: volume, depthCm: null });
}
assert.equal(pinnedRows.size, table.size);

const sides = ['source', 'target'];
const panSuffixes = ['Kind', 'Pan', 'Shape', 'D1', 'D2', 'Depth'];
const fields = [...sides.flatMap(side => panSuffixes.map(suffix => side + suffix)), 'quantity', 'quantityUnit'];
const limits = { Kind: 8, Pan: 12, Shape: 8, D1: 8, D2: 8, Depth: 8 };
const decimal = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/u;

function failure(code, field = null) {
  return { ok: false, error: { code, field, row: null } };
}

function validate(input) {
  if (input === null || typeof input !== 'object' ||
      ![null, Object.prototype].includes(Object.getPrototypeOf(input)) ||
      Reflect.ownKeys(input).length !== fields.length ||
      fields.some(field => typeof Object.getOwnPropertyDescriptor(input, field)?.value !== 'string')) {
    return failure('SCHEMA');
  }
  for (const field of fields) {
    const value = input[field];
    const side = sides.find(prefix => field.startsWith(prefix));
    const suffix = side ? field.slice(side.length) : field;
    const limit = limits[suffix] ?? (field === 'quantity' ? 10 : 4);
    if (value.length > limit) return failure('INPUT_LIMIT', field);

    const isTable = input[side + 'Kind'] === 'table';
    const isRect = input[side + 'Shape'] === 'rect';
    if ((suffix === 'Pan' && !isTable) ||
        (['Shape', 'D1', 'D2', 'Depth'].includes(suffix) && isTable) ||
        (suffix === 'D2' && !isRect) ||
        (field === 'quantityUnit' && input.quantity === '')) continue;
    if (!value.isWellFormed()) return failure('UNICODE', field);
    if (value === '') {
      if (field === 'quantity') continue;
      return failure('EMPTY', field);
    }

    const choices = {
      Kind: ['table', 'custom'], Pan: [...table.keys()], Shape: ['round', 'rect'], quantityUnit: ['g', 'ml'],
    }[suffix];
    if (choices) {
      if (!choices.includes(value)) return failure('ENUM', field);
      continue;
    }
    if (decimal.exec(value)?.[0] !== value) return failure('DECIMAL_FORMAT', field);
    const magnitude = hundredths(value);
    const [min, max] = field === 'quantity' ? [1n, 10000000n] :
      suffix === 'Depth' ? [100n, 1500n] : [500n, 6000n];
    if (magnitude < min || magnitude > max) return failure('RANGE', field);
  }
  return null;
}

function pan(input, side) {
  if (input[side + 'Kind'] === 'table') {
    const id = input[side + 'Pan'];
    const { volume, depthCm, basis } = table.get(id);
    return {
      exact: [BigInt(volume), 1n],
      double: volume,
      result: { kind: 'table', pan: id, shape: null, volumeMl: volume, basis, depthCm },
    };
  }
  const shape = input[side + 'Shape'];
  const dims = [
    hundredths(input[side + 'D1']),
    shape === 'rect' ? hundredths(input[side + 'D2']) : 0n,
    hundredths(input[side + 'Depth']),
  ];
  const exact = geometry(shape, dims);
  const double = doubleVolume(shape, dims);
  const volumeMl = Number(roundUnits(exact, 0));
  assert.equal(volumeMl, Math.floor(double + 0.5), side + ' custom volume binary64 rounding');
  return {
    exact, double,
    result: { kind: 'custom', pan: null, shape, volumeMl, basis: 'geometric', depthCm: formatUnits(dims[2], 2) },
  };
}

function evaluate(input) {
  const error = validate(input);
  if (error) return error;
  const original = pan(input, 'source');
  const replacement = pan(input, 'target');
  const [sourceN, sourceD] = original.exact;
  const [targetN, targetD] = replacement.exact;
  const ratio = [targetN * sourceD, targetD * sourceN];
  const quantity = input.quantity === '' ? null : hundredths(input.quantity);
  const factor = formatRatio(ratio, 2);
  const percent = formatRatio([ratio[0] * 100n, ratio[1]], 1);
  const scaled = quantity === null ? null : formatRatio([quantity * ratio[0], scale * ratio[1]], 1);
  const floatingRatio = replacement.double / original.double;
  const display = (x, digits) => (Math.floor(x * 10 ** digits + 0.5) / 10 ** digits).toFixed(digits);
  assert.equal(factor, display(floatingRatio, 2), 'factor binary64 rounding');
  assert.equal(percent, display(floatingRatio * 100, 1), 'percent binary64 rounding');
  if (scaled !== null) assert.equal(scaled, display(Number(input.quantity) * floatingRatio, 1), 'quantity binary64 rounding');

  const { depthCm: sourceDepth } = original.result;
  const { depthCm: targetDepth } = replacement.result;
  let depthRelation = 'unknown';
  if (sourceDepth !== null && targetDepth !== null) {
    const difference = hundredths(targetDepth) - hundredths(sourceDepth);
    depthRelation = difference === 0n ? 'same' : difference < 0n ? 'shallower' : 'deeper';
  }
  return {
    ok: true,
    result: {
      source: original.result, target: replacement.result, factor, percent,
      scaledQuantity: scaled === null ? null : { value: scaled, unit: input.quantityUnit },
      depthRelation,
    },
  };
}

const defaults = {
  sourceKind: 'table', sourcePan: 'round-8', sourceShape: 'round', sourceD1: '', sourceD2: '', sourceDepth: '',
  targetKind: 'table', targetPan: 'round-9', targetShape: 'round', targetD1: '', targetD2: '', targetDepth: '',
  quantity: '', quantityUnit: 'g',
};

// Event model for the review. This models snapshot validity, not Worker or DOM behavior.
function controllerModel() {
  let draft = { ...defaults };
  let state = 'empty';
  let generation = 0;
  let error;
  const invalidate = (next) => { generation += 1; state = next; error = undefined; };
  return {
    edit(next) { draft = { ...next }; invalidate('dirty'); },
    start() { invalidate('busy'); return generation; },
    finish(job, result) {
      if (job !== generation || state !== 'busy') return false;
      state = result.ok ? 'success' : 'error';
      error = result.error;
      return true;
    },
    cancel() { invalidate('cancelled'); },
    reset() { draft = { ...defaults }; invalidate('empty'); },
    snapshot(includeDraft = false) {
      return { state, reportAvailable: state === 'success', ...(error && { error }), ...(includeDraft && { draft }) };
    },
  };
}

function controllerCase(id, input) {
  const model = controllerModel();
  if (id === 'state-dirty-error') {
    model.edit(input.initial);
    model.finish(model.start(), evaluate(input.initial));
    const afterRun = model.snapshot();
    model.edit(input.edit);
    const afterEdit = model.snapshot();
    model.finish(model.start(), evaluate(input.edit));
    return { afterRun, afterEdit, afterRerun: model.snapshot() };
  }
  if (id === 'state-cancel-late') {
    model.edit(input.draft);
    const old = model.start();
    const whilePending = model.snapshot();
    model.cancel();
    const afterCancel = model.snapshot(true);
    const late = evaluate(input.draft);
    assert.deepEqual(late, { ok: true, result: input.lateResult });
    assert.equal(model.finish(old, late), false);
    const afterLateResult = model.snapshot();
    model.reset();
    return { whilePending, afterCancel, afterLateResult, afterReset: model.snapshot(true) };
  }
  assert.equal(id, 'state-replace-late');
  model.edit(input.olderDraft);
  const old = model.start();
  model.edit(input.newerDraft);
  model.finish(model.start(), evaluate(input.newerDraft));
  const afterNewerResult = model.snapshot();
  const late = evaluate(input.olderDraft);
  assert.deepEqual(late, { ok: true, result: input.olderLateResult });
  assert.equal(model.finish(old, late), false);
  return { afterNewerResult, afterOlderLateResult: model.snapshot() };
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortKeys(value[key])]));
}

function report(result) {
  const utf8Text = JSON.stringify(sortKeys(result)) + '\n';
  const bytes = Buffer.from(utf8Text, 'utf8');
  return { fileName: 'baking-pan-report.json', bytes: bytes.length, sha256: sha256(bytes), utf8Text };
}

const fixtures = JSON.parse(source['fixtures.json']);
assert.equal(fixtures.specId, 'spec-baking-pan-converter-20261109');
const cases = fixtures.cases.map(({ id, kind, input, expected }) => {
  const derived = kind === 'core' ? evaluate(input) : controllerCase(id, input);
  assert.deepEqual(derived, expected, id);
  return { id, kind, input, derived, literalExpectedMatch: true, ...(derived.result && { report: report(derived.result) }) };
});
assert.equal(new Set(cases.map(({ id }) => id)).size, 18);
assert.equal(cases.filter(({ kind }) => kind === 'core').length, 15);
assert.equal(cases.filter(({ kind }) => kind === 'controller').length, 3);

const depthProbe = {
  ...defaults, sourceKind: 'custom', sourceShape: 'rect', sourceD1: '20', sourceD2: '20', sourceDepth: '8',
  targetKind: 'custom', targetShape: 'rect', targetD1: '10', targetD2: '10', targetDepth: '4',
  quantity: '300', quantityUnit: 'ml',
};
const depth = evaluate(depthProbe).result;
assert.deepEqual([depth.factor, depth.percent, depth.scaledQuantity.value, depth.depthRelation], ['0.13', '12.5', '37.5', 'shallower']);
const depthEvidence = {
  id: 'BPC-01', input: depthProbe, derived: depth,
  sameQuantitySourceDepthCm: 300 / (20 * 20),
  sameQuantityTargetDepthCm: 300 / (10 * 10),
  scaledQuantityTargetDepthCm: 37.5 / (10 * 10),
};

const smallRatioProbe = {
  ...defaults, sourceKind: 'custom', sourceShape: 'rect', sourceD1: '60', sourceD2: '60', sourceDepth: '15',
  targetKind: 'custom', targetShape: 'rect', targetD1: '5', targetD2: '5', targetDepth: '1',
  quantity: '1000', quantityUnit: 'ml',
};
const smallRatio = evaluate(smallRatioProbe).result;
assert.deepEqual([smallRatio.factor, smallRatio.percent, smallRatio.scaledQuantity.value], ['0.00', '0.0', '0.5']);
const smallRatioEvidence = {
  id: 'BPC-02', input: smallRatioProbe, derived: smallRatio, exactFactor: '1/2160',
  report: report(smallRatio),
};
const smallQuantityProbe = { ...defaults, targetPan: 'round-8', quantity: '0.01' };
const smallQuantity = evaluate(smallQuantityProbe).result;
assert.deepEqual([smallQuantity.factor, smallQuantity.scaledQuantity.value], ['1.00', '0.0']);
const smallQuantityEvidence = {
  id: 'BPC-02-small-quantity', input: smallQuantityProbe, derived: smallQuantity, exactQuantity: '0.01 g',
};

const boundaryProbes = [
  ['below-length', { ...smallRatioProbe, targetD1: '4.99' }, failure('RANGE', 'targetD1')],
  ['above-length', { ...smallRatioProbe, sourceD1: '60.01' }, failure('RANGE', 'sourceD1')],
  ['below-depth', { ...smallRatioProbe, targetDepth: '0.99' }, failure('RANGE', 'targetDepth')],
  ['above-depth', { ...smallRatioProbe, sourceDepth: '15.01' }, failure('RANGE', 'sourceDepth')],
  ['above-quantity', { ...smallRatioProbe, quantity: '100000.01' }, failure('RANGE', 'quantity')],
  ['inactive-field-limit-first', { ...defaults, sourceD1: '123456789', targetPan: 'round-12' }, failure('INPUT_LIMIT', 'sourceD1')],
  ['active-unpaired-surrogate', { ...defaults, sourceKind: '\uD800' }, failure('UNICODE', 'sourceKind')],
].map(([id, input, expected]) => {
  const derived = evaluate(input);
  assert.deepEqual(derived, expected, id);
  return { id, input, derived };
});
const inactiveInput = { ...defaults, sourceD1: 'abc', targetD1: '\uD800', quantityUnit: 'bad!' };
const inactive = evaluate(inactiveInput);
assert.deepEqual(inactive, evaluate(defaults));
boundaryProbes.push({ id: 'inactive-values-skipped', input: inactiveInput, derived: inactive });
const maxQuantityInput = { ...defaults, targetPan: 'round-8', quantity: '100000' };
const maxQuantity = evaluate(maxQuantityInput);
assert.equal(maxQuantity.result.scaledQuantity.value, '100000.0');
boundaryProbes.push({ id: 'quantity-upper-endpoint', input: maxQuantityInput, derived: maxQuantity });

console.log(JSON.stringify({
  candidate, scope: 'document-model-only', nodeVersion: process.version,
  summary: { pinnedTableRows: table.size, coreFixtures: 15, controllerFixtures: 3, result: 'PASS' },
  sources: provenance, table: tableEvidence, cases,
  reproduction: [depthEvidence, smallRatioEvidence, smallQuantityEvidence], boundaryProbes,
}, null, 2));
