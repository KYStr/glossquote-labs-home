import assert from "node:assert/strict";
import test from "node:test";

import { PRESETS } from "../public/js/core/presets.mjs";
import { presetFraction } from "../public/js/core/ratio.mjs";

test("preset data matches SPEC section 2(c) exactly, in order", () => {
  assert.deepEqual(
    PRESETS.map((preset) => preset.label),
    ["1:1", "5:4", "4:3", "3:2", "16:10", "16:9", "1.85:1", "2.39:1", "4:5", "3:4", "2:3", "9:16"],
  );
  for (const preset of PRESETS) {
    assert.equal(preset.label, `${preset.width}:${preset.height}`);
  }
});

test("preset fractions simplify as the SPEC requires", () => {
  const byLabel = new Map(PRESETS.map((preset) => [preset.label, presetFraction(preset)]));
  assert.deepEqual(byLabel.get("16:10"), { label: "16:10", a: 8n, b: 5n });
  assert.deepEqual(byLabel.get("1.85:1"), { label: "1.85:1", a: 37n, b: 20n });
  assert.deepEqual(byLabel.get("2.39:1"), { label: "2.39:1", a: 239n, b: 100n });
  assert.deepEqual(byLabel.get("9:16"), { label: "9:16", a: 9n, b: 16n });
});
