import { cp, mkdir, lstat, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject, walk } from './check.mjs';
import { inside, projectRoot, publicRoot } from './serve.mjs';
import { verifyAssets } from './verify-assets.mjs';
import { validateSelectedManifest } from '../public/js/core/manifest.mjs';
import { DECODER_DISTRIBUTION, DECODER_PATH, MAX_STATIC_ASSET_BYTES } from '../public/js/core/decoder-distribution.mjs';
import { writeDecoderChunks } from './prepare-decoder-chunks.mjs';

export async function build() {
  await checkProject();
  const root = await realpath(projectRoot);
  const destination = path.resolve(root, 'dist');
  const files = await walk(publicRoot);
  for (const file of files) if (!['.html', '.css', '.mjs', '.js', '.json', '.txt', '.svg', '.ico', '.png', '.wasm', '.onnx', '.bin'].includes(path.extname(file))) throw new Error('UNAPPROVED_BUILD_FILE');
  const manifestPath = 'model-manifest.json';
  const sourceManifest = JSON.parse(await readFile(path.join(publicRoot, manifestPath), 'utf8'));
  if (Object.hasOwn(sourceManifest, 'decoderDistribution')) throw new Error('EXPECTED_UNSPLIT_SOURCE');
  const manifest = validateSelectedManifest({ ...sourceManifest, decoderDistribution: DECODER_DISTRIBUTION });
  const copies = files.filter(file => ![manifestPath, DECODER_PATH.slice(1)].includes(path.relative(publicRoot, file).split(path.sep).join('/')));
  for (const file of copies) if ((await stat(file)).size > MAX_STATIC_ASSET_BYTES) throw new Error('STATIC_ASSET_SIZE_LIMIT');
  if (!inside(root, destination) || path.relative(root, destination) !== 'dist') throw new Error('UNSAFE_BUILD_DESTINATION');
  try {
    const info = await lstat(destination);
    if (info.isSymbolicLink() || !(info.isDirectory()) || await realpath(destination) !== destination) throw new Error('UNSAFE_BUILD_DESTINATION');
    await rm(destination, { recursive: true });
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(destination);
  for (const file of copies) {
    const relative = path.relative(publicRoot, file);
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(file, target, { dereference: false, errorOnExist: true });
  }
  await writeDecoderChunks(publicRoot, destination);
  await writeFile(path.join(destination, manifestPath), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  await verifyAssets(destination, undefined, { requireDistribution: true });
  return copies.length + 1 + DECODER_DISTRIBUTION.parts.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`BUILD PASS: ${await build()} static distribution files in dist`); }
  catch (error) { console.error(`BUILD FAIL: ${error.message}`); process.exitCode = 1; }
}
