import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// This model belongs to the reviewer. The candidate supplies only documents and literal cases.
assert.equal(process.argv.length, 4, 'Usage: node verify-round2.mjs <original-source-dir> <repaired-source-dir>');
const originalCommit = '88a5d223d06de8e6a732327a92fed78f94296e74';
const repairedCommit = '8e717e5cd93ea9df06b54ede8dec8c7f7d1f0927';
const original = readSources(process.argv[2], {
  "BRIEF.md": "606c21e8d1770f09e58e166ac9eaa0a5fd756b7e",
  "SPEC.md": "8d47eb70dcc2c7a8209fce987114ffe8f6cb7f82",
  "fixtures.json": "b24bdc92a78b500e9d4c336d41fc79a2a2e3c8e3",
  "AUTHOR-CHECK.md": "b53f450dd7df41a3b08d3a89453733f21a7850a2"
});
const repaired = readSources(process.argv[3], {
  "BRIEF.md": "b21f45af953fa4dc4225f51e0eb5dcfd817261c7",
  "SPEC.md": "d8aa1bdaa203a582c86d8d19974ab5ece3d00f35",
  "fixtures.json": "20147407154d9acab7fffa69d9b541fcdcd29885",
  "AUTHOR-CHECK.md": "27e661823fcf474893416538084922c10c8eeba9"
});
const source = repaired.documents;

function readSources(directory, pinnedBlobs) {
  const documents = {};
  const manifest = [];
  for (const [name, expectedBlob] of Object.entries(pinnedBlobs)) {
    const bytes = readFileSync(join(directory, name));
    const gitBlob = createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    assert.equal(gitBlob, expectedBlob, name + ' Git blob');
    documents[name] = bytes.toString('utf8');
    manifest.push({ name, bytes: bytes.length, gitBlob, sha256: sha256(bytes) });
  }
  return { documents, manifest };
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

function positiveExact(value, places, useFallback) {
  const ordinary = roundUnits(value, places);
  if (ordinary !== 0n || !useFallback) return formatUnits(ordinary, places);
  const extended = roundUnits(value, 8);
  assert.ok(extended > 0n, 'Positive value must remain positive at eight places');
  return formatUnits(extended, 8).replace(/0+$/u, '');
}

function positiveDouble(value, places, useFallback) {
  const scale = 10 ** places;
  const ordinary = Math.floor(value * scale + 0.5);
  if (ordinary !== 0 || !useFallback) return (ordinary / scale).toFixed(places);
  const extended = Math.floor(value * 100_000_000 + 0.5);
  assert.ok(extended > 0, 'Positive binary64 value must remain positive at eight places');
  return (extended / 100_000_000).toFixed(8).replace(/0+$/u, '');
}

function evaluate(input, useFallback = true) {
  const error = validate(input);
  if (error) return error;
  const original = pan(input, 'source');
  const replacement = pan(input, 'target');
  const [sourceN, sourceD] = original.exact;
  const [targetN, targetD] = replacement.exact;
  const ratio = [targetN * sourceD, targetD * sourceN];
  const quantity = input.quantity === '' ? null : hundredths(input.quantity);
  const factor = positiveExact(ratio, 2, useFallback);
  const percent = positiveExact([ratio[0] * 100n, ratio[1]], 1, useFallback);
  const scaled = quantity === null ? null : positiveExact([quantity * ratio[0], scale * ratio[1]], 1, useFallback);
  const floatingRatio = replacement.double / original.double;
  assert.equal(factor, positiveDouble(floatingRatio, 2, useFallback), 'factor binary64 rounding');
  assert.equal(percent, positiveDouble(floatingRatio * 100, 1, useFallback), 'percent binary64 rounding');
  if (scaled !== null) {
    assert.equal(scaled, positiveDouble(Number(input.quantity) * floatingRatio, 1, useFallback), 'quantity binary64 rounding');
  }

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


const tableRows = document => document.split('\n').filter(line =>
  /^\| (?:round-|square-|rect-|loaf-|bundt-|tube-)/u.test(line)
);
assert.deepEqual(tableRows(source['SPEC.md']), tableRows(original.documents['SPEC.md']), 'All table rows preserved');
assert.equal(tableRows(source['SPEC.md']).length, table.size);

const before = JSON.parse(original.documents['fixtures.json']);
const after = JSON.parse(source['fixtures.json']);
for (const key of ['specId', 'slug', 'productChecks', 'schemaVersion']) assert.equal(after[key], before[key]);
assert.equal(after.productChecks, 'NOT_RUN');
const beforeById = new Map(before.cases.map(item => [item.id, item]));
const afterById = new Map(after.cases.map(item => [item.id, item]));
assert.equal(beforeById.size, before.cases.length);
assert.equal(afterById.size, after.cases.length);
const regression = before.cases.map(old => {
  const revised = afterById.get(old.id);
  assert.ok(revised, old.id + ' preserved');
  for (const key of Object.keys(old)) assert.deepEqual(revised[key], old[key], old.id + ' ' + key);
  const derived = old.kind === 'core' ? evaluate(old.input, false) : controllerCase(old.id, old.input);
  assert.deepEqual(derived, old.expected, old.id + ' original calculation');
  if (!derived.result) return { id: old.id, inputsAndExpectedUnchanged: true };
  const previousReport = report(derived.result);
  assert.equal(revised.expectedReport, previousReport.utf8Text, old.id + ' original report bytes');
  return { id: old.id, inputsAndExpectedUnchanged: true, originalReportSha256: previousReport.sha256 };
});

const fixtures = after.cases.map(({ id, kind, input, expected, expectedReport }) => {
  const derived = kind === 'core' ? evaluate(input) : controllerCase(id, input);
  assert.deepEqual(derived, expected, id + ' exact result');
  if (!derived.result) {
    assert.equal(expectedReport, undefined, id + ' has no report');
    return { id, kind, input, derived, literalExpectedMatch: true };
  }
  const canonical = report(derived.result);
  assert.equal(typeof expectedReport, 'string', id + ' literal report');
  const literalBytes = Buffer.from(expectedReport, 'utf8');
  assert.ok(literalBytes.equals(Buffer.from(canonical.utf8Text, 'utf8')), id + ' canonical bytes');
  assert.equal(literalBytes[0], 123, id + ' begins with { and no BOM');
  assert.equal(literalBytes.at(-1), 10, id + ' final LF');
  assert.equal(literalBytes.at(-2), 125, id + ' ends with } and one LF');
  assert.equal(sha256(literalBytes), canonical.sha256, id + ' canonical SHA-256');
  return { id, kind, input, derived, report: canonical, literalExpectedMatch: true, literalReportMatch: true };
});

const added = fixtures.filter(item => !beforeById.has(item.id)).map(item => item.id);
const requiredCases = [
  'wall-height-shallower', 'wall-height-deeper', 'small-ratio-rect', 'small-ratio-no-quantity',
  'same-pan-min-quantity', 'min-quantity-min-ratio', 'min-quantity-max-ratio', 'nominal-min-quantity',
];
assert.deepEqual([...added].sort(), [...requiredCases].sort());

const pairs = [];
for (const sourcePan of table.keys()) {
  for (const targetPan of table.keys()) {
    const { result } = evaluate({ ...defaults, sourcePan, targetPan, quantity: '0.01', quantityUnit: 'ml' });
    assert.equal(result.source.volumeMl, table.get(sourcePan).volume);
    assert.equal(result.target.volumeMl, table.get(targetPan).volume);
    assert.match(result.factor, /^\d+\.\d{2}$/u);
    assert.match(result.percent, /^\d+\.\d$/u);
    assert.match(result.scaledQuantity.value, /^0\.\d{1,7}[1-9]$/u);
    const unknownDepth = [sourcePan, targetPan].some(id => table.get(id).depthCm === null);
    assert.equal(result.depthRelation === 'unknown', unknownDepth);
    pairs.push({
      sourcePan, targetPan, factor: result.factor, percent: result.percent,
      minScaledMl: result.scaledQuantity.value, depthRelation: result.depthRelation,
    });
  }
}
assert.equal(pairs.length, 121);

const minRound = geometry('round', [500n, 0n, 100n]);
const maxRound = geometry('round', [6000n, 0n, 1500n]);
const minRect = geometry('rect', [500n, 500n, 100n]);
const maxRect = geometry('rect', [6000n, 6000n, 1500n]);
const less = ([leftN, leftD], [rightN, rightD]) => leftN * rightD < rightN * leftD;
assert.ok(less(minRound, minRect) && less(maxRound, maxRect));
for (const row of table.values()) {
  assert.ok(less(minRound, [BigInt(row.volume), 1n]) && less([BigInt(row.volume), 1n], maxRect));
}
const minFactor = [minRound[0] * maxRect[1], minRound[1] * maxRect[0]];
const minPercent = [100n * minFactor[0], minFactor[1]];
const minQuantity = [minFactor[0], 100n * minFactor[1]];
const minDisplayedQuantity = formatRatio(minQuantity, 8);
assert.equal(minDisplayedQuantity, '0.00000364');
assert.ok(less([5n, 1_000_000_000n], minQuantity));
const conservativeBinary64Quantity = 0.01 * 19 / 54001;
assert.ok(conservativeBinary64Quantity > 0.0000035);
const bounds = {
  minRoundMl: formatRatio(minRound, 12), maxRoundMl: formatRatio(maxRound, 9),
  minRectMl: formatRatio(minRect, 0), maxRectMl: formatRatio(maxRect, 0),
  minFactor: formatRatio(minFactor, 15), minPercent: formatRatio(minPercent, 15),
  minScaledQuantity: formatRatio(minQuantity, 15), minDisplayedQuantity,
  conservativeBinary64Quantity, eightPlaceCutoff: '0.000000005',
};

function measureDepth(id) {
  const entry = fixtures.find(item => item.id === id);
  const { input, derived } = entry;
  const sourceAreaCm2 = Number(input.sourceD1) * Number(input.sourceD2);
  const targetAreaCm2 = Number(input.targetD1) * Number(input.targetD2);
  const volumeMl = Number(input.quantity);
  const sourcePanMl = sourceAreaCm2 * Number(input.sourceDepth);
  const targetPanMl = targetAreaCm2 * Number(input.targetDepth);
  const scaledMl = volumeMl * (targetPanMl / sourcePanMl);
  const sourceDepthCm = volumeMl / sourceAreaCm2;
  const targetSameQuantityDepthCm = volumeMl / targetAreaCm2;
  const targetScaledDepthCm = scaledMl / targetAreaCm2;
  const sameQuantityTargetFill = volumeMl / targetPanMl;
  assert.equal(Number(derived.result.scaledQuantity.value), scaledMl);
  return {
    id, sourceAreaCm2, targetAreaCm2, sourcePanMl, targetPanMl, volumeMl, scaledMl,
    sourceDepthCm, targetSameQuantityDepthCm, targetScaledDepthCm, sameQuantityTargetFill,
  };
}
const shallow = measureDepth('wall-height-shallower');
const deep = measureDepth('wall-height-deeper');
assert.deepEqual([shallow.sourceDepthCm, shallow.targetSameQuantityDepthCm, shallow.targetScaledDepthCm, shallow.sameQuantityTargetFill],
  [0.75, 3, 0.375, 0.75]);
assert.deepEqual([deep.sourceDepthCm, deep.targetSameQuantityDepthCm, deep.targetScaledDepthCm], [3, 0.75, 6]);

function rectangularDraft([length, width, depth], [newLength, newWidth, newDepth], quantity = '1') {
  return {
    ...defaults, quantity, quantityUnit: 'ml',
    sourceKind: 'custom', sourceShape: 'rect', sourceD1: length, sourceD2: width, sourceDepth: depth,
    targetKind: 'custom', targetShape: 'rect', targetD1: newLength, targetD2: newWidth, targetDepth: newDepth,
  };
}

const transitions = [
  ['factor-at-usual-threshold', rectangularDraft(['20','25','10'], ['5','5','1']), ['0.01','0.5','0.005']],
  ['factor-below-usual-threshold', rectangularDraft(['20','25','10.01'], ['5','5','1']), ['0.004995','0.5','0.004995']],
  ['percent-at-usual-threshold', rectangularDraft(['60','60','15'], ['5','5.4','1']), ['0.0005','0.1','0.0005']],
  ['percent-below-usual-threshold', rectangularDraft(['60','60','15'], ['5','5.39','1']), ['0.00049907','0.04990741','0.00049907']],
  ['quantity-at-usual-threshold', rectangularDraft(['10','10','10'], ['5','5','2']), ['0.05','5.0','0.1']],
  ['quantity-below-usual-threshold', rectangularDraft(['10','10','10'], ['5','5','1.99']), ['0.05','5.0','0.04975']],
  ['eight-place-exact-tie', rectangularDraft(['40','40','8'], ['5','5','1']), ['0.00195313','0.2','0.00195313']],
].map(([id, input, expected]) => {
  const { result } = evaluate(input);
  const displayed = [result.factor, result.percent, result.scaledQuantity.value];
  assert.deepEqual(displayed, expected, id);
  return { id, input, displayed };
});

const extent = rectangularDraft(['60','60','15'], ['5','5','1']);
const { quantity: unusedQuantity, ...missingQuantity } = defaults;
const boundaryCases = [
  ['below-length', { ...extent, targetD1: '4.99' }, failure('RANGE', 'targetD1')],
  ['above-length', { ...extent, sourceD1: '60.01' }, failure('RANGE', 'sourceD1')],
  ['below-depth', { ...extent, targetDepth: '0.99' }, failure('RANGE', 'targetDepth')],
  ['above-depth', { ...extent, sourceDepth: '15.01' }, failure('RANGE', 'sourceDepth')],
  ['above-quantity', { ...extent, quantity: '100000.01' }, failure('RANGE', 'quantity')],
  ['inactive-field-limit-first', { ...defaults, sourceD1: '123456789', targetPan: 'round-12' }, failure('INPUT_LIMIT', 'sourceD1')],
  ['active-unpaired-surrogate', { ...defaults, sourceKind: '\uD800' }, failure('UNICODE', 'sourceKind')],
  ['missing-quantity-key', missingQuantity, failure('SCHEMA')],
].map(([id, input, expected]) => {
  const derived = evaluate(input);
  assert.deepEqual(derived, expected, id);
  return { id, input, derived };
});
const inactiveInput = { ...defaults, sourceD1: 'abc', targetD1: '\uD800', quantityUnit: 'bad!' };
const inactive = evaluate(inactiveInput);
assert.deepEqual(inactive, evaluate(defaults));
assert.equal(inactive.result.scaledQuantity, null);
boundaryCases.push({ id: 'inactive-values-skipped', input: inactiveInput, derived: inactive });
const maxInput = { ...defaults, targetPan: 'round-8', quantity: '100000' };
const maxResult = evaluate(maxInput);
assert.equal(maxResult.result.scaledQuantity.value, '100000.0');
boundaryCases.push({ id: 'quantity-upper-endpoint', input: maxInput, derived: maxResult });

const model = controllerModel();
const initial = afterById.get('table-upscale-round').input;
model.edit(initial);
model.finish(model.start(), evaluate(initial));
const beforeReset = model.snapshot();
assert.deepEqual(beforeReset, { state: 'success', reportAvailable: true });
const inFlight = model.start();
assert.deepEqual(model.snapshot(), { state: 'busy', reportAvailable: false });
model.reset();
const oldAccepted = model.finish(inFlight, evaluate(initial));
assert.equal(oldAccepted, false);
const afterReset = model.snapshot(true);
assert.deepEqual(afterReset, { state: 'empty', reportAvailable: false, draft: defaults });

console.log(JSON.stringify({
  scope: 'independent-document-review', productChecks: 'NOT_RUN', nativeDownload: 'NOT_RUN',
  nodeVersion: process.version, originalCommit, repairedCommit,
  provenance: { original: original.manifest, repaired: repaired.manifest },
  summary: {
    rows: table.size, pairs: pairs.length, originalCases: regression.length,
    newCoreCases: added.length, core: fixtures.filter(x => x.kind === 'core').length,
    controller: fixtures.filter(x => x.kind === 'controller').length,
    reports: fixtures.filter(x => x.literalReportMatch).length,
    originalReports: regression.filter(x => x.originalReportSha256).length,
    boundaryProbes: boundaryCases.length, roundingTransitions: transitions.length, result: 'PASS',
  },
  table: tableEvidence, pairs, bounds, depthChecks: [shallow, deep],
  regression, fixtures, boundaryCases, transitions, resetProbe: { beforeReset, afterReset, oldAccepted },
}, null, 2));
