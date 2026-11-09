import assert from 'node:assert/strict';
import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { root, listFiles, sourceMap } from './files.mjs';
const manifestName = 'evidence/m1/CANDIDATE-MANIFEST.json';
const checksumName = 'evidence/m1/CANDIDATE-MANIFEST.sha256';
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
const targetPath = name => { assert(!name.includes('\\') && !name.split('/').includes('..') && !name.includes(':') && !name.startsWith('/')); const target = path.resolve(root, name); assert(target.startsWith(path.resolve(root) + path.sep)); return target; };
async function inventory() {
  const names = (await listFiles(root)).filter(name => ![manifestName, checksumName].includes(name));
  const files = [];
  for (const name of names) { const buffer = await readFile(targetPath(name)); files.push({ path: name, bytes: buffer.length, sha256: digest(buffer) }); }
  return files;
}
for (const [name, buffer] of await sourceMap()) assert((await readFile(targetPath(`dist/${name}`))).equals(buffer), 'dist/public mismatch');
if (process.argv.includes('--verify')) {
  const manifest = JSON.parse(await readFile(targetPath(manifestName), 'utf8'));
  assert.deepEqual(await inventory(), manifest.files, 'Frozen bytes/paths changed');
  const hash = digest(await readFile(targetPath(manifestName)));
  assert.equal((await readFile(targetPath(checksumName), 'utf8')).trim(), `${hash}  CANDIDATE-MANIFEST.json`);
  process.stdout.write(`PASS frozen candidate: ${manifest.files.length} files; manifest SHA-256 ${hash}\n`);
} else {
  try { await access(targetPath(manifestName)); throw new Error('Candidate already frozen; use --verify'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const files = await inventory();
  const manifest = { candidateId: 'B20-49-M1-2026-10-23-r1', candidateDate: '2026-10-23', scope: 'local bilingual M1 candidate; no browser acceptance or publication', files };
  const buffer = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(targetPath(manifestName), buffer);
  await writeFile(targetPath(checksumName), `${digest(buffer)}  CANDIDATE-MANIFEST.json\n`);
  process.stdout.write(`FROZEN ${files.length} files; manifest SHA-256 ${digest(buffer)}\n`);
}
