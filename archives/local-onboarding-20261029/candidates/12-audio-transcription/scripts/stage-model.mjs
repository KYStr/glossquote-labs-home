import { mkdir, readFile, writeFile, lstat, realpath, rename } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, selectedModel, verifyAssets, verifyFile } from './verify-assets.mjs';
import { validateManifest } from '../public/js/core/manifest.mjs';

const modelRoot = `/models/whisper-base/${selectedModel.revision}/`;
const hubRoot = `https://huggingface.co/${selectedModel.modelId}/resolve/${selectedModel.revision}/`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const mime = name => name.endsWith('.json') ? 'application/json' : name.endsWith('.onnx') ? 'application/octet-stream' : 'text/plain';
const modelSources = [
  ['config.json', 2248, 'd1d347fdb422e6347c2f843a90d375aa67ea3f4b3e20d2c3075f9a9f6243685b'],
  ['generation_config.json', 3776, '3bba359e33fdd6dc1c10f71846a477d339b0242f462f70ea1dd73274caa38d05'],
  ['preprocessor_config.json', 339, 'a6a76d28c93edb273669eb9e0b0636a2bddbb1272c3261e47b7ca6dfdbac1b8d'],
  ['tokenizer.json', 2480466, '27fc476bfe7f17299480be2273fc0608e4d5a99aba2ab5dec5374b4482d1a566'],
  ['tokenizer_config.json', 282683, '2a4c4281cf9f51ac6ccc406fdc711a087afe6530f671fa7b80953edc498275ce'],
  ['onnx/encoder_model_quantized.onnx', 23200850, '3e345e977b55620a37c0c2b2af0644e019afdfad562dcf71eb929bb7274285f9'],
  ['onnx/decoder_model_merged_quantized.onnx', 53707539, 'a6beb6baabb66f00b6a686d828c95ffca6146d51900cbad0266cad38f64cf861'],
  ['MODEL-CARD.txt', 1160, 'dc362c71002d21febf5cd5256713cd9406d0eb5c32631f73a39791af6029ce9d', 'README.md'],
].map(([name, bytes, sha256, sourceName = name]) => ({ path: modelRoot + name, bytes, sha256, mime: mime(name), url: hubRoot + sourceName }));

const vendorSources = [
  ['@huggingface/transformers', '3.8.1', 'dist/transformers.min.js', '/vendor/transformers/transformers.min.js', 888173, 'aa5002b70e789798da263f5f99c62bd3e8fcd0c119258a493c40c180648365fa', 'text/javascript'],
  ['@huggingface/transformers', '3.8.1', 'LICENSE', '/vendor/transformers/LICENSE.txt', 11358, 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30', 'text/plain'],
  ['@huggingface/jinja', '0.5.10', 'LICENSE', '/vendor/transformers/JINJA-LICENSE.txt', 1069, 'd6e7b19451c1b3d1d66353bb4b1274138953b3bfd9ae60c56e77b1f548796982', 'text/plain'],
  ['onnxruntime-web', '1.22.0-dev.20250409-89f8206ba4', 'dist/ort-wasm-simd-threaded.jsep.mjs', '/vendor/onnx/ort-wasm-simd-threaded.jsep.mjs', 44484, '08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9', 'text/javascript'],
  ['onnxruntime-web', '1.22.0-dev.20250409-89f8206ba4', 'dist/ort-wasm-simd-threaded.jsep.wasm', '/vendor/onnx/ort-wasm-simd-threaded.jsep.wasm', 21596019, 'c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39', 'application/wasm'],
].map(([packageId, version, sourcePath, assetPath, bytes, sha256, contentType]) => ({ packageId, version, sourcePath, path: assetPath, bytes, sha256, mime: contentType }));

const noticeSources = [
  [modelRoot + 'LICENSE-APACHE.txt', 'https://raw.githubusercontent.com/huggingface/transformers.js/3.8.1/LICENSE', 11358, 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30'],
  [modelRoot + 'OPENAI-LICENSE.txt', 'https://raw.githubusercontent.com/openai/whisper/v20250625/LICENSE', 1063, 'b5d65a59060e68c4ff940e1eddfa6f94b2d68fdf58ed7f4dd57721c997e35e9d'],
  [modelRoot + 'UPSTREAM-MODEL-CARD.txt', 'https://huggingface.co/openai/whisper-base/resolve/e37978b90ca9030d5170a5c07aadb050351a65bb/README.md', 19811, '72895b74a093b6a84ded3eecb5d9c8ebaa2d271d16d37ee0fb0115b6fe62c36c'],
  ['/vendor/onnx/LICENSE.txt', 'https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/LICENSE', 1073, '2f07c72751aed99790b8a4869cf2311df85a860b22ded05fa22803587a48922c'],
  ['/vendor/onnx/ThirdPartyNotices.txt', 'https://raw.githubusercontent.com/microsoft/onnxruntime/89f8206ba4/ThirdPartyNotices.txt', 326866, 'e9e90971a8e75a9a8ac0c6412e29c1202d079998389915aa485f46c816c3b4cc'],
].map(([assetPath, url, bytes, sha256]) => ({ path: assetPath, url, bytes, sha256, mime: 'text/plain' }));

export const pinnedSources = Object.freeze([...modelSources, ...vendorSources, ...noticeSources]);

export function allowedDownloadUrl(value) {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password
    && (['huggingface.co', 'raw.githubusercontent.com', 'cas-bridge.xethub.hf.co', 'us.aws.cdn.hf.co'].includes(url.hostname)
      || /^cdn-lfs(?:-[a-z\d-]+)?\.hf\.co$/u.test(url.hostname));
}

export async function downloadPinned(source, fetcher = fetch) {
  let url = source.url;
  let response;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (!allowedDownloadUrl(url)) throw new Error('UNAPPROVED_SOURCE_HOST');
    response = await fetcher(url, { credentials: 'omit', redirect: 'manual', cache: 'no-store', headers: { 'Accept-Encoding': 'identity' }, signal: AbortSignal.timeout(180_000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirects === 5) throw new Error('SOURCE_REDIRECT_REJECTED');
      url = new URL(location, url).href;
    } else break;
  }
  if (!response.ok || !response.body) throw new Error('PUBLIC_SOURCE_UNAVAILABLE');
  const declared = response.headers.get('content-length');
  const encoded = response.headers.get('content-encoding');
  if ((!encoded || encoded === 'identity') && declared !== null && Number(declared) !== source.bytes) {
    await response.body.cancel();
    throw new Error('SOURCE_SIZE_MISMATCH');
  }
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  for (;;) {
    const result = await reader.read();
    if (result.done) break;
    bytes += result.value.length;
    if (bytes > source.bytes) { await reader.cancel(); throw new Error('SOURCE_SIZE_MISMATCH'); }
    chunks.push(Buffer.from(result.value));
  }
  const buffer = Buffer.concat(chunks);
  if (bytes !== source.bytes || hash(buffer) !== source.sha256) throw new Error('SOURCE_INTEGRITY_FAILED');
  return buffer;
}

async function installedAsset(source) {
  const directory = path.join(root, 'node_modules', source.packageId);
  const metadata = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  if (metadata.version !== source.version) throw new Error('RUNTIME_VERSION_MISMATCH');
  const file = path.join(directory, source.sourcePath);
  await verifyFile(file, source, directory);
  const bytes = await readFile(file);
  if (bytes.length !== source.bytes || hash(bytes) !== source.sha256) throw new Error('SOURCE_INTEGRITY_FAILED');
  return bytes;
}

async function saveAsset(temporaryRoot, source, bytes) {
  const target = path.resolve(temporaryRoot, source.path.slice(1));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: 'wx' });
}

async function publishStagedFile(temporaryRoot, assetPath) {
  const publicRoot = path.join(root, 'public');
  if ((await lstat(publicRoot)).isSymbolicLink() || await realpath(publicRoot) !== publicRoot) throw new Error('PUBLIC_ROOT_INVALID');
  const target = path.resolve(publicRoot, assetPath.slice(1));
  let directory = publicRoot;
  for (const part of assetPath.slice(1).split('/').slice(0, -1)) {
    directory = path.join(directory, part);
    try { await mkdir(directory); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    if ((await lstat(directory)).isSymbolicLink() || !(await lstat(directory)).isDirectory()) throw new Error('PUBLIC_ROOT_INVALID');
  }
  const staged = await readFile(path.resolve(temporaryRoot, assetPath.slice(1)));
  try {
    if ((await lstat(target)).isSymbolicLink()) throw new Error('PUBLIC_ROOT_INVALID');
    const existing = await readFile(target);
    if (hash(existing) !== hash(staged)) throw new Error('EXISTING_ASSET_CONFLICT');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await writeFile(target, staged, { flag: 'wx' });
  }
}

export async function stageModel({ reuseRoot } = {}) {
  const evidenceRoot = path.resolve(root, '../../.runs/audio-transcription/20261011-unblock');
  await mkdir(evidenceRoot, { recursive: true });
  if (reuseRoot) {
    reuseRoot = path.resolve(reuseRoot);
    const relative = path.relative(evidenceRoot, reuseRoot);
    if (!/^stage-[a-zA-Z\d-]+$/u.test(relative) || await realpath(reuseRoot) !== reuseRoot || (await lstat(reuseRoot)).isSymbolicLink()) throw new Error('REUSE_ROOT_INVALID');
  }
  const temporaryRoot = path.join(evidenceRoot, `stage-${new Date().toISOString().replaceAll(/[:.]/gu, '-')}`);
  await mkdir(temporaryRoot);
  const records = [];
  const acquisitions = [];
  for (const source of pinnedSources) {
    let bytes;
    if (reuseRoot) {
      try {
        const previous = path.resolve(reuseRoot, source.path.slice(1));
        await verifyFile(previous, source, reuseRoot);
        bytes = await readFile(previous);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const reused = bytes !== undefined;
    bytes ??= source.url ? await downloadPinned(source) : await installedAsset(source);
    await saveAsset(temporaryRoot, source, bytes);
    acquisitions.push({ path: source.path, method: reused ? 'verified-task-stage' : source.url ? 'fixed-public-download' : 'locked-npm-package' });
    records.push({ path: source.path, bytes: bytes.length, sha256: hash(bytes), mime: source.mime });
    console.log(`VERIFIED ${source.path}`);
  }
  const notice = Buffer.from(`GlossQuote local transcription distribution notices\n\nConverted model: ${selectedModel.modelId}@${selectedModel.revision}\nIts immutable model card explicitly declares Apache-2.0 for this ONNX repository. MODEL-CARD.txt preserves that statement; LICENSE-APACHE.txt contains the complete Apache-2.0 license text. The original OpenAI Whisper code and weights have an MIT statement; OPENAI-LICENSE.txt preserves its copyright and license. UPSTREAM-MODEL-CARD.txt preserves the separate Hugging Face upstream model declaration. We distribute the selected converted q8 files unchanged. This provenance record is not an independent legal certification.\n\nTransformers.js 3.8.1: Apache-2.0; /vendor/transformers/LICENSE.txt. Its bundled Jinja dependency: MIT; /vendor/transformers/JINJA-LICENSE.txt. ONNX Runtime 1.22.0-dev.20250409-89f8206ba4: MIT; /vendor/onnx/LICENSE.txt, with the complete upstream ThirdPartyNotices.txt from that fixed runtime commit. No native sharp, libvips, or onnxruntime-node files are distributed in public.\n`, 'utf8');
  const noticeSource = { path: modelRoot + 'NOTICE.txt', bytes: notice.length, sha256: hash(notice), mime: 'text/plain' };
  await saveAsset(temporaryRoot, noticeSource, notice);
  records.push(noticeSource);
  const manifest = validateManifest({ schemaVersion: 1, ...selectedModel, dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }, files: records }, selectedModel);
  await writeFile(path.join(temporaryRoot, 'model-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  await verifyAssets(temporaryRoot);
  for (const record of records) await publishStagedFile(temporaryRoot, record.path);
  const manifestTemporary = path.join(root, 'public', `manifest-stage-${randomUUID()}.tmp`);
  await writeFile(manifestTemporary, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  await rename(manifestTemporary, path.join(root, 'public', 'model-manifest.json'));
  const result = await verifyAssets();
  await writeFile(path.join(temporaryRoot, 'stage-result.json'), JSON.stringify({ ...result, sources: pinnedSources, notice: noticeSource, acquisitions }, null, 2) + '\n', { flag: 'wx' });
  return { ...result, evidence: temporaryRoot };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] && !process.argv[2].startsWith('--reuse-stage='))) throw new Error('STAGE_ARGUMENT_INVALID');
    const reuseRoot = process.argv[2]?.slice('--reuse-stage='.length);
    console.log(`STAGE PASS: ${JSON.stringify(await stageModel({ reuseRoot }))}`);
  }
  catch (error) { console.error(`STAGE FAIL: ${error.message}`); process.exitCode = 1; }
}
