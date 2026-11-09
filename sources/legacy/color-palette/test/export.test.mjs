import assert from "node:assert/strict";
import test from "node:test";
import { exportCss, exportPairCss, pairCssForState } from "../public/js/core/export.mjs";
import { createPalette, reducePalette } from "../public/js/core/palette.mjs";
import { contrastRatio, evaluateContrast } from "../public/js/core/contrast.mjs";

test("CP-14: initial palette export exactly matches fixed CSS bytes", () => {
  const actual = exportCss([
    { r: 17, g: 20, b: 16 },
    { r: 243, g: 240, b: 232 },
  ]);
  const expected = ":root {\n  --color-1: #111410;\n  --color-2: #F3F0E8;\n}\n";
  assert.equal(actual, expected);
  assert.deepStrictEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"));
  assert.equal(actual.endsWith("\n"), true);
  assert.equal(actual.includes("\r"), false);
  assert.equal(actual.charCodeAt(0), 0x3a);
});

test("export uses sequential variable names and fixed uppercase HEX for two through eight colors", () => {
  const colors = Array.from({ length: 8 }, (_, index) => ({ r: index, g: 16, b: 255 }));
  const css = exportCss(colors);
  assert.match(css, /--color-1: #0010FF;/);
  assert.match(css, /--color-8: #0710FF;/);
  assert.equal((css.match(/--color-/g) ?? []).length, 8);
  assert.equal(css.endsWith("}\n"), true);
  assert.throws(() => exportCss(colors.slice(0, 1)), RangeError);
});

test("export rejects malformed arrays and non-exact or invalid RGB records", () => {
  const valid = { r: 1, g: 2, b: 3 };
  for (const invalid of [
    null,
    {},
    [],
    [valid],
    Array.from({ length: 9 }, () => valid),
    [valid, { r: 1, g: 2 }],
    [valid, { r: 1, g: 2, b: 3, id: "c1" }],
    [valid, { r: "1", g: 2, b: 3 }],
    [valid, { r: -1, g: 2, b: 3 }],
  ]) {
    assert.throws(() => exportCss(invalid), RangeError);
  }

  const extraArrayProperty = [valid, { r: 4, g: 5, b: 6 }];
  extraArrayProperty.custom = "ignored data must still be rejected";
  assert.throws(() => exportCss(extraArrayProperty), RangeError);

  const sparse = [valid, { r: 4, g: 5, b: 6 }];
  delete sparse[0];
  assert.throws(() => exportCss(sparse), RangeError);

  const revoked = Proxy.revocable({ r: 4, g: 5, b: 6 }, {});
  revoked.revoke();
  assert.throws(() => exportCss([valid, revoked.proxy]), RangeError);
});

test("export reads frozen input without changing it", () => {
  const first = Object.freeze({ r: 1, g: 2, b: 3 });
  const second = Object.freeze({ r: 4, g: 5, b: 6 });
  const colors = Object.freeze([first, second]);
  const before = JSON.stringify(colors);
  exportCss(colors);
  assert.equal(JSON.stringify(colors), before);
});

function applyPairAction(state, action) {
  const result = reducePalette(state, action);
  assert.equal(result.ok, true);
  return result.value;
}

const INITIAL_PAIR = ".color-pair {\n  color: #111410;\n  background-color: #F3F0E8;\n}\n";

test("U10-01/12: pair bytes are fixed and the palette export remains unchanged", () => {
  const state = createPalette();
  assert.equal(pairCssForState(state), INITIAL_PAIR);
  assert.deepEqual(Buffer.from(pairCssForState(state)), Buffer.from(INITIAL_PAIR));
  assert.equal(INITIAL_PAIR.includes("\r"), false);
  assert.equal(INITIAL_PAIR.endsWith("\n"), true);
  assert.equal(exportCss(state.colors.map(({ r, g, b }) => ({ r, g, b }))),
    ":root {\n  --color-1: #111410;\n  --color-2: #F3F0E8;\n}\n");
});

test("U10-02: declarations follow roles after swap without changing palette order", () => {
  let state = createPalette();
  for (const [id, hex] of [["c1", "#000000"], ["c2", "#FFFFFF"]]) {
    state = applyPairAction(state, { type: "update", id, operation: "draft", fields: { hex } });
    state = applyPairAction(state, { type: "update", id, operation: "commit" });
  }
  const before = state.colors;
  assert.equal(pairCssForState(state), ".color-pair {\n  color: #000000;\n  background-color: #FFFFFF;\n}\n");
  state = applyPairAction(state, { type: "swap" });
  assert.deepEqual(state.colors, before);
  assert.equal(pairCssForState(state), ".color-pair {\n  color: #FFFFFF;\n  background-color: #000000;\n}\n");
  assert.equal(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }), 21);
});

test("U10-03/04: either endpoint blocks snapshots for legal dirty and invalid drafts until commit", () => {
  for (const id of ["c1", "c2"]) {
    let state = createPalette();
    state = applyPairAction(state, { type: "update", id, operation: "draft", fields: { hex: "#767676" } });
    assert.equal(state.drafts[id].error, null);
    assert.equal(state.drafts[id].dirty, true);
    assert.equal(pairCssForState(state), null);
    state = applyPairAction(state, { type: "update", id, operation: "draft", fields: { hex: "#zz" } });
    assert.equal(state.drafts[id].error, "COLOR_INVALID");
    assert.equal(pairCssForState(state), null);
    state = applyPairAction(state, { type: "update", id, operation: "commit" });
    assert.equal(pairCssForState(state), null);
    state = applyPairAction(state, { type: "update", id, operation: "draft", fields: { hex: "#a3f" } });
    assert.equal(pairCssForState(state), null);
    state = applyPairAction(state, { type: "update", id, operation: "commit" });
    assert.match(pairCssForState(state), id === "c1" ? /  color: #AA33FF;/u : /  background-color: #AA33FF;/u);
  }
});

test("U10-05: a third draft does not block committed pair until it becomes an endpoint", () => {
  let state = applyPairAction(createPalette(), { type: "add" });
  state = applyPairAction(state, { type: "update", id: "c3", operation: "draft", fields: { hex: "#123456" } });
  assert.equal(state.drafts.c3.dirty, true);
  assert.equal(pairCssForState(state), INITIAL_PAIR);
  state = applyPairAction(state, { type: "select-pair", selectedId: "c3", foregroundId: "c3", backgroundId: "c2" });
  assert.equal(pairCssForState(state), null);
});

test("U10-06: pair identity survives ordering; deletion and reset use current reducer roles", () => {
  let state = applyPairAction(createPalette(), { type: "add" });
  state = applyPairAction(state, { type: "select-pair", selectedId: "c3", foregroundId: "c2", backgroundId: "c3" });
  const secondThird = ".color-pair {\n  color: #F3F0E8;\n  background-color: #FFFFFF;\n}\n";
  assert.equal(pairCssForState(state), secondThird);
  state = applyPairAction(state, { type: "move", id: "c3", direction: "previous" });
  assert.deepEqual(state.colors.map(({ id }) => id), ["c1", "c3", "c2"]);
  assert.equal(pairCssForState(state), secondThird);
  state = applyPairAction(state, { type: "remove", id: "c3" });
  assert.equal(state.foregroundId, "c1");
  assert.equal(state.backgroundId, "c2");
  assert.equal(pairCssForState(state), INITIAL_PAIR);
  state = applyPairAction(state, { type: "reset" });
  assert.notEqual(state.foregroundId, "c1");
  assert.equal(pairCssForState(state), INITIAL_PAIR);
});

test("U10-07: same and low-contrast colors remain exportable without altering failing thresholds", () => {
  const same = { r: 18, g: 52, b: 86 };
  assert.equal(exportPairCss(same, same), ".color-pair {\n  color: #123456;\n  background-color: #123456;\n}\n");
  assert.deepEqual(evaluateContrast(contrastRatio(same, same)),
    { normalAA: false, normalAAA: false, largeAA: false, largeAAA: false });
  const grey = { r: 119, g: 119, b: 119 };
  const white = { r: 255, g: 255, b: 255 };
  assert.equal(exportPairCss(grey, white), ".color-pair {\n  color: #777777;\n  background-color: #FFFFFF;\n}\n");
  const ratio = contrastRatio(grey, white);
  assert.ok(Math.abs(ratio - 4.478089453577214) < 1e-12);
  assert.deepEqual(evaluateContrast(ratio),
    { normalAA: false, normalAAA: false, largeAA: true, largeAAA: false });
  let state = createPalette();
  state = applyPairAction(state, { type: "select-pair", selectedId: "c1", foregroundId: "c1", backgroundId: "c1" });
  assert.equal(pairCssForState(state), ".color-pair {\n  color: #111410;\n  background-color: #111410;\n}\n");
});

test("U10-10: both pair operands reject malformed records without invoking getters", () => {
  let getterCalls = 0;
  const getter = { get r() { getterCalls++; return 1; }, g: 2, b: 3 };
  const revoked = Proxy.revocable({ r: 1, g: 2, b: 3 }, {});
  revoked.revoke();
  const good = Object.freeze({ r: 1, g: 2, b: 3 });
  for (const bad of [null, {}, [], { r: "1", g: 2, b: 3 }, { r: 256, g: 2, b: 3 },
    { r: 1, g: 2, b: 3, id: "c1" }, getter, revoked.proxy]) {
    assert.throws(() => exportPairCss(bad, good), RangeError);
    assert.throws(() => exportPairCss(good, bad), RangeError);
  }
  assert.equal(getterCalls, 0);
  assert.equal(exportPairCss(good, good), ".color-pair {\n  color: #010203;\n  background-color: #010203;\n}\n");
});

test("pair snapshot fails closed on missing endpoints or formatter rejection", () => {
  const state = createPalette();
  assert.equal(pairCssForState({ ...state, foregroundId: "missing" }), null);
  assert.equal(pairCssForState({ ...state, drafts: {} }), null);
  assert.equal(pairCssForState({ ...state, colors: [{ ...state.colors[0], r: 256 }, state.colors[1]] }), null);
  assert.equal(pairCssForState(null), null);
});
