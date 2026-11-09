// Goal solver tests. Expected values are SPEC section 4 fixtures 3-5 and
// hand-computed cases; properties follow SPEC section 7(d)/(e).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  monthsToTarget,
  requiredContribution,
  finalBalanceCents,
} from '../public/js/core/simulate.mjs';

test('fixture 3: goal A reaches 1,000.00 at month 10 with 1,046.22', () => {
  const r = monthsToTarget({ initialCents: 0n, rateThousandths: 12000, contributionCents: 10000n, targetCents: 100000n });
  assert.equal(r.status, 'reached');
  assert.equal(r.months, 10);
  assert.equal(r.balanceCents, 104622n);
});

test('goal A: target <= initial is month 0, not an error', () => {
  const equal = monthsToTarget({ initialCents: 50000n, rateThousandths: 12000, contributionCents: 0n, targetCents: 50000n });
  assert.equal(equal.status, 'already-reached');
  assert.equal(equal.months, 0);
  const below = monthsToTarget({ initialCents: 50000n, rateThousandths: 0, contributionCents: 0n, targetCents: 40000n });
  assert.equal(below.status, 'already-reached');
});

test('goal A: no growth (rate 0, contribution 0) is its own outcome', () => {
  const r = monthsToTarget({ initialCents: 100n, rateThousandths: 0, contributionCents: 0n, targetCents: 200n });
  assert.equal(r.status, 'no-growth');
  assert.equal(r.months, null);
});

test('goal A: slow growth that misses 600 months is not-reached, distinct wording path', () => {
  // 1.00/month at 0% adds 600.00 in 600 months; the target is the amount cap.
  const r = monthsToTarget({ initialCents: 0n, rateThousandths: 0, contributionCents: 100n, targetCents: 99999999999n });
  assert.equal(r.status, 'not-reached');
  assert.equal(r.balanceCents, 60000n);
});

test('goal A: first-crossing property (balance at m-1 < target <= balance at m)', () => {
  const args = { initialCents: 12345n, rateThousandths: 3456, contributionCents: 789n, targetCents: 50000n };
  const r = monthsToTarget(args);
  assert.equal(r.status, 'reached');
  const atM = finalBalanceCents({ ...args, termMonths: r.months });
  const atPrev = finalBalanceCents({ ...args, termMonths: r.months - 1 });
  assert.ok(atM >= args.targetCents);
  assert.ok(atPrev < args.targetCents);
  assert.equal(r.balanceCents, atM);
});

test('fixture 4: goal B at 0% needs exactly 1,000.00 for 12,000.00 in 12 months', () => {
  const r = requiredContribution({ initialCents: 0n, rateThousandths: 0, targetCents: 1200000n, termMonths: 12 });
  assert.equal(r.contributionCents, 100000n);
  assert.equal(r.finalAtContributionCents, 1200000n);
  assert.equal(r.finalAtOneCentLessCents, 1199988n); // 999.99/mo -> 11,999.88
});

test('fixture 5: goal B at 12% needs 946.19; one cent less falls short', () => {
  const r = requiredContribution({ initialCents: 0n, rateThousandths: 12000, targetCents: 1200000n, termMonths: 12 });
  assert.equal(r.contributionCents, 94619n);
  assert.equal(r.finalAtContributionCents, 1200005n); // 12,000.05
  assert.equal(r.finalAtOneCentLessCents, 1199992n); // 11,999.92
});

test('goal B: target <= initial means required contribution 0.00', () => {
  const r = requiredContribution({ initialCents: 1200000n, rateThousandths: 12000, targetCents: 1200000n, termMonths: 12 });
  assert.equal(r.contributionCents, 0n);
  assert.equal(r.finalAtOneCentLessCents, null);
});

test('goal B: interest alone can make the answer 0 (hand-computed final)', () => {
  // 1,000.00 at 12% with no contributions for 12 months ends at 1,126.84
  // (hand-simulated month by month), already past a 1,100.00 target.
  const r = requiredContribution({ initialCents: 100000n, rateThousandths: 12000, targetCents: 110000n, termMonths: 12 });
  assert.equal(r.contributionCents, 0n);
  assert.equal(r.finalAtContributionCents, 112684n);
  assert.equal(r.finalAtOneCentLessCents, null);
});

test('goal B: minimality property holds across a seeded sweep', () => {
  let state = 987654321;
  const next = (limit) => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state % limit;
  };
  for (let i = 0; i < 40; i += 1) {
    const args = {
      initialCents: BigInt(next(200000)),
      rateThousandths: next(20001),
      targetCents: BigInt(1000 + next(500000)),
      termMonths: 1 + next(120),
    };
    const r = requiredContribution(args);
    assert.ok(
      finalBalanceCents({ ...args, contributionCents: r.contributionCents }) >= args.targetCents,
      `case ${i}: contribution does not reach target`,
    );
    if (r.contributionCents > 0n) {
      assert.ok(
        finalBalanceCents({ ...args, contributionCents: r.contributionCents - 1n }) < args.targetCents,
        `case ${i}: one cent less should fall short`,
      );
      assert.equal(r.finalAtContributionCents, finalBalanceCents({ ...args, contributionCents: r.contributionCents }));
      assert.equal(r.finalAtOneCentLessCents, finalBalanceCents({ ...args, contributionCents: r.contributionCents - 1n }));
    }
  }
});
