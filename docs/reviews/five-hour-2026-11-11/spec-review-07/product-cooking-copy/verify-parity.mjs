import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';

const [, , baselineRoot, candidateRoot] = process.argv;
assert.ok(baselineRoot && candidateRoot, 'Usage: node verify-parity.mjs <baseline-root> <candidate-root>');
const read = (root, path) => readFile(join(root, path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const corePath = 'public/js/core/convert.mjs';
const handlerPath = 'public/js/worker-handler.mjs';

const unchanged = [
  'HANDOFF.md', 'REPAIR-VERIFICATION.md', 'VERIFICATION.md',
  'dist-preview/js/app.js', 'dist-preview/js/controller.mjs', 'dist-preview/js/worker-handler.mjs',
  'dist-preview/robots.txt', 'dist-preview/styles/app.css', 'package.json',
  'public/js/app.js', 'public/js/controller.mjs', 'public/js/worker-handler.mjs', 'public/styles/app.css',
  'scripts/build.mjs', 'scripts/check-generated.mjs', 'scripts/serve.mjs',
  'test/build.test.mjs', 'test/controller.test.mjs', 'test/core.test.mjs',
  'test/fixtures.json', 'test/report.test.mjs',
];
const unchangedFiles = [];
for (const path of unchanged) {
  const oldBytes = await read(baselineRoot, path);
  const newBytes = await read(candidateRoot, path);
  assert.ok(newBytes.equals(oldBytes), path + ' must be byte-identical');
  unchangedFiles.push({ path, bytes: newBytes.length, sha256: sha256(newBytes) });
}

// The inspected diff confines edits to two blocks of whole-line comments.
// Preserve the remaining bytes, including whitespace and line endings.
const executable = source => source.replace(/^\/\/[^\n]*(?:\n|$)/gmu, '');
async function workerSource(root) {
  const core = (await read(root, corePath)).toString('utf8');
  const handler = (await read(root, handlerPath)).toString('utf8');
  assert.equal((await read(root, 'dist-preview/js/core/convert.mjs')).toString('utf8'), core);
  const wrapper = (await read(root, 'dist-preview/js/worker-source.js')).toString('utf8');
  const literal = wrapper.match(/^export const WORKER_SOURCE = (".*");$/mu)?.[1];
  assert.ok(literal, 'Expected a single fixed JSON string in Worker wrapper');
  const decoded = JSON.parse(literal);
  assert.equal(decoded, core + '\n' + handler);
  return { core, handler, decoded, executableCore: executable(core), executableWorker: executable(core) + '\n' + handler };
}
const oldWorker = await workerSource(baselineRoot);
const newWorker = await workerSource(candidateRoot);
assert.equal(newWorker.executableCore, oldWorker.executableCore);
assert.equal(newWorker.executableWorker, oldWorker.executableWorker);
assert.equal(newWorker.handler, oldWorker.handler);

const fields = ['amount', 'fromUnit', 'toUnit', 'ingredient'];
const rawLimit = { amount: 12, fromUnit: 4, toUnit: 4, ingredient: 32 };
const volume = { ml: 1n, tsp: 5n, tbsp: 15n, cup: 240n };
const density = {
  water: 227, 'all-purpose-flour': 120, 'granulated-sugar': 198, 'brown-sugar': 213,
  'powdered-sugar': 113, butter: 227, 'vegetable-oil': 198, honey: 336,
  'cocoa-powder': 84, milk: 227, 'long-grain-rice': 198, 'rolled-oats': 89,
};

const invalid = (code, field = null) => ({ ok: false, error: { code, field, row: null } });
const halfUp = (n, d) => (2n * n + d) / (2n * d);
const decimal = /^[0-9]+(?:\.[0-9]+)?$/u;

function eighthFraction(numerator, denominator) {
  const eighths = halfUp(numerator * 8n, denominator);
  const whole = eighths / 8n;
  const remainder = eighths % 8n;
  if (remainder === 0n) return String(whole);
  const divisor = remainder % 4n === 0n ? 4n : remainder % 2n === 0n ? 2n : 1n;
  const fraction = String(remainder / divisor) + '/' + String(8n / divisor);
  return whole === 0n ? fraction : String(whole) + ' ' + fraction;
}

function independent(input) {
  if (input === null || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== fields.length ||
      fields.some(field => typeof Object.getOwnPropertyDescriptor(input, field)?.value !== 'string')) {
    return invalid('SCHEMA');
  }

  let amountNumerator;
  let amountDenominator;
  for (const field of fields) {
    const raw = input[field];
    if (raw.length > rawLimit[field]) return invalid('INPUT_LIMIT', field);
    if (!raw.isWellFormed()) return invalid('UNICODE', field);
    if (raw === '') return invalid('EMPTY', field);
    if (field === 'amount') {
      if (decimal.exec(raw)?.[0] !== raw) return invalid('DECIMAL_FORMAT', field);
      const [whole, fraction = ''] = raw.split('.');
      amountNumerator = BigInt(whole + fraction);
      amountDenominator = 10n ** BigInt(fraction.length);
      if (amountNumerator <= 0n || amountNumerator > 100_000n * amountDenominator) return invalid('RANGE', field);
    } else if (field === 'ingredient') {
      if (raw !== 'none' && !Object.hasOwn(density, raw)) return invalid('ENUM', field);
    } else if (raw !== 'g' && !Object.hasOwn(volume, raw)) {
      return invalid('ENUM', field);
    }
  }

  const { fromUnit, toUnit, ingredient } = input;
  const cross = (fromUnit === 'g') !== (toUnit === 'g');
  if (cross && ingredient === 'none') return invalid('INGREDIENT_REQUIRED', 'ingredient');

  // Express both units on the same volume scale. A gram of a selected
  // ingredient occupies 240/D mL under the fixed model.
  const unitSize = unit => unit === 'g' ? (cross ? [240n, BigInt(density[ingredient])] : [1n, 1n]) : [volume[unit], 1n];
  const [fromN, fromD] = unitSize(fromUnit);
  const [toN, toD] = unitSize(toUnit);
  const numerator = amountNumerator * fromN * toD;
  const denominator = amountDenominator * fromD * toN;
  return {
    ok: true,
    result: {
      fractionText: toUnit === 'cup' ? eighthFraction(numerator, denominator) : null,
      gramsPerCup: cross ? density[ingredient] : null,
      ingredient: cross ? ingredient : null,
      unit: toUnit,
      value: Number(halfUp(numerator * 100n, denominator)) / 100,
    },
  };
}

const modelModules = await Promise.all([baselineRoot, candidateRoot].map(root =>
  import(pathToFileURL(join(root, corePath)).href)
));
for (const module of modelModules) {
  assert.deepEqual(module.FIELDS, fields);
  assert.deepEqual(module.RAW_LIMITS, rawLimit);
  assert.deepEqual(module.ML_PER_UNIT, volume);
  assert.deepEqual(Object.fromEntries(module.DENSITY.map(row => [row.id, row.gramsPerCup])), density);
  assert.equal(module.REPORT_FILENAME, 'cooking-measurement-report.json');
  assert.equal(module.REPORT_BYTE_LIMIT, 2_097_152);
}

function nodeWorker(source) {
  const adapter = [
    "import { parentPort } from 'node:worker_threads';",
    'globalThis.self = { postMessage: value => parentPort.postMessage(value) };',
    "parentPort.on('message', data => globalThis.self.onmessage({ data }));",
  ].join('\n');
  const module = Buffer.from(adapter + '\n' + source, 'utf8').toString('base64');
  return new Worker(new URL('data:text/javascript;base64,' + module));
}

function send(worker, generation, snapshot) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error('Worker response timed out')), 5000);
    function done(error, message) {
      clearTimeout(timer);
      worker.removeListener('error', onError);
      worker.removeListener('exit', onExit);
      worker.removeListener('message', onMessage);
      if (error) reject(error);
      else resolve(message);
    }
    const onError = error => done(error);
    const onExit = code => done(new Error('Worker exited early with code ' + code));
    const onMessage = message => done(null, message);
    worker.once('error', onError);
    worker.once('exit', onExit);
    worker.once('message', onMessage);
    worker.postMessage({ generation, snapshot });
  });
}

const fixtureBytes = await read(candidateRoot, 'test/fixtures.json');
const fixtures = JSON.parse(fixtureBytes.toString('utf8'));
const cases = fixtures.cases.filter(x => x.kind === 'core');
const stateIds = fixtures.cases.filter(x => x.kind === 'controller').map(x => x.id);
const extra = [
  ['butter-half-cup', '0.5', 'cup', 'g', 'butter', 113.5],
  ['butter-full-cup', '1', 'cup', 'g', 'butter', 227],
  ['honey-tablespoon', '1', 'tbsp', 'g', 'honey', 21],
  ['honey-cup', '1', 'cup', 'g', 'honey', 336],
  ['oats-cup', '1', 'cup', 'g', 'rolled-oats', 89],
  ['water-weight', '1', 'cup', 'g', 'water', 227],
  ['water-volume', '1', 'cup', 'ml', 'water', 240],
  ['leading-zero', '007', 'ml', 'ml', 'none', 7],
  ['above-maximum', '100000.01', 'ml', 'cup', 'none', 'RANGE'],
  ['decimal-point-left', '.5', 'ml', 'cup', 'none', 'DECIMAL_FORMAT'],
  ['decimal-point-right', '5.', 'ml', 'cup', 'none', 'DECIMAL_FORMAT'],
  ['exponent-notation', '1e3', 'ml', 'cup', 'none', 'DECIMAL_FORMAT'],
  ['invalid-first-field', '\uD800', 'other', 'cup', 'none', 'UNICODE'],
].map(([id, amount, fromUnit, toUnit, ingredient, literal]) => ({
  id, input: { amount, fromUnit, toUnit, ingredient }, literal,
}));
const workers = [nodeWorker(oldWorker.decoded), nodeWorker(newWorker.decoded)];
const evidence = [];
try {
  for (const [index, entry] of [...cases, ...extra].entries()) {
    const result = independent(entry.input);
    if (entry.expected) assert.deepEqual(result, entry.expected, entry.id + ' fixture literal');
    if (Object.hasOwn(entry, 'literal')) {
      assert.equal(result.ok ? result.result.value : result.error.code, entry.literal, entry.id + ' extra literal');
    }
    for (const module of modelModules) assert.deepEqual(module.run(entry.input), result, entry.id + ' core');
    const generation = index + 1;
    const responses = await Promise.all(workers.map(worker => send(worker, generation, entry.input)));
    for (const response of responses) assert.deepEqual(response, { generation, ...result }, entry.id + ' Node Worker bridge');

    let report = null;
    if (result.ok) {
      const text = JSON.stringify(result.result) + '\n';
      const bytes = Buffer.from(text, 'utf8');
      const expectedReport = { ok: true, text, bytes: bytes.length };
      for (const module of modelModules) {
        assert.deepEqual(module.serializeReport(result.result), expectedReport, entry.id + ' exact report');
      }
      assert.equal(bytes[0], 123);
      assert.equal(bytes.at(-2), 125);
      assert.equal(bytes.at(-1), 10);
      report = { filename: 'cooking-measurement-report.json', text, bytes: bytes.length, sha256: sha256(bytes) };
    }
    evidence.push({ id: entry.id, input: entry.input, independentResult: result, report, workerGeneration: generation });
  }
} finally {
  await Promise.all(workers.map(worker => worker.terminate()));
}

console.log(JSON.stringify({
  scope: 'offline calculations and Node Worker bridge',
  productBrowser: 'NOT_RUN_USER_FOCUS_INCIDENT',
  node: process.version,
  fixtureSha256: sha256(fixtureBytes),
  literalCore: cases.length, supplementalCases: extra.length, stateFixtureIds: stateIds,
  exactFixtureReports: evidence.slice(0, cases.length).filter(entry => entry.report).length,
  workerMessagesEach: evidence.length,
  executableCoreSha256: sha256(Buffer.from(newWorker.executableCore, 'utf8')),
  executableWorkerSha256: sha256(Buffer.from(newWorker.executableWorker, 'utf8')),
  unchangedFiles, evidence,
}, null, 2));
