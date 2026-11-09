import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, lstat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './files.mjs';

const EVIDENCE = path.join(ROOT, 'evidence', 'm1b');
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readonlyNames = new Set(['AGENTS.md', 'START-HERE.md', 'README.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md']);
const protectedPath = (name) => readonlyNames.has(name) || ['public/', 'dist/', 'docs/', 'evidence/m1/'].some((prefix) => name.startsWith(prefix));

async function records({ sourceOnly = false } = {}) {
  const result = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(ROOT, relative))) {
      const name = relative ? relative + '/' + entry : entry;
      if (name === '.git' || name === 'node_modules' || name === 'release-artifacts' || name === 'evidence/m1b') continue;
      if (sourceOnly && (name === 'dist' || name === 'evidence')) continue;
      assert.ok(!name.split('/').includes('..') && !name.includes('\\') && !path.isAbsolute(name));
      const stat = await lstat(path.join(ROOT, name));
      assert.ok(!stat.isSymbolicLink(), 'UNSAFE_EVIDENCE_INPUT');
      if (stat.isDirectory()) await walk(name);
      else {
        assert.ok(stat.isFile());
        const bytes = await readFile(path.join(ROOT, name));
        result.push({ path: name, bytes: bytes.length, sha256: sha(bytes) });
      }
    }
  }
  await walk();
  return result.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
async function verifyProtected() {
  const expected = JSON.parse(await readFile(path.join(EVIDENCE, 'protected-before.json'), 'utf8'));
  const actual = (await records()).filter((item) => protectedPath(item.path));
  assert.deepEqual(actual, expected.files, 'M1_PROTECTED_INPUT_CHANGED');
  return actual;
}
const mode = process.argv[2];
assert.equal(process.argv.length, 3, 'EXPECTED_ONE_MODE');
if (mode === 'capture') {
  const files = (await records()).filter((item) => protectedPath(item.path));
  await writeFile(path.join(EVIDENCE, 'protected-before.json'), JSON.stringify({ files, sha256: sha(JSON.stringify(files)) }, null, 2) + '\n', { flag: 'wx' });
  const publicFiles = files.filter((item) => item.path.startsWith('public/')).map((item) => ({ ...item, path: item.path.slice(7) }));
  await writeFile(path.join(ROOT, 'scripts', 'release-inputs.json'), JSON.stringify({ schemaVersion: 1, version: '0.1.0-m1', files: publicFiles }, null, 2) + '\n', { flag: 'wx' });
  console.log(`CAPTURED ${files.length} immutable M1/contract files and ${publicFiles.length} pinned public inputs.`);
} else if (mode === 'verify') {
  const files = await verifyProtected();
  console.log(`PASS ${files.length} immutable M1/contract files; ${sha(JSON.stringify(files))}`);
} else if (mode === 'freeze') {
  await verifyProtected();
  const files = await records({ sourceOnly: true });
  const inventory = { version: '0.1.0-m1b', scope: 'Tool sources/contracts; excludes dist/evidence/release-artifacts/.git/node_modules', files, sourceTreeSha256: sha(JSON.stringify(files)) };
  await writeFile(path.join(EVIDENCE, 'source-inventory.json'), JSON.stringify(inventory, null, 2) + '\n', { flag: 'wx' });
  console.log(`FROZEN ${files.length} source files; ${inventory.sourceTreeSha256}`);
} else throw new Error('UNKNOWN_MODE');
