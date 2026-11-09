// Core tests for the Spacing Token Audit.
// Every expected value below is taken from fixtures.json or hand-derived
// from the SPEC's own rules — never from the implementation's output.
import { deepStrictEqual, equal, ok } from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  EXAMPLE_DRAFT,
  REPORT_MAX_BYTES,
  formatThousandths,
  parsePxThousandths,
  run,
  serializeReport,
} from "../public/js/core/audit.mjs";

const fixtures = JSON.parse(
  readFileSync(
    new URL(
      "../../../docs/specs/spacing-token-audit/fixtures.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

for (const fixture of fixtures.cases.filter((c) => c.kind === "core")) {
  test(`fixture ${fixture.id}`, () => {
    deepStrictEqual(run(fixture.input), fixture.expected);
  });
}

test("example draft matches the first fixture input", () => {
  deepStrictEqual(EXAMPLE_DRAFT, fixtures.cases[0].input);
});

test("schema: unknown, missing, wrong-type, accessor, non-plain input", () => {
  const schema = { ok: false, error: { code: "SCHEMA", field: null, row: null } };
  deepStrictEqual(run({ tokens: "a\t1", measurements: "b\t1", tolerance: "1", extra: "x" }), schema);
  deepStrictEqual(run({ measurements: "b\t1", tolerance: "1" }), schema);
  deepStrictEqual(run({ tokens: "a\t1", tolerance: "1" }), schema);
  deepStrictEqual(run({ tokens: 1, measurements: "b\t1", tolerance: "1" }), schema);
  deepStrictEqual(run({ tokens: "a\t1", measurements: "b\t1", tolerance: 1 }), schema);
  deepStrictEqual(run(null), schema);
  deepStrictEqual(run("a\t1"), schema);
  deepStrictEqual(run(["a\t1"]), schema);
  const accessor = {};
  Object.defineProperty(accessor, "tokens", { get: () => "a\t1", enumerable: true });
  accessor.measurements = "b\t1";
  accessor.tolerance = "1";
  deepStrictEqual(run(accessor), schema);
  const stringObject = { tokens: new String("a\t1"), measurements: "b\t1", tolerance: "1" };
  deepStrictEqual(run(stringObject), schema);
});

test("schema: missing tolerance defaults to 1", () => {
  deepStrictEqual(run({ tokens: "a\t8", measurements: "b\t9" }), {
    ok: true,
    result: {
      rows: [{ label: "b", px: "9", token: "a", tokenPx: "8", delta: "1", status: "within" }],
      outsideCount: 0,
    },
  });
});

test("tolerance is validated before tokens and measurements", () => {
  deepStrictEqual(run({ tokens: "bad", measurements: "bad", tolerance: "2rem" }), {
    ok: false,
    error: { code: "TOLERANCE", field: "tolerance", row: null },
  });
  deepStrictEqual(run({ tokens: "a\t1", measurements: "b\t1", tolerance: "2049" }), {
    ok: false,
    error: { code: "TOLERANCE", field: "tolerance", row: null },
  });
  deepStrictEqual(run({ tokens: "a\t1", measurements: "b\t1", tolerance: "" }), {
    ok: false,
    error: { code: "TOLERANCE", field: "tolerance", row: null },
  });
  deepStrictEqual(run({ tokens: "a\t1", measurements: "b\t1", tolerance: "1.0001" }), {
    ok: false,
    error: { code: "TOLERANCE", field: "tolerance", row: null },
  });
});

test("tokens errors beat measurements errors", () => {
  deepStrictEqual(run({ tokens: "bad", measurements: "alsobad", tolerance: "1" }), {
    ok: false,
    error: { code: "ROW_FORMAT", field: "tokens", row: 1 },
  });
});

test("capacity: 8193 UTF-16 units is INPUT_LIMIT", () => {
  const long = "a\t1\n".repeat(2049).slice(0, 8193);
  equal(long.length, 8193);
  deepStrictEqual(run({ tokens: long, measurements: "b\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "INPUT_LIMIT", field: "tokens", row: null },
  });
});

test("unpaired surrogate is UNICODE", () => {
  deepStrictEqual(run({ tokens: "a\t1\nb\uD800\t2", measurements: "c\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "UNICODE", field: "tokens", row: null },
  });
  deepStrictEqual(run({ tokens: "a\t1", measurements: "c\uDC00\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "UNICODE", field: "measurements", row: null },
  });
  // A well-formed surrogate pair is not a surrogate error; the name grammar rejects it.
  deepStrictEqual(run({ tokens: "a\uD83D\uDE00\t1", measurements: "c\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "ROW_FORMAT", field: "tokens", row: 1 },
  });
});

test("empty tables are EMPTY", () => {
  deepStrictEqual(run({ tokens: "", measurements: "b\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "EMPTY", field: "tokens", row: null },
  });
  deepStrictEqual(run({ tokens: "a\t1", measurements: "", tolerance: "1" }), {
    ok: false,
    error: { code: "EMPTY", field: "measurements", row: null },
  });
  deepStrictEqual(run({ tokens: "\n", measurements: "b\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "EMPTY", field: "tokens", row: null },
  });
});

test("row limits: 65 token rows and 101 measurement rows are ROW_LIMIT", () => {
  const tokens65 = Array.from({ length: 65 }, (_, i) => `t${i}\t${i}`).join("\n");
  deepStrictEqual(run({ tokens: tokens65, measurements: "b\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "ROW_LIMIT", field: "tokens", row: null },
  });
  const tokens64 = Array.from({ length: 64 }, (_, i) => `t${i}\t${i}`).join("\n");
  ok(run({ tokens: tokens64, measurements: "b\t1", tolerance: "1" }).ok);
  const measurements101 = Array.from({ length: 101 }, (_, i) => `m${i}\t${i}`).join("\n");
  deepStrictEqual(run({ tokens: "a\t1", measurements: measurements101, tolerance: "1" }), {
    ok: false,
    error: { code: "ROW_LIMIT", field: "measurements", row: null },
  });
});

test("row format: column count and name grammar", () => {
  const cases = [
    ["a", 1],
    ["a\t1\t2", 1],
    ["1a\t1", 1],
    ["_a\t1", 1],
    ["a b\t1", 1],
    ["a".repeat(33) + "\t1", 1],
    ["é\t1", 1],
    ["\t1", 1],
    ["a\t1\nbadrow", 2],
  ];
  for (const [tokens, row] of cases) {
    deepStrictEqual(run({ tokens, measurements: "b\t1", tolerance: "1" }), {
      ok: false,
      error: { code: "ROW_FORMAT", field: "tokens", row },
    });
  }
  // A 32-character name is legal.
  ok(run({ tokens: "a".repeat(32) + "\t1", measurements: "b\t1", tolerance: "1" }).ok);
  // A row with no tab in the middle is a format error at its own row.
  deepStrictEqual(run({ tokens: "a\t1\n\nb\t2", measurements: "c\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "ROW_FORMAT", field: "tokens", row: 2 },
  });
});

test("duplicate names are per-table and case-sensitive", () => {
  deepStrictEqual(run({ tokens: "a\t1\nA\t2", measurements: "b\t1", tolerance: "1" }).ok, true);
  deepStrictEqual(run({ tokens: "a\t1", measurements: "b\t1\nb\t2", tolerance: "1" }), {
    ok: false,
    error: { code: "DUP_NAME", field: "measurements", row: 2 },
  });
  // Names may repeat across the two tables.
  ok(run({ tokens: "a\t1", measurements: "a\t1", tolerance: "1" }).ok);
});

test("px grammar and range: every refusal class", () => {
  const bad = [
    "2048.001",
    "2049",
    "10000",
    "00",
    "01",
    "5.",
    ".5",
    "5.0001",
    "+5",
    "-1",
    "1e3",
    "1,000",
    " 5",
    "5 ",
    "5px",
    "2rem",
    "",
    "NaN",
    "Infinity",
  ];
  for (const px of bad) {
    deepStrictEqual(run({ tokens: "a\t1", measurements: `b\t${px}`, tolerance: "1" }), {
      ok: false,
      error: { code: "PIXELS", field: "measurements", row: 1 },
    });
  }
  const good = ["0", "0.000", "0.001", "2048", "2048.000", "12.5", "007".replace("007", "7")];
  for (const px of good) {
    ok(run({ tokens: "a\t1", measurements: `b\t${px}`, tolerance: "1" }).ok, px);
  }
});

test("one trailing LF is stripped; a second one is an empty row", () => {
  ok(run({ tokens: "a\t1\n", measurements: "b\t1", tolerance: "1" }).ok);
  deepStrictEqual(run({ tokens: "a\t1\n\n", measurements: "b\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "ROW_FORMAT", field: "tokens", row: 2 },
  });
});

test("carriage returns are not stripped (LF only, per SPEC)", () => {
  deepStrictEqual(run({ tokens: "a\t1\r\nb\t2", measurements: "c\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "PIXELS", field: "tokens", row: 1 },
  });
});

test("per-row checks run in row order", () => {
  // Row 1 has a bad px, row 2 has a bad format: row 1 wins.
  deepStrictEqual(run({ tokens: "a\t2rem\nbadrow", measurements: "b\t1", tolerance: "1" }), {
    ok: false,
    error: { code: "PIXELS", field: "tokens", row: 1 },
  });
});

test("nearest token: tie takes smaller px, then earlier row", () => {
  // 10 is equidistant from 8 and 12 -> 8.
  // 10 is equidistant from 12 and 8 regardless of table order.
  const reversed = run({
    tokens: "big\t12\nsmall\t8",
    measurements: "m\t10",
    tolerance: "1",
  });
  deepStrictEqual(reversed, {
    ok: true,
    result: {
      rows: [{ label: "m", px: "10", token: "small", tokenPx: "8", delta: "2", status: "outside" }],
      outsideCount: 1,
    },
  });
  // Same value twice -> earlier row wins.
  const alias = run({
    tokens: "second\t8\nfirst\t8.000",
    measurements: "m\t9",
    tolerance: "1",
  });
  equal(alias.result.rows[0].token, "second");
  equal(alias.result.rows[0].tokenPx, "8");
});

test("status thresholds: exact, within at the boundary, outside past it", () => {
  const outcome = run({
    tokens: "t\t100",
    measurements: "a\t100\nb\t100.5\nc\t101\nd\t101.001",
    tolerance: "1",
  });
  deepStrictEqual(
    outcome.result.rows.map((r) => [r.label, r.delta, r.status]),
    [
      ["a", "0", "exact"],
      ["b", "0.5", "within"],
      ["c", "1", "within"],
      ["d", "1.001", "outside"],
    ],
  );
  equal(outcome.result.outsideCount, 1);
});

test("measurement order is preserved, not sorted by outside", () => {
  const outcome = run({
    tokens: "t\t0",
    measurements: "far\t100\nnear\t0\nmid\t50",
    tolerance: "1",
  });
  deepStrictEqual(
    outcome.result.rows.map((r) => r.label),
    ["far", "near", "mid"],
  );
});

test("canonical decimals: no trailing zeros, negative delta, 2048.000", () => {
  const outcome = run({
    tokens: "a\t8.000\nb\t2048.000",
    measurements: "x\t7.500\ny\t2048",
    tolerance: "0",
  });
  deepStrictEqual(outcome.result.rows, [
    { label: "x", px: "7.5", token: "a", tokenPx: "8", delta: "-0.5", status: "outside" },
    { label: "y", px: "2048", token: "b", tokenPx: "2048", delta: "0", status: "exact" },
  ]);
});

test("parsePxThousandths and formatThousandths round-trip", () => {
  const canonical = {
    "0": "0",
    "0.001": "0.001",
    "1.5": "1.5",
    "12.340": "12.34",
    "2048": "2048",
    "2048.000": "2048",
  };
  for (const [text, expected] of Object.entries(canonical)) {
    const value = parsePxThousandths(text);
    ok(value !== null, text);
    equal(formatThousandths(value), expected);
  }
  equal(parsePxThousandths("2048.001"), null);
  equal(parsePxThousandths("12.34"), 12340n);
  equal(formatThousandths(-1n), "-0.001");
  equal(formatThousandths(0n), "0");
});

test("serializeReport: sorted keys, compact, one trailing LF", () => {
  const result = {
    rows: [
      { label: "gap", px: "10", token: "small", tokenPx: "8", delta: "2", status: "within" },
    ],
    outsideCount: 1,
  };
  const serialized = serializeReport(result);
  equal(
    serialized.text,
    '{"outsideCount":1,"rows":[{"delta":"2","label":"gap","px":"10","status":"within","token":"small","tokenPx":"8"}]}\n',
  );
  equal(serialized.ok, true);
  // Escaping uses JSON literals; a quote in a label is escaped, not raw.
  const escaped = serializeReport({
    rows: [
      { label: 'a"b', px: "1", token: "t", tokenPx: "1", delta: "0", status: "exact" },
    ],
    outsideCount: 0,
  });
  ok(escaped.text.includes('\\"'));
});

test("serializeReport: OUTPUT_LIMIT for an oversized report", () => {
  const bigLabel = "x".repeat(REPORT_MAX_BYTES);
  deepStrictEqual(
    serializeReport({
      rows: [{ label: bigLabel, px: "1", token: "t", tokenPx: "1", delta: "0", status: "exact" }],
      outsideCount: 0,
    }),
    { ok: false, error: { code: "OUTPUT_LIMIT", field: null, row: null } },
  );
});

test("serializeReport: malformed result is SCHEMA", () => {
  deepStrictEqual(serializeReport(null), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
  deepStrictEqual(serializeReport({ rows: [], outsideCount: "0" }), {
    ok: false,
    error: { code: "SCHEMA", field: null, row: null },
  });
});
