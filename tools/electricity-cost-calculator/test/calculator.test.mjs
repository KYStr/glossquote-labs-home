// Core computation tests. Every expected value below is derived from the
// SPEC by hand (section 4 fixtures F1-F6 and hand-computed edge cases),
// never from the implementation's own output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../public/js/core/calculator.mjs";

function run(overrides = {}) {
  const input = {
    watts: "1000",
    hoursPerDay: "3",
    days: "30",
    quantity: "1",
    currency: "TWD",
    tariff: { mode: "flat", rate: "5.000" },
    ...overrides,
  };
  const outcome = calculate(input);
  assert.equal(outcome.ok, true, JSON.stringify(outcome.errors));
  return outcome.result;
}

test("F1: initial worked example, flat TWD", () => {
  const r = run();
  assert.equal(r.kwhPerDay, "3.000");
  assert.equal(r.kwhPeriod, "90.000");
  assert.equal(r.costPerDay, "NT$15.00");
  assert.equal(r.costPeriod, "NT$450.00");
  assert.equal(r.perDayIsAverage, false);
  assert.deepEqual(r.bands, []);
});

test("F2: air conditioner, flat 4.500", () => {
  const r = run({
    watts: "1200",
    hoursPerDay: "8",
    tariff: { mode: "flat", rate: "4.500" },
  });
  assert.equal(r.kwhPerDay, "9.600");
  assert.equal(r.kwhPeriod, "288.000");
  assert.equal(r.costPerDay, "NT$43.20");
  assert.equal(r.costPeriod, "NT$1,296.00");
});

test("F3: four bulbs via quantity, USD", () => {
  const r = run({
    watts: "60",
    hoursPerDay: "5",
    quantity: "4",
    currency: "USD",
    tariff: { mode: "flat", rate: "0.300" },
  });
  assert.equal(r.kwhPerDay, "1.200");
  assert.equal(r.kwhPeriod, "36.000");
  assert.equal(r.costPerDay, "US$0.36");
  assert.equal(r.costPeriod, "US$10.80");
});

test("F4: three-band tiered with breakdown and average per day", () => {
  const r = run({
    watts: "2000",
    hoursPerDay: "7",
    days: "25",
    tariff: {
      mode: "tiered",
      bands: [
        { threshold: "120", rate: "3.000" },
        { threshold: "300", rate: "4.000" },
        { threshold: null, rate: "5.000" },
      ],
    },
  });
  assert.equal(r.kwhPerDay, "14.000");
  assert.equal(r.kwhPeriod, "350.000");
  assert.deepEqual(r.bands, [
    { from: 0, to: 120, kwh: "120.000", rate: "3.000", subtotal: "NT$360.00" },
    { from: 120, to: 300, kwh: "180.000", rate: "4.000", subtotal: "NT$720.00" },
    { from: 300, to: null, kwh: "50.000", rate: "5.000", subtotal: "NT$250.00" },
  ]);
  assert.equal(r.costPeriod, "NT$1,330.00");
  assert.equal(r.costPerDay, "NT$53.20");
  assert.equal(r.perDayIsAverage, true);
});

test("F5: JPY has zero minor decimals anywhere", () => {
  const r = run({ currency: "JPY", tariff: { mode: "flat", rate: "31" } });
  assert.equal(r.costPeriod, "¥2,790");
  assert.equal(r.costPerDay, "¥93");
});

test("F6: cost comes from unrounded energy, rounded once at display", () => {
  const r = run({
    watts: "333",
    hoursPerDay: "1",
    days: "3",
    tariff: { mode: "flat", rate: "3.333" },
  });
  assert.equal(r.kwhPerDay, "0.333");
  assert.equal(r.kwhPeriod, "0.999");
  // exact period cost 0.999 * 3.333 = 3.329667 -> 3.33
  assert.equal(r.costPeriod, "NT$3.33");
  // exact per-day cost 0.333 * 3.333 = 1.109889 -> 1.11
  assert.equal(r.costPerDay, "NT$1.11");
});

test("tier edge: energy exactly at the first threshold stays in band 1", () => {
  const r = run({
    hoursPerDay: "4", // 1 kW * 4 h * 30 d = 120 kWh
    tariff: {
      mode: "tiered",
      bands: [
        { threshold: "120", rate: "3.000" },
        { threshold: null, rate: "5.000" },
      ],
    },
  });
  assert.equal(r.kwhPeriod, "120.000");
  assert.equal(r.bands.length, 1);
  assert.equal(r.costPeriod, "NT$360.00");
});

test("tier edge: one kWh into band 2", () => {
  const r = run({
    hoursPerDay: "1",
    days: "121", // 121 kWh
    tariff: {
      mode: "tiered",
      bands: [
        { threshold: "120", rate: "3.000" },
        { threshold: null, rate: "5.000" },
      ],
    },
  });
  assert.deepEqual(
    r.bands.map((b) => [b.kwh, b.subtotal]),
    [
      ["120.000", "NT$360.00"],
      ["1.000", "NT$5.00"],
    ],
  );
  assert.equal(r.costPeriod, "NT$365.00");
});

test("tier edge: bands with zero energy are omitted from the breakdown", () => {
  const r = run({
    hoursPerDay: "1",
    days: "100", // 100 kWh, all in band 1 of three
    tariff: {
      mode: "tiered",
      bands: [
        { threshold: "120", rate: "3.000" },
        { threshold: "300", rate: "4.000" },
        { threshold: null, rate: "5.000" },
      ],
    },
  });
  assert.equal(r.bands.length, 1);
  assert.equal(r.bands[0].kwh, "100.000");
  assert.equal(r.costPeriod, "NT$300.00");
});

test("tier edge: energy exactly at the second threshold uses no third band", () => {
  const r = run({
    hoursPerDay: "10",
    days: "30", // 300 kWh
    tariff: {
      mode: "tiered",
      bands: [
        { threshold: "120", rate: "3.000" },
        { threshold: "300", rate: "4.000" },
        { threshold: null, rate: "5.000" },
      ],
    },
  });
  assert.equal(r.bands.length, 2);
  assert.equal(r.costPeriod, "NT$1,080.00"); // 360 + 720
});

test("rounding: a cost at exactly x.xx5 rounds half away from zero", () => {
  const up = run({
    hoursPerDay: "1",
    days: "1",
    tariff: { mode: "flat", rate: "2.005" }, // 1 kWh * 2.005 = 2.005
  });
  assert.equal(up.costPeriod, "NT$2.01");
  const down = run({
    hoursPerDay: "1",
    days: "1",
    tariff: { mode: "flat", rate: "2.004" },
  });
  assert.equal(down.costPeriod, "NT$2.00");
});

test("rounding: kWh display rounds half away from zero at 3 decimals", () => {
  const r = run({ watts: "0.5", hoursPerDay: "1", days: "1" }); // 0.0005 kWh
  assert.equal(r.kwhPerDay, "0.001");
  assert.equal(r.kwhPeriod, "0.001");
});

test("JPY: comma grouping on a large whole-yen amount", () => {
  const r = run({
    watts: "50000",
    hoursPerDay: "24",
    days: "366",
    quantity: "100",
    currency: "JPY",
    tariff: { mode: "flat", rate: "999.999" },
  });
  // 50 kW * 24 h * 100 * 366 d = 43,920,000 kWh; * 999.999 = 43,919,956,080
  assert.equal(r.kwhPeriod, "43,920,000.000");
  assert.equal(r.costPeriod, "¥43,919,956,080");
});

test("currency switching reformats without changing the energy", () => {
  for (const [currency, period] of [
    ["TWD", "NT$450.00"],
    ["USD", "US$450.00"],
    ["EUR", "€450.00"],
    ["GBP", "£450.00"],
  ]) {
    const r = run({ currency });
    assert.equal(r.kwhPeriod, "90.000");
    assert.equal(r.costPeriod, period);
  }
});

test("tiered total is the rounded exact sum, not the sum of displayed subtotals", () => {
  // Each band subtotal is x.xx4 (displays down), the exact sum crosses .005.
  // Band 1: 1 kWh * 0.004 = 0.004 -> displays NT$0.00
  // Band 2: 1 kWh * 0.004 = 0.004 -> displays NT$0.00
  // Exact total 0.008 -> NT$0.01, which no sum of displayed subtotals gives.
  const r = run({
    hoursPerDay: "1",
    days: "2", // 2 kWh
    tariff: {
      mode: "tiered",
      bands: [
        { threshold: "1", rate: "0.004" },
        { threshold: null, rate: "0.004" },
      ],
    },
  });
  assert.deepEqual(r.bands.map((b) => b.subtotal), ["NT$0.00", "NT$0.00"]);
  assert.equal(r.costPeriod, "NT$0.01");
});
