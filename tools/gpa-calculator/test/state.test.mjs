// Row-list lifecycle and scale switching (SPEC sections 2-3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, addRow, removeRow, setScale, clearAll, MAX_ROWS } from "../public/js/core/state.mjs";
import { assessRow, computeTotals } from "../public/js/core/calc.mjs";
import { getScale } from "../public/js/core/scales.mjs";

test("initial state: 4.0 scale, three empty rows, empty totals", () => {
  const s = createInitialState();
  assert.equal(s.scaleId, "4.0");
  assert.equal(s.rows.length, 3);
  assert.equal(computeTotals(s.rows, s.scaleId).status, "empty");
});

test("add row up to 50; the 51st is refused", () => {
  let s = createInitialState();
  while (s.rows.length < MAX_ROWS) { const r = addRow(s); assert.equal(r.added, true); s = r.state; }
  assert.equal(s.rows.length, 50);
  const refused = addRow(s);
  assert.equal(refused.added, false);
  assert.equal(refused.code, "row-limit");
  assert.equal(refused.state.rows.length, 50);
});

test("remove row: minimum one row always remains", () => {
  let s = createInitialState();
  s = removeRow(s, 0).state;
  s = removeRow(s, 0).state;
  assert.equal(s.rows.length, 1);
  const refused = removeRow(s, 0);
  assert.equal(refused.removed, false);
  assert.equal(refused.code, "row-minimum");
});

test("scale switch preserves labels and credits; A+ row becomes an error row on 4.0", () => {
  let s = createInitialState();
  s.rows[0] = { label: "Calculus", grade: "A+", creditsRaw: "3", excluded: false };
  s.rows[1] = { label: "History", grade: "B", creditsRaw: "2", excluded: false };
  const switched = setScale(s, "4.0");
  assert.equal(switched.rows[0].label, "Calculus");
  assert.equal(switched.rows[0].creditsRaw, "3");
  assert.equal(switched.rows[0].grade, "A+"); // never silently remapped
  const a = assessRow(switched.rows[0], getScale("4.0"));
  assert.equal(a.state, "error");
  assert.equal(a.code, "grade-not-on-scale");
  // ...and the A+ row is excluded from totals while the valid row still counts.
  const t = computeTotals(switched.rows, "4.0");
  assert.equal(t.errors, 1);
  assert.equal(t.gpaText, "3.00");
  // Switching back restores the row.
  const back = setScale(switched, "4.3");
  assert.equal(assessRow(back.rows[0], getScale("4.3")).state, "ok");
});

test("clear-all returns to the initial state", () => {
  let s = createInitialState();
  s.rows[0] = { label: "X", grade: "A", creditsRaw: "3", excluded: false };
  s = setScale(s, "4.3");
  const cleared = clearAll();
  assert.deepEqual(cleared, createInitialState());
});
