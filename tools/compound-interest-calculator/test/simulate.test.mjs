// Simulation tests. Expected values are the SPEC section 4 worked fixtures
// (hand-recomputed from the pinned rules) and hand-computed cases; none are
// generated from the implementation's output.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  simulate,
  yearlySummary,
  monthlyInterestCents,
  effectiveAnnualRatePercent,
} from '../public/js/core/simulate.mjs';

test('fixture 1: growth 10,000.00 at 12% + 100.00/mo for 12 months', () => {
  const r = simulate({ initialCents: 1000000n, rateThousandths: 12000, contributionCents: 10000n, termMonths: 12 });
  // SPEC: final 12,536.49 (the closed form's 12,536.50 is NOT the answer),
  // total interest 1,336.49, recurring contributions 1,200.00.
  assert.equal(r.finalBalanceCents, 1253649n);
  assert.equal(r.totalInterestCents, 133649n);
  assert.equal(r.totalContributionsCents, 120000n);
  assert.equal(r.rows.length, 12);
  // Hand-computed spot rows: month 1 interest 100.00, balance 10,200.00;
  // month 12 interest 123.13 (12313.36 rounds down), balance 12,536.49.
  assert.equal(r.rows[0].interestCents, 10000n);
  assert.equal(r.rows[0].balanceCents, 1020000n);
  assert.equal(r.rows[11].interestCents, 12313n);
  assert.equal(r.rows[11].balanceCents, 1253649n);
});

test('fixture 2: zero rate is pure addition, exactly 3,000.00', () => {
  const r = simulate({ initialCents: 0n, rateThousandths: 0, contributionCents: 25000n, termMonths: 12 });
  assert.equal(r.finalBalanceCents, 300000n);
  assert.equal(r.totalInterestCents, 0n);
  assert.ok(r.rows.every((row) => row.interestCents === 0n));
});

test('fixture 1 effective annual rate displays 12.68%', () => {
  assert.equal(effectiveAnnualRatePercent(12000), '12.68');
  assert.equal(effectiveAnnualRatePercent(0), '0.00');
});

test('rounding: an exact half cent rounds away from zero', () => {
  // balance 0.50 at 12% -> 50 * 12000 / 1200000 = 0.5 cent exactly -> 1.
  assert.equal(monthlyInterestCents(50n, 12000), 1n);
  // balance 1.50 at 12% -> 1.5 cents exactly -> 2.
  assert.equal(monthlyInterestCents(150n, 12000), 2n);
  // Just below a half stays down: 1.49 at 12% -> 1.49 cents -> 1.
  assert.equal(monthlyInterestCents(149n, 12000), 1n);
  // 2.50 at 12% -> 2.5 cents -> 3 (not banker's rounding).
  assert.equal(monthlyInterestCents(250n, 12000), 3n);
});

test('identity + yearly summary hold across a seeded parameter sweep', () => {
  // Deterministic LCG so the sweep is reproducible and offline.
  let state = 20261109;
  const next = (limit) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % limit;
  };
  for (let i = 0; i < 60; i += 1) {
    const initialCents = BigInt(next(100000000));
    const rateThousandths = next(100001);
    const contributionCents = BigInt(next(500000));
    const termMonths = 1 + next(600);
    const r = simulate({ initialCents, rateThousandths, contributionCents, termMonths });
    // SPEC identity: final = initial + term * contribution + sum(interest).
    assert.equal(
      r.finalBalanceCents,
      initialCents + r.totalContributionsCents + r.totalInterestCents,
      `identity failed at case ${i}`,
    );
    assert.equal(r.totalContributionsCents, contributionCents * BigInt(termMonths));
    // Rows chain: each end balance = previous + interest + contribution.
    let prev = initialCents;
    for (const row of r.rows) {
      assert.equal(row.balanceCents, prev + row.interestCents + row.contributionCents);
      prev = row.balanceCents;
    }
    // Yearly table's last row equals the growth outputs.
    const years = yearlySummary(r.rows);
    const last = years[years.length - 1];
    assert.equal(last.endBalanceCents, r.finalBalanceCents);
    assert.equal(last.contributionsCumulativeCents, r.totalContributionsCents);
    assert.equal(last.interestCumulativeCents, r.totalInterestCents);
    assert.equal(years.length, Math.ceil(termMonths / 12));
  }
});

test('exactness at the amount cap: BigInt interest never flips a cent', () => {
  // 999,999,999.99 at 100% for 1 month: interest = balance * 100 / 1200
  // = balance / 12 = 8,333,333,333.25 cents exactly -> rounds down to
  // 8,333,333,333. A double decides products near 10^16 here; BigInt is exact.
  assert.equal(monthlyInterestCents(99999999999n, 100000), 8333333333n);
  const r = simulate({ initialCents: 99999999999n, rateThousandths: 100000, contributionCents: 0n, termMonths: 1 });
  assert.equal(r.finalBalanceCents, 99999999999n + 8333333333n);
});
