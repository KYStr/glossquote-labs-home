// SPEC sections 4, 6 (boundaries) and 7(c)(d): the round-up rule at every
// adult row boundary, and out-of-range behaviour at both ends of each
// category's table.

import assert from "node:assert/strict";
import test from "node:test";
import { rowResult, selectRowByFoot, tableFor } from "../public/js/core/convert.mjs";

test("round-up: a length equal to a row's mondo selects that row; 1 mm above selects the next", () => {
  const rows = tableFor("men");
  for (let i = 0; i < rows.length; i += 1) {
    const exact = selectRowByFoot(rows, rows[i].mondo);
    assert.equal(exact.status, "ok");
    assert.equal(exact.row.mondo, rows[i].mondo, `exact ${rows[i].mondo}`);
    const above = selectRowByFoot(rows, rows[i].mondo + 1);
    if (i + 1 < rows.length) {
      assert.equal(above.status, "ok");
      assert.equal(above.row.mondo, rows[i + 1].mondo, `above ${rows[i].mondo}`);
    } else {
      assert.equal(above.status, "out-of-range", "1 mm above the last row is out of range");
    }
  }
});

test("adult boundaries: 320 mm resolves, 321 mm out; 210 mm out, 211 mm is the first row", () => {
  for (const category of ["men", "women"]) {
    const rows = tableFor(category);
    assert.equal(selectRowByFoot(rows, 320).status, "ok", category);
    assert.equal(selectRowByFoot(rows, 321).status, "out-of-range", category);
    assert.equal(selectRowByFoot(rows, 210).status, "out-of-range", category);
    const first = selectRowByFoot(rows, 211);
    assert.equal(first.status, "ok", category);
    assert.equal(first.row.mondo, 215, category);
  }
});

test("kids boundaries: 115 mm out (<= first - 5), 116 mm is row 120; 195 resolves, 196 out", () => {
  const rows = tableFor("kids");
  assert.equal(selectRowByFoot(rows, 115).status, "out-of-range");
  const first = selectRowByFoot(rows, 116);
  assert.equal(first.status, "ok");
  assert.equal(first.row.mondo, 120);
  assert.equal(selectRowByFoot(rows, 195).status, "ok");
  assert.equal(selectRowByFoot(rows, 196).status, "out-of-range");
});

test("category tables genuinely differ: 26.3 cm in women reads the women's US column", () => {
  const rows = tableFor("women");
  const picked = selectRowByFoot(rows, 263);
  assert.equal(picked.status, "ok");
  const r = rowResult("women", picked.row);
  assert.equal(r.mondo, 265);
  assert.equal(r.us, "10.5");
  assert.equal(r.eur, "41.5");
  assert.equal(r.uk, "8.5");
});

test("covered range derivation matches the SPEC's adult span (21.1-32.0 cm) and kids span (11.6-19.5 cm)", async () => {
  const { coveredRangeCm } = await import("../public/js/core/convert.mjs");
  assert.deepEqual(coveredRangeCm(tableFor("men")), { min: "21.1", max: "32.0" });
  assert.deepEqual(coveredRangeCm(tableFor("women")), { min: "21.1", max: "32.0" });
  assert.deepEqual(coveredRangeCm(tableFor("kids")), { min: "11.6", max: "19.5" });
});
