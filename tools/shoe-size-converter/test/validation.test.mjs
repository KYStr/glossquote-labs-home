// Input validation refusals and select-population exactness (SPEC sections
// 2, 5 and 6 boundaries: selects contain exactly the table's labels, no
// orphan options). Label lists below are written out by hand from the
// transcribed source rows.

import assert from "node:assert/strict";
import test from "node:test";
import {
  labelsFor,
  parseFootLength,
  selectRowByLabel,
  tableFor,
} from "../public/js/core/convert.mjs";

test("parse: plain and one-decimal lengths in mm-exact tenths", () => {
  assert.deepEqual(parseFootLength("27"), { ok: true, mm: 270 });
  assert.deepEqual(parseFootLength("27.0"), { ok: true, mm: 270 });
  assert.deepEqual(parseFootLength(" 26.3 "), { ok: true, mm: 263 });
  assert.deepEqual(parseFootLength("10.0"), { ok: true, mm: 100 });
  assert.deepEqual(parseFootLength("35.0"), { ok: true, mm: 350 });
});

test("parse: refusals are explicit, never silently truncated or guessed", () => {
  assert.equal(parseFootLength("").error, "empty");
  assert.equal(parseFootLength("   ").error, "empty");
  assert.equal(parseFootLength("abc").error, "format");
  assert.equal(parseFootLength("27,5").error, "format");
  assert.equal(parseFootLength("-27.0").error, "format");
  assert.equal(parseFootLength("27.05").error, "step");
  assert.equal(parseFootLength("27.55").error, "step");
  assert.equal(parseFootLength("9.9").error, "below-min");
  assert.equal(parseFootLength("35.1").error, "above-max");
  assert.equal(parseFootLength(27).error, "format");
});

test("men US select offers exactly the men's US labels from the table", () => {
  assert.deepEqual(labelsFor(tableFor("men"), "us"), [
    "3.5", "4", "4.5", "5", "5.5", "6.5", "7", "7.5", "8", "8.5", "9.5",
    "10", "10.5", "11", "11.5", "12", "13", "13.5", "14", "14.5", "15", "16",
  ]);
});

test("women US labels run 4.5 to 17 and differ from men's, as the source table prints", () => {
  const labels = labelsFor(tableFor("women"), "us");
  assert.equal(labels[0], "4.5");
  assert.equal(labels[labels.length - 1], "17");
  assert.equal(labels.length, 22);
});

test("kids selects contain exactly the assigned labels (unassigned cells offer nothing)", () => {
  assert.deepEqual(labelsFor(tableFor("kids"), "us"),
    ["4.5", "5", "6.5", "8", "8.5", "10", "10.5", "11.5", "12.5", "13"]);
  assert.deepEqual(labelsFor(tableFor("kids"), "uk"),
    ["4", "4.5", "5.5", "6", "6.5", "7.5", "8", "9", "9.5", "10", "11", "11.5", "12", "12.5", "13.5"]);
  assert.equal(labelsFor(tableFor("kids"), "jp").length, 16);
  assert.equal(labelsFor(tableFor("kids"), "eur").length, 16);
});

test("label lookup refuses labels that are not in the active table", () => {
  assert.equal(selectRowByLabel(tableFor("men"), "us", "17"), null); // women's max, not men's
  assert.equal(selectRowByLabel(tableFor("men"), "us", "6"), null); // not a men's US label in this table
  assert.equal(selectRowByLabel(tableFor("kids"), "us", "7"), null); // source assigns no US kids 7 to a Mondopoint row
  assert.equal(selectRowByLabel(tableFor("men"), "eur", "36"), null); // EUR 36 is not a row of the Mondopoint table
  assert.equal(selectRowByLabel(tableFor("men"), "jp", "27.3"), null); // no Mondopoint row at 273 mm
});

test("JP labels exist for every row and select their row (JP is definitional)", () => {
  const rows = tableFor("men");
  assert.equal(selectRowByLabel(rows, "jp", "27.5")?.mondo, 275);
  assert.equal(selectRowByLabel(rows, "jp", "21.5")?.mondo, 215);
  assert.equal(selectRowByLabel(rows, "jp", "32.0")?.mondo, 320);
});
