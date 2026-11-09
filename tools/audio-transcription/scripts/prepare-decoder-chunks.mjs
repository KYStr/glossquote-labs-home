import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createRuntimePrepDirectory, pinnedSources } from './stage-model.mjs';
import { root, verifyFile } from './verify-assets.mjs';
import { DECODER_DISTRIBUTION, DECODER_PATH, MAX_STATIC_ASSET_BYTES } from '../public/js/core/decoder-distribution.mjs';

export async function writeDecoderChunks(publicRoot, directory, { flat = false } = {}) {
  const source = pinnedSources.find(asset => asset.path === DECODER_PATH);
  const decoder = path.resolve(publicRoot, DECODER_PATH.slice(1));
  await verifyFile(decoder, source, publicRoot);
  const assembled = createHash('sha256');
  const parts = [];
  let total = 0;
  for (const fragment of DECODER_DISTRIBUTION.parts) {
    if (fragment.offset !== total || fragment.bytes < 1 || fragment.bytes > MAX_STATIC_ASSET_BYTES) throw new Error('DECODER_PLAN_INVALID');
    const name = flat ? `decoder-${parts.length + 1}.bin` : fragment.path.slice(1);
    const file = path.resolve(directory, name);
    await mkdir(path.dirname(file), { recursive: true });
    await pipeline(
      createReadStream(decoder, { start: fragment.offset, end: fragment.offset + fragment.bytes - 1 }),
      createWriteStream(file, { flags: 'wx' }),
    );
    const digest = createHash('sha256');
    let bytes = 0;
    for await (const chunk of createReadStream(file)) {
      bytes += chunk.length;
      if (bytes > fragment.bytes) throw new Error('DECODER_FRAGMENT_MISMATCH');
      digest.update(chunk);
      assembled.update(chunk);
    }
    if (bytes !== fragment.bytes || digest.digest('hex') !== fragment.sha256) throw new Error('DECODER_FRAGMENT_MISMATCH');
    total += bytes;
    parts.push({ name, offset: fragment.offset, bytes: fragment.bytes, sha256: fragment.sha256 });
  }
  if (total !== source.bytes || assembled.digest('hex') !== source.sha256) throw new Error('DECODER_REASSEMBLY_MISMATCH');
  return { logicalDecoder: { path: DECODER_PATH, bytes: total, sha256: source.sha256 }, parts, orderedReassembly: 'PASS' };
}

async function prepareDecoderChunks() {
  const directory = await createRuntimePrepDirectory('decoder');
  const receipt = {
    status: 'PREPARED_NOT_DEPLOYABLE',
    maxAssetBytes: MAX_STATIC_ASSET_BYTES,
    ...await writeDecoderChunks(path.join(root, 'public'), directory, { flat: true }),
  };
  await writeFile(path.join(directory, 'decoder-chunks.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return { ...receipt, directory: path.relative(root, directory).replaceAll('\\', '/') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('CHUNK_ARGUMENT_INVALID');
    console.log(`CHUNKS PASS: ${JSON.stringify(await prepareDecoderChunks())}`);
  } catch (error) {
    console.error(`CHUNKS FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
