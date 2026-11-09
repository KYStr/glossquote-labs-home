// Core behaviour: exactness vs a BigInt rational reference, row states, bounds.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, assessRow, roundHalfUpDiv } from "../public/js/core/calc.mjs";
import { getScale } from "../public/js/core/scales.mjs";
import { parseCreditsHalves } from "../public/js/core/validate.mjs";

const row = (grade, creditsRaw, extra = {}) => ({ label: "", grade, creditsRaw: String(creditsRaw), excluded: false, ...extra });

// Independent reference: exact rational GPA with half-up rounding, in BigInt.
function referenceGpaText(rows, scaleId) {
  const pts = { "4.0": { A: 40n, "A\u2212": 37n, "B+": 33n, B: 30n, "B\u2212": 27n, "C+": 23n, C: 20n, "C\u2212": 17n, "D+": 13n, D: 10n, "D\u2212": 7n, F: 0n },
                "4.3": { "A+": 43n, A: 40n, "A\u2212": 37n, "B+": 33n, B: 30n, "B\u2212": 27n, "C+": 23n, C: 20n, "C\u2212": 17n, "D+": 13n, D: 10n, "D\u2212": 7n, F: 0n } }[scaleId];
  let n = 0n, d = 0n;
  for (const r of rows) { const c2 = BigInt(Math.round(Number(r.creditsRaw) * 2)); n += pts[r.grade] * c2; d += c2; }
  // GPA x100 = 10n/d; half-up: floor((20n + d) / 2d)
  const h = (20n * n + d) / (2n * d);
  return `${h / 100n}.${String(h % 100n).padStart(2, "0")}`;
}

test("exactness property: deterministic pseudo-random row sets match the rational reference", () => {
  let seed = 123456789;
  const rnd = (m) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % m; };
  const letters40 = ["A", "A\u2212", "B+", "B", "B\u2212", "C+", "C", "C\u2212", "D+", "D", "D\u2212", "F"];
  const letters43 = ["A+", ...letters40];
  for (let trial = 0; trial < 200; trial++) {
    const scaleId = trial % 2 ? "4.3" : "4.0";
    const letters = scaleId === "4.3" ? letters43 : letters40;
    const rows = Array.from({ length: 1 + rnd(8) }, () => row(letters[rnd(letters.length)], (1 + rnd(20)) / 2));
    assert.equal(computeTotals(rows, scaleId).gpaText, referenceGpaText(rows, scaleId), `trial ${trial}`);
  }
});

test("deliberate xx5 boundary: 2.675-style case rounds half-up, not banker's", () => {
  // A(1) + C(3) on 4.0: (40*2 + 20*6)/(10*8) = 200/80 = 2.50 exact — sanity.
  assert.equal(computeTotals([row("A", 1), row("C", 3)], "4.0").gpaText, "2.50");
  // B+(1) + D(1) + F(0.5): N = 33*2 + 10*2 + 0 = 86, D = 5 -> 860/50 = 17.2 -> no.
  // Direct half-up unit checks at .5 boundaries:
  assert.equal(roundHalfUpDiv(3325, 1000), 3); // not used for display; sanity of floor form
  assert.equal(roundHalfUpDiv(5, 2), 3); // 2.5 -> 3 (ties away from zero)
  assert.equal(roundHalfUpDiv(7, 2), 4); // 3.5 -> 4
  // A+(0.5) + B(3.5) on 4.3: N = 43*1 + 30*7 = 253, D = 8 -> 2530/8 = 316.25 -> 316
  assert.equal(computeTotals([row("A+", 0.5), row("B", 3.5)], "4.3").gpaText, "3.16");
});

test("incomplete rows neither count nor hide: counted and reported", () => {
  const t = computeTotals([row("A", 3), row(null, 3), row("B", ""), row("", 2)], "4.0");
  assert.equal(t.included, 1);
  assert.equal(t.incomplete, 3);
  assert.equal(t.gpaText, "4.00");
});

test("excluded rows do not affect totals", () => {
  const t = computeTotals([row("A", 3), row("F", 3, { excluded: true })], "4.0");
  assert.equal(t.excluded, 1);
  assert.equal(t.totalCreditsText, "3");
  assert.equal(t.gpaText, "4.00");
});

test("empty course list -> empty status, no number", () => {
  assert.equal(computeTotals([], "4.0").status, "empty");
  assert.equal(computeTotals([row(null, "")], "4.0").status, "empty");
  assert.equal(computeTotals([row("A", 3, { excluded: true })], "4.0").status, "empty");
});

test("odd halves display: 7.5 total credits", () => {
  const t = computeTotals([row("A", 4.5), row("B", 3)], "4.0");
  assert.equal(t.totalCreditsText, "7.5");
});

test("credits bounds: 0.5 and 30 accepted; 0, 30.5, 1.3, blank, text refused", () => {
  assert.deepEqual(parseCreditsHalves("0.5"), { ok: true, c2: 1 });
  assert.deepEqual(parseCreditsHalves("30"), { ok: true, c2: 60 });
  assert.equal(parseCreditsHalves("0").ok, false);
  assert.equal(parseCreditsHalves("30.5").ok, false);
  assert.equal(parseCreditsHalves("1.3").code, "off-step");
  assert.equal(parseCreditsHalves("").code, "blank");
  assert.equal(parseCreditsHalves("abc").code, "not-a-number");
  assert.equal(parseCreditsHalves("-3").ok, false);
});

test("row credit errors surface as error state, not silent zero", () => {
  const a = assessRow(row("A", "31"), getScale("4.0"));
  assert.equal(a.state, "error");
});
