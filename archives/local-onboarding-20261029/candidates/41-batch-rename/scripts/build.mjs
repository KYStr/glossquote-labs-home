import { copyFile, lstat, mkdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, assertPublicTree, inspectTree, inside, check } from './check.mjs';

export async function copyPublic(source = join(ROOT, 'public'), output = join(ROOT, 'dist')) {
  source = resolve(source);
  output = resolve(output);
  const standard = source === join(ROOT, 'public') && output === join(ROOT, 'dist');
  const testRoot = dirname(source);
  const synthetic = inside(join(ROOT, 'evidence', 'm1'), testRoot) && basename(testRoot).startsWith('tmp-scaffold-') &&
    dirname(output) === testRoot && basename(source) === 'public' && basename(output) === 'dist';
  if (!standard && !synthetic) throw new Error('UNSAFE_BUILD_PATH');
  if (!inside(ROOT, source) || !inside(ROOT, output) || source === output || inside(source, output) || inside(output, source)) throw new Error('UNSAFE_BUILD_PATH');
  await assertPublicTree(source);
  try {
    const existing = await inspectTree(output);
    if (existing.some(file => !PUBLIC_FILES.includes(file))) throw new Error('STALE_DIST');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Validate ancestors before any mkdir/copy, including absent output roots.
  for (let current = output; current !== ROOT; current = dirname(current)) {
    try { const stat = await lstat(current); if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('UNSAFE_OUTPUT'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  await mkdir(output, { recursive: true });
  for (const file of PUBLIC_FILES) {
    const target = join(output, file);
    try { if (!(await lstat(target)).isFile() || (await lstat(target)).isSymbolicLink()) throw new Error('UNSAFE_OUTPUT'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(source, file), target);
    if (!(await readFile(join(source, file))).equals(await readFile(target))) throw new Error('COPY_MISMATCH');
  }
  await assertPublicTree(output);
  return { status: 'PASS', output: 'dist/', files: PUBLIC_FILES.length, byteEquality: true, preview: 'noindex' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await check(); console.log(JSON.stringify(await copyPublic())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
