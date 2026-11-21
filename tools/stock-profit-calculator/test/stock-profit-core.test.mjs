// Core tests: every literal fixture case from fixtures.json (deep
// comparison against the SPEC's expected values), plus hand-derived
// boundary, validation-order, rounding and breakeven plug-back tests.
// Expected values were independently recalculated (exact rational
// arithmetic, breakeven by scanning from low cents upward), never
// taken from the implementation's own output.

import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULTS, EXAMPLE, run } from "../public/js/core/stock-profit.mjs";
import fixtures from "./fixtures.json" with { type: "json" };

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const successCases = coreCases.filter((entry) => entry.expected.ok);

test("all 13 core fixture cases pass verbatim", () => {
  assert.equal(coreCases.length, 13);
  for (const entry of coreCases) {
    assert.deepEqual(run(entry.input), entry.expected, entry.id);
  }
});

test("defaults and example equal the round-lot-profit fixture input", () => {
  const roundLot = fixtures.cases.find((entry) => entry.id === "round-lot-profit");
  assert.deepEqual(DEFAULTS, roundLot.input);
  assert.deepEqual(EXAMPLE, roundLot.input);
  assert.equal(run(DEFAULTS).ok, true);
});

test("legal maxima are accepted", () => {
  const outcome = run({
    buyPrice: "999999.99",
    buyQty: "999999",
    buyUnit: "share",
    sellPrice: "999999.99",
    sellQty: "999999",
    sellUnit: "share",
    feeRatePct: "1",
    feeDiscount: "1",
    minFeeTwd: "99999",
    taxMode: "standard",
    taxRatePct: "1",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.buyShares, 999999);
  assert.equal(outcome.result.buyGross, 999998990000.01);
  assert.equal(outcome.result.remainingShares, 0);
});

test("legal maxima with lot units are accepted", () => {
  const outcome = run({
    ...DEFAULTS,
    buyPrice: "10",
    buyQty: "999",
    buyUnit: "lot",
    sellPrice: "10",
    sellQty: "999",
    sellUnit: "lot",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.buyShares, 999000);
});

test("just over the limits is rejected with the first error", () => {
  const over = [
    [{ ...DEFAULTS, buyPrice: "1000000" }, "RANGE", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: "0.00" }, "RANGE", "buyPrice"],
    [{ ...DEFAULTS, buyQty: "0" }, "RANGE", "buyQty"],
    [{ ...DEFAULTS, buyQty: "1000000" }, "INPUT_LIMIT", "buyQty"],
    [{ ...DEFAULTS, feeRatePct: "1.0001" }, "RANGE", "feeRatePct"],
    [{ ...DEFAULTS, feeDiscount: "1.001" }, "RANGE", "feeDiscount"],
    [{ ...DEFAULTS, feeDiscount: "0.001" }, null, null],
    [{ ...DEFAULTS, minFeeTwd: "100000" }, "INPUT_LIMIT", "minFeeTwd"],
    [{ ...DEFAULTS, taxRatePct: "1.0001" }, "RANGE", "taxRatePct"],
    [{ ...DEFAULTS, sellPrice: "100.005" }, "DECIMAL_FORMAT", "sellPrice"],
  ];
  for (const [input, code, field] of over) {
    const outcome = run(input);
    if (code === null) {
      assert.equal(outcome.ok, true, JSON.stringify(input));
    } else {
      assert.deepEqual(outcome, { ok: false, error: { code, field, row: null } });
    }
  }
});

test("schema failures: wrong type, missing field, extra field, array, null, accessor", () => {
  const bad = [
    { ...DEFAULTS, buyPrice: 100 },
    { ...DEFAULTS, buyPrice: null },
    { ...DEFAULTS, buyPrice: undefined },
    { ...DEFAULTS, buyPrice: true },
  ];
  for (const input of bad) {
    assert.deepEqual(run(input), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  }
  const missing = { ...DEFAULTS };
  delete missing.sellQty;
  assert.deepEqual(run(missing), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(
    run({ ...DEFAULTS, extra: "1" }),
    { ok: false, error: { code: "SCHEMA", field: null, row: null } },
  );
  assert.deepEqual(run([DEFAULTS]), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run(null), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  assert.deepEqual(run("100"), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  const accessor = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (key === "buyPrice") {
      Object.defineProperty(accessor, key, {
        enumerable: true,
        configurable: true,
        get() {
          return "100";
        },
      });
    } else {
      Object.defineProperty(accessor, key, { value, enumerable: true, configurable: true });
    }
  }
  assert.deepEqual(run(accessor), { ok: false, error: { code: "SCHEMA", field: null, row: null } });
  const symbolKeyed = { ...DEFAULTS, [Symbol("x")]: "1" };
  assert.deepEqual(run(symbolKeyed), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});

test("validation order: capacity before unicode, field order, first error wins", () => {
  assert.deepEqual(run({ ...DEFAULTS, buyPrice: "1234567890" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "buyPrice", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, buyPrice: " " }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "buyPrice", row: null },
  });
  // buyPrice is checked before sellPrice, even when both are wrong.
  assert.deepEqual(run({ ...DEFAULTS, buyPrice: "10.005", sellPrice: "" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "buyPrice", row: null },
  });
  // An over-long later field does not beat an earlier bad field.
  assert.deepEqual(run({ ...DEFAULTS, buyPrice: "10.005", buyQty: "1234567" }), {
    ok: false,
    error: { code: "DECIMAL_FORMAT", field: "buyPrice", row: null },
  });
});

test("a lone surrogate is UNICODE", () => {
  assert.deepEqual(run({ ...DEFAULTS, buyPrice: "\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "buyPrice", row: null },
  });
  assert.deepEqual(run({ ...DEFAULTS, sellQty: "1\uD800" }), {
    ok: false,
    error: { code: "UNICODE", field: "sellQty", row: null },
  });
});

test("decimal and integer grammar rejections", () => {
  const bad = [
    [{ ...DEFAULTS, buyPrice: "10." }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: ".5" }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: " 100" }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: "100 " }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: "1e3" }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: "+100" }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, buyPrice: "-100" }, "DECIMAL_FORMAT", "buyPrice"],
    [{ ...DEFAULTS, feeRatePct: "0.12345" }, "DECIMAL_FORMAT", "feeRatePct"],
    [{ ...DEFAULTS, feeDiscount: "0.1234" }, "INPUT_LIMIT", "feeDiscount"],
    [{ ...DEFAULTS, buyQty: "10.5" }, "INTEGER_FORMAT", "buyQty"],
    [{ ...DEFAULTS, minFeeTwd: "20.5" }, "INTEGER_FORMAT", "minFeeTwd"],
    [{ ...DEFAULTS, buyUnit: "lots" }, "ENUM", "buyUnit"],
    [{ ...DEFAULTS, taxMode: "Day" }, "ENUM", "taxMode"],
    [{ ...DEFAULTS, buyQty: "" }, "EMPTY", "buyQty"],
  ];
  for (const [input, code, field] of bad) {
    assert.deepEqual(run(input), { ok: false, error: { code, field, row: null } });
  }
});

test("leading zeros are allowed and change nothing", () => {
  const outcome = run({ ...DEFAULTS, buyPrice: "0100", buyQty: "01000" });
  const roundLot = fixtures.cases.find((entry) => entry.id === "round-lot-profit");
  assert.deepEqual(outcome, roundLot.expected);
});

test("day mode still validates the unused tax rate input", () => {
  assert.deepEqual(run({ ...DEFAULTS, taxMode: "day", taxRatePct: "2" }), {
    ok: false,
    error: { code: "RANGE", field: "taxRatePct", row: null },
  });
  const outcome = run({ ...DEFAULTS, taxMode: "day", taxRatePct: "0" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.effectiveTaxRatePct, 0.15);
});

test("a fee exactly equal to the minimum stays at the minimum", () => {
  // Gross 10,000 x 0.2% = 20 exactly, minimum 20: neither side wins.
  const outcome = run({
    buyPrice: "10",
    buyQty: "1000",
    buyUnit: "share",
    sellPrice: "10",
    sellQty: "1000",
    sellUnit: "share",
    feeRatePct: "0.2",
    feeDiscount: "1",
    minFeeTwd: "20",
    taxMode: "standard",
    taxRatePct: "0.3",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.buyFee, 20);
  assert.equal(outcome.result.sellFee, 20);
  assert.equal(outcome.result.netProfitLoss, -70);
});

test("zero profit: all costs zero, return 0 and breakeven equals the buy price", () => {
  const outcome = run({
    buyPrice: "50",
    buyQty: "100",
    buyUnit: "share",
    sellPrice: "50",
    sellQty: "100",
    sellUnit: "share",
    feeRatePct: "0",
    feeDiscount: "1",
    minFeeTwd: "0",
    taxMode: "standard",
    taxRatePct: "0",
  });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.netProfitLoss, 0);
  assert.equal(outcome.result.returnPct, 0);
  assert.equal(outcome.result.breakevenPrice, 50);
  assert.equal(outcome.result.buyFee, 0);
  assert.equal(outcome.result.sellTax, 0);
});

test("breakeven plugs back into the fee model: it reaches, one cent less does not", () => {
  for (const entry of successCases) {
    const { result } = entry.expected;
    const beCents = Math.round(result.breakevenPrice * 100);
    const costCents = Math.round(result.costBasisSold * 100);
    const at = run({
      ...entry.input,
      sellPrice: (beCents / 100).toFixed(2),
      sellQty: String(result.sellShares),
      sellUnit: "share",
    });
    assert.equal(at.ok, true, entry.id);
    assert.ok(
      at.result.sellNet * 100 >= costCents,
      `${entry.id}: sell net at breakeven must reach the cost basis`,
    );
    const below = run({
      ...entry.input,
      sellPrice: ((beCents - 1) / 100).toFixed(2),
      sellQty: String(result.sellShares),
      sellUnit: "share",
    });
    assert.equal(below.ok, true, entry.id);
    assert.ok(
      below.result.sellNet * 100 <= costCents,
      `${entry.id}: sell net one cent below breakeven must not exceed the cost basis`,
    );
  }
});

test("partial sells keep the remaining shares and apportion the basis exactly", () => {
  const partial = fixtures.cases.find((entry) => entry.id === "partial-sell");
  const outcome = run(partial.input);
  assert.equal(outcome.result.remainingShares, 2000);
  // 600855 * 1000 / 3000 = 200285 exactly.
  assert.equal(outcome.result.costBasisSold, 200285);
  const prorata = fixtures.cases.find((entry) => entry.id === "prorata-basis");
  const proOutcome = run(prorata.input);
  assert.equal(proOutcome.result.remainingShares, 200);
  // 10019 / 3 = 3339.666..., displayed 3339.67, but the profit uses
  // the exact fraction: 3982 - 10019/3 = 642.333... -> 642.
  assert.equal(proOutcome.result.costBasisSold, 3339.67);
  assert.equal(proOutcome.result.netProfitLoss, 642);
});
