import { createReadStream } from 'node:fs';
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseManifest, totalAssetBytes, SELECTED_MODEL, validateSelectedManifest } from '../public/js/core/manifest.mjs';

export const selectedModel = SELECTED_MODEL;
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');

function inside(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function verifyFile(absolute, expected, parentRoot) {
  const canonicalRoot = await realpath(parentRoot);
  if (!inside(canonicalRoot, absolute) || await realpath(parentRoot) !== path.resolve(parentRoot)) throw new Error('ASSET_PATH_INVALID');
  let current = canonicalRoot;
  for (const part of path.relative(canonicalRoot, absolute).split(path.sep)) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('ASSET_SYMLINK_REJECTED');
  }
  if (!inside(canonicalRoot, await realpath(absolute))) throw new Error('ASSET_PATH_INVALID');
  const info = await lstat(absolute);
  if (!info.isFile() || info.size !== expected.bytes) throw new Error('ASSET_INTEGRITY_FAILED');
  const hash = createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(absolute)) {
    bytes += chunk.length;
    if (bytes > expected.bytes) throw new Error('ASSET_INTEGRITY_FAILED');
    hash.update(chunk);
  }
  if (bytes !== expected.bytes || hash.digest('hex') !== expected.sha256) throw new Error('ASSET_INTEGRITY_FAILED');
}

async function listFiles(directory) {
  const info = await lstat(directory);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('ASSET_PATH_INVALID');
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if ((await lstat(absolute)).isSymbolicLink()) throw new Error('ASSET_SYMLINK_REJECTED');
    if (entry.isDirectory()) files.push(...await listFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
    else throw new Error('ASSET_PATH_INVALID');
  }
  return files;
}

export async function verifyAssets(assetRoot = publicRoot, expected = selectedModel) {
  const manifest = parseManifest(await readFile(path.join(assetRoot, 'model-manifest.json'), 'utf8'), expected);
  if (manifest.modelId === selectedModel.modelId && manifest.revision === selectedModel.revision) validateSelectedManifest(manifest);
  for (const file of manifest.files) await verifyFile(path.resolve(assetRoot, file.path.slice(1)), file, assetRoot);
  const listed = new Set(manifest.files.map(file => path.resolve(assetRoot, file.path.slice(1))));
  for (const directory of ['models', 'vendor']) {
    for (const file of await listFiles(path.join(assetRoot, directory))) if (!listed.has(file)) throw new Error('UNLISTED_PUBLIC_ASSET');
  }
  return { modelId: manifest.modelId, revision: manifest.revision, files: manifest.files.length, bytes: totalAssetBytes(manifest) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`ASSETS PASS: ${JSON.stringify(await verifyAssets())}`); }
  catch (error) { console.error(`ASSETS FAIL: ${error.message}`); process.exitCode = 1; }
}
