// Validation tests: every range and precision refusal in SPEC section 2
// and section 4, threshold ordering with the offending band named, and the
// accepted boundary values on the other side of each refusal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../public/js/core/calculator.mjs";

const BASE = {
  watts: "1000",
  hoursPerDay: "3",
  days: "30",
  quantity: "1",
  currency: "TWD",
  tariff: { mode: "flat", rate: "5.000" },
};

function errors(overrides = {}) {
  const outcome = calculate({ ...BASE, ...overrides });
  assert.equal(outcome.ok, false, "expected validation failure");
  return outcome.errors;
}

function errorFor(overrides, field) {
  return errors(overrides).find((e) => e.field === field);
}

function ok(overrides = {}) {
  const outcome = calculate({ ...BASE, ...overrides });
  assert.equal(outcome.ok, true, JSON.stringify(outcome.errors));
}

test("watts refusals", () => {
  assert.equal(errorFor({ watts: "" }, "watts").code, "required");
  assert.equal(errorFor({ watts: "abc" }, "watts").code, "not-a-number");
  assert.equal(errorFor({ watts: "0" }, "watts").code, "must-be-positive");
  assert.equal(errorFor({ watts: "-5" }, "watts").code, "must-be-positive");
  assert.equal(errorFor({ watts: "50000.1" }, "watts").code, "above-max");
  const precision = errorFor({ watts: "100.55" }, "watts");
  assert.equal(precision.code, "too-many-decimals");
  assert.equal(precision.maxDecimals, 1);
});

test("watts boundaries accepted", () => {
  ok({ watts: "50000" });
  ok({ watts: "0.1" });
  ok({ watts: "49999.9" });
});

test("hours refusals and boundaries", () => {
  assert.equal(errorFor({ hoursPerDay: "0" }, "hours").code, "must-be-positive");
  assert.equal(errorFor({ hoursPerDay: "24.01" }, "hours").code, "above-max");
  const precision = errorFor({ hoursPerDay: "1.234" }, "hours");
  assert.equal(precision.code, "too-many-decimals");
  assert.equal(precision.maxDecimals, 2);
  ok({ hoursPerDay: "24" });
  ok({ hoursPerDay: "24.00" });
  ok({ hoursPerDay: "0.01" });
});

test("days refusals and boundaries", () => {
  assert.equal(errorFor({ days: "0" }, "days").code, "out-of-range");
  assert.equal(errorFor({ days: "367" }, "days").code, "out-of-range");
  assert.equal(errorFor({ days: "1.5" }, "days").code, "not-whole");
  ok({ days: "1" });
  ok({ days: "366" });
});

test("quantity refusals and boundaries", () => {
  assert.equal(errorFor({ quantity: "0" }, "quantity").code, "out-of-range");
  assert.equal(errorFor({ quantity: "101" }, "quantity").code, "out-of-range");
  assert.equal(errorFor({ quantity: "2.0" }, "quantity").code, "not-whole");
  ok({ quantity: "1" });
  ok({ quantity: "100" });
});

test("flat rate refusals and boundaries", () => {
  const flat = (rate) => ({ tariff: { mode: "flat", rate } });
  assert.equal(errorFor(flat(""), "rate").code, "required");
  assert.equal(errorFor(flat("0"), "rate").code, "must-be-positive");
  assert.equal(errorFor(flat("1000"), "rate").code, "above-max");
  const precision = errorFor(flat("1.0001"), "rate");
  assert.equal(precision.code, "too-many-decimals");
  assert.equal(precision.maxDecimals, 3);
  ok(flat("999.999"));
  ok(flat("0.001"));
});

const TIERED = (bands) => ({ tariff: { mode: "tiered", bands } });

test("tier threshold refusals", () => {
  const two = (t1) =>
    TIERED([
      { threshold: t1, rate: "3.000" },
      { threshold: null, rate: "5.000" },
    ]);
  assert.equal(errorFor(two(""), "threshold1").code, "required");
  assert.equal(errorFor(two(null), "threshold1").code, "required");
  assert.equal(errorFor(two("0"), "threshold1").code, "out-of-range");
  assert.equal(errorFor(two("1000001"), "threshold1").code, "out-of-range");
  assert.equal(errorFor(two("120.5"), "threshold1").code, "not-whole");
  ok(two("1"));
  ok(two("1000000"));
});

test("tier thresholds must be strictly ascending and name the band", () => {
  const equal = TIERED([
    { threshold: "120", rate: "3.000" },
    { threshold: "120", rate: "4.000" },
    { threshold: null, rate: "5.000" },
  ]);
  const err = errorFor(equal, "threshold2");
  assert.equal(err.code, "not-ascending");
  assert.equal(err.band, 2);

  const descending = TIERED([
    { threshold: "300", rate: "3.000" },
    { threshold: "120", rate: "4.000" },
    { threshold: null, rate: "5.000" },
  ]);
  assert.equal(errorFor(descending, "threshold2").code, "not-ascending");
});

test("tier band count and open-ended final band", () => {
  assert.equal(
    errorFor(TIERED([{ threshold: null, rate: "5.000" }]), "bands").code,
    "band-count",
  );
  assert.equal(
    errorFor(
      TIERED([
        { threshold: "10", rate: "1.000" },
        { threshold: "20", rate: "2.000" },
        { threshold: "30", rate: "3.000" },
        { threshold: null, rate: "4.000" },
      ]),
      "bands",
    ).code,
    "band-count",
  );
  assert.equal(
    errorFor(
      TIERED([
        { threshold: "120", rate: "3.000" },
        { threshold: "300", rate: "5.000" },
      ]),
      "bands",
    ).code,
    "final-band-must-be-open",
  );
});

test("tier band rate refusals are per-band", () => {
  const bad = TIERED([
    { threshold: "120", rate: "3.000" },
    { threshold: null, rate: "" },
  ]);
  assert.equal(errorFor(bad, "rate2").code, "required");
});

test("multiple errors are reported together, one per field", () => {
  const list = errors({ watts: "0", days: "0" });
  assert.deepEqual(
    list.map((e) => e.field).sort(),
    ["days", "watts"],
  );
});
