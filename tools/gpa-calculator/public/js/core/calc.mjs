// Exact GPA arithmetic (SPEC section 4). All computation is integer-based:
// points are tenths (p10), credits are halves (c2), GPAs are hundredths.
// The only rounding is one final half-up rounding at display time.
import { getScale, pointsTenths } from "./scales.mjs";
import { parseCreditsHalves, parseSolverCreditsHalves, parseGpaHundredths } from "./validate.mjs";

// Round the non-negative rational num/den half-up to an integer.
export function roundHalfUpDiv(num, den) {
  return Math.floor((2 * num + den) / (2 * den));
}

export function formatHundredths(h100) {
  const whole = Math.floor(h100 / 100);
  const frac = String(h100 % 100).padStart(2, "0");
  return `${whole}.${frac}`;
}

export function formatCredits(c2) {
  return c2 % 2 === 0 ? String(c2 / 2) : `${Math.floor(c2 / 2)}.5`;
}

// Total grade points N is in twentieths (p10 * c2). Format exactly:
// integer when whole, otherwise the exact decimal (one or two places).
export function formatTotalPoints(nTwentieths) {
  const hundredths = nTwentieths * 5; // N/20 == (5N)/100
  const whole = Math.floor(hundredths / 100);
  const frac = hundredths % 100;
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

// Assess one course row against the active scale.
// row: { label, grade (letter string or null), creditsRaw (string), excluded }
export function assessRow(row, scale) {
  if (row.excluded) return { state: "excluded" };
  const gradeMissing = row.grade === null || row.grade === undefined || row.grade === "";
  const creditsBlank = row.creditsRaw === null || row.creditsRaw === undefined || String(row.creditsRaw).trim() === "";
  if (!gradeMissing && !gradeOnScaleSafe(scale, row.grade)) {
    return { state: "error", code: "grade-not-on-scale", grade: row.grade };
  }
  if (gradeMissing || creditsBlank) return { state: "incomplete" };
  const parsed = parseCreditsHalves(row.creditsRaw);
  if (!parsed.ok) return { state: "error", code: `credits-${parsed.code}` };
  return { state: "ok", p10: pointsTenths(scale, row.grade), c2: parsed.c2 };
}

function gradeOnScaleSafe(scale, letter) {
  return pointsTenths(scale, letter) !== null;
}

// Aggregate totals over a row list under a scale id (SPEC section 4).
export function computeTotals(rows, scaleId) {
  const scale = getScale(scaleId);
  let n = 0; // sum of p10 * c2 (twentieths of a grade point)
  let d = 0; // sum of c2 (halves of a credit)
  let included = 0;
  let incomplete = 0;
  let errors = 0;
  let excluded = 0;
  for (const row of rows) {
    const a = assessRow(row, scale);
    if (a.state === "ok") { n += a.p10 * a.c2; d += a.c2; included += 1; }
    else if (a.state === "incomplete") incomplete += 1;
    else if (a.state === "error") errors += 1;
    else excluded += 1;
  }
  if (d === 0) {
    return { status: "empty", included, incomplete, errors, excluded,
             totalCreditsC2: 0, totalPointsText: "0", gpaText: null };
  }
  // GPA x100 = 10 * N / D as a rational; round half-up exactly once.
  const gpaH100 = roundHalfUpDiv(10 * n, d);
  return { status: "ok", included, incomplete, errors, excluded,
           totalCreditsC2: d, totalCreditsText: formatCredits(d),
           totalPointsText: formatTotalPoints(n), gpaText: formatHundredths(gpaH100) };
}

// Target-GPA solver (SPEC section 4). Raw string inputs; scale id selects max.
// R (in hundredths) is the exact rational rNum / c1h.
export function solveTarget(input, scaleId) {
  const scale = getScale(scaleId);
  const errors = {};
  const c0 = parseSolverCreditsHalves(input.completedCredits, 0, 2000);
  if (!c0.ok) errors.completedCredits = c0.code;
  const c1 = parseSolverCreditsHalves(input.plannedCredits, 1, 600);
  if (!c1.ok) errors.plannedCredits = c1.code;
  const t = parseGpaHundredths(input.targetGpa, scale.maxTenths);
  if (!t.ok) errors.targetGpa = t.code;
  const g0 = parseGpaHundredths(input.currentGpa, scale.maxTenths, { allowBlank: true });
  if (!g0.ok) errors.currentGpa = g0.code;
  // C0 = 0 makes G0 irrelevant: it may be blank only in that case.
  if (c0.ok && c0.c2 > 0 && g0.ok && g0.blank) errors.currentGpa = "blank";
  if (Object.keys(errors).length > 0) return { status: "invalid", errors };

  const c0h = c0.c2, c1h = c1.c2;
  const g100 = c0h === 0 ? 0 : g0.h100; // C0 = 0: G0 is ignored entirely
  const t100 = t.h100;
  const maxH100 = scale.maxTenths * 10;
  const totalH = c0h + c1h;

  // R x100 is the exact rational rNum / c1h. With C0 = 0 it reduces to T.
  const rNum = t100 * totalH - g100 * c0h;
  if (rNum <= 0) {
    const zeroFinal = roundHalfUpDiv(g100 * c0h, totalH);
    return { status: "guaranteed", zeroFinalGpaText: formatHundredths(zeroFinal) };
  }
  const requiredH100 = roundHalfUpDiv(rNum, c1h);
  if (rNum > maxH100 * c1h) {
    const maxFinal = roundHalfUpDiv(g100 * c0h + maxH100 * c1h, totalH);
    return { status: "unreachable",
             requiredText: formatHundredths(requiredH100),
             maxAttainableText: formatHundredths(maxFinal) };
  }
  return { status: "feasible", requiredText: formatHundredths(requiredH100) };
}
