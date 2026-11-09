// CSV tests: the export serialises the monthly table exactly (SPEC 2/3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../public/js/core/simulate.mjs';
import { monthlyTableCsv } from '../public/js/core/csv.mjs';

test('csv: fixture 2 rows serialise to plain decimals with the given header', () => {
  const r = simulate({ initialCents: 0n, rateThousandths: 0, contributionCents: 25000n, termMonths: 3 });
  const csv = monthlyTableCsv(r.rows, ['Month', 'Interest', 'Contribution', 'End balance']);
  assert.equal(
    csv,
    'Month,Interest,Contribution,End balance\n'
    + '1,0.00,250.00,250.00\n'
    + '2,0.00,250.00,500.00\n'
    + '3,0.00,250.00,750.00\n',
  );
});

test('csv: no grouping separators or currency symbols leak into values', () => {
  const r = simulate({ initialCents: 1000000n, rateThousandths: 12000, contributionCents: 10000n, termMonths: 12 });
  const csv = monthlyTableCsv(r.rows, ['M', 'I', 'C', 'B']);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 13);
  assert.equal(lines[12], '12,123.13,100.00,12536.49');
});
