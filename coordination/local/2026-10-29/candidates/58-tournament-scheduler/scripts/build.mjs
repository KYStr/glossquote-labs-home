import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, PUBLIC_FILES, inspectSite, closedTree } from './check.mjs';

export async function buildPreview({ source = join(PROJECT_ROOT, 'public'), target = join(PROJECT_ROOT, 'dist') } = {}) {
  const contents = await inspectSite(source);
  const existing = await closedTree(target, { allowMissing: true });
  if (existing.exists) {
    for (const file of PUBLIC_FILES) if (!(await readFile(join(target, file))).equals(contents.get(file))) throw new Error('STALE_OUTPUT: use a reviewed empty output directory; no files removed');
  } else {
    await mkdir(target); // Never delete or silently replace an unknown output tree.
    for (const directory of ['en', 'styles', 'js', 'js/core']) await mkdir(join(target, directory));
    for (const file of PUBLIC_FILES) await writeFile(join(target, file), contents.get(file), { flag: 'wx' });
  }
  const verified = await inspectSite(target);
  return PUBLIC_FILES.map(file => {
    if (!verified.get(file).equals(contents.get(file))) throw new Error('BUILD_BYTES');
    return { path: file, bytes: verified.get(file).length, sha256: createHash('sha256').update(verified.get(file)).digest('hex') };
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const files = await buildPreview(); process.stdout.write(`PASS: ${files.length} exact preview files in dist; noindex,nofollow; no production output.\n`); }
  catch (error) { process.stderr.write(`BUILD FAILED: ${error.message}\n`); process.exitCode = 1; }
}
