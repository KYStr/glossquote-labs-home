import { mkdir, writeFile, readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, readSources, treeFiles, assertAllowlist } from './files.mjs';

export async function buildTo({ sourceRoot = path.join(ROOT, 'public'), destination = path.join(ROOT, 'dist') } = {}) {
  const sources = await readSources(sourceRoot);
  const existing = await treeFiles(destination, { optional: true });
  assertAllowlist(existing, [...PUBLIC_FILES, 'manifest.json'], { subset: true });
  await mkdir(destination, { recursive: true });
  const records = [];
  for (const [name, bytes] of sources) {
    const target = path.join(destination, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: 'w' });
    const actual = await readFile(target);
    if (!(await lstat(target)).isFile() || !actual.equals(bytes)) throw new Error('BUILD_BYTES_MISMATCH');
    records.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await writeFile(path.join(destination, 'manifest.json'), JSON.stringify({ mode: 'preview-noindex', files: records }, null, 2) + '\n');
  assertAllowlist(await treeFiles(destination), [...PUBLIC_FILES, 'manifest.json']);
  return records;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const records = await buildTo();
    console.log(`PASS preview build: ${records.length} allowlisted files; exact byte verification; no server started.`);
  } catch (error) { console.error(`BUILD_FAILED ${error.message}`); process.exitCode = 1; }
}
