import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexText, validateOutputBytes } from '../public/js/core/index-text.mjs';
const row = (name, w = 300, h = 200) => ({ file: { name }, metadata: { visualWidth: w, visualHeight: h } });
test('A14: hand-written UTF-8 index oracle, escaped injection remains exactly one record', () => {
  const actual = buildIndexText([row('a\tB\n<script>.png'), row('風景😀.jpg', 200, 300)]);
  const expected = 'Photo contact sheet index v1\n1\t"a\\tB\\n<script>.png"\t300x200\n2\t"風景😀.jpg"\t200x300\n';
  assert.deepEqual(actual, new TextEncoder().encode(expected));
  assert.equal(new TextDecoder().decode(actual).trimEnd().split('\n').length, 3);
});
test('A15: TXT keeps the full unshortened filename and caller order', () => {
  const actual = new TextDecoder().decode(buildIndexText([row('B.jpg'), row('😀'.repeat(40))]));
  assert.equal(actual, 'Photo contact sheet index v1\n1\t"B.jpg"\t300x200\n2\t"' + '😀'.repeat(40) + '"\t300x200\n');
});
test('A19: exact 128 KiB TXT and 64 MiB PNG accepted; one byte over rejected', () => {
  assert.doesNotThrow(() => validateOutputBytes(131_072, 'text'));
  assert.throws(() => validateOutputBytes(131_073, 'text'), { code: 'OUTPUT_TOO_LARGE' });
  assert.doesNotThrow(() => validateOutputBytes(67_108_864, 'png'));
  assert.throws(() => validateOutputBytes(67_108_865, 'png'), { code: 'OUTPUT_TOO_LARGE' });
  // 28-byte title plus newline; one record adds 16 bytes with an empty filename.
  const overhead = new TextEncoder().encode('Photo contact sheet index v1\n1\t""\t300x200\n').length;
  const name = 'x'.repeat(131_072 - overhead);
  assert.equal(buildIndexText([row(name)]).byteLength, 131_072);
  assert.throws(() => buildIndexText([row(name + 'x')]), { code: 'OUTPUT_TOO_LARGE' });
});
