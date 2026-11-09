// Pure simulation and goal solvers for the Compound Interest Calculator.
// Contract: docs/specs/compound-interest-calculator/SPEC.md section 4.
// The month-by-month simulation is the product's truth; no closed-form
// formula is used for any money result. Money is BigInt cents throughout.
// No DOM, network or storage.

import { MONTHLY_RATE_DENOMINATOR, MAX_TERM_MONTHS } from './money.mjs';

// interest = round-half-away-from-zero(balance * annualRate / 1200), exact.
// All inputs are non-negative, so half-away-from-zero is half-up here.
export function monthlyInterestCents(balanceCents, rateThousandths) {
  if (rateThousandths === 0 || balanceCents === 0n) return 0n;
  const numerator = balanceCents * BigInt(rateThousandths);
  const quotient = numerator / MONTHLY_RATE_DENOMINATOR;
  const remainder = numerator % MONTHLY_RATE_DENOMINATOR;
  return remainder * 2n >= MONTHLY_RATE_DENOMINATOR ? quotient + 1n : quotient;
}

// Run the pinned simulation: each month interest is credited on the balance,
// then the contribution lands at month end.
// Returns the full monthly series plus totals. The identity
// final = initial + totalContributions + totalInterest holds by construction.
export function simulate({ initialCents, rateThousandths, contributionCents, termMonths }) {
  const rows = [];
  let balance = initialCents;
  let totalInterest = 0n;
  for (let month = 1; month <= termMonths; month += 1) {
    const interest = monthlyInterestCents(balance, rateThousandths);
    balance += interest;
    balance += contributionCents;
    totalInterest += interest;
    rows.push({
      month,
      interestCents: interest,
      contributionCents,
      balanceCents: balance,
    });
  }
  return {
    rows,
    totalInterestCents: totalInterest,
    totalContributionsCents: contributionCents * BigInt(termMonths),
    finalBalanceCents: balance,
  };
}

// Final balance only (no series), used by the goal solvers.
export function finalBalanceCents({ initialCents, rateThousandths, contributionCents, termMonths }) {
  let balance = initialCents;
  for (let month = 1; month <= termMonths; month += 1) {
    balance += monthlyInterestCents(balance, rateThousandths);
    balance += contributionCents;
  }
  return balance;
}

// Group simulation rows into calendar years of the plan (months 1-12 = year 1).
export function yearlySummary(rows) {
  const years = [];
  for (const row of rows) {
    const yearIndex = Math.floor((row.month - 1) / 12);
    let entry = years[yearIndex];
    if (!entry) {
      entry = {
        year: yearIndex + 1,
        contributionsYearCents: 0n,
        interestYearCents: 0n,
        contributionsCumulativeCents: 0n,
        interestCumulativeCents: 0n,
        endBalanceCents: 0n,
      };
      years[yearIndex] = entry;
    }
    entry.contributionsYearCents += row.contributionCents;
    entry.interestYearCents += row.interestCents;
    entry.endBalanceCents = row.balanceCents;
  }
  let cumContrib = 0n;
  let cumInterest = 0n;
  for (const entry of years) {
    cumContrib += entry.contributionsYearCents;
    cumInterest += entry.interestYearCents;
    entry.contributionsCumulativeCents = cumContrib;
    entry.interestCumulativeCents = cumInterest;
  }
  return years;
}

// Goal A: first month whose end balance reaches the target.
// status: already-reached | reached | no-growth | not-reached.
export function monthsToTarget({ initialCents, rateThousandths, contributionCents, targetCents }) {
  if (initialCents >= targetCents) {
    return { status: 'already-reached', months: 0, balanceCents: initialCents };
  }
  let balance = initialCents;
  for (let month = 1; month <= MAX_TERM_MONTHS; month += 1) {
    balance += monthlyInterestCents(balance, rateThousandths);
    balance += contributionCents;
    if (balance >= targetCents) {
      return { status: 'reached', months: month, balanceCents: balance };
    }
  }
  if (rateThousandths === 0 && contributionCents === 0n) {
    return { status: 'no-growth', months: null, balanceCents: initialCents };
  }
  return { status: 'not-reached', months: null, balanceCents: balance };
}

// Goal B: smallest monthly contribution in whole cents whose simulation
// reaches the target by the end of the term (SPEC section 4 binary search
// over [0, targetCents]; interest is never negative at rate >= 0, so the
// target itself is a safe upper bound).
export function requiredContribution({ initialCents, rateThousandths, targetCents, termMonths }) {
  const at = (c) => finalBalanceCents({
    initialCents, rateThousandths, contributionCents: c, termMonths,
  });
  if (targetCents <= initialCents) {
    return { contributionCents: 0n, finalAtContributionCents: at(0n), finalAtOneCentLessCents: null };
  }
  let lo = 0n;
  let hi = targetCents;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (at(mid) >= targetCents) hi = mid;
    else lo = mid + 1n;
  }
  return {
    contributionCents: lo,
    finalAtContributionCents: at(lo),
    finalAtOneCentLessCents: lo > 0n ? at(lo - 1n) : null,
  };
}

// Effective annual rate, display only (SPEC section 4): a percentage string
// with 2 decimals. This is the one place a double is allowed, because no
// cent is decided by it.
export function effectiveAnnualRatePercent(rateThousandths) {
  const annualPercent = rateThousandths / 1000;
  const ear = (Math.pow(1 + annualPercent / 1200, 12) - 1) * 100;
  return ear.toFixed(2);
}
