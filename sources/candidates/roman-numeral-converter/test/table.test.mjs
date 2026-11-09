import assert from "node:assert/strict";
import test from "node:test";

import { GREEDY_TABLE, SYMBOL_VALUES } from "../public/js/core/table.mjs";

test("the greedy table matches SPEC section 4 exactly, in order", () => {
  assert.deepEqual(
    GREEDY_TABLE.map((entry) => [entry.value, entry.symbols]),
    [
      [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
      [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"],
      [5, "V"], [4, "IV"], [1, "I"],
    ],
  );
  assert.deepEqual(SYMBOL_VALUES, { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 });
});
