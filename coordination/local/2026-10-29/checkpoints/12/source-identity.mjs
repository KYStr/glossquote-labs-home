import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const FIXTURE = Object.freeze({
  path: '/fixtures/generated/t02-v1/en-04.wav', bytes: 160044,
  sha256: '1255b2a08c579ce8967b81d290b0a26daafd1f8acfe7eaf736eae13f2f46bf66',
  readerSha256: '09cd2e5c00ec4e31657fc0d618de7fcd1702aace044785c4736189e8cbc42716',
  readerModuleSha256: 'b1cfedc495eba438b7969ec2a0a72ce2db1e05e73dcdcdb1aa8536a950403015',
});
const sources = [
  ['scripts/serve.mjs', 4468, 'e7d592210563709d057bba1996da2b8aa531f24bc7f10a1b319fb57b86cb6886'],
  ['scripts/serve-spike.mjs', 7873, 'd9612a9332e23726823a80de5b6d5035312e77b52c647ba404d00a449c6a526f'],
  ['test/spike/spike.mjs', 21975, '1d8cd54d57d85dfab15d8cf38856e24298b52f201a020468748785f23e0f591e'],
  ['test/fixtures/generated/t02-v1/en-04.wav', 160044, FIXTURE.sha256],
  ['scripts/verify-assets.mjs', 3573, '9678b7a19600104e01a8378cf2d2bc8eeb89e513aa33c50ec3a889b80c0a6a01'],
  ['scripts/measurement-context.mjs', 1668, '3aa34deb6a6b1f8c41393f12d0314137e60d33df7b8a77baf8bc89b9c9c4772d'],
  ['public/js/core/manifest.mjs', 4529, '985299590ebe482400d97edeea90652619de627051d664a0b7ec353e9cde1c21'],
];
const tool = new URL('../../../tool-projects/12-audio-transcription/', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export async function verifyFixedSources() {
  const observed = await Promise.all(sources.map(async ([path, bytes, sha256]) => {
    const data = await readFile(new URL(path, tool));
    if (data.length !== bytes || sha(data) !== sha256) throw new Error('FIXED_SOURCE_MISMATCH');
    return { path, bytes, sha256, data };
  }));
  const source = observed.find(item => item.path === 'test/spike/spike.mjs').data.toString('utf8');
  const first = source.indexOf('async function getBytes('), last = source.indexOf('function fixturePcm(', first);
  const readerSource = source.slice(first, last);
  if (first < 0 || last <= first || sha(readerSource) !== FIXTURE.readerSha256) throw new Error('FIXED_READER_MISMATCH');
  const extracted = await readFile(new URL('./reader-extracted.mjs', import.meta.url));
  const prefix = 'const pageReadDiagnostics=undefined;let pageReadId=0;const pageReadReceipts=new Map();\n';
  if (sha(extracted) !== FIXTURE.readerModuleSha256 || extracted.toString('utf8') !== prefix + readerSource + 'export {getBytes};\n') throw new Error('EXTRACTED_READER_MISMATCH');
  return { tool, readerSource, fixtureBytes: observed.find(item => item.path.endsWith('en-04.wav')).data, sources: observed.map(({ data, ...item }) => item), toolPath: fileURLToPath(tool) };
}
