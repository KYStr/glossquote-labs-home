// SPEC fixture D6 (round-trip property), evaluated as the SPEC defines it:
// over every row of the shipped adult table, and over the shipped kids rows
// for every label the source assigns there.

import assert from "node:assert/strict";
import test from "node:test";
import {
  jpLabel,
  labelOf,
  selectRowByFoot,
  selectRowByLabel,
  tableFor,
} from "../public/js/core/convert.mjs";
import { ADULT_ROWS, KIDS_ROWS } from "../public/js/core/tables.mjs";

for (const category of ["men", "women"]) {
  test(`D6 ${category}: every row is selected identically by US, UK, EU, JP and exact foot length`, () => {
    const rows = tableFor(category);
    assert.equal(rows.length, ADULT_ROWS.length);
    for (const row of rows) {
      for (const system of ["us", "uk", "eur", "jp"]) {
        const byLabel = selectRowByLabel(rows, system, labelOf(row, system));
        assert.equal(byLabel?.mondo, row.mondo, `${category} ${system} ${labelOf(row, system)}`);
      }
      const byFoot = selectRowByFoot(rows, row.mondo);
      assert.equal(byFoot.status, "ok");
      assert.equal(byFoot.row.mondo, row.mondo);
      // Converting the row's JP label back as a foot length selects the same row.
      const back = selectRowByFoot(rows, Math.round(Number(jpLabel(row.mondo)) * 10));
      assert.equal(back.status, "ok");
      assert.equal(back.row.mondo, row.mondo);
    }
  });
}

test("D6 kids sample: rows are selected identically by EU, JP and exact foot length", () => {
  const rows = tableFor("kids");
  assert.equal(rows.length, KIDS_ROWS.length);
  for (const row of rows) {
    for (const system of ["eur", "jp"]) {
      const byLabel = selectRowByLabel(rows, system, labelOf(row, system));
      assert.equal(byLabel?.mondo, row.mondo, `kids ${system} ${labelOf(row, system)}`);
    }
    const byFoot = selectRowByFoot(rows, row.mondo);
    assert.equal(byFoot.status, "ok");
    assert.equal(byFoot.row.mondo, row.mondo);
  }
});

test("D6 kids: every assigned UK/US kids label selects its own row", () => {
  const rows = tableFor("kids");
  let checked = 0;
  for (const row of rows) {
    for (const system of ["uk", "us"]) {
      const label = labelOf(row, system);
      if (label === null) continue; // source assigns no label on this row
      assert.equal(selectRowByLabel(rows, system, label)?.mondo, row.mondo);
      checked += 1;
    }
  }
  assert.ok(checked > 0, "sample must be non-empty");
});
