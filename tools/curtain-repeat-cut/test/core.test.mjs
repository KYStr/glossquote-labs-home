import test from "node:test";
import assert from "node:assert/strict";
import { solve, solveJson, INPUT_BYTES_MAX } from "../public/js/core/curtain-repeat-cut.mjs";

// All literal cases below are transcribed from docs/specs/curtain-repeat-cut/fixtures.json
// and re-derived by hand from the SPEC's own rules (never from the implementation).

const MATCHED = {
  stockMm: 4000, repeatMm: 320, headPhaseMm: 80, motifPhaseMm: 0,
  panels: [
    { name: "A", finishedMm: 1500, topMm: 50, bottomMm: 70 },
    { name: "B", finishedMm: 1500, topMm: 50, bottomMm: 70 },
  ],
};

test("fixture matched: two panels share motif phase 0", () => {
  assert.deepStrictEqual(solve(MATCHED), {
    status: "ok",
    result: {
      cuts: [
        { name: "A", skipMm: 190, startMm: 190, endMm: 1810 },
        { name: "B", skipMm: 300, startMm: 2110, endMm: 3730 },
      ],
      neededMm: 3730, wasteMm: 490, spareMm: 270, shortageMm: 0,
    },
  });
  // Visible-top phase invariant, checked independently of the skip rule:
  // phase(position) = (headPhaseMm + position) mod repeatMm must equal motifPhaseMm.
  const out = solve(MATCHED).result;
  for (const cut of out.cuts) {
    const panel = MATCHED.panels.find((p) => p.name === cut.name);
    assert.equal((MATCHED.headPhaseMm + cut.startMm + panel.topMm) % MATCHED.repeatMm, 0);
  }
  // Cut intervals do not overlap and are in order.
  assert.ok(out.cuts[0].endMm <= out.cuts[1].startMm);
});

test("fixture plain: repeat 0 means no skips", () => {
  assert.deepStrictEqual(solve({
    stockMm: 1800, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 0,
    panels: [
      { name: "A", finishedMm: 800, topMm: 50, bottomMm: 50 },
      { name: "B", finishedMm: 700, topMm: 20, bottomMm: 30 },
    ],
  }), {
    status: "ok",
    result: {
      cuts: [
        { name: "A", skipMm: 0, startMm: 0, endMm: 900 },
        { name: "B", skipMm: 0, startMm: 900, endMm: 1650 },
      ],
      neededMm: 1650, wasteMm: 0, spareMm: 150, shortageMm: 0,
    },
  });
});

test("fixture exact-stock: second panel needs no skip, spare and shortage both 0", () => {
  assert.deepStrictEqual(solve({
    stockMm: 2100, repeatMm: 500, headPhaseMm: 100, motifPhaseMm: 0,
    panels: [
      { name: "A", finishedMm: 800, topMm: 100, bottomMm: 100 },
      { name: "B", finishedMm: 600, topMm: 100, bottomMm: 100 },
    ],
  }), {
    status: "ok",
    result: {
      cuts: [
        { name: "A", skipMm: 300, startMm: 300, endMm: 1300 },
        { name: "B", skipMm: 0, startMm: 1300, endMm: 2100 },
      ],
      neededMm: 2100, wasteMm: 300, spareMm: 0, shortageMm: 0,
    },
  });
});

test("fixture short: shortage of 1 mm, spare 0", () => {
  assert.deepStrictEqual(solve({
    stockMm: 899, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 0,
    panels: [{ name: "A", finishedMm: 800, topMm: 50, bottomMm: 50 }],
  }), {
    status: "ok",
    result: {
      cuts: [{ name: "A", skipMm: 0, startMm: 0, endMm: 900 }],
      neededMm: 900, wasteMm: 0, spareMm: 0, shortageMm: 1,
    },
  });
});

test("fixture phase-edge: motif phase 300 equals the repeat, so it is the next cycle's 0", () => {
  assert.deepStrictEqual(solve({
    stockMm: 1000, repeatMm: 300, headPhaseMm: 0, motifPhaseMm: 300,
    panels: [{ name: "A", finishedMm: 100, topMm: 0, bottomMm: 0 }],
  }), { status: "error", error: { code: "PHASE", path: "/motifPhaseMm" } });
});

test("fixture zero-repeat-phase: plain cloth forces both phases to 0", () => {
  assert.deepStrictEqual(solve({
    stockMm: 1000, repeatMm: 0, headPhaseMm: 1, motifPhaseMm: 0,
    panels: [{ name: "A", finishedMm: 100, topMm: 0, bottomMm: 0 }],
  }), { status: "error", error: { code: "PHASE", path: "/headPhaseMm" } });
});

test("hand-derived three-panel case: every visible top lands on motif phase 200", () => {
  const input = {
    stockMm: 2000, repeatMm: 250, headPhaseMm: 30, motifPhaseMm: 200,
    panels: [
      { name: "P1", finishedMm: 400, topMm: 10, bottomMm: 20 },
      { name: "P2", finishedMm: 300, topMm: 0, bottomMm: 10 },
      { name: "P3", finishedMm: 100, topMm: 5, bottomMm: 5 },
    ],
  };
  // skips by hand: (200-30-0-10)=160; (200-30-590-0)=-420 mod 250=80;
  // (200-30-980-5)=-815 mod 250=185.
  assert.deepStrictEqual(solve(input), {
    status: "ok",
    result: {
      cuts: [
        { name: "P1", skipMm: 160, startMm: 160, endMm: 590 },
        { name: "P2", skipMm: 80, startMm: 670, endMm: 980 },
        { name: "P3", skipMm: 185, startMm: 1165, endMm: 1275 },
      ],
      neededMm: 1275, wasteMm: 425, spareMm: 725, shortageMm: 0,
    },
  });
});

test("skip boundaries: repeat-1 skip and zero skip", () => {
  const max = solve({
    stockMm: 1000, repeatMm: 100, headPhaseMm: 0, motifPhaseMm: 99,
    panels: [{ name: "A", finishedMm: 10, topMm: 0, bottomMm: 0 }],
  });
  assert.deepStrictEqual(max.result.cuts[0], { name: "A", skipMm: 99, startMm: 99, endMm: 109 });
  const zero = solve({
    stockMm: 1000, repeatMm: 100, headPhaseMm: 20, motifPhaseMm: 20,
    panels: [{ name: "A", finishedMm: 10, topMm: 0, bottomMm: 0 }],
  });
  assert.equal(zero.result.cuts[0].skipMm, 0);
});

test("16 panels is the maximum and still solves in one linear scan", () => {
  const panels = Array.from({ length: 16 }, (_, i) => ({
    name: `P${i + 1}`, finishedMm: 100, topMm: 0, bottomMm: 0,
  }));
  const out = solve({ stockMm: 100000, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 0, panels });
  assert.equal(out.status, "ok");
  assert.equal(out.result.cuts.length, 16);
  assert.equal(out.result.neededMm, 1600);
  for (let i = 1; i < 16; i += 1) {
    assert.equal(out.result.cuts[i].startMm, out.result.cuts[i - 1].endMm);
  }
});

test("input size cap: exactly 65536 bytes is accepted, one more is SIZE at the root", () => {
  const base = JSON.stringify(MATCHED);
  const padLen = INPUT_BYTES_MAX - Buffer.byteLength(base, "utf8");
  assert.ok(padLen > 0);
  // Whitespace between JSON tokens is legal, so padding after "{" keeps the same data.
  const exact = `{${" ".repeat(padLen)}${base.slice(1)}`;
  assert.equal(Buffer.byteLength(exact, "utf8"), INPUT_BYTES_MAX);
  assert.equal(solveJson(exact).status, "ok");
  const over = `{${" ".repeat(padLen + 1)}${base.slice(1)}`;
  assert.equal(Buffer.byteLength(over, "utf8"), INPUT_BYTES_MAX + 1);
  assert.deepStrictEqual(solveJson(over), { status: "error", error: { code: "SIZE", path: "" } });
});

test("JSON syntax error is SYNTAX at the root", () => {
  assert.deepStrictEqual(solveJson("{not json"), { status: "error", error: { code: "SYNTAX", path: "" } });
  assert.deepStrictEqual(solveJson(""), { status: "error", error: { code: "SYNTAX", path: "" } });
});

test("shape: unknown root key reports that key's path; missing key reports the known key's path", () => {
  const { stockMm, ...rest } = MATCHED;
  assert.deepStrictEqual(solve({ ...MATCHED, extra: 1 }), { status: "error", error: { code: "SHAPE", path: "/extra" } });
  assert.deepStrictEqual(solve(rest), { status: "error", error: { code: "SHAPE", path: "/stockMm" } });
  assert.deepStrictEqual(solve(null), { status: "error", error: { code: "SHAPE", path: "" } });
  assert.deepStrictEqual(solve([MATCHED]), { status: "error", error: { code: "SHAPE", path: "" } });
});

test("shape: unknown and missing panel keys report the panel's fixed path", () => {
  const bad = { ...MATCHED, panels: [{ name: "A", finishedMm: 100, topMm: 0, bottomMm: 0, seam: 5 }] };
  assert.deepStrictEqual(solve(bad), { status: "error", error: { code: "SHAPE", path: "/panels/0/seam" } });
  const missing = { ...MATCHED, panels: [{ name: "A", finishedMm: 100, topMm: 0 }] };
  assert.deepStrictEqual(solve(missing), { status: "error", error: { code: "SHAPE", path: "/panels/0/bottomMm" } });
});

test("type and range: string numbers, fractions, -0 and out-of-range values", () => {
  assert.deepStrictEqual(solve({ ...MATCHED, stockMm: "4000" }), { status: "error", error: { code: "TYPE", path: "/stockMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, stockMm: 1.5 }), { status: "error", error: { code: "TYPE", path: "/stockMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, stockMm: -0 }), { status: "error", error: { code: "TYPE", path: "/stockMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, stockMm: 0 }), { status: "error", error: { code: "RANGE", path: "/stockMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, stockMm: 100001 }), { status: "error", error: { code: "RANGE", path: "/stockMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, repeatMm: 5001 }), { status: "error", error: { code: "RANGE", path: "/repeatMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, headPhaseMm: 5000 }), { status: "error", error: { code: "RANGE", path: "/headPhaseMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, panels: [] }), { status: "error", error: { code: "RANGE", path: "/panels" } });
  const seventeen = Array.from({ length: 17 }, (_, i) => ({ name: `P${i}`, finishedMm: 10, topMm: 0, bottomMm: 0 }));
  assert.deepStrictEqual(solve({ ...MATCHED, panels: seventeen }), { status: "error", error: { code: "RANGE", path: "/panels" } });
  assert.deepStrictEqual(
    solve({ ...MATCHED, panels: [{ name: "A", finishedMm: 8001, topMm: 0, bottomMm: 0 }] }),
    { status: "error", error: { code: "RANGE", path: "/panels/0/finishedMm" } },
  );
  assert.deepStrictEqual(
    solve({ ...MATCHED, panels: [{ name: "A", finishedMm: 10, topMm: 1001, bottomMm: 0 }] }),
    { status: "error", error: { code: "RANGE", path: "/panels/0/topMm" } },
  );
});

test("phase order: head phase is checked before motif phase", () => {
  assert.deepStrictEqual(solve({ ...MATCHED, repeatMm: 100, headPhaseMm: 100, motifPhaseMm: 100 }), { status: "error", error: { code: "PHASE", path: "/headPhaseMm" } });
  assert.deepStrictEqual(solve({ ...MATCHED, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 5 }), { status: "error", error: { code: "PHASE", path: "/motifPhaseMm" } });
});

test("names: empty, bad characters and over-long names are refused; NFC duplicates point at the second name", () => {
  const withName = (name) => ({ ...MATCHED, panels: [{ name, finishedMm: 100, topMm: 0, bottomMm: 0 }] });
  assert.deepStrictEqual(solve(withName("   ")), { status: "error", error: { code: "TYPE", path: "/panels/0/name" } });
  assert.deepStrictEqual(solve(withName("A/B")), { status: "error", error: { code: "TYPE", path: "/panels/0/name" } });
  assert.deepStrictEqual(solve(withName("-A")), { status: "error", error: { code: "TYPE", path: "/panels/0/name" } });
  assert.deepStrictEqual(solve(withName("A".repeat(25))), { status: "error", error: { code: "RANGE", path: "/panels/0/name" } });
  assert.deepStrictEqual(solve(withName(12)), { status: "error", error: { code: "TYPE", path: "/panels/0/name" } });
  // "e" + combining acute (U+0301) normalises to the same NFC name as precomposed é (U+00E9).
  const dup = {
    ...MATCHED,
    panels: [
      { name: "e\u0301", finishedMm: 100, topMm: 0, bottomMm: 0 },
      { name: "\u00e9", finishedMm: 100, topMm: 0, bottomMm: 0 },
    ],
  };
  assert.deepStrictEqual(solve(dup), { status: "error", error: { code: "DUPLICATE", path: "/panels/1/name" } });
  // Leading/trailing U+0020 spaces are trimmed, so " A " is the valid name "A".
  const trimmed = solve(withName(" A "));
  assert.equal(trimmed.status, "ok");
  assert.equal(trimmed.result.cuts[0].name, "A");
});

test("names: markup in a name is kept as plain text, never interpreted", () => {
  const out = solve({ ...MATCHED, panels: [{ name: "<b>A", finishedMm: 100, topMm: 0, bottomMm: 0 }] });
  // "<" is not an allowed name character, so the name is refused rather than rendered.
  assert.deepStrictEqual(out, { status: "error", error: { code: "TYPE", path: "/panels/0/name" } });
});

test("validation order: shape beats field types, field types beat cross-field phases", () => {
  assert.deepStrictEqual(
    solve({ ...MATCHED, extra: 1, stockMm: "x" }),
    { status: "error", error: { code: "SHAPE", path: "/extra" } },
  );
  assert.deepStrictEqual(
    solve({ ...MATCHED, stockMm: "x", repeatMm: 0, headPhaseMm: 1 }),
    { status: "error", error: { code: "TYPE", path: "/stockMm" } },
  );
});
