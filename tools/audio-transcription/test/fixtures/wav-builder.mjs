// Bounded test-only PCM reader/writer. This is not the T03 user-file parser.
export function readFixturePcm(input) {
  const bytes = Buffer.from(input);
  const fail = () => { throw new Error('FIXTURE_WAV_INVALID'); };
  if (bytes.length < 44 || bytes.length > 1_000_000 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE' || bytes.readUInt32LE(4) + 8 !== bytes.length) fail();
  let offset = 12; let format = false; let pcm; let chunks = 0;
  while (offset < bytes.length) {
    if (++chunks > 128 || offset + 8 > bytes.length) fail();
    const name = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > bytes.length) fail();
    if (name === 'fmt ') {
      if (format || size < 16 || bytes.readUInt16LE(start) !== 1 || bytes.readUInt16LE(start + 2) !== 1 || bytes.readUInt32LE(start + 4) !== 16000 || bytes.readUInt32LE(start + 8) !== 32000 || bytes.readUInt16LE(start + 12) !== 2 || bytes.readUInt16LE(start + 14) !== 16) fail();
      format = true;
    } else if (name === 'data') {
      if (pcm || size === 0 || size % 2 || size > 960000) fail();
      pcm = { start, size };
    }
    offset = start + size + size % 2;
  }
  if (!format || !pcm || offset !== bytes.length) fail();
  const output = new Int16Array(pcm.size / 2);
  for (let index = 0; index < output.length; index += 1) output[index] = bytes.readInt16LE(pcm.start + index * 2);
  return output;
}

export function writeFixtureWav(samples) {
  if (!(samples instanceof Int16Array) || samples.length < 1 || samples.length > 480000) throw new Error('FIXTURE_PCM_INVALID');
  const output = Buffer.alloc(44 + samples.length * 2);
  output.write('RIFF', 0); output.writeUInt32LE(output.length - 8, 4); output.write('WAVEfmt ', 8);
  output.writeUInt32LE(16, 16); output.writeUInt16LE(1, 20); output.writeUInt16LE(1, 22);
  output.writeUInt32LE(16000, 24); output.writeUInt32LE(32000, 28); output.writeUInt16LE(2, 32); output.writeUInt16LE(16, 34);
  output.write('data', 36); output.writeUInt32LE(samples.length * 2, 40);
  for (let index = 0; index < samples.length; index += 1) output.writeInt16LE(samples[index], 44 + index * 2);
  return output;
}

export function sineFixture({ frequency = 440, seconds = 30 } = {}) {
  if (!Number.isFinite(frequency) || frequency < 0 || frequency > 8000 || !Number.isFinite(seconds) || seconds <= 0 || seconds > 30) throw new Error('FIXTURE_PCM_INVALID');
  const samples = new Int16Array(Math.round(seconds * 16000));
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.round(0.2 * 32767 * Math.sin(2 * Math.PI * frequency * index / 16000));
  return writeFixtureWav(samples);
}
