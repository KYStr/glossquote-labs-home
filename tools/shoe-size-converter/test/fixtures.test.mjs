// SPEC section 4 fixtures D1-D5, transcribed from the specification text.
// Expected values come from the SPEC (which took them from the source table),
// never from the implementation's output.

import assert from "node:assert/strict";
import test from "node:test";
import {
  parseFootLength,
  rowResult,
  selectRowByFoot,
  selectRowByLabel,
  tableFor,
} from "../public/js/core/convert.mjs";

const men = tableFor("men");
const women = tableFor("women");

function byFootCm(rows, cmText) {
  const parsed = parseFootLength(cmText);
  assert.equal(parsed.ok, true, `parse ${cmText}`);
  const picked = selectRowByFoot(rows, parsed.mm);
  assert.equal(picked.status, "ok", `foot ${cmText} in range`);
  return picked.row;
}

test("D1: men, foot 27.0 cm (exact row 270)", () => {
  const r = rowResult("men", byFootCm(men, "27.0"));
  assert.equal(r.mondo, 270);
  assert.equal(r.footCm, "27.0");
  assert.equal(r.eur, "42.5");
  assert.equal(r.uk, "9");
  assert.equal(r.us, "10");
  assert.equal(r.jp, "27.0");
});

test("D2: men, foot 26.3 cm rounds UP to row 265", () => {
  const r = rowResult("men", byFootCm(men, "26.3"));
  assert.equal(r.mondo, 265);
  assert.equal(r.footCm, "26.5");
  assert.equal(r.eur, "41.5");
  assert.equal(r.uk, "8.5");
  assert.equal(r.us, "9.5");
  assert.equal(r.jp, "26.5");
});

test("D3: women, label US 8 selects row 245", () => {
  const row = selectRowByLabel(women, "us", "8");
  assert.ok(row);
  const r = rowResult("women", row);
  assert.equal(r.mondo, 245);
  assert.equal(r.footCm, "24.5");
  assert.equal(r.eur, "38.5");
  assert.equal(r.uk, "6");
  assert.equal(r.jp, "24.5");
});

test("D4: men, label EU 44 selects row 280", () => {
  const row = selectRowByLabel(men, "eur", "44");
  assert.ok(row);
  const r = rowResult("men", row);
  assert.equal(r.mondo, 280);
  assert.equal(r.footCm, "28.0");
  assert.equal(r.uk, "10");
  assert.equal(r.us, "11");
  assert.equal(r.jp, "28.0");
});

test("D5: range ends — 32.5 cm and 21.0 cm out of range, 21.1 cm is row 215", () => {
  assert.equal(selectRowByFoot(men, parseFootLength("32.5").mm).status, "out-of-range");
  assert.equal(selectRowByFoot(men, parseFootLength("21.0").mm).status, "out-of-range");
  const r = rowResult("men", byFootCm(men, "21.1"));
  assert.equal(r.mondo, 215);
  assert.equal(r.eur, "34");
  assert.equal(r.uk, "2.5");
  assert.equal(r.us, "3.5");
  assert.equal(r.jp, "21.5");
});
