import assert from "node:assert/strict";
import test from "node:test";

import {
  InvoiceError,
  checkFull,
  checkQuick,
  classifyBatch,
  formatAmount,
  normalizeDigits,
  parseCandidate,
  parseSetup,
  suffixMatchLength,
  summarize,
} from "../public/js/core/invoice.mjs";

// The normative synthetic setup of SPEC section 4.
const W = parseSetup({
  special: "12345678",
  grand: "87654321",
  first: ["11112222", "33334444"],
  addSixth: ["007"],
});

test("SPEC fixtures: special, grand and first exact matches", () => {
  assert.deepEqual(checkFull(W, "12345678"), {
    number: "12345678", tier: "special", amount: 10000000, note: { kind: "special" },
  });
  assert.equal(checkFull(W, "87654321").tier, "grand");
  assert.equal(checkFull(W, "87654321").amount, 2000000);
  const first = checkFull(W, "11112222");
  assert.equal(first.tier, "first");
  assert.equal(first.amount, 200000);
  assert.deepEqual(first.note, { kind: "first-suffix", firstIndex: 0, k: 8 });
});

test("SPEC fixtures: suffix tiers k = 7, 6, 4 against the first first-prize number", () => {
  const k7 = checkFull(W, "01112222");
  assert.equal(k7.tier, "second");
  assert.equal(k7.amount, 40000);
  assert.deepEqual(k7.note, { kind: "first-suffix", firstIndex: 0, k: 7 });
  const k6 = checkFull(W, "00112222");
  assert.equal(k6.tier, "third");
  assert.equal(k6.amount, 10000);
  assert.equal(k6.note.k, 6);
  const k4 = checkFull(W, "00002222"); // suffix 2222 matches, 02222 does not
  assert.equal(k4.tier, "fifth");
  assert.equal(k4.amount, 1000);
  assert.equal(k4.note.k, 4);
});

// SPEC section 4 prints "99994444 ⇒ 六獎 (k=3 via second first number)",
// but the longest common suffix of 99994444 and 33334444 is 4 ("4444"),
// so the SPEC's own step-3 mapping gives 五獎 at k=4 — exactly like the
// neighbouring fixture 00002222 (k=4 ⇒ 五獎）. The printed k=3 appears
// to be a hand-derivation slip (as with the mortgage SPEC's payment
// figure); the rule governs, and the discrepancy is documented in
// VERIFICATION.md. A true k=3 case via the second number is covered too.
test("suffix k=4 via the second first-prize number is fifth prize (rule over misprinted fixture)", () => {
  const result = checkFull(W, "99994444");
  assert.equal(result.note.k, 4);
  assert.equal(result.note.firstIndex, 1);
  assert.equal(result.tier, "fifth");
  const k3 = checkFull(W, "99950444"); // last 3 = 444, fourth-from-end differs
  assert.equal(k3.note.k, 3);
  assert.equal(k3.tier, "sixth");
  assert.equal(k3.amount, 200);
});

test("SPEC fixtures: additional sixth set, no prize, and full-width normalisation", () => {
  const add = checkFull(W, "55555007");
  assert.equal(add.tier, "sixth");
  assert.equal(add.amount, 200);
  assert.deepEqual(add.note, { kind: "additional" });
  assert.equal(checkFull(W, "12345679").tier, "none");
  assert.equal(checkFull(W, "12345679").amount, 0);
  assert.equal(normalizeDigits("１２３４５６７８"), "12345678");
  const parsed = parseCandidate("１２３４５６７８", 8);
  assert.deepEqual(parsed, { ok: true, value: "12345678" });
  assert.equal(checkFull(W, parsed.value).tier, "special");
});

test("suffix sweep: every k from 0 to 8 against a constructed first-prize number", () => {
  const setup = parseSetup({ special: "00000001", grand: "00000002", first: ["12345678"], addSixth: [] });
  const expected = {
    8: "first", 7: "second", 6: "third", 5: "fourth", 4: "fifth", 3: "sixth",
  };
  for (let k = 0; k <= 8; k += 1) {
    // Build a candidate sharing exactly k trailing digits with 12345678:
    // take the last k digits and prefix with a digit that breaks the run.
    const suffix = "12345678".slice(8 - k);
    const breaker = k === 8 ? "" : (suffix[0] === "9" || "12345678"[7 - k] === "9" ? "0" : "9");
    const candidate = (breaker + suffix).padStart(8, "5").slice(-8);
    const actualK = suffixMatchLength(candidate, "12345678");
    if (k <= 2) {
      assert.equal(checkFull(setup, candidate).tier, "none", `k=${actualK}`);
    } else {
      assert.equal(actualK, k, `constructed k=${k}`);
      assert.equal(checkFull(setup, candidate).tier, expected[k], `k=${k}`);
    }
  }
});

test("precedence: special/grand exact beats suffix; first-suffix beats additional set", () => {
  const setup = parseSetup({
    special: "99992222", grand: "88884444", first: ["11112222"], addSixth: ["222"],
  });
  // 99992222 equals special exactly (its last 3 would also hit the add set).
  assert.equal(checkFull(setup, "99992222").tier, "special");
  // A candidate whose last 3 matches both a first suffix (k=3) and the add set
  // resolves via the first-prize channel (step 3 before step 4).
  const both = checkFull(setup, "55555222");
  assert.equal(both.tier, "sixth");
  assert.equal(both.note.kind, "first-suffix");
  // Additional set alone, when no first-prize suffix reaches k=3.
  const setup2 = parseSetup({
    special: "99992222", grand: "88884444", first: ["11112222"], addSixth: ["777"],
  });
  const add = checkFull(setup2, "55555777");
  assert.equal(add.tier, "sixth");
  assert.deepEqual(add.note, { kind: "additional" });
});

test("setup validation: duplicates across kinds are errors, not precedence", () => {
  assert.throws(
    () => parseSetup({ special: "11112222", grand: "87654321", first: ["11112222"], addSixth: [] }),
    (e) => e instanceof InvoiceError && e.code === "SETUP_DUPLICATE" && e.params.value === "11112222",
  );
  assert.throws(
    () => parseSetup({ special: "12345678", grand: "87654321", first: ["11112222", "11112222"], addSixth: [] }),
    (e) => e.code === "SETUP_DUPLICATE",
  );
  assert.throws(
    () => parseSetup({ special: "12345678", grand: "12345678", first: ["11112222"], addSixth: [] }),
    (e) => e.code === "SETUP_DUPLICATE",
  );
  assert.throws(
    () => parseSetup({ special: "12345678", grand: "87654321", first: ["11112222"], addSixth: ["007", "007"] }),
    (e) => e.code === "SETUP_DUPLICATE" && e.params.field === "addSixth",
  );
});

test("setup validation: required fields, lengths, non-digits, full-width conversion", () => {
  assert.throws(() => parseSetup({ special: "", grand: "87654321", first: ["11112222"] }), (e) => e.code === "SETUP_REQUIRED" && e.params.field === "special");
  assert.throws(() => parseSetup({ special: "1234567", grand: "87654321", first: ["11112222"] }), (e) => e.code === "SETUP_LENGTH" && e.params.expected === 8);
  assert.throws(() => parseSetup({ special: "1234567a", grand: "87654321", first: ["11112222"] }), (e) => e.code === "SETUP_NON_DIGIT");
  assert.throws(() => parseSetup({ special: "12345678", grand: "87654321", first: [] }), (e) => e.code === "SETUP_REQUIRED" && e.params.field === "first");
  assert.throws(() => parseSetup({ special: "12345678", grand: "87654321", first: ["11112222"], addSixth: ["07"] }), (e) => e.code === "SETUP_LENGTH" && e.params.expected === 3);
  const converted = parseSetup({ special: "１２３４５６７８", grand: "87654321", first: ["11112222"], addSixth: [] });
  assert.equal(converted.special, "12345678");
  // Internal spaces are invalid, surrounding whitespace is trimmed.
  assert.throws(() => parseSetup({ special: "1234 5678", grand: "87654321", first: ["11112222"] }), (e) => e.code === "SETUP_NON_DIGIT");
  assert.equal(parseSetup({ special: " 12345678 ", grand: "87654321", first: ["11112222"] }).special, "12345678");
  // Leading zeros are preserved as data.
  assert.equal(parseSetup({ special: "00112233", grand: "87654321", first: ["11112222"] }).special, "00112233");
});

test("quick mode truth table over the four channels, with honesty (no tier/amount)", () => {
  assert.deepEqual(checkQuick(W, "678"), { possible: true, channels: [{ kind: "special" }] });
  assert.deepEqual(checkQuick(W, "321"), { possible: true, channels: [{ kind: "grand" }] });
  assert.deepEqual(checkQuick(W, "222"), { possible: true, channels: [{ kind: "first", firstIndex: 0 }] });
  assert.deepEqual(checkQuick(W, "444"), { possible: true, channels: [{ kind: "first", firstIndex: 1 }] });
  assert.deepEqual(checkQuick(W, "007"), { possible: true, channels: [{ kind: "additional" }] });
  assert.deepEqual(checkQuick(W, "999"), { possible: false, channels: [] });
  const result = checkQuick(W, "678");
  assert.ok(!("tier" in result) && !("amount" in result), "quick mode must not fabricate a verdict");
});

test("candidate validation distinguishes empty, non-digit and wrong length", () => {
  assert.deepEqual(parseCandidate("", 8), { ok: false, code: "CANDIDATE_REQUIRED" });
  assert.deepEqual(parseCandidate("1234567a", 8), { ok: false, code: "CANDIDATE_NON_DIGIT" });
  assert.equal(parseCandidate("123", 8).code, "CANDIDATE_LENGTH");
  assert.deepEqual(parseCandidate("678", 3), { ok: true, value: "678" });
});

test("batch: mixed valid and invalid lines are all reported with reasons", () => {
  const { rows, summary } = classifyBatch(W, [
    "12345678", // special
    "01112222", // second
    "12345679", // none
    "abc",
    "123",
    "",
    "55555007", // sixth via additional
  ].join("\n"));
  assert.equal(rows.length, 7);
  assert.equal(rows[0].tier, "special");
  assert.equal(rows[1].tier, "second");
  assert.equal(rows[2].tier, "none");
  assert.deepEqual(
    rows.slice(3, 6).map((r) => [r.status, r.reason]),
    [["invalid", "NON_DIGIT"], ["invalid", "LENGTH"], ["invalid", "EMPTY"]],
  );
  assert.equal(rows[6].tier, "sixth");
  assert.deepEqual(summary.counts, {
    special: 1, grand: 0, first: 0, second: 1, third: 0, fourth: 0,
    fifth: 0, sixth: 1, none: 1, invalid: 3,
  });
  assert.equal(summary.totalAmount, 10000000 + 40000 + 200);
});

test("batch: a trailing newline makes no phantom row; 501 lines are a limit error", () => {
  const one = classifyBatch(W, "12345678\n");
  assert.equal(one.rows.length, 1);
  const fiveHundred = Array.from({ length: 500 }, () => "12345679").join("\n");
  const ok = classifyBatch(W, fiveHundred);
  assert.equal(ok.rows.length, 500);
  assert.equal(ok.summary.counts.none, 500);
  assert.throws(
    () => classifyBatch(W, fiveHundred + "\n12345679"),
    (e) => e.code === "BATCH_LIMIT" && e.params.limit === 500 && e.params.actual === 501,
  );
});

test("batch is deterministic and the summary is a pure function of the lines", () => {
  const text = "11112222\n00112222\n55555007\nxyz";
  const a = classifyBatch(W, text);
  const b = classifyBatch(W, text);
  assert.deepEqual(a, b);
  assert.deepEqual(summarize(a.rows), a.summary);
  assert.equal(a.summary.totalAmount, 200000 + 10000 + 200);
});

test("amount formatting uses thousands separators", () => {
  assert.equal(formatAmount(10000000), "10,000,000");
  assert.equal(formatAmount(200), "200");
  assert.equal(formatAmount(0), "0");
});
