// Core tests. The primary expectations are the SPEC's literal
// fixtures, vendored verbatim in test/fixtures.json (a byte-identical
// copy of the fixed spec candidate fixtures,
// spec-deal-comparator-20261121, spec candidate commit
// d96c5920128637f2b942b52c0fd11f771e7d25dc, draft spec PR #375,
// SHA-256
// f7d2d5fdec220b4309319b666082af2bc83459c8b6873805d5661fc196c5854b).
// Every literal case is asserted with a full deep equal of the
// complete result or the complete error triple, so no field can hide
// behind a partial match. The hand-derived cases below are computed
// from the SPEC's pinned rules by hand (and cross-checked with an
// independent Python Fraction script before implementation), never
// from the implementation's output.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

import { run } from "../public/js/core/deal-comparator.mjs";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures.json", import.meta.url), "utf8"),
);

const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
assert.equal(fixtures.specId, "spec-deal-comparator-20261121");
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

function baseInput(overrides = {}) {
  return {
    productName: "咖啡豆",
    unitBasis: "g",
    packSize: "500",
    packPrice: "150.00",
    offers: [
      { type: "buyNGetM", buyN: "2", getM: "1" },
      { type: "percentOff", percent: "20", quantity: "1" },
    ],
    ...overrides,
  };
}

test("ranking is consecutive with a unique rank 1, ties broken by total then order", () => {
  const outcome = run(baseInput());
  assert.equal(outcome.ok, true);
  const ranks = outcome.result.offers.map((offer) => offer.rank);
  assert.deepEqual(ranks, [1, 2]);
  assert.equal(outcome.result.offers.filter((offer) => offer.best).length, 1);
  // Exact tie on unit price and total: input order decides.
  const tied = run(
    baseInput({
      offers: [
        { type: "percentOff", percent: "50", quantity: "1" },
        { type: "fixedOff", amountOff: "75.00", quantity: "1" },
      ],
    }),
  );
  assert.equal(tied.ok, true);
  assert.deepEqual(
    tied.result.offers.map((offer) => [offer.index, offer.rank]),
    [
      [0, 1],
      [1, 2],
    ],
  );
  assert.equal(tied.result.offers[0].unitPrice, tied.result.offers[1].unitPrice);
  assert.equal(tied.result.offers[0].totalPaid, tied.result.offers[1].totalPaid);
});

test("endpoints: percent 1/99, buyN/getM 1/99, quantity 99", () => {
  const ok = run(
    baseInput({
      offers: [
        { type: "percentOff", percent: "1", quantity: "99" },
        { type: "buyNGetM", buyN: "99", getM: "99" },
      ],
    }),
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.result.offers.find((offer) => offer.type === "percentOff").totalQuantity, 99 * 500);
  assert.equal(ok.result.offers.find((offer) => offer.type === "buyNGetM").totalQuantity, 198 * 500);
  for (const bad of ["0", "100"]) {
    assert.deepEqual(
      run(baseInput({ offers: [{ type: "percentOff", percent: bad, quantity: "1" }, { type: "buyNGetM", buyN: "1", getM: "1" }] })),
      { ok: false, error: { code: "RANGE", field: "offers[0].percent", row: null } },
    );
    assert.deepEqual(
      run(baseInput({ offers: [{ type: "buyNGetM", buyN: bad, getM: "1" }, { type: "percentOff", percent: "10", quantity: "1" }] })),
      { ok: false, error: { code: "RANGE", field: "offers[0].buyN", row: null } },
    );
    assert.deepEqual(
      run(baseInput({ offers: [{ type: "buyNGetM", buyN: "1", getM: bad }, { type: "percentOff", percent: "10", quantity: "1" }] })),
      { ok: false, error: { code: "RANGE", field: "offers[0].getM", row: null } },
    );
    assert.deepEqual(
      run(baseInput({ offers: [{ type: "percentOff", percent: "10", quantity: bad }, { type: "buyNGetM", buyN: "1", getM: "1" }] })),
      { ok: false, error: { code: "RANGE", field: "offers[0].quantity", row: null } },
    );
  }
});

test("fixed-off boundary: one cent below the total is legal, equal is DISCOUNT_EXCEEDS_PRICE", () => {
  const below = run(
    baseInput({
      offers: [
        { type: "fixedOff", amountOff: "149.99", quantity: "1" },
        { type: "percentOff", percent: "10", quantity: "1" },
      ],
    }),
  );
  assert.equal(below.ok, true);
  assert.equal(below.result.offers.find((offer) => offer.type === "fixedOff").totalPaid, "0.01");
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "fixedOff", amountOff: "150.00", quantity: "1" },
          { type: "percentOff", percent: "10", quantity: "1" },
        ],
      }),
    ),
    {
      ok: false,
      error: { code: "DISCOUNT_EXCEEDS_PRICE", field: "offers[0].amountOff", row: null },
    },
  );
  // Two packs: the limit is quantity x pack price (300.00).
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "fixedOff", amountOff: "300.00", quantity: "2" },
          { type: "percentOff", percent: "10", quantity: "1" },
        ],
      }),
    ),
    {
      ok: false,
      error: { code: "DISCOUNT_EXCEEDS_PRICE", field: "offers[0].amountOff", row: null },
    },
  );
  assert.equal(
    run(
      baseInput({
        offers: [
          { type: "fixedOff", amountOff: "299.99", quantity: "2" },
          { type: "percentOff", percent: "10", quantity: "1" },
        ],
      }),
    ).ok,
    true,
  );
});

test("packSize endpoints depend on the unit basis", () => {
  assert.equal(run(baseInput({ packSize: "100000" })).ok, true);
  assert.deepEqual(run(baseInput({ packSize: "100001" })), {
    ok: false,
    error: { code: "RANGE", field: "packSize", row: null },
  });
  assert.equal(run(baseInput({ unitBasis: "piece", packSize: "1000" })).ok, true);
  assert.deepEqual(run(baseInput({ unitBasis: "piece", packSize: "1001" })), {
    ok: false,
    error: { code: "RANGE", field: "packSize", row: null },
  });
  assert.deepEqual(run(baseInput({ packSize: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "packSize", row: null },
  });
});

test("packPrice endpoints 0.01 and 999999.99", () => {
  assert.equal(run(baseInput({ packPrice: "0.01" })).ok, true);
  assert.equal(run(baseInput({ packPrice: "999999.99" })).ok, true);
  assert.deepEqual(run(baseInput({ packPrice: "0.00" })), {
    ok: false,
    error: { code: "RANGE", field: "packPrice", row: null },
  });
  assert.deepEqual(run(baseInput({ packPrice: "1000000.00" })), {
    ok: false,
    error: { code: "RANGE", field: "packPrice", row: null },
  });
});

test("half-cent rounding goes up, from the exact paid amount", () => {
  // 700 x 100 / 160 = 437.5 cents exactly -> 438 (4.38); this is the
  // rounding-half-up fixture, re-asserted here with its sibling value.
  const outcome = run(
    baseInput({
      productName: "巧克力",
      packSize: "160",
      packPrice: "7.00",
      offers: [
        { type: "bundle", bundlePrice: "7.00", quantity: "1" },
        { type: "buyNGetM", buyN: "1", getM: "1" },
      ],
    }),
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.offers.find((offer) => offer.index === 0).unitPrice, "4.38");
  assert.equal(outcome.result.offers.find((offer) => offer.index === 1).unitPrice, "2.19");
  // A bundle equal to the list price saves exactly zero and is legal.
  assert.equal(outcome.result.offers.find((offer) => offer.index === 0).savings, "0.00");
  assert.equal(outcome.result.offers.find((offer) => offer.index === 0).savingsPercent, "0.0");
});

test("bundle above the list price stays legal with negative savings", () => {
  const outcome = run(
    baseInput({
      productName: "洗衣粉",
      packPrice: "100.00",
      offers: [
        { type: "bundle", bundlePrice: "250.00", label: "貴組合", quantity: "2" },
        { type: "percentOff", percent: "10", quantity: "1", label: "九折" },
      ],
    }),
  );
  assert.equal(outcome.ok, true);
  const bundle = outcome.result.offers.find((offer) => offer.type === "bundle");
  assert.equal(bundle.savings, "-50.00");
  assert.equal(bundle.savingsPercent, "-25.0");
  assert.equal(bundle.rank, 2);
  assert.equal(bundle.best, false);
});

test("percent-off uses exact rationals: 129.50 x 80% over 750 g is 13.81", () => {
  const outcome = run(
    baseInput({
      productName: "堅果",
      packSize: "750",
      packPrice: "129.50",
      offers: [
        { type: "percentOff", percent: "20", quantity: "1" },
        { type: "buyNGetM", buyN: "2", getM: "1" },
      ],
    }),
  );
  assert.equal(outcome.ok, true);
  assert.equal(outcome.result.offers.find((offer) => offer.index === 0).unitPrice, "13.81");
  // 10360 x 100 / 750 = 1381.333... -> 1381, not 1382: no float drift.
  assert.equal(outcome.result.offers.find((offer) => offer.index === 0).totalPaid, "103.60");
});

test("money and integer grammar: no signs, spaces, decimals, or leading zeros", () => {
  for (const bad of ["12.345", "12.3.4", "+12.00", "-12.00", " 12.00", "12.00 ", "012.00", "00.50", "1e2"]) {
    assert.deepEqual(run(baseInput({ packPrice: bad })), {
      ok: false,
      error: { code: "MONEY_FORMAT", field: "packPrice", row: null },
    });
  }
  for (const bad of ["12.5", "+500", "-500", " 500", "500 ", "0500", "00", "1e2", "５００"]) {
    assert.deepEqual(run(baseInput({ packSize: bad })), {
      ok: false,
      error: { code: "INTEGER_FORMAT", field: "packSize", row: null },
    });
  }
  assert.deepEqual(run(baseInput({ packSize: "0" })), {
    ok: false,
    error: { code: "RANGE", field: "packSize", row: null },
  });
});

test("empty product name and blank label are EMPTY", () => {
  assert.deepEqual(run(baseInput({ productName: "" })), {
    ok: false,
    error: { code: "EMPTY", field: "productName", row: null },
  });
  assert.deepEqual(run(baseInput({ productName: "   " })), {
    ok: false,
    error: { code: "EMPTY", field: "productName", row: null },
  });
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: "10", quantity: "1", label: "  " },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "EMPTY", field: "offers[0].label", row: null } },
  );
});

test("offer count 2 and 4 pass; 1 and 5 fail with OFFER_COUNT", () => {
  assert.equal(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: "10", quantity: "1" },
          { type: "buyNGetM", buyN: "1", getM: "1" },
          { type: "fixedOff", amountOff: "10.00", quantity: "1" },
          { type: "bundle", bundlePrice: "100.00", quantity: "1" },
        ],
      }),
    ).ok,
    true,
  );
  assert.deepEqual(
    run(baseInput({ offers: [{ type: "percentOff", percent: "10", quantity: "1" }] })),
    { ok: false, error: { code: "OFFER_COUNT", field: "offers", row: null } },
  );
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: "10", quantity: "1" },
          { type: "buyNGetM", buyN: "1", getM: "1" },
          { type: "fixedOff", amountOff: "10.00", quantity: "1" },
          { type: "bundle", bundlePrice: "100.00", quantity: "1" },
          { type: "percentOff", percent: "20", quantity: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "OFFER_COUNT", field: "offers", row: null } },
  );
});

test("first error only, in the SPEC order", () => {
  // productName (step 2) beats packPrice (step 5).
  assert.deepEqual(run(baseInput({ productName: "", packPrice: "junk" })), {
    ok: false,
    error: { code: "EMPTY", field: "productName", row: null },
  });
  // unitBasis ENUM (step 3) beats packSize (step 4).
  assert.deepEqual(run(baseInput({ unitBasis: "kg", packSize: "junk" })), {
    ok: false,
    error: { code: "ENUM", field: "unitBasis", row: null },
  });
  // Offer 0 is fully validated before offer 1.
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: "0", quantity: "1" },
          { type: "percentOff", percent: "0", quantity: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "RANGE", field: "offers[0].percent", row: null } },
  );
  // Label (step b) beats type (step c); type (step c) beats extra
  // fields (step d); extra fields (step d) beat type fields (step e).
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "nope", label: "  " },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "EMPTY", field: "offers[0].label", row: null } },
  );
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "nope", quantity: "1" },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "ENUM", field: "offers[0].type", row: null } },
  );
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "buyNGetM", buyN: "1", getM: "1", quantity: "1" },
          { type: "percentOff", percent: "10", quantity: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "SCHEMA", field: "offers[0].quantity", row: null } },
  );
  // Quantity (table order first) beats percent.
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", quantity: "0", percent: "0" },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "RANGE", field: "offers[0].quantity", row: null } },
  );
});

test("schema violations are SCHEMA; top-level field is null, offer-level carries the path", () => {
  const topSchema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  assert.deepEqual(run(null), topSchema);
  assert.deepEqual(run([]), topSchema);
  assert.deepEqual(run("x"), topSchema);
  assert.deepEqual(run({}), topSchema);
  assert.deepEqual(run(baseInput({ extra: "x" })), topSchema);
  const { packPrice, ...missing } = baseInput();
  assert.deepEqual(run(missing), topSchema);
  assert.deepEqual(run(baseInput({ packPrice: 150 })), topSchema);
  assert.deepEqual(run(baseInput({ offers: "nope" })), topSchema);
  assert.deepEqual(
    run(baseInput({ offers: ["nope", { type: "buyNGetM", buyN: "1", getM: "1" }] })),
    { ok: false, error: { code: "SCHEMA", field: "offers[0]", row: null } },
  );
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: 10, quantity: "1" },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "SCHEMA", field: "offers[0].percent", row: null } },
  );
  const withAccessor = baseInput();
  Object.defineProperty(withAccessor, "packPrice", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(withAccessor), topSchema);
  const offerAccessor = baseInput({
    offers: [
      { type: "percentOff", percent: "10", quantity: "1" },
      { type: "buyNGetM", buyN: "1", getM: "1" },
    ],
  });
  Object.defineProperty(offerAccessor.offers[0], "percent", {
    enumerable: true,
    get() {
      throw new Error("accessor must never be invoked");
    },
  });
  assert.deepEqual(run(offerAccessor), {
    ok: false,
    error: { code: "SCHEMA", field: "offers[0].percent", row: null },
  });
});

test("capacity: whole input over 65536 chars is INPUT_LIMIT with field null", () => {
  const huge = baseInput({ extra2: "x".repeat(70000) });
  // Unknown top-level key plus huge size: capacity (step 1) wins.
  assert.deepEqual(run(huge), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: null, row: null },
  });
});

test("capacity: single raw fields over their limits are INPUT_LIMIT in the field", () => {
  assert.deepEqual(run(baseInput({ productName: "x".repeat(81) })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "productName", row: null },
  });
  assert.equal(run(baseInput({ productName: "x".repeat(80) })).ok, true);
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: "10", quantity: "1", label: "x".repeat(41) },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "INPUT_LIMIT", field: "offers[0].label", row: null } },
  );
  assert.deepEqual(run(baseInput({ packSize: "1000000" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "packSize", row: null },
  });
  assert.deepEqual(run(baseInput({ packPrice: "1234567890.12" })), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "packPrice", row: null },
  });
  assert.deepEqual(
    run(
      baseInput({
        offers: [
          { type: "percentOff", percent: "1234567", quantity: "1" },
          { type: "buyNGetM", buyN: "1", getM: "1" },
        ],
      }),
    ),
    { ok: false, error: { code: "INPUT_LIMIT", field: "offers[0].percent", row: null } },
  );
});

test("quantity defaults to 1 when omitted; custom labels pass through verbatim", () => {
  const outcome = run(
    baseInput({
      packSize: "200",
      packPrice: "50.00",
      offers: [
        { type: "percentOff", percent: "50", label: "五折" },
        { type: "fixedOff", amountOff: "25.00", label: "折 25 元" },
        { type: "bundle", bundlePrice: "50.00", quantity: "2", label: "兩件 50 元" },
      ],
    }),
  );
  assert.equal(outcome.ok, true);
  assert.deepEqual(
    outcome.result.offers.map((offer) => offer.label),
    ["五折", "折 25 元", "兩件 50 元"],
  );
  assert.equal(outcome.result.offers.find((offer) => offer.index === 0).totalQuantity, 200);
});

test("core output is byte-identical under other host timezones", () => {
  // The SPEC forbids any clock or timezone participation in the core;
  // rerunning every literal core fixture in fresh processes under
  // four timezones must produce identical JSON.
  const corePath = fileURLToPath(new URL("../public/js/core/deal-comparator.mjs", import.meta.url));
  const inputs = coreCases.map((entry) => entry.input);
  const script = `
    import { run } from ${JSON.stringify(pathToFileURL(corePath).href)};
    const inputs = ${JSON.stringify(inputs)};
    const outputs = inputs.map((input) => run(input));
    process.stdout.write(JSON.stringify(outputs));
  `;
  const expected = JSON.stringify(inputs.map((input) => run(input)));
  for (const tz of ["UTC", "Asia/Taipei", "America/New_York", "Pacific/Kiritimati"]) {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      env: { ...process.env, TZ: tz },
      encoding: "utf8",
    });
    assert.equal(out, expected, `TZ=${tz}`);
  }
});
