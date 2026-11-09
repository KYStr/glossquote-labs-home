// Solver classification boundaries and input bounds (SPEC section 4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { solveTarget } from "../public/js/core/calc.mjs";

const S = (o, scale = "4.0") => solveTarget(o, scale);

test("R exactly 0 -> guaranteed", () => {
  // R = (1.50*20 - 3.00*10) / 10 = 0 exactly.
  const r = S({ completedCredits: "10", currentGpa: "3.00", plannedCredits: "10", targetGpa: "1.50" });
  assert.equal(r.status, "guaranteed");
  assert.equal(r.zeroFinalGpaText, "1.50");
});

test("R exactly the scale maximum -> feasible", () => {
  // C0=1 @ 4.30, +100, T=4.30 on 4.3: R = 4.30 exactly.
  const r = S({ completedCredits: "1", currentGpa: "4.30", plannedCredits: "100", targetGpa: "4.30" }, "4.3");
  assert.equal(r.status, "feasible");
  assert.equal(r.requiredText, "4.30");
  // Target equal to the 4.0 maximum with no history is feasible at the max.
  const r2 = S({ completedCredits: "0", currentGpa: "", plannedCredits: "30", targetGpa: "4.00" });
  assert.equal(r2.status, "feasible");
  assert.equal(r2.requiredText, "4.00");
});

test("R one hundredth above the maximum -> unreachable", () => {
  // C0=1 @ 3.30, +100, T=4.30 on 4.3: R = (4.30*101 - 3.30*1) / 100 = 4.31 exactly.
  const r = S({ completedCredits: "1", currentGpa: "3.30", plannedCredits: "100", targetGpa: "4.30" }, "4.3");
  assert.equal(r.status, "unreachable");
  assert.equal(r.requiredText, "4.31");
});

test("C0 = 0: G0 may be blank and is ignored; R equals T", () => {
  const blank = S({ completedCredits: "0", currentGpa: "", plannedCredits: "30", targetGpa: "3.20" });
  assert.equal(blank.status, "feasible");
  assert.equal(blank.requiredText, "3.20");
  const withG0 = S({ completedCredits: "0", currentGpa: "1.00", plannedCredits: "30", targetGpa: "3.20" });
  assert.equal(withG0.requiredText, "3.20"); // stated G0 changes nothing
});

test("C0 > 0 with blank G0 is refused", () => {
  const r = S({ completedCredits: "10", currentGpa: "", plannedCredits: "10", targetGpa: "3.00" });
  assert.equal(r.status, "invalid");
  assert.equal(r.errors.currentGpa, "blank");
});

test("solver bounds: at and beyond every limit", () => {
  const base = { completedCredits: "60", currentGpa: "3.00", plannedCredits: "30", targetGpa: "3.20" };
  // Validity only: with C0=1000 the required average is 9.87, i.e. a valid
  // input whose outcome happens to be unreachable — not an invalid input.
  assert.equal(S({ ...base, completedCredits: "1000" }).status, "unreachable");
  assert.equal(S({ ...base, completedCredits: "1000.5" }).status, "invalid");
  assert.equal(S({ ...base, plannedCredits: "300" }).status, "feasible");
  assert.equal(S({ ...base, plannedCredits: "300.5" }).status, "invalid");
  assert.equal(S({ ...base, plannedCredits: "0" }).status, "invalid");
  assert.equal(S({ ...base, targetGpa: "4.00" }).status !== "invalid", true);
  assert.equal(S({ ...base, targetGpa: "4.01" }).status, "invalid"); // above 4.0 max
  assert.equal(S({ ...base, targetGpa: "4.30" }, "4.3").status !== "invalid", true);
  assert.equal(S({ ...base, currentGpa: "4.01" }).status, "invalid");
  assert.equal(S({ ...base, currentGpa: "3.005" }).status, "invalid"); // three decimals
  assert.equal(S({ ...base, completedCredits: "10.3" }).status, "invalid"); // off-step
});
