import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFixturePcm, writeFixtureWav } from './fixtures/wav-builder.mjs';

test('T02 fixtures have ten bounded phrases, two full composites and real hashes', async () => {
  const base = new URL('./fixtures/generated/t02-v1/', import.meta.url);
  const metadata = JSON.parse(await readFile(new URL('quality-speech.json', base), 'utf8'));
  assert.equal(metadata.mode, 't02-quality-v1'); assert.equal(metadata.syntheticOnly, true);
  assert.equal(metadata.cases.length, 13);
  for (const item of metadata.cases) {
    const bytes = await readFile(new URL(item.id + '.wav', base));
    assert.equal(bytes.length, item.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256);
    const pcm = readFixturePcm(bytes); const duration = pcm.length / 16000;
    assert.equal(duration, item.durationSeconds);
    if (item.id.endsWith('-30')) assert.equal(duration, 30);
    else { assert.ok(duration >= 5 && duration <= 10); assert.equal(item.rate, -2); }
    if (item.sourceIds) {
      assert.equal(item.sourceIds.length, 5);
      assert.equal(item.reference, item.sourceIds.map(id => metadata.cases.find(other => other.id === id).reference).join(' '));
    }
    if (item.id === 'silence-30') assert.ok(pcm.every(value => value === 0));
  }
});

test('test-only fixture reader refuses overrun, unsupported channels and duplicate data', () => {
  const bytes = writeFixtureWav(new Int16Array(16000));
  const badSize = Buffer.from(bytes); badSize.writeUInt32LE(0xffffffff, 40);
  assert.throws(() => readFixturePcm(badSize), /FIXTURE_WAV_INVALID/u);
  const stereo = Buffer.from(bytes); stereo.writeUInt16LE(2, 22);
  assert.throws(() => readFixturePcm(stereo), /FIXTURE_WAV_INVALID/u);
  const duplicate = Buffer.concat([bytes, bytes.subarray(36)]); duplicate.writeUInt32LE(duplicate.length - 8, 4);
  assert.throws(() => readFixturePcm(duplicate), /FIXTURE_WAV_INVALID/u);
});
