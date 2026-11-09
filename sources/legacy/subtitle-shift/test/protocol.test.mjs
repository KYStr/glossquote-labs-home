import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAndShiftSrt, ERROR_CODES } from '../public/core.mjs';
import { isTerminal, isShiftSuccess, isCoreError } from '../public/protocol.mjs';
import { basic, request, cue, manyCues, byteLimitFixture } from '../scripts/test-fixtures.mjs';

const envelope = outcome => ({ type: outcome.ok ? 'success' : 'failure', jobId: 1, revision: 3, pageGeneration: 0, outcome });
const good = () => analyzeAndShiftSrt(request());
const forgedText = lines => {
  const out = good();
  out.result.cues[0].textLines = lines;
  out.result.srtText = '1\n00:00:02,250 --> 00:00:03,750\n' + lines.join('\n') + '\n';
  out.result.outputUtf8Bytes = new TextEncoder().encode(out.result.srtText).length;
  out.result.inputUtf8Bytes = out.result.outputUtf8Bytes;
  return out;
};

test('P01 R1 counterexample: forged full output disagrees with verified cues', () => {
  const out = good(); out.result.srtText = 'X\n'; out.result.outputUtf8Bytes = 2;
  assert.equal(isTerminal(envelope(out)), false);
  assert.equal(isTerminal(envelope(good())), true);
});
test('P02 R1 counterexample: sparse cue/text arrays are rejected', () => {
  for (const target of ['cues', 'textLines']) {
    const out = good(); const array = target === 'cues' ? out.result.cues : out.result.cues[0].textLines;
    delete array[0]; assert.equal(isTerminal(envelope(out)), false);
  }
});
test('P03 R1 counterexample: NO_CUES cannot name a setting or physical location', () => {
  const error = { code: 'NO_CUES', field: 'secondsRaw', line: 1, cueIndex: 1 };
  assert.equal(isTerminal(envelope({ ok: false, error })), false);
  assert.equal(isCoreError({ code: 'NO_CUES', field: 'srtRaw', line: null, cueIndex: null }), true);
});
test('P04 both array layers reject symbols, extras, accessors, non-enumerability and prototypes', () => {
  let getterCalls = 0;
  const mutations = [
    array => { array.extra = true; },
    array => { array[Symbol('extra')] = true; },
    array => { Object.defineProperty(array, 'extra', { value: true }); },
    array => { Object.defineProperty(array, '0', { get() { getterCalls++; throw new Error('must not read'); }, enumerable: true }); },
    array => { Object.defineProperty(array, '0', { value: array[0], enumerable: false }); },
    array => { Object.setPrototypeOf(array, Object.create(Array.prototype)); }
  ];
  for (const target of ['cues', 'textLines']) for (const mutate of mutations) {
    const out = good(); mutate(target === 'cues' ? out.result.cues : out.result.cues[0].textLines);
    assert.equal(isTerminal(envelope(out)), false);
  }
  assert.equal(getterCalls, 0);
});
test('P05 canonical-looking forged text still obeys Unicode, line and SRT subset limits', () => {
  for (const lines of [
    [''], [' \t'], ['a\rb'], ['a\nb'], ['a\0b'], ['\ud800'], ['\udfff'],
    ['x'.repeat(1001)], ['x'.repeat(1000) + '😀'], Array.from({ length: 11 }, () => 'x'),
    ['2', '00:00:03,000 --> 00:00:04,000'], ['000000', '00:60:03,000 --> 00:00:04,000']
  ]) assert.equal(isTerminal(envelope(forgedText(lines))), false);
});
test('P06 every supported non-NUL control and non-ASCII whitespace is preserved literally', () => {
  const controls = Array.from({ length: 32 }, (_, code) => code).filter(code => ![0, 10, 13].includes(code)).map(code => String.fromCharCode(code)).join('');
  for (const text of ['x'.repeat(999) + '😀', '😀'.repeat(1000), 'é漢\u0800\u07ff', '\u00a0', '\u2028\u2029\uFEFF', controls, '2\nnot a timing line']) {
    const out = analyzeAndShiftSrt(request(cue('1', undefined, text)));
    assert.equal(out.ok, true); assert.equal(isTerminal(envelope(out)), true);
  }
});
test('P07 output serialization must match exact spacing, ordering, indexes and final LF', () => {
  for (const mutate of [
    text => '\uFEFF' + text, text => text + '\n', text => text.slice(0, -1),
    text => text.replace(/\n/g, '\r\n'), text => text.replace(' --> ', '\t-->\t'),
    text => text.replace(/^1/, '01'), text => text.replace('Hello', 'Different')
  ]) {
    const out = good(); out.result.srtText = mutate(out.result.srtText);
    out.result.outputUtf8Bytes = new TextEncoder().encode(out.result.srtText).length;
    out.result.inputUtf8Bytes = out.result.outputUtf8Bytes;
    assert.equal(isTerminal(envelope(out)), false);
  }
  const out = analyzeAndShiftSrt(request(cue('0007') + '\n' + cue('0010')));
  out.result.srtText = out.result.srtText.split('\n\n').reverse().join('\n\n');
  assert.equal(isTerminal(envelope(out)), false);
});
test('P08 actual UTF8 count is checked independently of code-unit length', () => {
  const out = analyzeAndShiftSrt(request(cue('1', undefined, 'é漢😀')));
  assert.equal(isShiftSuccess(out.result), true);
  for (const bytes of [out.result.outputUtf8Bytes - 1, out.result.outputUtf8Bytes + 1, out.result.srtText.length]) {
    const forged = structuredClone(out); forged.result.outputUtf8Bytes = bytes;
    assert.equal(isTerminal(envelope(forged)), false);
  }
});
test('P09 real core successes at byte/cue boundaries pass the bounded guard', () => {
  const raw = byteLimitFixture(1048576);
  const sources = [request(raw, 'later', '0'), request(manyCues(2000), 'later', '0'), request('\uFEFF' + basic.replace(/\n/g, '\r\n')),
    request(cue('0007', '00:00:05,000 --> 00:00:07,000', ' a ') + '\n' + cue('0010', '00:00:01,000 --> 00:00:06,000', '<i>x</i>'))];
  for (const input of sources) { const out = analyzeAndShiftSrt(input); assert.equal(out.ok, true); assert.equal(isTerminal(envelope(out)), true); }
});
function coreErrorExamples() {
  const accessor = request(); Object.defineProperty(accessor, 'srtRaw', { get() { throw new Error('getter must stay unread'); } });
  const hidden = request(); Object.defineProperty(hidden, 'direction', { value: 'later', enumerable: false });
  return [
    [null, 'ROOT_NOT_PLAIN_OBJECT'], [{ ...request(), [Symbol()]: 1 }, 'SYMBOL_KEY'], [{ ...request(), extra: 1 }, 'UNKNOWN_FIELD'], [{ srtRaw: basic }, 'MISSING_FIELD'],
    [accessor, 'ACCESSOR_PROPERTY'], [hidden, 'NON_ENUMERABLE_PROPERTY'], [request(null), 'SRT_RAW_TYPE'],
    [request('x'.repeat(1048577)), 'RAW_CODE_UNITS_HIGH'], [request(basic + '\0'), 'NUL_NOT_ALLOWED'], [request(basic + '\ud800'), 'UNPAIRED_SURROGATE'],
    [request(byteLimitFixture(1048576).replace('x', 'é')), 'UTF8_BYTES_HIGH'], [request(basic, 'invalid'), 'DIRECTION_INVALID'],
    [request(basic, 'later', 0), 'SECONDS_TYPE'], [request(basic, 'later', '.5'), 'SECONDS_FORMAT'], [request(basic, 'later', '3600.001'), 'SECONDS_RANGE'],
    [request(''), 'NO_CUES'], [request(manyCues(2001)), 'CUE_COUNT_HIGH'], [request(cue('bad')), 'INDEX_FORMAT'], [request(cue('0')), 'INDEX_RANGE'],
    [request(basic + '\n' + basic), 'INDEX_NOT_INCREASING'], [request('1'), 'TIMING_LINE_MISSING'], [request('1\nx'), 'TIMING_FORMAT'],
    [request(cue('1', '00:60:00,000 --> 00:00:02,500')), 'TIMESTAMP_RANGE'], [request(cue('1', '00:00:02,500 --> 00:00:02,500')), 'CUE_START_NOT_BEFORE_END'],
    [request('1\n00:00:01,000 --> 00:00:02,500'), 'CUE_TEXT_MISSING'], [request(cue('1', undefined, Array(11).fill('x').join('\n'))), 'CUE_TEXT_LINES_HIGH'],
    [request(cue('1', undefined, 'x'.repeat(1001))), 'CUE_TEXT_LINE_TOO_LONG'], [request(basic + cue('2')), 'MISSING_CUE_SEPARATOR'],
    [request(basic, 'earlier', '1.001'), 'SHIFT_OUT_OF_BOUNDS']
  ];
}
test('P10 real core errors cover all 29 codes and retain precise semantic fields', () => {
  const seen = new Set();
  for (const [input, code] of coreErrorExamples()) {
    const out = analyzeAndShiftSrt(input); assert.equal(out.ok, false); assert.equal(out.error.code, code);
    assert.equal(isTerminal(envelope(out)), true, code); seen.add(code);
    for (const field of ['input', 'srtRaw', 'direction', 'secondsRaw'].filter(field => field !== out.error.field)) assert.equal(isCoreError({ ...out.error, field }), false, code + ': wrong field');
    if (out.error.line === null) {
      assert.equal(isCoreError({ ...out.error, line: 1 }), false, code); assert.equal(isCoreError({ ...out.error, cueIndex: 1 }), false, code);
    } else {
      assert.equal(isCoreError({ ...out.error, line: null }), false, code); assert.equal(isCoreError({ ...out.error, cueIndex: null }), false, code);
    }
  }
  assert.deepEqual([...seen].sort(), [...ERROR_CODES].sort());
});
test('P11 block ordinal and physical line constraints accept real edge errors', () => {
  const cases = [
    request('1\n00:00:01,000 --> 00:00:02,500\n2\n00:00:03,000 --> 00:00:04,000'),
    request(manyCues(1999) + '\n2000\n00:00:03,000 --> 00:00:04,000\n2001\n00:00:05,000 --> 00:00:06,000'),
    request('\n\n' + basic + '\n2\n')
  ];
  for (const input of cases) { const out = analyzeAndShiftSrt(input); assert.equal(out.ok, false); assert.equal(isTerminal(envelope(out)), true); }
  for (const error of [
    { code: 'CUE_COUNT_HIGH', field: 'srtRaw', line: 8001, cueIndex: 2000 },
    { code: 'CUE_COUNT_HIGH', field: 'srtRaw', line: 8000, cueIndex: 2001 },
    { code: 'MISSING_CUE_SEPARATOR', field: 'srtRaw', line: 3, cueIndex: 1 },
    { code: 'INDEX_NOT_INCREASING', field: 'srtRaw', line: 1, cueIndex: 1 },
    { code: 'CUE_TEXT_LINES_HIGH', field: 'srtRaw', line: 12, cueIndex: 1 },
    { code: 'SHIFT_OUT_OF_BOUNDS', field: 'srtRaw', line: 1, cueIndex: 1 }
  ]) assert.equal(isCoreError(error), false);
});
test('P12 sizes and nested descriptors fail safely without executing getters', () => {
  let calls = 0;
  const oversized = good(); oversized.result.cueCount = 2001; oversized.result.cues = new Array(2001);
  Object.defineProperty(oversized.result.cues, '0', { get() { calls++; }, enumerable: true });
  assert.equal(isTerminal(envelope(oversized)), false);
  const text = good(); text.result.cues[0].textLines = new Array(11);
  Object.defineProperty(text.result.cues[0].textLines, '0', { get() { calls++; }, enumerable: true });
  assert.equal(isTerminal(envelope(text)), false);
  const cueAccessor = good(); Object.defineProperty(cueAccessor.result.cues[0], 'textLines', { get() { calls++; }, enumerable: true });
  assert.equal(isTerminal(envelope(cueAccessor)), false);
  const output = good(); output.result.srtText = 'x'.repeat(1048578); assert.equal(isTerminal(envelope(output)), false);
  assert.equal(calls, 0);
});
