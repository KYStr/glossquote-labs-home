import { readFile, mkdir, writeFile, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { PROJECT_ROOT, isWithin } from './serve.mjs';
import { RUNTIME_ID, RUNTIME_FILES, validateManifest } from '../public/js/core/manifest.mjs';

const lock = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package-lock.json'), 'utf8'));
const expected = { core: '0.12.10', ffmpeg: '0.12.15', types: '0.12.4' };
for (const [name, version] of Object.entries(expected)) {
  const installed = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'node_modules', '@ffmpeg', name, 'package.json'), 'utf8'));
  const pinned = lock.packages[`node_modules/@ffmpeg/${name}`];
  if (installed.version !== version || pinned.version !== version || !pinned.resolved.startsWith('https://registry.npmjs.org/@ffmpeg/') || !pinned.integrity.startsWith('sha512-')) throw new Error('Unreviewed package');
}
const publicRoot = await realpath(path.join(PROJECT_ROOT, 'public'));
async function save(relative, bytes) {
  const target = path.resolve(publicRoot, relative);
  if (!isWithin(publicRoot, target) || !relative.startsWith('vendor/ffmpeg/')) throw new Error('Unsafe vendor target');
  let directory = path.dirname(target);
  const ancestors = [];
  while (directory !== publicRoot) { ancestors.push(directory); directory = path.dirname(directory); }
  for (const ancestor of ancestors.reverse()) {
    try { if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Vendor symlink'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await mkdir(ancestor); }
    if (!isWithin(publicRoot, await realpath(ancestor))) throw new Error('Vendor escape');
  }
  try { if ((await lstat(target)).isSymbolicLink()) throw new Error('Vendor file symlink'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(target, bytes);
}
const files = [];
for (const entry of RUNTIME_FILES) {
  const packageName = entry.path.includes('/ffmpeg-0.12.15/') ? 'ffmpeg' : 'core';
  const source = path.join(PROJECT_ROOT, 'node_modules/@ffmpeg', packageName, 'dist/esm', path.basename(entry.path));
  if ((await lstat(source)).isSymbolicLink()) throw new Error('Vendor source symlink');
  const bytes = await readFile(source);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  files.push({ ...entry, bytes: bytes.length, sha256 });
  await save(entry.path.slice(1), bytes);
}
// Official release licensing texts, copied without altering the upstream program.
const licensing = [
  ['https://raw.githubusercontent.com/ffmpegwasm/ffmpeg.wasm/v12.15/LICENSE', 'vendor/ffmpeg/ffmpeg-0.12.15/LICENSE.MIT'],
  ['https://raw.githubusercontent.com/FFmpeg/FFmpeg/n5.1.4/COPYING.GPLv2', 'vendor/ffmpeg/core-0.12.10/LICENSE.GPL-2.0'],
];
for (const [url, target] of licensing) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error('Upstream license unavailable');
  await save(target, new Uint8Array(await response.arrayBuffer()));
}
const manifest = { schemaVersion: 1, runtimeId: RUNTIME_ID, files };
const verified = validateManifest(manifest);
await writeFile(path.join(publicRoot, 'runtime-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`PASS: staged ${files.length} unmodified runtime files, ${verified.totalBytes} bytes, plus upstream license texts.`);
