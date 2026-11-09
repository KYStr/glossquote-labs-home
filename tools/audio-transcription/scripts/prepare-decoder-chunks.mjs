import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createRuntimePrepDirectory, pinnedSources } from './stage-model.mjs';
import { root, selectedModel, verifyFile } from './verify-assets.mjs';

const decoderPath = `/models/whisper-base/${selectedModel.revision}/onnx/decoder_model_merged_quantized.onnx`;
const maxAssetBytes = 25 * 1024 ** 2;
const fragments = [
  { offset: 0, bytes: 20971520, sha256: '1fea536e721bfb5767316fef388d147287834485706326204f6cb290d1ad6bce' },
  { offset: 20971520, bytes: 20971520, sha256: '4887b177b8f5782442613313a9785395be5eab2f27251fdfaa026bc75e501a0f' },
  { offset: 41943040, bytes: 11764499, sha256: '111aedef8f0120320f184ff5b9bd419605c09fbc486cfce07f637d740b2cefc0' },
];

async function prepareDecoderChunks() {
  const source = pinnedSources.find(asset => asset.path === decoderPath);
  const publicRoot = path.join(root, 'public');
  const decoder = path.resolve(publicRoot, decoderPath.slice(1));
  await verifyFile(decoder, source, publicRoot);
  const directory = await createRuntimePrepDirectory('decoder');
  const assembled = createHash('sha256');
  const parts = [];
  let total = 0;
  for (const fragment of fragments) {
    if (fragment.offset !== total || fragment.bytes < 1 || fragment.bytes > maxAssetBytes) throw new Error('DECODER_PLAN_INVALID');
    const name = `decoder-${parts.length + 1}.bin`;
    const file = path.join(directory, name);
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
    parts.push({ name, ...fragment });
  }
  if (total !== source.bytes || assembled.digest('hex') !== source.sha256) throw new Error('DECODER_REASSEMBLY_MISMATCH');
  const receipt = {
    status: 'PREPARED_NOT_DEPLOYABLE',
    logicalDecoder: { path: decoderPath, bytes: total, sha256: source.sha256 },
    maxAssetBytes,
    parts,
    orderedReassembly: 'PASS',
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
