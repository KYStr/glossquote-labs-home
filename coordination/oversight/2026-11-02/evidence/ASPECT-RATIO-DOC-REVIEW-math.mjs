import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const gcd = (a, b) => {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
};

const rational = (n, d = 1n) => {
  if (d === 0n) throw new RangeError('zero denominator');
  if (d < 0n) [n, d] = [-n, -d];
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};

const add = (a, b) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => rational(a.n * b.n, a.d * b.d);
const div = (a, b) => rational(a.n * b.d, a.d * b.n);
const abs = a => rational(a.n < 0n ? -a.n : a.n, a.d);
const cmp = (a, b) => {
  const delta = a.n * b.d - b.n * a.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
};
const frac = a => `${a.n}/${a.d}`;

function decimal(raw) {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw);
  if (!match) throw new TypeError(`invalid decimal fixture: ${raw}`);
  const digits = match[2] ?? '';
  const denominator = 10n ** BigInt(digits.length);
  return rational(BigInt(match[1] + digits), denominator);
}

function fixed(a, places) {
  const scale = 10n ** BigInt(places);
  const scaled = a.n * scale;
  const sign = scaled < 0n ? '-' : '';
  const numerator = scaled < 0n ? -scaled : scaled;
  let q = numerator / a.d;
  const r = numerator % a.d;
  if (2n * r >= a.d) q += 1n; // positive fixtures: half away from zero
  const whole = q / scale;
  const remainder = (q % scale).toString().padStart(places, '0');
  return places === 0 ? `${sign}${whole}` : `${sign}${whole}.${remainder}`;
}

function simplifiedRatio(a, b) {
  const g = gcd(a, b);
  return `${a / g}:${b / g}`;
}

function scaledPart(raw) {
  const value = decimal(raw);
  const scaled = value.n * 1000n;
  if (scaled % value.d !== 0n) throw new TypeError(`more than 3 decimal places: ${raw}`);
  return scaled / value.d;
}

const dimensionCases = [
  { input: '1920x1080', w: 1920n, h: 1080n, ratio: '16:9', decimal: '1.7778', heightPct: '56.25' },
  { input: '1366x768', w: 1366n, h: 768n, ratio: '683:384', decimal: '1.7786', heightPct: '56.22' },
  { input: '2560x1080', w: 2560n, h: 1080n, ratio: '64:27', decimal: '2.3704', heightPct: '42.19' },
];

const derivedDimensions = dimensionCases.map(item => {
  const ratio = rational(item.w, item.h);
  const heightPct = mul(rational(item.h, item.w), rational(100n));
  assert.equal(simplifiedRatio(item.w, item.h), item.ratio);
  assert.equal(fixed(ratio, 4), item.decimal);
  assert.equal(fixed(heightPct, 2), item.heightPct);
  return { input: item.input, ratio: item.ratio, decimal: item.decimal, heightPct: item.heightPct };
});

const nearMissDiff = sub(rational(1366n, 768n), rational(16n, 9n));
assert.equal(frac(nearMissDiff), '1/1152');
assert.equal(fixed(nearMissDiff, 4), '0.0009');
const wideMissDiff = sub(rational(2560n, 1080n), rational(21n, 9n));
assert.equal(frac(wideMissDiff), '1/27');
assert.equal(fixed(wideMissDiff, 4), '0.0370');

const modeB = [];
{
  const a = scaledPart('2.39');
  const b = scaledPart('1');
  const g = gcd(a, b);
  const ratio = { a: a / g, b: b / g };
  const height = rational(1000n * ratio.b, ratio.a);
  assert.equal(`${ratio.a}:${ratio.b}`, '239:100');
  assert.equal(frac(height), '100000/239');
  assert.equal(fixed(height, 2), '418.41');
  modeB.push({ input: '2.39:1, width=1000', ratio: '239:100', solved: frac(height), display: fixed(height, 2) });
}
{
  const height = div(mul(rational(1280n), rational(9n)), rational(16n));
  assert.equal(frac(height), '720/1');
  modeB.push({ input: '16:9, width=1280', solved: frac(height), display: '720' });
}
{
  const ratioA = scaledPart('21');
  const ratioB = scaledPart('9');
  const g = gcd(ratioA, ratioB);
  const height = rational(1000n * (ratioB / g), ratioA / g);
  assert.equal(`${ratioA / g}:${ratioB / g}`, '7:3');
  assert.equal(frac(height), '3000/7');
  assert.equal(fixed(height, 2), '428.57');
  modeB.push({ input: '21:9, width=1000', ratio: '7:3', solved: frac(height), display: fixed(height, 2) });
}
{
  const width = rational(600n * 4n, 3n);
  assert.equal(frac(width), '800/1');
  modeB.push({ input: '4:3, height=600', solved: frac(width), display: '800' });
}
{
  const a = scaledPart('1.85');
  const b = scaledPart('1');
  const g = gcd(a, b);
  assert.equal(`${a / g}:${b / g}`, '37:20');
  modeB.push({ input: '1.85:1', ratio: '37:20' });
}
{
  const a = scaledPart('2.390');
  assert.equal(a, 2390n);
  assert.equal(simplifiedRatio(a, scaledPart('1')), '239:100');
  const width = decimal('12.50');
  assert.equal(frac(width), '25/2');
  assert.equal(frac(mul(width, rational(1n))), '25/2');
  modeB.push({ input: '2.390 equivalent; width=12.50 at 1:1', scaledPart: a.toString(), solved: '25/2', display: fixed(width, 2) });
}

const rawBounds = {
  smallestAllowedRatioPart: scaledPart('0.001').toString(),
  largestAllowedScaledPart: scaledPart('10000.000').toString(),
  threeDecimalTrailingZeroEquivalent: scaledPart('2.390').toString(),
  largeCoprime: simplifiedRatio(100000n, 99999n),
};
assert.equal(rawBounds.smallestAllowedRatioPart, '1');
assert.equal(rawBounds.largestAllowedScaledPart, '10000000');
assert.equal(rawBounds.largeCoprime, '100000:99999');
assert.equal(fixed(rational(1n, 8n), 2), '0.13');
assert.equal(fixed(rational(3n, 8n), 2), '0.38');

const specPresets = [
  ['1:1', rational(1n, 1n)], ['5:4', rational(5n, 4n)], ['4:3', rational(4n, 3n)],
  ['3:2', rational(3n, 2n)], ['16:10', rational(16n, 10n)], ['16:9', rational(16n, 9n)],
  ['1.85:1', rational(185n, 100n)], ['2.39:1', rational(239n, 100n)],
  ['4:5', rational(4n, 5n)], ['3:4', rational(3n, 4n)], ['2:3', rational(2n, 3n)], ['9:16', rational(9n, 16n)],
];
let nearestGap = null;
for (let i = 0; i < specPresets.length; i++) {
  for (let j = i + 1; j < specPresets.length; j++) {
    const gap = abs(sub(specPresets[i][1], specPresets[j][1]));
    if (nearestGap === null || cmp(gap, nearestGap.gap) < 0) {
      nearestGap = { first: specPresets[i][0], second: specPresets[j][0], gap };
    }
  }
}
assert.equal(nearestGap.first, '4:5');
assert.equal(nearestGap.second, '3:4');
assert.equal(frac(nearestGap.gap), '1/20');
assert.equal(fixed(nearestGap.gap, 2), '0.05');
assert.ok(cmp(nearestGap.gap, rational(2n, 100n)) > 0);

// A synthetic core-level preset set can exercise winner selection without changing the product's closed list.
const synthetic = [
  ['test-left', rational(177n, 100n)],
  ['test-right', rational(178n, 100n)],
];
const candidate = rational(889n, 500n); // 1.778: 0.008 from left and 0.002 from right.
const within = synthetic
  .map(([name, value]) => ({ name, gap: abs(sub(candidate, value)) }))
  .filter(item => cmp(item.gap, rational(1n, 100n)) <= 0)
  .sort((a, b) => cmp(a.gap, b.gap));
assert.deepEqual(within.map(x => x.name), ['test-right', 'test-left']);
assert.equal(fixed(within[0].gap, 4), '0.0020');

const presetSets = {
  spec: specPresets.map(([name]) => name),
  brief: ['1:1', '3:2', '2:3', '4:3', '3:4', '5:4', '16:9', '9:16', '16:10', '21:9', '1.85:1', '2.39:1'],
};
assert.ok(presetSets.brief.includes('21:9') && !presetSets.spec.includes('21:9'));
assert.ok(presetSets.spec.includes('4:5') && !presetSets.brief.includes('4:5'));

const result = {
  candidateCommit: '617030612c3525b3d78db008b4d5e700331d66dc',
  node: process.version,
  purpose: 'Independent exact-rational recomputation of written fixtures; not a product test.',
  dimensionFixtures: derivedDimensions,
  nearMisses: {
    '1366x768 vs 16:9': { exactDifference: frac(nearMissDiff), display4: fixed(nearMissDiff, 4) },
    '2560x1080 vs 21:9': { exactDifference: frac(wideMissDiff), display4: fixed(wideMissDiff, 4) },
  },
  modeB,
  rawBounds,
  roundingHalfAwayExamples: { '1/8 to 2 places': fixed(rational(1n, 8n), 2), '3/8 to 2 places': fixed(rational(3n, 8n), 2) },
  presetAudit: {
    specPresetCount: presetSets.spec.length,
    briefPresetCount: presetSets.brief.length,
    onlyInBrief: ['21:9'],
    onlyInSpec: ['4:5'],
    closestSpecPresetPair: { first: nearestGap.first, second: nearestGap.second, exactGap: frac(nearestGap.gap), decimalGap: fixed(nearestGap.gap, 2) },
    canTwoListedSpecPresetsBothBeWithin0_01: cmp(nearestGap.gap, rational(2n, 100n)) <= 0,
    syntheticCoreWinner: { candidate: '1.778', candidatesWithin0_01: within.length, winner: within[0].name, winnerDifference: fixed(within[0].gap, 4) },
  },
  assertions: 'PASS',
};

await writeFile(new URL('./ASPECT-RATIO-DOC-REVIEW-math.json', import.meta.url), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
