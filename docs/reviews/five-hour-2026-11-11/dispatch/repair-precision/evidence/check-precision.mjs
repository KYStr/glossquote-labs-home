import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evidence = fileURLToPath(new URL('.', import.meta.url));
const [baselineArgument, candidateArgument] = process.argv.slice(2);
const work = candidateArgument ? resolve(candidateArgument) : join(evidence, '../work');
const baseline = baselineArgument ? resolve(baselineArgument) : join(evidence, '../../../astra-review/candidate');
const read = (root, file) => readFileSync(join(root, file));
const spec = (root, slug) => read(root, `docs/specs/${slug}/SPEC.md`).toString('utf8');
const fixtures = (root, slug) => JSON.parse(read(root, `docs/specs/${slug}/fixtures.json`));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const manifest = JSON.parse(read(evidence, 'source-manifest.json'));
const race = 'race-time-predictor';
const nhi = 'nhi-premium-calculator';
const cooking = 'cooking-measurement-converter';
const slugs = [race, nhi, cooking];

const expectedChanges = [
  `${race}/AUTHOR-CHECK.md`, `${race}/BRIEF.md`, `${race}/SPEC.md`, `${race}/fixtures.json`,
  `${nhi}/SPEC.md`, `${cooking}/AUTHOR-CHECK.md`, `${cooking}/BRIEF.md`, `${cooking}/SPEC.md`,
].map(name => `docs/specs/${name}`).sort();
const scopedFiles = slugs.flatMap(slug =>
  readdirSync(join(work, 'docs/specs', slug), { recursive: true, withFileTypes: true }))
  .filter(entry => !entry.isDirectory())
  .map(entry => relative(work, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
  .sort();
assert.deepEqual(scopedFiles, manifest.files.map(entry => entry.path).sort());
const changed = [];
const candidateFiles = manifest.files.map(entry => {
  const original = read(baseline, entry.path);
  const candidate = read(work, entry.path);
  assert.equal(blob(original), entry.gitBlob, entry.path);
  assert.equal(sha256(original), entry.sha256, entry.path);
  assert.equal(original.length, entry.bytes, entry.path);
  if (!original.equals(candidate)) changed.push(entry.path);
  return { path: entry.path, bytes: candidate.length, sha256: sha256(candidate), gitBlob: blob(candidate) };
});
assert.deepEqual(changed.sort(), expectedChanges);
const headings = ['goal', 'scope', 'userFlow', 'inputsOutputs', 'implementation', 'acceptance', 'tests', 'handoff'];
for (const slug of slugs) {
  const actual = [...spec(work, slug).matchAll(/^## (\w+)\s*$/gm)].map(match => match[1]);
  assert.deepEqual(actual, headings, slug);
}

const beforeRace = fixtures(baseline, race);
const afterRace = fixtures(work, race);
const raceSpec = spec(work, race);
assert(raceSpec.includes('existing-tool-upgrade'));
assert(raceSpec.includes('不計新工具 ready 庫存'));
for (const file of ['SPEC.md', 'AUTHOR-CHECK.md', 'BRIEF.md']) {
  const content = read(work, `docs/specs/${race}/${file}`).toString('utf8');
  assert(!content.includes('tools/race-time-predictor/'));
  assert(!content.includes('race-time-predictor.glossquote.com'));
}
const newRaceId = 'custom-source-matching-target';
assert.equal(afterRace.cases.length, beforeRace.cases.length + 1);
assert.deepEqual({ ...afterRace, cases: afterRace.cases.filter(row => row.id !== newRaceId) }, beforeRace);
assert.equal(afterRace.cases.filter(row => row.kind === 'core').length, 16);
const raceCase = id => afterRace.cases.find(row => row.id === id);
const standard = [['5k', 5000], ['10k', 10000], ['half', 21097.5], ['marathon', 42195]];
const raceProbes = [
  ['classic-10k', standard, ['10k']],
  ['half-with-custom-target', [...standard, ['custom', 30000]], ['half']],
  ['custom-source', standard, []],
  ['min-custom-boundary', standard, []],
  [newRaceId, [...standard, ['custom', 15000]], ['custom']],
].map(([id, targets, identity]) => {
  const result = raceCase(id).expected.result;
  assert.deepEqual(result.predictions.map(row => [row.key, row.distanceM]), targets, id);
  const matched = result.predictions.filter(row => row.distanceM === result.knownDistanceM);
  assert.deepEqual(matched.map(row => row.key), identity, id);
  for (const row of matched) {
    assert.equal(row.predictedSeconds, result.knownTimeSeconds, id);
    assert.equal(row.paceSecPerKm, result.knownPaceSecPerKm, id);
  }
  return { id, targets, identity };
});
const successfulRace = afterRace.cases.filter(row => row.kind === 'core' && row.expected.ok);
for (const { id, input, expected: { result } } of successfulRace) {
  const knownDistanceM = input.knownPreset === 'custom' ? Number(input.knownCustomM)
    : standard.find(([key]) => key === input.knownPreset)[1];
  const knownTimeSeconds = input.knownTime.split(':').reduce((seconds, next) => seconds * 60 + Number(next), 0);
  const knownPaceSecPerKm = Math.floor(knownTimeSeconds / (knownDistanceM / 1000) * 10 + 0.5) / 10;
  const targets = input.targetCustomM ? [...standard, ['custom', Number(input.targetCustomM)]] : standard;
  const predictions = targets.map(([key, distanceM]) => {
    const raw = knownTimeSeconds * Math.pow(distanceM / knownDistanceM, 1.06);
    return { key, distanceM, predictedSeconds: Math.floor(raw + 0.5),
      paceSecPerKm: Math.floor(raw / (distanceM / 1000) * 10 + 0.5) / 10 };
  });
  assert.deepEqual(result, { knownDistanceM, knownTimeSeconds, knownPaceSecPerKm, predictions }, id);
}
assert.deepEqual(raceCase(newRaceId).expected.result.predictions.slice(0, 4), raceCase('custom-source').expected.result.predictions);
assert.deepEqual(raceCase(newRaceId).expected.result.predictions.at(-1),
  { key: 'custom', distanceM: 15000, predictedSeconds: 4050, paceSecPerKm: 270 });

const numericTable = (content, cells) => content.split(/\r?\n/).filter(line =>
  /^\| \d+ \|/.test(line) && line.split('|').slice(1, -1).length === cells);
const originalNhi = spec(baseline, nhi);
const currentNhi = spec(work, nhi);
assert.deepEqual(numericTable(currentNhi, 6), numericTable(originalNhi, 6));
const appendix = numericTable(currentNhi, 10);
assert.deepEqual(appendix, numericTable(originalNhi, 10));
assert.equal(appendix.length, 29);
const exactHalfUp = (numerator, denominator) => numerator / denominator
  + (2n * (numerator % denominator) >= denominator ? 1n : 0n);
const rows = appendix.flatMap(line => {
  const cells = line.split('|').slice(1, -1).map(cell => BigInt(cell.trim().replaceAll(',', '')));
  return [cells.slice(0, 5), cells.slice(5)];
});
assert.deepEqual(rows.map(([grade]) => Number(grade)).sort((a, b) => a - b),
  Array.from({ length: 58 }, (_, i) => i + 1));
for (const [grade, amount, person, employer, government] of rows) {
  assert.equal(exactHalfUp(amount * 1551n, 100000n), person, `grade ${grade}, person`);
  assert.equal(exactHalfUp(amount * 483912n, 10000000n), employer, `grade ${grade}, employer`);
  assert.equal(exactHalfUp(amount * 80652n, 10000000n), government, `grade ${grade}, government`);
}
assert.equal(29500n * 1551n * 200n, 91509n * 100000n);
assert.equal(Math.floor(457.54499 + 0.5), 458);
assert.equal(Math.floor(29500 * 0.0517 * 0.3 + 0.5), 458);
assert.equal((150000n * 1551n) % 100000n, 50000n);
assert.equal(exactHalfUp(150000n * 1551n, 100000n), 2327n);
const nhiCase = id => fixtures(work, nhi).cases.find(row => row.id === id);
assert.equal(nhiCase('floor-grade-no-dependents').expected.result.selfPremium, 458);
assert.equal(nhiCase('half-up-discriminator').expected.result.selfPremium, 2327);
assert(!currentNhi.includes('457.54499'));

const densities = content => [...content.matchAll(/^\| ([a-z-]+) \| [^|]+ \| [^|]+ \| (\d+) \|\s*$/gm)]
  .map(match => [match[1], Number(match[2])]);
const cookingSpec = spec(work, cooking);
const cookingDensities = densities(cookingSpec);
assert.equal(cookingDensities.length, 12);
assert.deepEqual(cookingDensities, densities(spec(baseline, cooking)));
const butter = fixtures(work, cooking).cases.find(row => row.id === 'grams-butter-to-cup');
const butterDensity = new Map(cookingDensities).get(butter.input.ingredient);
assert.equal(butterDensity, 227);
assert.equal(Number(butter.input.amount) / butterDensity, 1);
assert.deepEqual(butter.expected.result,
  { value: 1, unit: 'cup', fractionText: '1', ingredient: 'butter', gramsPerCup: 227 });
for (const file of ['SPEC.md', 'AUTHOR-CHECK.md', 'BRIEF.md']) {
  assert(!read(work, `docs/specs/${cooking}/${file}`).includes('全表同源'));
}
assert(cookingSpec.includes('EasyAsPie_February2025.pdf#page=1'));

console.log(JSON.stringify({
  scope: 'Offline author verification of three specification corrections',
  node: process.version,
  source: { commit: manifest.commit, verifiedFiles: candidateFiles.length },
  race: { classification: 'existing-tool-upgrade', previousCasesPreserved: beforeRace.cases.length,
    successfulCasesRecomputed: successfulRace.length, probes: raceProbes },
  nhi: { appendixGrades: rows.length, appendixPremiumAmounts: rows.length * 3, firstGrade: 458, halfBoundary: 2327 },
  cooking: { densitiesPreserved: cookingDensities.length, butterGramsPerCup: butterDensity, butterFixture: butter.expected.result },
  changed,
  candidateFiles,
  independentReview: 'NOT_RUN',
  productAndBrowserChecks: 'NOT_RUN',
}, null, 2));
