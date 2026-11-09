// SPEC sections 4 and 7(e)(f): the suite itself recomputes the data file's
// SHA-256 and row counts and compares them with DATA-SOURCE.md, so a silent
// table edit fails tests even if the build gate is bypassed; and the JP
// derivation (mondo / 10, one decimal) holds for every shipped row.
// This test parses DATA-SOURCE.md on its own rather than importing the
// build's gate module, keeping the check independent.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { jpLabel, validateTables } from "../public/js/core/convert.mjs";
import { ADULT_ROWS, KIDS_ROWS } from "../public/js/core/tables.mjs";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("data file SHA-256 and row counts match DATA-SOURCE.md", () => {
  const record = readFileSync(path.join(toolRoot, "DATA-SOURCE.md"), "utf8");
  const sha = /SHA-256:\s*([0-9a-f]{64})/.exec(record)?.[1];
  const adult = Number(/Adult table rows:\s*(\d+)/.exec(record)?.[1]);
  const kids = Number(/Kids table rows:\s*(\d+)/.exec(record)?.[1]);
  assert.ok(sha, "DATA-SOURCE.md records a SHA-256");
  const bytes = readFileSync(path.join(toolRoot, "public/js/core/tables.mjs"));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), sha);
  assert.equal(ADULT_ROWS.length, adult);
  assert.equal(KIDS_ROWS.length, kids);
  assert.equal(adult, 22, "SPEC section 4 pins the adult table at exactly 22 rows");
});

test("tables are structurally valid (5 mm steps, complete adult rows, explicit kids nulls)", () => {
  assert.deepEqual(validateTables(), []);
});

test("JP derivation: JP = mondo / 10 with exactly one decimal, for every row", () => {
  for (const row of [...ADULT_ROWS, ...KIDS_ROWS]) {
    assert.equal(jpLabel(row.mondo), (row.mondo / 10).toFixed(1));
    assert.match(jpLabel(row.mondo), /^\d+\.\d$/);
  }
});

test("adult endpoints match the SPEC-pinned first and last rows", () => {
  assert.deepEqual(ADULT_ROWS[0], { mondo: 215, eur: 34, uk: 2.5, usMen: 3.5, usWomen: 4.5 });
  assert.deepEqual(ADULT_ROWS[ADULT_ROWS.length - 1],
    { mondo: 320, eur: 50, uk: 15, usMen: 16, usWomen: 17 });
});
