// Core tests (SPEC §4/§7): every expectation is a hard-coded literal derived
// from the specification text, never from the parser under test or a browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareSelectors, formatSummary } from '../src/assets/core.mjs';

function ok(l, r) {
  const res = compareSelectors({ left: l, right: r === undefined ? 'div' : r });
  assert.equal(res.ok, true, 'expected ok for ' + JSON.stringify(l) + ' :: ' + JSON.stringify(res));
  return res;
}
function err(l, code, offset) {
  const res = compareSelectors({ left: l, right: 'div' });
  assert.equal(res.ok, false, 'expected error for ' + JSON.stringify(l));
  assert.deepEqual([res.errors[0].field, res.errors[0].code, res.errors[0].offset], ['left', code, offset],
    'for ' + JSON.stringify(l) + ' :: ' + JSON.stringify(res.errors));
}

test('S01-S18 author fixtures: exact triples', () => {
  const cases = [
    ['#card .title', [1, 1, 0]],
    ['*', [0, 0, 0]],
    ['.a.b.c.d.e.f.g.h.i.j.k', [0, 11, 0]],
    ['ul > li.active + li[hidden]', [0, 2, 3]],
    [':is(.a,#b,div)', [1, 0, 0]],
    [':not(.a.b,div#x)', [1, 0, 1]],
    [':where(#a.b div)::before', [0, 0, 1]],
    ['section:is(.a,:where(#x))', [0, 1, 1]],
    [':where(:is(#x,.a)) .b', [0, 1, 0]],
    ['.a:hover::after', [0, 2, 1]],
    ['div#x#y.a.a[hidden]:focus', [2, 4, 1]],
    ['.a div', [0, 1, 1]],
    [':is(#x,#y)#z', [2, 0, 0]],
    [':NOT(:is(.a,div),#x)', [1, 0, 0]],
    [':is(:not(:where(:is(.a))))', [0, 0, 0]],
    [':is(.a,.b,.c,.d,.e,.f,.g,.h)', [0, 1, 0]],
    ['\t div\n>\r.a \f', [0, 1, 1]],
    ['*::first-letter', [0, 0, 1]],
  ];
  for (const [input, triple] of cases) {
    assert.deepEqual(ok(input).left.specificity, triple, input);
  }
});

test('comparisons and firstDifference', () => {
  let r = ok('#card .title', '.card h2.title');
  assert.deepEqual([r.comparison, r.firstDifference], ['left', 'A']);
  r = ok('*', 'div');
  assert.deepEqual([r.comparison, r.firstDifference], ['right', 'C']);
  r = ok('.a.b.c.d.e.f.g.h.i.j.k', '#x');
  assert.deepEqual([r.comparison, r.firstDifference], ['right', 'A']);
  r = ok('.a div', 'span.b');
  assert.deepEqual([r.comparison, r.firstDifference], ['equal', null]);
  r = ok('div', 'div');
  assert.equal(r.left === r.right, false, 'identical text still yields two distinct analyses');
  assert.equal(r.comparison, 'equal');
});

test('summary template is exact and language-invariant', () => {
  const r = ok('#card .title', '.card h2.title');
  assert.equal(formatSummary(r), 'L: (1,1,0)\nR: (0,2,1)\ncomparison: left\nfirstDifference: A');
  const e = ok('.a div', 'span.b');
  assert.equal(formatSummary(e), 'L: (0,1,1)\nR: (0,1,1)\ncomparison: equal\nfirstDifference: none');
  assert.equal(formatSummary({ ok: false, errors: [] }), null);
});

test('tree spans: S01, S05, S07, S17 literals', () => {
  const s01 = ok('#card .title').left.tree;
  assert.deepEqual([s01.start, s01.end], [0, 12]);
  assert.deepEqual(s01.children.map((c) => [c.start, c.end]), [[0, 5], [6, 12]]);
  assert.deepEqual(
    [s01.children[0].children[0].kind, s01.children[0].children[0].start, s01.children[0].children[0].end],
    ['id', 0, 5]);
  const fn = ok(':is(.a,#b,div)').left.tree.children[0].children[0];
  assert.deepEqual([fn.kind, fn.start, fn.end], ['is', 0, 14]);
  assert.deepEqual(fn.children.map((b) => [b.start, b.end]), [[4, 6], [7, 9], [10, 13]]);
  assert.deepEqual(fn.specificity, [1, 0, 0]);
  const comp7 = ok(':where(#a.b div)::before').left.tree.children[0];
  assert.deepEqual([comp7.children[0].start, comp7.children[0].end], [0, 16]);
  assert.deepEqual(comp7.children[0].specificity, [0, 0, 0], 'where node contributes zero');
  assert.deepEqual(comp7.children[0].children[0].specificity, [1, 1, 1], 'where children keep their own scores');
  assert.deepEqual([comp7.children[1].start, comp7.children[1].end], [16, 24]);
  const s17 = ok('\t div\n>\r.a \f').left.tree;
  assert.deepEqual([s17.start, s17.end], [2, 10], 'root excludes outer whitespace');
});

test('error catalogue: exact code and offset for every SPEC example', () => {
  err('', 'EMPTY', 0);
  err('   ', 'EMPTY', 0);
  err(' div/', 'UNSUPPORTED_CHAR', 4);
  err('.1x', 'SYNTAX', 1);
  err('div,span', 'UNSUPPORTED_CONTEXT', 3);
  err(':foo', 'UNSUPPORTED_NAME', 0);
  err(':is (.a)', 'SYNTAX', 3);
  err(':is(.a,)', 'SYNTAX', 7);
  err(':is()', 'SYNTAX', 4);
  err('[a', 'SYNTAX', 2);
  err('div >', 'SYNTAX', 5);
  err('div*', 'SYNTAX', 3);
  err('::before', 'UNSUPPORTED_CONTEXT', 0);
  err('.a::before:hover', 'UNSUPPORTED_CONTEXT', 10);
  err(':not(*::before)', 'UNSUPPORTED_CONTEXT', 6);
  err(':is(:is(:is(:is(:is(.a)))))', 'DEPTH', 16);
  err(':is(.a,.b,.c,.d,.e,.f,.g,.h,.i)', 'BRANCH_LIMIT', 27);
  err('div > > span', 'SYNTAX', 6);
  err(':is(.a,/bad)', 'UNSUPPORTED_CHAR', 7);
  err(':before', 'UNSUPPORTED_NAME', 0);
  err(':hover(.a)', 'UNSUPPORTED_NAME', 0);
  err('::foo', 'UNSUPPORTED_NAME', 0);
  err('.a::before > .b', 'UNSUPPORTED_CONTEXT', 11);
  err('div ::before', 'UNSUPPORTED_CONTEXT', 4);
  err(':is(.a', 'SYNTAX', 6);
  err('\\\\div', 'UNSUPPORTED_CHAR', 0);
  err('div)', 'SYNTAX', 3);
  err('> div', 'SYNTAX', 0);
  err('[1a]', 'SYNTAX', 1);
  err('[]', 'SYNTAX', 1);
});

test('character scan precedes structural parsing', () => {
  // '/bad' contains an earlier structural problem (trailing comma) but the
  // unsupported slash is reported because the raw scan runs first.
  err(':is(.a,/bad)', 'UNSUPPORTED_CHAR', 7);
  err('div=', 'UNSUPPORTED_CHAR', 3);
  err('div { }', 'UNSUPPORTED_CHAR', 4);
  err('.a\\', 'UNSUPPORTED_CHAR', 2);
});

test('length: 1024 accepted, 1025 LENGTH, left checked first, scan order', () => {
  const maxClass = '.' + 'a'.repeat(1023);
  assert.deepEqual(ok(maxClass).left.specificity, [0, 1, 0]);
  err('a'.repeat(1025), 'LENGTH', 1024);
  err('/'.repeat(1025), 'LENGTH', 1024); // LENGTH wins over the char scan
  const both = compareSelectors({ left: '/'.repeat(1025), right: 'x'.repeat(2000) });
  assert.deepEqual([both.errors[0].field, both.errors[0].code], ['left', 'LENGTH']);
  const rightOnly = compareSelectors({ left: 'div', right: 'x'.repeat(1025) });
  assert.deepEqual([rightOnly.errors[0].field, rightOnly.errors[0].code], ['right', 'LENGTH']);
});

test('both fields analyzed; at most one error per field', () => {
  const res = compareSelectors({ left: ':foo', right: '.1x' });
  assert.equal(res.ok, false);
  assert.deepEqual(res.errors.map((e) => [e.field, e.code]), [['left', 'UNSUPPORTED_NAME'], ['right', 'SYNTAX']]);
  const res2 = compareSelectors({ left: 'div', right: 'span' });
  assert.equal(res2.ok, true);
});

test('schema defenses: shape, prototypes, symbols, accessors never invoked', () => {
  const schema = { field: null, code: 'SCHEMA', offset: null };
  assert.deepEqual(compareSelectors([]).errors, [schema]);
  assert.deepEqual(compareSelectors(null).errors, [schema]);
  assert.deepEqual(compareSelectors('div').errors, [schema]);
  assert.deepEqual(compareSelectors({ left: 'a', right: 'b', x: 1 }).errors, [schema]);
  assert.deepEqual(compareSelectors({ left: 'a' }).errors, [schema]);
  assert.deepEqual(compareSelectors({ left: 1, right: 'b' }).errors, [schema]);
  assert.deepEqual(compareSelectors(Object.create({ left: 'a', right: 'b' })).errors, [schema]);
  const sym = { left: 'a', right: 'b' };
  sym[Symbol('s')] = 1;
  assert.deepEqual(compareSelectors(sym).errors, [schema]);
  let invoked = false;
  const rec = { right: 'div' };
  Object.defineProperty(rec, 'left', {
    enumerable: true,
    get() { invoked = true; return 'div'; },
  });
  assert.deepEqual(compareSelectors(rec).errors, [schema]);
  assert.equal(invoked, false, 'getter must never be invoked');
  const nullProto = Object.create(null);
  nullProto.left = 'div';
  nullProto.right = 'div';
  assert.equal(compareSelectors(nullProto).ok, true, 'null-prototype record is admissible');
});

test('case rules: pseudo names fold, identifiers keep case', () => {
  assert.deepEqual(ok(':HOVER').left.specificity, [0, 1, 0]);
  assert.deepEqual(ok(':FoCuS-ViSiBlE').left.specificity, [0, 1, 0]);
  assert.deepEqual(ok('DIV.A').left.specificity, [0, 1, 1]);
  const fn = ok(':NOT(.a)').left.tree.children[0].children[0];
  assert.equal(fn.kind, 'not', 'AST kind uses the normalized lowercase name');
});

test('lexicographic, not componentwise; ties never multiply', () => {
  assert.deepEqual(ok(':is(.a.b,#x)').left.specificity, [1, 0, 0]);
  assert.deepEqual(ok(':is(#x,#y)').left.specificity, [1, 0, 0]);
  assert.deepEqual(ok(':where(#x#y)').left.specificity, [0, 0, 0]);
});

test('stress inputs from SPEC §7 stay exact', () => {
  const a = ok('.a'.repeat(512));
  assert.deepEqual(a.left.specificity, [0, 512, 0]);
  const b = ok('* '.repeat(511) + '*');
  assert.deepEqual(b.left.specificity, [0, 0, 0]);
  assert.equal(b.left.tree.children.length, 512);
});

test('direct core strings keep CR/LF exactly; whitespace is the closed set', () => {
  const r = ok('div\r\nspan');
  assert.deepEqual(r.left.specificity, [0, 0, 2]);
  assert.deepEqual([r.left.tree.start, r.left.tree.end], [0, 9]);
  err('div\u000Bspan', 'UNSUPPORTED_CHAR', 3); // VT is not recognized whitespace
  err('div\u00A0span', 'UNSUPPORTED_CHAR', 3); // NBSP is non-ASCII here
});
