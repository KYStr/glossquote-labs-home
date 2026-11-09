// Core tests for the WCAG Contrast Checker.
// Every expected value is taken literally from the REVISED specification
// (commit 1b732fbd92156360b0d6d63d2593359d9a85c34f, SPEC.md section 4 and
// section 7) and was re-derived independently of this implementation.
// Nothing here is generated from the implementation's own output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseColor, compositeOver, effectiveColors, relativeLuminance,
  contrastRatio, verdicts, toHex, formatRatio, suggest, THRESHOLDS,
} from '../public/js/core/color.mjs';

const round4 = (x) => Math.round(x * 10000) / 10000;
const near = (actual, expected, eps = 1e-9) => Math.abs(actual - expected) < eps;
const rgb = (hex) => parseColor(hex).color;
const opaque = (hex) => { const c = rgb(hex); return { r: c.r, g: c.g, b: c.b }; };
const ratioOf = (fgText, bgText) => {
  const eff = effectiveColors(rgb(fgText), rgb(bgText));
  return { eff, ratio: contrastRatio(eff.foreground, eff.background) };
};
const verdictMap = (ratio) => Object.fromEntries(verdicts(ratio).map((v) => [v.id, v.pass]));

// ---- SPEC section 4 fixtures 1-7 (ratios to 4 dp, displayed strings) ----

test('fixture 1: #000000 on #FFFFFF -> 21.00, all rows pass', () => {
  const { ratio } = ratioOf('#000000', '#FFFFFF');
  assert.equal(round4(ratio), 21);
  assert.equal(formatRatio(ratio), '21.00');
  assert.deepEqual(verdictMap(ratio), {
    aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true, nonText: true,
  });
});

test('fixture 2: #FFFFFF on #FFFFFF -> 1.00, all rows fail', () => {
  const { ratio } = ratioOf('#FFFFFF', '#FFFFFF');
  assert.equal(round4(ratio), 1);
  assert.equal(formatRatio(ratio), '1.00');
  assert.deepEqual(verdictMap(ratio), {
    aaNormal: false, aaLarge: false, aaaNormal: false, aaaLarge: false, nonText: false,
  });
});

test('fixture 3: #767676 on white -> 4.5422, displayed 4.54, AA normal passes', () => {
  const { eff, ratio } = ratioOf('#767676', '#FFFFFF');
  assert.ok(near(relativeLuminance(eff.foreground), 0.18116, 1e-5));
  assert.equal(round4(ratio), 4.5422);
  assert.equal(formatRatio(ratio), '4.54');
  assert.deepEqual(verdictMap(ratio), {
    aaNormal: true, aaLarge: true, aaaNormal: false, aaaLarge: true, nonText: true,
  });
});

test('fixture 4: #777777 on white -> 4.4781, displayed 4.48, AA normal fails, AA large passes', () => {
  const { ratio } = ratioOf('#777777', '#FFFFFF');
  assert.equal(round4(ratio), 4.4781);
  assert.equal(formatRatio(ratio), '4.48');
  assert.deepEqual(verdictMap(ratio), {
    aaNormal: false, aaLarge: true, aaaNormal: false, aaaLarge: false, nonText: true,
  });
});

test('fixture 5: #FF0000 on white -> 3.9985, displayed 4.00, AA normal fails on the unrounded value', () => {
  const { ratio } = ratioOf('#FF0000', '#FFFFFF');
  assert.equal(round4(ratio), 3.9985);
  assert.equal(formatRatio(ratio), '4.00');
  assert.deepEqual(verdictMap(ratio), {
    aaNormal: false, aaLarge: true, aaaNormal: false, aaaLarge: false, nonText: true,
  });
});

test('fixture 6: #0000FF on white -> 8.5925, displayed 8.59, AAA normal passes', () => {
  const { ratio } = ratioOf('#0000FF', '#FFFFFF');
  assert.equal(round4(ratio), 8.5925);
  assert.equal(formatRatio(ratio), '8.59');
  assert.equal(verdictMap(ratio).aaaNormal, true);
});

test('fixture 7: rgba(0,0,0,0.5) on white -> effective 127.5 shown #808080, ratio 3.9767 / 3.98', () => {
  const { eff, ratio } = ratioOf('rgba(0, 0, 0, 0.5)', '#FFFFFF');
  assert.deepEqual(eff.foreground, { r: 127.5, g: 127.5, b: 127.5 });
  assert.equal(toHex(eff.foreground), '#808080');
  assert.equal(round4(ratio), 3.9767);
  assert.equal(formatRatio(ratio), '3.98');
});

// ---- Fixture 8: suggestion search ----

test('fixture 8a: #777777 on white, target 4.5 toward black -> t=0.01 #767676 (4.5422)', () => {
  const eff = effectiveColors(rgb('#777777'), rgb('#FFFFFF'));
  const s = suggest(eff.foreground, eff.background, 4.5, 'black');
  assert.equal(s.state, 'found');
  assert.equal(s.t, 0.01);
  assert.equal(s.hex, '#767676');
  assert.equal(round4(s.ratio), 4.5422);
});

test('fixture 8b: #777777 on white, target 7.0 toward black -> t=0.25 #595959 (7.0047)', () => {
  const eff = effectiveColors(rgb('#777777'), rgb('#FFFFFF'));
  const s = suggest(eff.foreground, eff.background, 7.0, 'black');
  assert.equal(s.state, 'found');
  assert.equal(s.t, 0.25);
  assert.equal(s.hex, '#595959');
  assert.equal(round4(s.ratio), 7.0047);
});

test('suggestion: an already-passing foreground offers nothing', () => {
  const eff = effectiveColors(rgb('#000000'), rgb('#FFFFFF'));
  const s = suggest(eff.foreground, eff.background, 4.5, 'black');
  assert.equal(s.state, 'already');
  assert.equal(s.hex, undefined);
});

// ---- Fixture 9: alpha swap counterexample (raw-input symmetry is false) ----

test('fixture 9a: rgba(0,0,0,0.5) on #FF0000 -> 2.7495900453, displayed 2.75', () => {
  const { eff, ratio } = ratioOf('rgba(0, 0, 0, 0.5)', '#FF0000');
  assert.deepEqual(eff.foreground, { r: 127.5, g: 0, b: 0 });
  assert.deepEqual(eff.background, { r: 255, g: 0, b: 0 });
  assert.ok(near(ratio, 2.7495900453), `ratio was ${ratio}`);
  assert.equal(formatRatio(ratio), '2.75');
});

test('fixture 9b: raw inputs swapped -> 1.0054879683, displayed 1.01, a different ratio', () => {
  const { eff, ratio } = ratioOf('#FF0000', 'rgba(0, 0, 0, 0.5)');
  assert.deepEqual(eff.background, { r: 127.5, g: 127.5, b: 127.5 });
  assert.ok(near(ratio, 1.0054879683), `ratio was ${ratio}`);
  assert.equal(formatRatio(ratio), '1.01');
  const forward = ratioOf('rgba(0, 0, 0, 0.5)', '#FF0000').ratio;
  assert.notEqual(round4(ratio), round4(forward));
});

// ---- Fixture 10: selected direction fails, the other succeeds ----

test('fixture 10: #777777/white target 4.5 toward white -> state (ii), black named, no colour offered', () => {
  const eff = effectiveColors(rgb('#777777'), rgb('#FFFFFF'));
  const s = suggest(eff.foreground, eff.background, 4.5, 'white');
  assert.equal(s.state, 'other-direction');
  assert.equal(s.otherDirection, 'black');
  assert.equal(s.hex, undefined);
  // The toward-black fix the state refers to: t = 0.01, ratio 4.5422249596.
  const fix = suggest(eff.foreground, eff.background, 4.5, 'black');
  assert.equal(fix.state, 'found');
  assert.ok(near(fix.ratio, 4.5422249596));
});

// ---- Fixture 11: both directions fail (state iii is legitimate) ----

test('fixture 11: any foreground on #767676 at target 7.0 -> both walks exhausted, state none', () => {
  const bg = opaque('#767676');
  // Best reachable candidates, per SPEC: black 4.6233 and white 4.5422, both < 7.
  assert.equal(round4(contrastRatio({ r: 0, g: 0, b: 0 }, bg)), 4.6233);
  assert.equal(round4(contrastRatio({ r: 255, g: 255, b: 255 }, bg)), 4.5422);
  const eff = effectiveColors(rgb('#777777'), rgb('#767676'));
  for (const dir of ['black', 'white']) {
    const s = suggest(eff.foreground, eff.background, 7.0, dir);
    assert.equal(s.state, 'none');
    assert.equal(s.hex, undefined);
  }
});

// ---- Parser sweep (SPEC sections 2 and 4) ----

test('parser: accepted hex forms, case-insensitivity, optional #', () => {
  assert.deepEqual(rgb('#abc'), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(rgb('ABC'), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(rgb('#AABBCC'), { r: 170, g: 187, b: 204, a: 1 });
  assert.deepEqual(rgb('aabbcc'), { r: 170, g: 187, b: 204, a: 1 });
  const withAlpha = rgb('#FF000080');
  assert.deepEqual({ r: withAlpha.r, g: withAlpha.g, b: withAlpha.b }, { r: 255, g: 0, b: 0 });
  assert.ok(near(withAlpha.a, 128 / 255, 1e-12));
  assert.equal(rgb('#00000000').a, 0);
  assert.equal(rgb('#FFFFFFFF').a, 1);
});

test('parser: accepted rgb()/rgba() forms incl. leading-dot alpha and whitespace', () => {
  assert.deepEqual(rgb('rgb(1, 2, 3)'), { r: 1, g: 2, b: 3, a: 1 });
  assert.deepEqual(rgb('rgba(1,2,3,.5)'), { r: 1, g: 2, b: 3, a: 0.5 });
  assert.deepEqual(rgb('  rgba( 0 , 255 , 12 , 0.25 )  '), { r: 0, g: 255, b: 12, a: 0.25 });
  assert.deepEqual(rgb('rgb(0,0,0)'), { r: 0, g: 0, b: 0, a: 1 });
  assert.deepEqual(rgb('rgb(255,255,255)'), { r: 255, g: 255, b: 255, a: 1 });
});

test('parser: refusals name the problem (SPEC section 3)', () => {
  const e = (text) => parseColor(text).error;
  assert.deepEqual(e('#abcd'), { code: 'hex-length', expected: [3, 6, 8], actual: 4 });
  assert.deepEqual(e('#abcde'), { code: 'hex-length', expected: [3, 6, 8], actual: 5 });
  assert.deepEqual(e('#abcdef0'), { code: 'hex-length', expected: [3, 6, 8], actual: 7 });
  assert.equal(e('#gggggg').code, 'hex-digit');
  assert.deepEqual(e('rgb(256,0,0)'), { code: 'channel-range', channel: 'r', value: 256, min: 0, max: 255 });
  assert.deepEqual(e('rgb(0,-1,0)'), { code: 'channel-range', channel: 'g', value: -1, min: 0, max: 255 });
  assert.deepEqual(e('rgb(1.5,0,0)'), { code: 'channel-integer', channel: 'r', token: '1.5' });
  assert.equal(e('rgb(10%,0,0)').code, 'channel-percent');
  assert.deepEqual(e('rgba(0,0,0,1.5)'), { code: 'alpha-range', value: 1.5, min: 0, max: 1 });
  assert.equal(e('rgba(0,0,0,-0.5)').code, 'alpha-range');
  assert.equal(e('red').code, 'format');
  assert.equal(e('hsl(0, 0%, 0%)').code, 'format');
  assert.equal(e('').code, 'empty');
});

// ---- Compositing (SPEC sections 4 and 7c) ----

test('compositing: background alpha only - black on rgba(255,255,255,0.5) sees white', () => {
  const { eff, ratio } = ratioOf('#000000', 'rgba(255, 255, 255, 0.5)');
  assert.deepEqual(eff.background, { r: 255, g: 255, b: 255 });
  assert.equal(round4(ratio), 21);
});

test('compositing: both alpha - the pinned order decides the effective colours', () => {
  const { eff } = ratioOf('rgba(255, 0, 0, 0.5)', 'rgba(0, 0, 255, 0.5)');
  assert.deepEqual(eff.background, { r: 127.5, g: 127.5, b: 255 });
  assert.deepEqual(eff.foreground, { r: 191.25, g: 63.75, b: 127.5 });
  const direct = compositeOver({ r: 0, g: 0, b: 255, a: 0.5 }, { r: 255, g: 255, b: 255 });
  assert.deepEqual(direct, { r: 127.5, g: 127.5, b: 255 });
});

test('compositing: fully transparent foreground takes the background ratio, exactly 1.00', () => {
  const { ratio } = ratioOf('rgba(0, 0, 0, 0)', '#123456');
  assert.equal(ratio, 1);
  assert.equal(formatRatio(ratio), '1.00');
});

test('effective colours: ratio is symmetric in the EFFECTIVE colours', () => {
  const a = { r: 12.5, g: 200, b: 99 };
  const b = { r: 240, g: 30, b: 30 };
  assert.equal(contrastRatio(a, b), contrastRatio(b, a));
});

// ---- Rounding and unrounded verdicts (SPEC sections 4 and 7e) ----

test('rounding: display rounds half away from zero at a constructed x.xx5 case', () => {
  assert.equal(formatRatio(4.545), '4.55');
  assert.equal(formatRatio(1.005), '1.01');
  assert.equal(formatRatio(2.7495900453), '2.75');
  assert.equal(formatRatio(1.0054879683), '1.01');
});

test('verdicts: a pair displaying 4.50 with unrounded ratio below 4.5 FAILS AA normal', () => {
  // #008580 on white: unrounded ratio 4.4999542714 (independently derived),
  // which displays as 4.50 yet is below the AA normal threshold.
  const { ratio } = ratioOf('#008580', '#FFFFFF');
  assert.ok(ratio >= 4.495 && ratio < 4.5, `ratio was ${ratio}`);
  assert.equal(formatRatio(ratio), '4.50');
  assert.equal(verdictMap(ratio).aaNormal, false);
});

test('threshold table matches SPEC section 4 exactly', () => {
  assert.deepEqual(THRESHOLDS, [
    { id: 'aaNormal', value: 4.5 },
    { id: 'aaLarge', value: 3.0 },
    { id: 'aaaNormal', value: 7.0 },
    { id: 'aaaLarge', value: 4.5 },
    { id: 'nonText', value: 3.0 },
  ]);
});
