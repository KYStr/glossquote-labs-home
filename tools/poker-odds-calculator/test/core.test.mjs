// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-poker-odds-calculator-20261121, draft spec PR #395,
// SHA-256
// 94fa04850beb87da0eca296fc121172fd50c3b8ccc819ff0e0c7414142ca1077).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's §5-§10 rules by hand, never from the
// implementation's output.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CATEGORY_SLUGS,
  evaluateHand,
  run,
} from "../public/js/core/poker-odds.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-poker-odds-calculator-20261121");
assert.equal(coreCases.length, 13);

for (const fixture of coreCases) {
  test(`fixture ${fixture.id}`, () => {
    const actual = run(fixture.input);
    if (fixture.expected.ok) {
      assert.deepEqual(actual, { ok: true, result: fixture.expected.result });
    } else {
      assert.deepEqual(actual, { ok: false, error: fixture.expected.error });
    }
  });
}

// Card ids in deck order (rank ascending, suits c, d, h, s):
// id = rankIndex * 4 + suitIndex, suits c=0, d=1, h=2, s=3.
function card(rankChar, suitChar) {
  const ranks = "23456789TJQKA";
  const suits = "cdhs";
  return ranks.indexOf(rankChar) * 4 + suits.indexOf(suitChar);
}

test("evaluator boundaries: royal flush, wheel, full house, three pairs", () => {
  // Royal flush: A K Q J T of spades, category 9 topping at A.
  assert.deepEqual(
    evaluateHand([card("A", "s"), card("K", "s"), card("Q", "s"), card("J", "s"), card("T", "s")]),
    [9, 14],
  );
  // Nine-high straight flush.
  assert.deepEqual(
    evaluateHand([card("9", "s"), card("8", "s"), card("7", "s"), card("6", "s"), card("5", "s")]),
    [9, 9],
  );
  // Wheel straight A-2-3-4-5 tops at 5, not at A.
  assert.deepEqual(
    evaluateHand([card("A", "s"), card("2", "c"), card("3", "d"), card("4", "h"), card("5", "s")]),
    [5, 5],
  );
  // Full house: kings over queens.
  assert.deepEqual(
    evaluateHand([card("K", "h"), card("K", "d"), card("K", "s"), card("Q", "c"), card("Q", "d")]),
    [7, 13, 12],
  );
  // Three pairs in six cards: best five are the two highest pairs
  // plus the third pair's rank as kicker (AUTHOR-CHECK boundary).
  assert.deepEqual(
    evaluateHand([
      card("K", "s"),
      card("Q", "d"),
      card("K", "c"),
      card("Q", "h"),
      card("2", "s"),
      card("2", "c"),
    ]),
    [3, 13, 12, 2],
  );
  // Four of a kind with a kicker; quads beat a full house.
  const quads = evaluateHand([
    card("7", "s"),
    card("7", "h"),
    card("7", "c"),
    card("7", "d"),
    card("K", "d"),
  ]);
  assert.deepEqual(quads, [8, 7, 13]);
  const boat = evaluateHand([
    card("A", "s"),
    card("A", "h"),
    card("A", "c"),
    card("K", "s"),
    card("K", "d"),
  ]);
  assert.equal(quads[0] > boat[0], true);
});

test("outs 15 combo draw matches the SPEC 2/4 error table by hand", () => {
  // 9s 8s on 7s 6s 2h: flush outs 9, open-ended straight outs 8,
  // overlap Ts and 5s counted once: 9 + 8 - 2 = 15.
  // Next card 15/47 = 31.91%; two cards 1 - C(32,2)/C(47,2) =
  // 585/1081 = 54.12%; approximations 30% / 60%.
  const actual = run({
    holeCards: ["9s", "8s"],
    boardCards: ["7s", "6s", "2h"],
    opponents: "1",
    pot: "",
    toCall: "",
  });
  assert.equal(actual.ok, true);
  assert.equal(actual.result.outs, 15);
  assert.equal(actual.result.hitNextPct, "31.91");
  assert.equal(actual.result.hitTwoCardPct, "54.12");
  assert.equal(actual.result.approxNextPct, 30);
  assert.equal(actual.result.approxTwoCardPct, 60);
});

test("outs excludes overcard pairing and two-pair-to-three-pair", () => {
  // As Ks on Qs 7s 2c is the flush draw (9 outs). An A or K that
  // only pairs up is not an out; the fixture's 9 outs already pin
  // this, and a bare overcard hand with no straight or flush draw
  // has 0 outs on the flop.
  const bare = run({
    holeCards: ["Ah", "Kd"],
    boardCards: ["Qs", "7c", "2h"],
    opponents: "1",
    pot: "",
    toCall: "",
  });
  assert.equal(bare.ok, true);
  assert.equal(bare.result.currentCategory, "high-card");
  assert.equal(bare.result.outs, 0);
  assert.equal(bare.result.hitNextPct, "0.00");
  assert.equal(bare.result.hitTwoCardPct, "0.00");
  // Two pair KQ on K Q 2: pairing the 2 only makes three pair,
  // which is still two pair — not an out. Only K/Q (4 outs) count.
  const twoPair = run({
    holeCards: ["Kh", "Qd"],
    boardCards: ["Kc", "Qs", "2h"],
    opponents: "1",
    pot: "",
    toCall: "",
  });
  assert.equal(twoPair.ok, true);
  assert.equal(twoPair.result.outs, 4);
});

test("method selection follows the pinned scenario table", () => {
  // Flop, 2 opponents: 161,063,595 scenarios -> Monte Carlo.
  const flopTwo = run({
    holeCards: ["As", "Ks"],
    boardCards: ["Qs", "7s", "2c"],
    opponents: "2",
    pot: "",
    toCall: "",
  });
  assert.equal(flopTwo.ok, true);
  assert.equal(flopTwo.result.method, "monte-carlo");
  assert.equal(flopTwo.result.scenarios, 100000);
  assert.equal(
    flopTwo.result.wins + flopTwo.result.ties + flopTwo.result.losses,
    100000,
  );
  // River, 2 opponents: C(45,4) = 148,995 -> exact.
  const riverTwo = run({
    holeCards: ["Ad", "Ac"],
    boardCards: ["Ks", "Qd", "8h", "5c", "2s"],
    opponents: "2",
    pot: "",
    toCall: "",
  });
  assert.equal(riverTwo.ok, true);
  assert.equal(riverTwo.result.method, "exact");
  assert.equal(riverTwo.result.scenarios, 148995);
  assert.equal(
    riverTwo.result.wins + riverTwo.result.ties + riverTwo.result.losses,
    148995,
  );
  // River, 3 opponents: 8,145,060 scenarios -> Monte Carlo.
  const riverThree = run({
    holeCards: ["Ad", "Ac"],
    boardCards: ["Ks", "Qd", "8h", "5c", "2s"],
    opponents: "3",
    pot: "",
    toCall: "",
  });
  assert.equal(riverThree.ok, true);
  assert.equal(riverThree.result.method, "monte-carlo");
  assert.equal(riverThree.result.scenarios, 100000);
});

test("Monte Carlo is deterministic: the same input gives the same output", () => {
  const input = {
    holeCards: ["As", "Ah"],
    boardCards: [],
    opponents: "1",
    pot: "",
    toCall: "",
  };
  assert.deepEqual(run(input), run(input));
});

test("final hand distribution sums to 99.99-100.01 after rounding", () => {
  for (const fixture of coreCases.filter((entry) => entry.expected.ok)) {
    const dist = fixture.expected.result.finalHandDistribution;
    let sum = 0;
    for (const slug of CATEGORY_SLUGS) sum += Number(dist[slug]);
    assert.ok(
      sum >= 99.99 && sum <= 100.01,
      `${fixture.id}: distribution sums to ${sum}`,
    );
  }
});

test("pot odds: free call, missing amounts, boundaries, exact marginal", () => {
  const base = {
    holeCards: ["Ad", "Ac"],
    boardCards: ["Ks", "Qd", "8h", "5c", "2s"],
    opponents: "1",
  };
  // toCall 0: free call, ratio null, break-even "0.00".
  const free = run({ ...base, pot: "300", toCall: "0" });
  assert.equal(free.ok, true);
  assert.equal(free.result.potOddsRatio, null);
  assert.equal(free.result.breakEvenPct, "0.00");
  assert.equal(free.result.hint, "call");
  // Either amount missing: all three pot fields are null.
  const missingCall = run({ ...base, pot: "300", toCall: "" });
  assert.equal(missingCall.result.potOddsRatio, null);
  assert.equal(missingCall.result.breakEvenPct, null);
  assert.equal(missingCall.result.hint, null);
  const missingPot = run({ ...base, pot: "", toCall: "100" });
  assert.equal(missingPot.result.potOddsRatio, null);
  assert.equal(missingPot.result.breakEvenPct, null);
  assert.equal(missingPot.result.hint, null);
  // Amount boundaries 0 and 1,000,000,000 are accepted.
  const maxed = run({ ...base, pot: "1000000000", toCall: "1000000000" });
  assert.equal(maxed.ok, true);
  assert.equal(maxed.result.potOddsRatio, "1:1");
  assert.equal(maxed.result.breakEvenPct, "50.00");
  assert.equal(maxed.result.hint, "call");
  // Exact marginal: hero holds the unbeatable royal flush on the
  // river (equity exactly 100%); pot 0 and toCall 100 make the
  // break-even exactly 100%, so the unrounded comparison is equal.
  const royal = run({
    holeCards: ["As", "Ks"],
    boardCards: ["Qs", "Js", "Ts", "9s", "2c"],
    opponents: "1",
    pot: "0",
    toCall: "100",
  });
  assert.equal(royal.ok, true);
  assert.equal(royal.result.equityPct, "100.00");
  assert.equal(royal.result.potOddsRatio, "0:1");
  assert.equal(royal.result.breakEvenPct, "100.00");
  assert.equal(royal.result.hint, "marginal");
});

test("range endpoints: opponents 1/9, amounts 0/1,000,000,000; just outside is RANGE", () => {
  const base = {
    holeCards: ["As", "Ks"],
    boardCards: ["Qs", "7s", "2c"],
    pot: "",
    toCall: "",
  };
  assert.equal(run({ ...base, opponents: "1" }).ok, true);
  assert.equal(run({ ...base, opponents: "9" }).ok, true);
  assert.deepEqual(run({ ...base, opponents: "0" }), {
    ok: false,
    error: { code: "RANGE", field: "opponents", row: null },
  });
  assert.deepEqual(run({ ...base, opponents: "10" }), {
    ok: false,
    error: { code: "RANGE", field: "opponents", row: null },
  });
  assert.deepEqual(run({ ...base, opponents: "1", pot: "1000000001" }), {
    ok: false,
    error: { code: "RANGE", field: "pot", row: null },
  });
  assert.deepEqual(run({ ...base, opponents: "1", toCall: "1000000001" }), {
    ok: false,
    error: { code: "RANGE", field: "toCall", row: null },
  });
});

test("card counts: hole 1/3, board 1/2/6 are CARD_COUNT in the offending field", () => {
  const flop = ["Qs", "7s", "2c"];
  assert.deepEqual(
    run({ holeCards: ["As"], boardCards: flop, opponents: "1", pot: "", toCall: "" }),
    { ok: false, error: { code: "CARD_COUNT", field: "holeCards", row: null } },
  );
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks", "Qs"],
      boardCards: flop,
      opponents: "1",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "CARD_COUNT", field: "holeCards", row: null } },
  );
  for (const board of [["Qs"], ["Qs", "7s"], ["Qs", "7s", "2c", "5d", "9h", "3c"]]) {
    assert.deepEqual(
      run({ holeCards: ["As", "Ks"], boardCards: board, opponents: "1", pot: "", toCall: "" }),
      { ok: false, error: { code: "CARD_COUNT", field: "boardCards", row: null } },
    );
  }
  // Board 0, 3, 4, 5 are all legal counts.
  for (const board of [[], ["Qs", "7s", "2c"], ["Qs", "7s", "2c", "5d"], ["Qs", "7s", "2c", "5d", "9h"]]) {
    assert.equal(
      run({ holeCards: ["As", "Ks"], boardCards: board, opponents: "1", pot: "", toCall: "" }).ok,
      true,
    );
  }
});

test("duplicate inside the hole cards is DUPLICATE_CARD in holeCards", () => {
  assert.deepEqual(
    run({
      holeCards: ["As", "As"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "1",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "DUPLICATE_CARD", field: "holeCards", row: null } },
  );
});

test("grammar: card codes are rank + suit only; lower case is accepted", () => {
  const base = { boardCards: ["Qs", "7s", "2c"], opponents: "1", pot: "", toCall: "" };
  for (const bad of ["1s", "Asx", "A", "AX", "sA", "10s", ""]) {
    assert.deepEqual(run({ ...base, holeCards: ["As", bad] }), {
      ok: false,
      error: { code: "CARD_FORMAT", field: "holeCards", row: null },
    });
  }
  const lower = run({ ...base, holeCards: ["as", "ks"] });
  assert.equal(lower.ok, true);
  assert.equal(lower.result.currentCategory, "high-card");
  assert.equal(lower.result.outs, 9);
});

test("integer grammar: ASCII decimal integers only, no leading zeros", () => {
  const base = {
    holeCards: ["As", "Ks"],
    boardCards: ["Qs", "7s", "2c"],
    pot: "",
    toCall: "",
  };
  for (const bad of ["1.5", "+1", "-1", " 1", "1 ", "01", "00", "1e1", "１"]) {
    assert.deepEqual(run({ ...base, opponents: bad }), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "opponents", row: null },
    });
  }
  assert.deepEqual(run({ ...base, opponents: "1", pot: "12.5" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "pot", row: null },
  });
  assert.deepEqual(run({ ...base, opponents: "1", toCall: "007" }), {
    ok: false,
    error: { code: "INTEGER_FORMAT", field: "toCall", row: null },
  });
});

test("empty inputs are EMPTY in the offending field", () => {
  assert.deepEqual(
    run({ holeCards: [], boardCards: ["Qs", "7s", "2c"], opponents: "1", pot: "", toCall: "" }),
    { ok: false, error: { code: "EMPTY", field: "holeCards", row: null } },
  );
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "EMPTY", field: "opponents", row: null } },
  );
});

test("INPUT_LIMIT is decided on the raw string before format and count checks", () => {
  // Six hole cards joined are 17 units (> 15): capacity precedes
  // CARD_COUNT, so this is INPUT_LIMIT, not CARD_COUNT.
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks", "Qs", "7s", "2c", "3d"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "1",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "holeCards", row: null } },
  );
  // Eleven board cards joined are 32 units (> 29).
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks"],
      boardCards: ["2c", "3c", "4c", "5c", "6c", "7c", "8c", "9c", "Tc", "Jc", "Qc"],
      opponents: "1",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "boardCards", row: null } },
  );
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "12345678901",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "INPUT_LIMIT", field: "opponents", row: null } },
  );
});

test("lone surrogates are UNICODE, after capacity and before grammar", () => {
  assert.deepEqual(
    run({
      holeCards: ["A\uD800", "Ks"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "1",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "UNICODE", field: "holeCards", row: null } },
  );
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "1\uD800",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "UNICODE", field: "opponents", row: null } },
  );
});

test("validation order: CARD_FORMAT precedes CARD_COUNT, CARD_COUNT precedes RANGE", () => {
  // Three hole cards with an invalid code: format wins over count.
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks", "Xh"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "1",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "CARD_FORMAT", field: "holeCards", row: null } },
  );
  // Three hole cards and opponents 10: count wins over range.
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks", "Qs"],
      boardCards: ["Qs", "7s", "2c"],
      opponents: "10",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "CARD_COUNT", field: "holeCards", row: null } },
  );
  // Duplicate and out-of-range opponents: duplicate wins (step 3
  // precedes step 4).
  assert.deepEqual(
    run({
      holeCards: ["As", "Ks"],
      boardCards: ["As", "7s", "2c"],
      opponents: "10",
      pot: "",
      toCall: "",
    }),
    { ok: false, error: { code: "DUPLICATE_CARD", field: "boardCards", row: null } },
  );
});

test("schema violations are SCHEMA with field null", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  const base = {
    holeCards: ["As", "Ks"],
    boardCards: ["Qs", "7s", "2c"],
    opponents: "1",
    pot: "",
    toCall: "",
  };
  assert.deepEqual(run(null), schema);
  assert.deepEqual(run([]), schema);
  assert.deepEqual(run("As"), schema);
  assert.deepEqual(run({ ...base, extra: "x" }), schema);
  const missing = { ...base };
  delete missing.pot;
  assert.deepEqual(run(missing), schema);
  assert.deepEqual(run({ ...base, holeCards: "As Ks" }), schema);
  assert.deepEqual(run({ ...base, holeCards: ["As", 75] }), schema);
  assert.deepEqual(run({ ...base, opponents: 1 }), schema);
  const withAccessor = { ...base };
  Object.defineProperty(withAccessor, "opponents", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), schema);
});

test("outs never exceed the unseen cards; preflop outs is null, river outs is 0", () => {
  for (const fixture of coreCases.filter((entry) => entry.expected.ok)) {
    const result = fixture.expected.result;
    if (result.outs !== null) {
      assert.ok(result.outs <= result.remainingCards, fixture.id);
    }
  }
  const preflop = fixtures.cases.find((entry) => entry.id === "preflop-aces");
  assert.equal(preflop.expected.result.outs, null);
  const river = fixtures.cases.find((entry) => entry.id === "river-equity-call");
  assert.equal(river.expected.result.outs, 0);
});
