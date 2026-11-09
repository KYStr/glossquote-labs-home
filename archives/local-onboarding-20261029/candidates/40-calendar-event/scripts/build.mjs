import { mkdir, lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, check, inventory } from './check.mjs';

export async function build(destination = path.join(ROOT, 'dist')) {
  if (path.resolve(destination) !== path.join(ROOT, 'dist')) throw new Error('BUILD_TARGET_NOT_ALLOWED');
  await check();
  await assertFreshOutput(destination);
  const directories = new Set(['', ...PUBLIC_FILES.map(file => path.dirname(file)).filter(p => p !== '.')]);
  for (const directory of directories) {
    const target = path.join(destination, directory);
    await mkdir(target, { recursive: true });
    const stat = await lstat(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('UNSAFE_OUTPUT_DIRECTORY');
  }
  for (const file of PUBLIC_FILES) await writeFile(path.join(destination, file), await readFile(path.join(ROOT, 'public', file)));
  const written = await inventory(destination);
  if (written.length !== PUBLIC_FILES.length) throw new Error('INCOMPLETE_BUILD');
  return written;
}

// Refuse stale bytes and unknown paths. A reviewed earlier build must be retained separately.
export async function assertFreshOutput(destination) {
  let previous = [];
  try { previous = await inventory(destination); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  for (const file of previous) {
    if (!(await readFile(path.join(destination, file))).equals(await readFile(path.join(ROOT, 'public', file)))) throw new Error('STALE_DIST');
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { process.stdout.write(`BUILD PASS: ${(await build()).length} preview files; noindex.\n`); }
  catch (error) { process.stderr.write(`BUILD FAIL: ${error.message}\n`); process.exitCode = 1; }
}
