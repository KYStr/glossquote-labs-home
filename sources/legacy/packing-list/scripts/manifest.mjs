import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { PROJECT_ROOT, verifyRoot, verifyPath, sha256, PUBLIC_FILES, inside } from './validation.mjs';

const evidenceRoot = resolve(PROJECT_ROOT, '../../.runs/packing-list');
const destination = resolve(process.argv[2] ?? '');
if (!inside(evidenceRoot, destination) || destination === evidenceRoot) throw new Error('EVIDENCE_PATH_REQUIRED');
await verifyRoot(evidenceRoot);
await verifyPath(evidenceRoot, destination, { missing: true, directory: true });
await mkdir(destination, { recursive: true });
const fileNames = [];
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (['dist', '.git', 'node_modules'].includes(entry.name) || entry.name.startsWith('.sandbox-')) continue;
    const path = join(folder, entry.name);
    await verifyPath(PROJECT_ROOT, path, { directory: entry.isDirectory() });
    if (entry.isDirectory()) await walk(path);
    else fileNames.push(relative(PROJECT_ROOT, path).replaceAll('\\', '/'));
  }
}
await walk(PROJECT_ROOT);
fileNames.sort();
async function entries(root, names) {
  const result = [];
  for (const path of names) {
    await verifyPath(PROJECT_ROOT, join(root, path));
    const bytes = await readFile(join(root, path));
    result.push({ path, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  return result;
}
const source = await entries(PROJECT_ROOT, fileNames);
const code = source.filter(file => /^(public\/|scripts\/|test\/|package\.json$|\.gitignore$)/.test(file.path));
const runtime = await entries(join(PROJECT_ROOT, 'public'), PUBLIC_FILES);
const dist = await entries(join(PROJECT_ROOT, 'dist'), PUBLIC_FILES);
const manifests = {};
for (const [name, files] of Object.entries({ source, code, runtime, dist })) {
  const value = { schemaVersion: 1, task: 'TASK-W22-M1-T00', algorithm: 'sha256',
    digestDefinition: 'SHA-256 of UTF-8 JSON.stringify(files), ordered by relative path',
    digest: sha256(JSON.stringify(files)), fileCount: files.length, totalBytes: files.reduce((sum, file) => sum + file.bytes, 0), files };
  const target = join(destination, `${name}-manifest.json`);
  await verifyPath(evidenceRoot, target, { missing: true });
  await writeFile(target, JSON.stringify(value, null, 2) + '\n');
  manifests[name] = { digest: value.digest, files: value.fileCount, bytes: value.totalBytes };
}
console.log(JSON.stringify(manifests, null, 2));
