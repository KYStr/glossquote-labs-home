import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createCryptoSource, drawIndex } from "../public/js/core/wheel.mjs";

// SPEC section 7(e): a smoke check over the real crypto source only.
// 60,000 draws at n = 6; every index count must land within ±5% of the
// 10,000 expectation. This is a sanity band, never a fairness proof —
// the fairness obligation is the audited rejection-sampling rule.
describe("distribution sanity over the real crypto source", () => {
  it("keeps 60,000 draws at n = 6 within ±5% of uniform", () => {
    const source = createCryptoSource();
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i += 1) {
      counts[drawIndex(6, source).index] += 1;
    }
    for (const count of counts) {
      assert.ok(
        count >= 9500 && count <= 10500,
        `count ${count} outside the pre-declared 9500..10500 band`,
      );
    }
  });
});
