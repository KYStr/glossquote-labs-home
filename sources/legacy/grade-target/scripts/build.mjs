import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { root, expectedBuild, inventory, sha256, verifyBuild } from './assets.mjs';

try {
  const files = await expectedBuild();
  const dir = join(root, 'dist');
  let exists = false;
  try { await lstat(dir); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) {
    const found = await inventory(dir);
    if (found.some(path => !files.has(path) && path !== 'manifest.json')) throw new Error('unexpected-build-file');
  }
  await mkdir(dir, { recursive: true });
  const manifest = [];
  for (const [path, bytes] of [...files].sort(([a],[b]) => a.localeCompare(b, 'en'))) {
    const output = join(dir, path); await mkdir(dirname(output), { recursive: true }); await writeFile(output, bytes);
    manifest.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  await writeFile(join(dir, 'manifest.json'), JSON.stringify({ schemaVersion: 1, mode: 'preview', files: manifest }, null, 2) + '\n');
  await verifyBuild(); process.stdout.write(`PASS preview build: ${files.size} files; noindex,nofollow\n`);
} catch { process.stderr.write('FAIL preview build\n'); process.exitCode = 1; }
