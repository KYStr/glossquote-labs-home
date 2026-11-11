import { error, hasOwnDataFields, ok, shortStringError, verifyFixtures } from '../fixture-review.mjs';

const common = { amount: { max: 12, places: 2, lo: 0, hi: 999_999_999.99 } };
const rateFields = {
  ...common,
  annualRatePercent: { max: 8, places: 3, lo: -100, hi: 1000, signed: true, open: true },
  years: { max: 3, places: 0, lo: 0, hi: 200 },
};
const index = { max: 9, places: 3, lo: 0, hi: 99_999.999, open: true };
const cpiFields = {
  ...common,
  cpiFrom: index,
  cpiTo: index,
  labelFrom: { max: 24, label: true },
  labelTo: { max: 24, label: true },
  yearsBetween: { max: 3, places: 0, lo: 1, hi: 200, nullable: true },
};

const round = (value, places) => {
  const scale = 10 ** places;
  return Math.floor(value * scale + 0.5) / scale;
};
const defaultDraft = { mode: 'rate', amount: '100000', annualRatePercent: '2', years: '10' };

function derive(input) {
  const mode = input && Object.getOwnPropertyDescriptor(input, 'mode')?.value;
  const fields = mode === 'rate' ? rateFields : mode === 'cpi' ? cpiFields : null;
  if (!fields || !hasOwnDataFields(input, ['mode', ...Object.keys(fields)])) return error('SCHEMA');
  if (Object.entries(fields).some(([field, rule]) =>
    typeof input[field] !== 'string' && !(rule.nullable && input[field] === null)
  )) return error('SCHEMA');

  const values = {};
  for (const [field, rule] of Object.entries(fields)) {
    const raw = input[field];
    if (raw === null) {
      values[field] = null;
      continue;
    }
    const value = rule.label ? raw.replace(/^ +| +$/g, '') : raw;
    const code = shortStringError(raw, rule.max, value);
    if (code) return error(code, field);
    if (rule.label) {
      values[field] = value;
      continue;
    }
    const match = /^(-?)[0-9]+(?:\.([0-9]+))?$/.exec(value);
    if (!match || (match[1] && !rule.signed) || (match[2]?.length ?? 0) > rule.places) {
      return error(rule.places === 0 ? 'INTEGER_FORMAT' : 'DECIMAL_FORMAT', field);
    }
    const n = Number(value);
    if (n < rule.lo || n > rule.hi || (rule.open && n === rule.lo)) return error('RANGE', field);
    values[field] = n;
  }

  const a = values.amount;
  if (mode === 'cpi') {
    const ratio = values.cpiTo / values.cpiFrom;
    return ok({
      adjustedAmount: round(a * ratio, 2),
      cumulativePercent: round((ratio - 1) * 100, 2),
      equivalentAnnualRatePercent: values.yearsBetween === null ? null :
        round((Math.pow(ratio, 1 / values.yearsBetween) - 1) * 100, 4),
      fromLabel: values.labelFrom,
      toLabel: values.labelTo,
    });
  }
  const base = 1 + values.annualRatePercent / 100;
  const factor = Math.pow(base, values.years);
  const yearTable = Array.from({ length: values.years + 1 }, (_, year) => {
    const f = Math.pow(base, year);
    const rawPower = a / f;
    return {
      year,
      nominalValue: round(a * f, 2),
      purchasingPower: Number.isFinite(rawPower) ? round(rawPower, 2) : null,
    };
  });
  return ok({
    cumulativePercent: round((factor - 1) * 100, 2),
    futureValue: yearTable.at(-1).nominalValue,
    purchasingPower: yearTable.at(-1).purchasingPower,
    yearTable,
  });
}

function probes() {
  const overflow = { mode: 'rate', amount: '10000000', annualRatePercent: '-99.999', years: '60' };
  const factor = Math.pow(1 + Number(overflow.annualRatePercent) / 100, Number(overflow.years));
  const raw = Number(overflow.amount) / factor;
  const result = derive(overflow).result;
  const underflow = { ...overflow, amount: '1000', years: '200' };
  const underflowResult = derive(underflow).result;
  const rateInputs = ['0.001', '0.002'].map((annualRatePercent) => ({
    mode: 'rate', amount: '1', annualRatePercent, years: '1',
  }));
  const rateOutputs = rateInputs.map((input) => {
    const { futureValue, cumulativePercent } = derive(input).result;
    return { futureValue, cumulativePercent };
  });
  const mixedBase = {
    mode: 'cpi', amount: '10000', cpiFrom: '105.48', cpiTo: '103.97',
    labelFrom: '民國99年', labelTo: '民國103年', yearsBetween: '4',
  };
  const commonBase = { ...mixedBase, cpiFrom: '98.60' };
  const period = {
    mode: 'cpi', amount: '5000', cpiFrom: '105.3', cpiTo: '100.0',
    labelFrom: '2020', labelTo: '2021', yearsBetween: '5',
  };
  const ratio = 2.25;
  const binary = new DataView(new ArrayBuffer(8));
  binary.setFloat64(0, ratio);
  binary.setBigUint64(0, binary.getBigUint64(0) - 1n);
  const lowerRatio = binary.getFloat64(0);
  return [
    {
      id: 'INFL-01', input: overflow, factor, unroundedPurchasingPower: raw,
      scalingBy100: raw * 100, resultPower: result.purchasingPower,
      reportPowerAfterJsonSerialization: JSON.parse(JSON.stringify(result)).purchasingPower,
    },
    {
      id: 'underflow-stated-case', input: underflow,
      output: {
        futureValue: underflowResult.futureValue,
        purchasingPower: underflowResult.purchasingPower,
        cumulativePercent: underflowResult.cumulativePercent,
        nullRows: underflowResult.yearTable.filter(({ purchasingPower }) => purchasingPower === null).length,
      },
    },
    { id: 'INFL-02', inputs: rateInputs, outputs: rateOutputs },
    {
      id: 'INFL-03', mixedBase, commonBase,
      mixedResult: derive(mixedBase).result, commonResult: derive(commonBase).result,
      labeledOneYear: { input: period, output: derive(period).result.equivalentAnnualRatePercent },
      correctedDuration: derive({ ...period, yearsBetween: '1' }).result.equivalentAnnualRatePercent,
    },
    {
      id: 'INFL-04', note: 'Binary64 sensitivity analysis. No alternate browser execution.',
      input: { mode: 'rate', amount: '0.02', annualRatePercent: '50', years: '2' },
      factors: [ratio, lowerRatio],
      roundedNominalValues: [ratio, lowerRatio].map((f) => round(0.02 * f, 2)),
    },
  ];
}
await verifyFixtures('inflation-calculator', derive, defaultDraft, probes);
