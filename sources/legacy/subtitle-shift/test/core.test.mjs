import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAndShiftSrt as run, validateShiftInput, parseSecondsToMs, parseSrt, shiftCues, formatSrt, formatTimestamp, ERROR_CODES } from '../public/core.mjs';
import { basic, shiftedBasic, request, cue, manyCues, byteLimitFixture } from '../scripts/test-fixtures.mjs';
const error = (code, line = null, cueIndex = null, field = 'srtRaw') => ({ ok: false, error: { code, field, line, cueIndex } });
const success = input => { const out = run(input); assert.equal(out.ok, true); return out.result; };
const baseCue = { cueOrdinal: 1, indexRaw: '1', originalStartMs: 1000, originalEndMs: 2500, shiftedStartMs: 2250, shiftedEndMs: 3750, textLines: ['Hello'] };
const edgeIn = { cueOrdinal: 1, indexRaw: '1', start: '00:00:01,000', end: '00:00:02,500' };
const edgeOut = { cueOrdinal: 1, indexRaw: '1', start: '00:00:02,250', end: '00:00:03,750' };
const exactBasic = { ok: true, result: { direction: 'later', secondsRaw: '1.25', shiftMilliseconds: 1250, cueCount: 1, inputUtf8Bytes: 38, outputUtf8Bytes: 38, firstInputCue: edgeIn, lastInputCue: edgeIn, firstOutputCue: edgeOut, lastOutputCue: edgeOut, cues: [baseCue], srtText: shiftedBasic } };

test('C01 exact complete output and every success field', () => assert.deepEqual(run(request()), exactBasic));
test('C02 earlier preserves index and literal markup including spaces', () => {
  const text = cue('02', '00:00:03,000 --> 00:00:04,000', '  <i>hello</i>  ');
  assert.equal(success(request(text, 'earlier', '1.5')).srtText, '02\n00:00:01,500 --> 00:00:02,500\n  <i>hello</i>  \n');
});
test('C03 zero shift canonicalizes without time changes', () => assert.equal(success(request(basic, 'earlier', '0')).srtText, basic));
test('C04 CRLF and bare CR normalize to LF', () => {
  const out = success(request('1\r\n00:00:01,000 --> 00:00:02,500\rHello\r\n'));
  assert.equal(out.srtText, shiftedBasic); assert.equal(out.outputUtf8Bytes, 38);
});
test('C05 one leading BOM removed after raw bytes gate', () => { const out = success(request('\uFEFF' + basic)); assert.equal(out.inputUtf8Bytes, 41); assert.equal(out.srtText, shiftedBasic); });
test('C06 second leading BOM is an invalid index', () => assert.deepEqual(run(request('\uFEFF\uFEFF' + basic)), error('INDEX_FORMAT', 1, 1)));
test('C07 ASCII separators collapse with exact output', () => assert.equal(success(request(' \t\n\n' + basic + '\t  \n \n')).srtText, shiftedBasic));
test('C08 index zero is out of range', () => assert.deepEqual(run(request(cue('000000'))), error('INDEX_RANGE', 1, 1)));
test('C09 leading zeros and gaps are preserved', () => {
  const out = success(request(cue('0007') + '\n' + cue('0010')));
  assert.deepEqual(out.cues.map(c => c.indexRaw), ['0007', '0010']);
  assert.equal(out.srtText, shiftedBasic.replace(/^1/, '0007') + '\n' + shiftedBasic.replace(/^1/, '0010'));
});
test('C10 numeric duplicate despite different strings is rejected', () => assert.deepEqual(run(request(cue('0007') + '\n' + cue('7'))), error('INDEX_NOT_INCREASING', 5, 2)));
test('C11 minimum valid cue', () => { const raw = cue('1', '00:00:00,000 --> 00:00:00,001', 'x'); const out = success(request(raw, 'later', '0')); assert.equal(out.srtText, raw); assert.equal(out.cueCount, 1); });
test('C12 empty and separator-only have no cues', () => { for (const raw of ['', ' \t\n\r\n\t']) assert.deepEqual(run(request(raw)), error('NO_CUES')); });
test('C13 2000 complete cues are retained', () => { const raw = manyCues(2000); const out = success(request(raw, 'later', '0')); assert.equal(out.cueCount, 2000); assert.equal(out.cues.length, 2000); assert.equal(out.srtText, raw); });
test('C14 candidate 2001 is rejected without partial output', () => assert.deepEqual(run(request(manyCues(2001), 'later', '0')), error('CUE_COUNT_HIGH', 8001, 2001)));
test('C15 ten text lines accepted', () => { const lines = Array.from({ length: 10 }, (_, i) => 'T' + (i + 1)); assert.deepEqual(success(request(cue('1', undefined, lines.join('\n')))).cues[0].textLines, lines); });
test('C16 eleventh text line rejected', () => assert.deepEqual(run(request(cue('1', undefined, Array.from({ length: 11 }, (_, i) => 'T' + (i + 1)).join('\n')))), error('CUE_TEXT_LINES_HIGH', 13, 1)));
test('C17 exactly 1000 code points accepted', () => assert.equal(success(request(cue('1', undefined, 'x'.repeat(1000)))).cues[0].textLines[0], 'x'.repeat(1000)));
test('C18 1001 code points rejected', () => assert.deepEqual(run(request(cue('1', undefined, 'x'.repeat(1001)))), error('CUE_TEXT_LINE_TOO_LONG', 3, 1)));
test('C19 supplementary character counts as one code point', () => { assert.equal(success(request(cue('1', undefined, 'x'.repeat(999) + '😀'))).cues[0].textLines[0].length, 1001); assert.deepEqual(run(request(cue('1', undefined, 'x'.repeat(1000) + '😀'))), error('CUE_TEXT_LINE_TOO_LONG', 3, 1)); });
test('C20 index syntax is ASCII and bounded', () => { for (const index of ['1a', '１', '1000000', ' 1', '+1']) assert.deepEqual(run(request(cue(index))), error('INDEX_FORMAT', 1, 1)); });
test('C21 tabs around arrow canonicalize', () => assert.equal(success(request(cue('1', '00:00:01,000\t\t-->\t00:00:02,500'))).srtText, shiftedBasic));
test('C22 timestamp syntax and component ranges', () => {
  for (const [stamp, code] of [['100:00:01,000', 'TIMING_FORMAT'], ['00:60:01,000', 'TIMESTAMP_RANGE'], ['00:00:60,000', 'TIMESTAMP_RANGE']]) assert.deepEqual(run(request(cue('1', stamp + ' --> 00:00:02,500'))), error(code, 2, 1));
  assert.deepEqual(run(request(cue('1', '00:00:01,000 --> 99:60:59,000'))), error('TIMESTAMP_RANGE', 2, 1));
});
test('C23 timing line syntax is exact', () => { for (const timing of ['00:00:01.000 --> 00:00:02,500', '00:00:01 --> 00:00:02,500', '0:00:01,000 --> 00:00:02,500', '00:00:01,000 --> 00:00:02,500 X1:1', ' 00:00:01,000 --> 00:00:02,500', '00:00:01,000 --> 00:00:02,500 ', '00:00:01,000\u00a0--> 00:00:02,500']) assert.deepEqual(run(request(cue('1', timing))), error('TIMING_FORMAT', 2, 1)); });
test('C24 start must precede end', () => { for (const start of ['00:00:02,500', '00:00:03,000']) assert.deepEqual(run(request(cue('1', start + ' --> 00:00:02,500'))), error('CUE_START_NOT_BEFORE_END', 2, 1)); });
test('C25 missing timing/text reports expected physical line', () => {
  for (const raw of ['1', '1\n', '1\n \t\n']) assert.deepEqual(run(request(raw)), error('TIMING_LINE_MISSING', 2, 1));
  for (const raw of ['1\n00:00:01,000 --> 00:00:02,500', '1\n00:00:01,000 --> 00:00:02,500\n\n']) assert.deepEqual(run(request(raw)), error('CUE_TEXT_MISSING', 3, 1));
});
test('C26 numeric index followed by timing shape requires separator', () => assert.deepEqual(run(request(basic + cue('2'))), error('MISSING_CUE_SEPARATOR', 4, 2)));
test('C27 overlapping cues in reverse time order are preserved', () => {
  const raw = cue('1', '00:00:05,000 --> 00:00:07,000', 'a') + '\n' + cue('2', '00:00:01,000 --> 00:00:06,000', 'b');
  const out = success(request(raw)); assert.equal(out.srtText, '1\n00:00:06,250 --> 00:00:08,250\na\n\n2\n00:00:02,250 --> 00:00:07,250\nb\n'); assert.equal(out.firstInputCue.start, '00:00:05,000'); assert.equal(out.lastInputCue.start, '00:00:01,000');
});
test('C28 lower boundary equality accepted', () => assert.equal(success(request(cue('1', '00:00:01,000 --> 00:00:02,000'), 'earlier', '1.000')).srtText, '1\n00:00:00,000 --> 00:00:01,000\nHello\n'));
test('C29 lower boundary minus one rejects whole operation', () => assert.deepEqual(run(request(cue('1', '00:00:01,000 --> 00:00:02,000'), 'earlier', '1.001')), error('SHIFT_OUT_OF_BOUNDS', 2, 1)));
test('C30 upper boundary equality accepted', () => assert.equal(success(request(cue('1', '99:59:57,999 --> 99:59:58,999'), 'later', '1.000')).cues[0].shiftedEndMs, 359999999));
test('C31 upper boundary plus one rejects', () => assert.deepEqual(run(request(cue('1', '99:59:57,999 --> 99:59:58,999'), 'later', '1.001')), error('SHIFT_OUT_OF_BOUNDS', 2, 1)));
test('C32 later overflowing cue never returns partial data', () => assert.deepEqual(run(request(basic + '\n' + cue('2', '99:59:57,999 --> 99:59:58,999'), 'later', '1.001')), error('SHIFT_OUT_OF_BOUNDS', 6, 2)));
test('C33 decimal parsing uses exact integer milliseconds', () => { assert.equal(success(request(basic, 'earlier', '0.001')).cues[0].shiftedStartMs, 999); assert.deepEqual(parseSecondsToMs('0002.01'), { ok: true, value: 2010 }); });
test('C34 seconds endpoints, format and range', () => {
  for (const [raw, value] of [['0', 0], ['0000.1', 100], ['3600', 3600000], ['3600.000', 3600000]]) assert.deepEqual(parseSecondsToMs(raw), { ok: true, value });
  for (const raw of ['.5', '1.', '-1', '+1', '1,000', '１', '1e2', ' 1', '1\n', '1\r', '1\u2028', '1\u2029', '00000', '0.0001']) assert.deepEqual(parseSecondsToMs(raw), error('SECONDS_FORMAT', null, null, 'secondsRaw'));
  assert.deepEqual(parseSecondsToMs('3600.001'), error('SECONDS_RANGE', null, null, 'secondsRaw'));
});
function withoutEncoding(action) {
  const original = globalThis.TextEncoder; let calls = 0;
  globalThis.TextEncoder = class { constructor() { calls++; throw new Error('must not encode'); } };
  try { action(); assert.equal(calls, 0); } finally { globalThis.TextEncoder = original; }
}
test('C35 raw code-unit gate runs before encoding', () => withoutEncoding(() => assert.deepEqual(run(request('x'.repeat(1048577))), error('RAW_CODE_UNITS_HIGH'))));
test('C36 exact UTF8 byte cap accepts, one byte over rejects', () => {
  const raw = byteLimitFixture(1048576); assert.equal(new TextEncoder().encode(raw).length, 1048576);
  const out = success(request(raw, 'later', '0')); assert.equal(out.inputUtf8Bytes, 1048576); assert.equal(out.outputUtf8Bytes, 1048576); assert.equal(out.srtText, raw);
  const over = raw.replace('x', 'é'); assert.equal(over.length, raw.length); assert.equal(new TextEncoder().encode(over).length, 1048577); assert.deepEqual(run(request(over)), error('UTF8_BYTES_HIGH'));
});
test('C37 Unicode safety rejects before encoding', () => withoutEncoding(() => {
  for (const [suffix, code] of [['\0', 'NUL_NOT_ALLOWED'], ['\ud800', 'UNPAIRED_SURROGATE'], ['\udfff', 'UNPAIRED_SURROGATE'], ['\ud800x', 'UNPAIRED_SURROGATE']]) assert.deepEqual(run(request(basic + suffix)), error(code));
}));
test('C38 exact root/scalar schemas and descriptor precedence, no getters', () => {
  let calls = 0; const getter = () => { calls++; return basic; };
  const accessor = request(); Object.defineProperty(accessor, 'srtRaw', { get: getter, enumerable: false });
  const hidden = request(); Object.defineProperty(hidden, 'direction', { value: 'later', enumerable: false });
  const missing = { direction: 'later', secondsRaw: '0' };
  for (const [input, code] of [[null, 'ROOT_NOT_PLAIN_OBJECT'], [[], 'ROOT_NOT_PLAIN_OBJECT'], [Object.assign(Object.create(null), request()), 'ROOT_NOT_PLAIN_OBJECT'], [{ ...request(), extra: true }, 'UNKNOWN_FIELD'], [missing, 'MISSING_FIELD'], [{ ...request(), [Symbol()]: 1, extra: 1 }, 'SYMBOL_KEY'], [hidden, 'NON_ENUMERABLE_PROPERTY'], [accessor, 'ACCESSOR_PROPERTY']]) assert.deepEqual(run(input), error(code, null, null, 'input'));
  assert.equal(calls, 0);
  for (const raw of [undefined, null, 1, new String(basic)]) assert.deepEqual(run({ ...request(), srtRaw: raw }), error('SRT_RAW_TYPE'));
  for (const raw of [undefined, null, 1, 'Later', new String('later')]) assert.deepEqual(run({ ...request(), direction: raw }), error('DIRECTION_INVALID', null, null, 'direction'));
  for (const raw of [undefined, null, 0, new String('0')]) assert.deepEqual(run({ ...request(), secondsRaw: raw }), error('SECONDS_TYPE', null, null, 'secondsRaw'));
});
test('C39 complete success JSON roundtrip has no extra fields', () => assert.deepEqual(JSON.parse(JSON.stringify(run(request()))), exactBasic));
test('C40 safe errors never contain input marker', () => { const out = run(request('PRIVATE_FAKE_MARKER_40\n' + basic)); assert.deepEqual(out, error('INDEX_FORMAT', 1, 1)); assert.ok(!JSON.stringify(out).includes('PRIVATE_FAKE_MARKER_40')); });

test('core API pipeline and immutable inputs', () => {
  const raw = Object.freeze(request()); const validated = validateShiftInput(raw); assert.deepEqual(Object.keys(validated.value), ['srtRaw', 'direction', 'secondsRaw', 'shiftMilliseconds', 'inputUtf8Bytes']);
  const parsed = parseSrt(raw.srtRaw, 38); assert.deepEqual(parsed.value.cues[0], { cueOrdinal: 1, indexRaw: '1', indexValue: 1, originalStartMs: 1000, originalEndMs: 2500, timingLine: 2, textLines: ['Hello'] });
  Object.freeze(parsed.value.cues[0].textLines); Object.freeze(parsed.value.cues[0]); Object.freeze(parsed.value.cues);
  const shifted = shiftCues(parsed.value.cues, 'later', 1250); assert.equal(formatSrt(shifted.value), shiftedBasic); assert.deepEqual(raw, request());
  assert.equal(formatTimestamp(0), '00:00:00,000'); assert.equal(formatTimestamp(359999999), '99:59:59,999');
});
test('parser ordering, ASCII boundaries, controls and numeric subtitle lines', () => {
  assert.deepEqual(run(request(cue('1', '00:00:00,000 --> 00:00:00,001') + '\nBAD', 'earlier', '1')), error('INDEX_FORMAT', 5, 2));
  assert.deepEqual(run(request('\n\r\n  \r1a\r')), error('INDEX_FORMAT', 4, 1));
  const text = '123\nnot timing\n\u00a0\n\u2028\n\u0001\u000b\uFEFF'; assert.equal(success(request(cue('1', undefined, text))).cues[0].textLines.join('\n'), text);
  assert.deepEqual(run(request(cue('1\u2028'))), error('INDEX_FORMAT', 1, 1));
  assert.deepEqual(run(request(cue('1', '00:00:01,000 --> 00:00:02,500\u2028'))), error('TIMING_FORMAT', 2, 1));
  const eleven = Array.from({ length: 10 }, () => 'x').join('\n') + '\n2\n00:00:03,000 --> 00:00:04,000';
  assert.deepEqual(run(request(cue('1', undefined, eleven))), error('MISSING_CUE_SEPARATOR', 13, 2));
  assert.deepEqual(run({ ...request('bad\0\ud800'), direction: 'invalid' }), error('NUL_NOT_ALLOWED'));
  assert.deepEqual(run(request('bad\ud800\0')), error('UNPAIRED_SURROGATE'));
});
test('generated invariants: order, durations, output bound, determinism', () => {
  for (let n = 1; n <= 40; n++) {
    const raw = manyCues(n, i => ' x😀' + i + '\t'); const original = request(raw, 'later', '0002.001'); const out = success(original);
    assert.deepEqual(run(original), run(original)); assert.equal(out.cues.length, n); assert.ok(out.outputUtf8Bytes <= out.inputUtf8Bytes + 1);
    for (const c of out.cues) { assert.equal(c.shiftedStartMs - c.originalStartMs, 2001); assert.equal(c.shiftedEndMs - c.shiftedStartMs, c.originalEndMs - c.originalStartMs); }
    assert.equal(success(request(out.srtText, 'earlier', '2.001')).srtText, raw);
  }
  const raw = basic.slice(0, -1); assert.equal(success(request(raw)).outputUtf8Bytes, 38); assert.equal(new TextEncoder().encode(raw).length, 37);
  assert.equal(new Set(ERROR_CODES).size, 29);
});
