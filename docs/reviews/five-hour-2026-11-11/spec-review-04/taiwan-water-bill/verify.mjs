import assert from 'node:assert/strict';
import { error, hasOwnDataFields, ok, shortStringError, verifyFixtures } from '../fixture-review.mjs';

const options = process.argv.slice(2);
assert(options.every((option) => ['--cycle-cap-nine', '--json'].includes(option)));
const allowNineCharacterCycle = options.includes('--cycle-cap-nine');
const cycleCap = allowNineCharacterCycle ? 9 : 8;

const diameterOptions = ['13', '20', '25', '40', '50', '75', '100', '150', '200', '250', '300', '350', '400+'];
// Taiwan Water Corporation's rate sheet, page 1. Exact milli-NTD.
const basicFees = {
  monthly: [
    17850n, 35700n, 66150n, 196350n, 357000n, 963900n, 1909950n,
    5301450n, 10531500n, 18599700n, 29184750n, 41626200n, 58119600n,
  ],
  bimonthly: [
    35700n, 71400n, 132300n, 392700n, 714000n, 1927800n, 3819900n,
    10602900n, 21063000n, 37199400n, 58369500n, 83252400n, 116239200n,
  ],
};
const tariff = {
  monthly: { ceilings: [10, 30, 50, Infinity], deduction: [0n, 21000n, 84000n, 110250n] },
  bimonthly: { ceilings: [20, 60, 100, Infinity], deduction: [0n, 42000n, 168000n, 220500n] },
};
const prices = [7350n, 9450n, 11550n, 12075n];
const required = ['cycle', 'diameterMm', 'usageM3'];
const optional = ['sewerRateNt', 'wasteRateNt'];
const defaultDraft = { cycle: 'bimonthly', diameterMm: '20', usageM3: '30', sewerRateNt: '', wasteRateNt: '' };
const halfUp = (n, d) => n / d + (2n * (n % d) >= d ? 1n : 0n);

function parseRate(value) {
  const [whole, cents = ''] = value.split('.');
  return BigInt(whole) * 100n + BigInt(cents.padEnd(2, '0'));
}

function derive(input, maxCycle = cycleCap) {
  const fields = [...required, ...optional.filter((field) => input && Object.hasOwn(input, field))];
  if (!hasOwnDataFields(input, fields) || fields.some((field) => typeof input[field] !== 'string')) {
    return error('SCHEMA');
  }
  const { cycle, diameterMm } = input;
  let usage;
  const rates = {};
  for (const field of fields) {
    const raw = input[field];
    if (optional.includes(field) && raw === '') continue;
    const code = shortStringError(raw, field === 'cycle' ? maxCycle : 8);
    if (code) return error(code, field);
    if (field === 'cycle' && !Object.hasOwn(tariff, raw)) return error('ENUM', field);
    if (field === 'diameterMm' && !diameterOptions.includes(raw)) return error('ENUM', field);
    if (field === 'usageM3') {
      if (!/^(0|[1-9][0-9]*)$/.test(raw)) return error('INTEGER_FORMAT', field);
      usage = Number(raw);
      if (usage > 999_999) return error('RANGE', field);
    }
    if (optional.includes(field)) {
      if (!/^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/.test(raw)) return error('DECIMAL_FORMAT', field);
      rates[field] = parseRate(raw);
      if (rates[field] > 9999n) return error('RANGE', field);
    }
  }

  const tiers = [];
  let usageFee = 0n;
  let lower = 0;
  for (const [i, upper] of tariff[cycle].ceilings.entries()) {
    const degrees = Math.max(0, Math.min(usage, upper) - lower);
    if (degrees > 0) {
      const subtotal = BigInt(degrees) * prices[i];
      usageFee += subtotal;
      tiers.push({
        tier: i + 1, degrees, unitPriceMilliNt: Number(prices[i]), subtotalMilliNt: Number(subtotal),
      });
    }
    lower = upper;
  }
  const basic = basicFees[cycle][diameterOptions.indexOf(diameterMm)];
  const subtotal = basic + usageFee;
  const levy = halfUp(usageFee, 21000n) * 1000n;
  const sewer = rates.sewerRateNt === undefined ? null : halfUp(BigInt(usage) * rates.sewerRateNt, 100n) * 1000n;
  const waste = rates.wasteRateNt === undefined ? null : halfUp(BigInt(usage) * rates.wasteRateNt, 100n) * 1000n;
  const tax = halfUp(subtotal, 2100n) * 100n;
  const total = halfUp(subtotal, 1000n) * 1000n + levy + (sewer ?? 0n) + (waste ?? 0n);
  return ok({
    cycle, diameterMm, usageM3: usage, tiers,
    basicFeeMilliNt: Number(basic), usageChargeMilliNt: Number(usageFee),
    waterSubtotalMilliNt: Number(subtotal), wrccMilliNt: Number(levy),
    sewerRateNt: sewer === null ? null : input.sewerRateNt, sewerFeeMilliNt: sewer === null ? null : Number(sewer),
    wasteRateNt: waste === null ? null : input.wasteRateNt, wasteFeeMilliNt: waste === null ? null : Number(waste),
    businessTaxMilliNt: Number(tax), totalPayableMilliNt: Number(total),
  });
}

function probes() {
  const official110 = derive({ cycle: 'bimonthly', diameterMm: '25', usageM3: '110' }, 9).result;
  const sampleWithLevy = derive(defaultDraft, 9).result;
  const taxInput = { cycle: 'monthly', diameterMm: '13', usageM3: '10' };
  const sampleTax = derive(taxInput, 9).result;
  const edges = Object.entries(tariff).flatMap(([cycle, { ceilings, deduction }]) =>
    [1, ...ceilings.slice(0, 3).map((end) => end + 1)].flatMap((start) =>
      [-1, 0, 1].map((offset) => {
        const usage = start + offset;
        const tier = ceilings.findIndex((limit) => usage <= limit);
        const quickFee = BigInt(usage) * prices[tier] - deduction[tier];
        const marginalFee = derive({ cycle, diameterMm: '20', usageM3: String(usage) }, 9).result.usageChargeMilliNt;
        assert.equal(marginalFee, Number(quickFee));
        return { cycle, usage, marginalFeeMilliNt: marginalFee, quickFeeMilliNt: Number(quickFee) };
      })
    )
  );
  return [
    { id: 'WATER-01', input: defaultDraft, cycleLength: defaultDraft.cycle.length, rawCap: 8,
      strict: derive(defaultDraft, 8), capNineExample: sampleWithLevy },
    { id: 'WATER-02', input: defaultDraft,
      withLevyMilliNt: sampleWithLevy.totalPayableMilliNt,
      exemptMilliNt: sampleWithLevy.totalPayableMilliNt - sampleWithLevy.wrccMilliNt,
      levyMilliNt: sampleWithLevy.wrccMilliNt },
    { id: 'WATER-03', input: taxInput, unroundedIncludedTaxNt: '91.35 / 21 = 4.35',
      statedBusinessTaxMilliNt: sampleTax.businessTaxMilliNt,
      nearestWholeYuanTaxMilliNt: Number(halfUp(BigInt(sampleTax.waterSubtotalMilliNt), 21000n) * 1000n) },
    { id: 'tariff-110-m3', input: { cycle: 'bimonthly', diameterMm: '25', usageM3: '110' },
      marginalFeeMilliNt: official110.usageChargeMilliNt, quickFeeMilliNt: Number(110n * 12075n - 220500n) },
    { id: 'tariff-boundaries', cases: edges },
  ];
}
await verifyFixtures('taiwan-water-bill', derive, defaultDraft, probes,
  allowNineCharacterCycle ? 'cycle-cap-nine' : undefined);
