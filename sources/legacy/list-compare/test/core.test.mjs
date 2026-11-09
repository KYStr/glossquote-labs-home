import test from 'node:test';
import assert from 'node:assert/strict';
import { compareLists } from '../public/js/core/compare.mjs';
import { request, fixedExample, expectedExample } from './fixtures.mjs';

function results(input) {
  const actual = compareLists(input);
  assert.equal(actual.ok, true);
  return Object.fromEntries(Object.entries(actual.value.results).map(([key, items]) => [key, items.map(item => item.text)]));
}
const error = (code, side = null, line = null) => ({ ok: false, error: { code, side, line } });
const blankSide = side => ({ side, rawLineCount: 1, blankLineCount: 1, nonEmptyLineCount: 0, uniqueCount: 0, duplicateCount: 0, items: [] });

test('A01 empty inputs are valid; physical blank counts remain 1', () => {
  assert.deepEqual(compareLists(request()), { ok: true, value: {
    a: blankSide('A'), b: blankSide('B'),
    summary: { aOnlyCount: 0, bOnlyCount: 0, intersectionCount: 0, mergedCount: 0 },
    results: { aOnly: [], bOnly: [], intersection: [], merged: [] }
  } });
});
test('A02 empty A / B Z', () => assert.deepEqual(results(request('', 'Z')), { aOnly: [], bOnly: ['Z'], intersection: [], merged: ['Z'] }));
test('A03 fixed two-set example and complete schema oracle', () => {
  assert.deepEqual(results(request('Ada\nBo', 'Bo\nCy')), { aOnly: ['Ada'], bOnly: ['Cy'], intersection: ['Bo'], merged: ['Ada', 'Bo', 'Cy'] });
  assert.deepEqual(compareLists(fixedExample), expectedExample);
});
test('A04 A order is never sorted', () => assert.deepEqual(results(request('Z\nA\nM')), { aOnly: ['Z', 'A', 'M'], bOnly: [], intersection: [], merged: ['Z', 'A', 'M'] }));
test('A05 B-only preserves B order', () => assert.deepEqual(results(request('M', 'Z\nM\nA')), { aOnly: [], bOnly: ['Z', 'A'], intersection: ['M'], merged: ['M', 'Z', 'A'] }));
test('A06 case-sensitive x / X', () => assert.deepEqual(results(request('x\nX', 'X')), { aOnly: ['x'], bOnly: [], intersection: ['X'], merged: ['x', 'X'] }));
test('A07 ignoreCase preserves first A spelling', () => assert.deepEqual(results(request('x\nX', 'X', { ignoreCase: true })), { aOnly: [], bOnly: [], intersection: ['x'], merged: ['x'] }));
test('A08 simple lowercasing; no NFKC / NFC / locale folding', () => {
  assert.deepEqual(results(request('a\nＡ\né\nİ\nß', 'A\ne\u0301\ni\nSS', { ignoreCase: true })), {
    aOnly: ['Ａ', 'é', 'İ', 'ß'], bOnly: ['e\u0301', 'i', 'SS'], intersection: ['a'], merged: ['a', 'Ａ', 'é', 'İ', 'ß', 'e\u0301', 'i', 'SS']
  });
});
test('A09 trim before display and comparison', () => {
  const actual = compareLists(request(' Ada ', 'Ada'));
  assert.deepEqual(actual.value.a.items, [{ key: 'Ada', text: 'Ada', firstLine: 1, occurrences: 1 }]);
  assert.equal(actual.value.summary.intersectionCount, 1);
});
test('A10 trim=false preserves outer spaces as meaningful text', () => assert.deepEqual(results(request(' Ada ', 'Ada', { trimItems: false })), { aOnly: [' Ada '], bOnly: ['Ada'], intersection: [], merged: [' Ada ', 'Ada'] }));
test('A11 blank whitespace including tabs ignored regardless of trim', () => {
  for (const trimItems of [true, false]) {
    const { a } = compareLists(request('\n \n\t\nAda', '', { trimItems })).value;
    assert.deepEqual(a, { side: 'A', rawLineCount: 4, blankLineCount: 3, nonEmptyLineCount: 1, uniqueCount: 1, duplicateCount: 0, items: [{ key: 'Ada', text: 'Ada', firstLine: 4, occurrences: 1 }] });
  }
});
test('A12 only CRLF / CR newline normalization', () => assert.deepEqual(compareLists(request('Ada\r\nBo\r\rCy', '\rBo\r\n')), compareLists(request('Ada\nBo\n\nCy', '\nBo\n'))));
test('A13 trailing LF contributes one blank physical line', () => {
  const a = compareLists(request('Ada\n')).value.a;
  assert.equal(a.rawLineCount, 2); assert.equal(a.blankLineCount, 1); assert.equal(a.uniqueCount, 1);
});
test('A14 occurrences include first row; duplicate count is excess rows', () => {
  const a = compareLists(request('A\nA\nB')).value.a;
  assert.deepEqual(a.items, [{ key: 'A', text: 'A', firstLine: 1, occurrences: 2 }, { key: 'B', text: 'B', firstLine: 3, occurrences: 1 }]);
  assert.equal(a.duplicateCount, 1);
});
test('A15 blank rows do not renumber first occurrences', () => {
  const a = compareLists(request('\nZ\n\nZ\nM')).value.a;
  assert.deepEqual(a.items, [{ key: 'Z', text: 'Z', firstLine: 2, occurrences: 2 }, { key: 'M', text: 'M', firstLine: 5, occurrences: 1 }]);
});
test('A16 duplicate B rows never duplicate shared or merged output', () => {
  const { b, summary, results: r } = compareLists(request('X', 'X\nX\nY\nY')).value;
  assert.equal(b.duplicateCount, 2); assert.equal(summary.intersectionCount, 1); assert.equal(summary.mergedCount, 2);
  assert.deepEqual(r.merged.map(item => item.text), ['X', 'Y']);
});
test('A17 intersection preserves A text and both sides firstLine/occurrences', () => {
  const { results: r } = compareLists(request('\nAlice\nALICE', '\n\nalice\nAlice\nalice', { ignoreCase: true })).value;
  assert.deepEqual(r.intersection, [{ text: 'Alice', key: 'alice', aFirstLine: 2, bFirstLine: 3, aOccurrences: 2, bOccurrences: 3 }]);
});
test('A18 5000 unique non-empty items accepted in each side', () => {
  const text = Array.from({ length: 5000 }, (_, i) => `Fake_${i}`).join('\n');
  const value = compareLists(request(text, text)).value;
  assert.equal(value.a.uniqueCount, 5000); assert.equal(value.b.uniqueCount, 5000); assert.equal(value.summary.intersectionCount, 5000);
});
test('A19 item 5001 rejected before partial output, including duplicate rows', () => {
  for (const side of ['A', 'B']) {
    const text = '\n' + Array(5001).fill('X').join('\n');
    assert.deepEqual(compareLists(request(side === 'A' ? text : '', side === 'B' ? text : '')), error('TOO_MANY_ITEMS', side, 5002));
  }
});
test('A20 exactly 100000 UTF-16 units passes with otherwise legal content', () => {
  const text = ('X'.repeat(199) + '\n').repeat(500);
  assert.equal(text.length, 100000);
  const actual = compareLists(request(text));
  assert.equal(actual.ok, true); assert.equal(actual.value.a.nonEmptyLineCount, 500); assert.equal(actual.value.a.blankLineCount, 1);
});
test('A21 100001 UTF-16 units rejects, counting astral symbols as 2 units', () => {
  assert.deepEqual(compareLists(request('😀'.repeat(50000) + 'X')), error('INPUT_TOO_LONG', 'A'));
  assert.deepEqual(compareLists(request('', 'X'.repeat(100001))), error('INPUT_TOO_LONG', 'B'));
});
test('A22 200 Unicode code points, including astral, accepted', () => {
  assert.equal(compareLists(request('😀'.repeat(200))).ok, true);
  assert.equal(compareLists(request('X'.repeat(200))).ok, true);
});
test('A23 201 code points rejects correct original side and physical line', () => {
  assert.deepEqual(compareLists(request('\nX\n' + '😀'.repeat(201))), error('ITEM_TOO_LONG', 'A', 3));
  assert.deepEqual(compareLists(request('', '\n' + 'Y'.repeat(201))), error('ITEM_TOO_LONG', 'B', 2));
});
test('A24 point length after optional trim; no silent truncation', () => {
  const text = ' ' + 'X'.repeat(200) + ' ';
  const actual = compareLists(request(text));
  assert.equal(actual.ok, true); assert.equal(actual.value.a.items[0].text, 'X'.repeat(200));
  assert.deepEqual(compareLists(request(text, '', { trimItems: false })), error('ITEM_TOO_LONG', 'A', 1));
});
test('A25 NUL, C0, DEL and C1 rejected without raw error contents', () => {
  for (const control of ['\u0000', '\u0001', '\u0009', '\u007f', '\u0085', '\u009f']) {
    assert.deepEqual(compareLists(request('Fake' + control + 'Text')), error('CONTROL_CHARACTER', 'A', 1));
  }
  assert.deepEqual(compareLists(request('', '\nFake\u0080Text')), error('CONTROL_CHARACTER', 'B', 2));
});
test('A26 missing, wrong type, array and unknown own key rejected', () => {
  for (const invalid of [undefined, null, [], 'X', 3, { ...request(), extra: true }, { aText: '', bText: '' }, { ...request(), ignoreCase: 0 }, { ...request(), bText: {} }]) {
    assert.deepEqual(compareLists(invalid), error('INVALID_REQUEST'));
  }
});
test('A27 schema, A raw, B raw, A lines, B lines validation priority', () => {
  const long = 'X'.repeat(100001);
  assert.deepEqual(compareLists({ ...request(long, long), extra: true }), error('INVALID_REQUEST'));
  assert.deepEqual(compareLists(request(long, long)), error('INPUT_TOO_LONG', 'A'));
  assert.deepEqual(compareLists(request('Fake\u0000', long)), error('INPUT_TOO_LONG', 'B'));
  assert.deepEqual(compareLists(request('\nFake\u0000\n' + 'X'.repeat(201), 'Fake\u0000')), error('CONTROL_CHARACTER', 'A', 2));
});
test('A28 exact descriptors, Reflect.ownKeys and plain prototype; no getter invoked', () => {
  let getterReads = 0;
  const symbol = Object.assign(request(), { [Symbol('unknown')]: true });
  const hiddenUnknown = Object.defineProperty(request(), 'extra', { value: 3 });
  const hiddenRequired = Object.defineProperty(request(), 'aText', { value: '', enumerable: false });
  const accessor = Object.defineProperty(request(), 'aText', { enumerable: true, get() { getterReads += 1; throw new Error('Do not read'); } });
  const setter = Object.defineProperty(request(), 'trimItems', { enumerable: true, set() {} });
  const inherited = Object.assign(Object.create({}), request());
  for (const invalid of [symbol, hiddenUnknown, hiddenRequired, accessor, setter, inherited, new Date(), new String('X')]) assert.deepEqual(compareLists(invalid), error('INVALID_REQUEST'));
  const revoked = Proxy.revocable(request(), {}); revoked.revoke();
  assert.deepEqual(compareLists(revoked.proxy), error('INVALID_REQUEST'));
  assert.equal(getterReads, 0);
  assert.equal(compareLists(Object.assign(Object.create(null), request())).ok, true);
  assert.equal(compareLists(Object.freeze(request())).ok, true);
});
test('A29 a zero-result category is a successful empty set', () => assert.deepEqual(results(request('Ada', 'Ada')), { aOnly: [], bOnly: [], intersection: ['Ada'], merged: ['Ada'] }));
test('A30 byte-equivalent deterministic results and input unchanged', () => {
  const frozen = Object.freeze(fixedExample);
  const before = JSON.stringify(frozen);
  const first = JSON.stringify(compareLists(frozen));
  for (let i = 0; i < 10; i += 1) assert.equal(JSON.stringify(compareLists(frozen)), first);
  assert.equal(JSON.stringify(frozen), before);
});
test('A32 every failure has stable code/side/line and no user text', () => {
  const cases = [
    [{ ...request(), extra: 'Fake_Canary' }, error('INVALID_REQUEST')],
    [request('Fake_Canary' + 'X'.repeat(100001)), error('INPUT_TOO_LONG', 'A')],
    [request(Array(5001).fill('Fake_Canary').join('\n')), error('TOO_MANY_ITEMS', 'A', 5001)],
    [request('Fake_Canary' + 'X'.repeat(201)), error('ITEM_TOO_LONG', 'A', 1)],
    [request('Fake_Canary\u0000'), error('CONTROL_CHARACTER', 'A', 1)]
  ];
  for (const [input, expected] of cases) {
    const actual = compareLists(input);
    assert.deepEqual(actual, expected); assert.equal(JSON.stringify(actual).includes('Fake_Canary'), false);
  }
});
test('A33 each summary count equals its category length', () => {
  for (const input of [fixedExample, request(), request('x\nX', 'X', { ignoreCase: true }), request('', 'Z')]) {
    const { summary, results: r } = compareLists(input).value;
    assert.deepEqual(summary, { aOnlyCount: r.aOnly.length, bOnlyCount: r.bOnly.length, intersectionCount: r.intersection.length, mergedCount: r.merged.length });
  }
});
