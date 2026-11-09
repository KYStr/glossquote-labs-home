import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const own = fileURLToPath(new URL('./', import.meta.url));
const root = fileURLToPath(new URL('../../../', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function verifyRows(base, rows) {
  assert(Array.isArray(rows) && rows.length > 0);
  const seen = new Set();
  for (const row of rows) {
    assert.equal(typeof row.path, 'string');
    assert(!path.isAbsolute(row.path) && !row.path.includes('\\') && !row.path.split('/').some(part => !part || part === '.' || part === '..'));
    assert(!seen.has(row.path), 'duplicate binding path'); seen.add(row.path);
    assert(Number.isSafeInteger(row.bytes) && row.bytes >= 0 && /^[a-f\d]{64}$/u.test(row.sha256));
    const file = path.resolve(base, row.path), relative = path.relative(base, file);
    assert(relative && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep));
    for (let current = file; current !== path.resolve(base); current = path.dirname(current)) {
      assert(!(await lstat(current)).isSymbolicLink(), 'symlink binding rejected');
    }
    assert((await lstat(file)).isFile(), 'bound input must be a file');
    const bytes = await readFile(file);
    assert.equal(bytes.length, row.bytes, row.path + ' bytes');
    assert.equal(digest(bytes), row.sha256, row.path + ' SHA-256');
  }
  return rows.length;
}

export async function verifySourceBinding() {
  const binding = JSON.parse(await readFile(new URL('./source-binding.json', import.meta.url), 'utf8'));
  assert.equal(binding.schema, 'NC25_INTEGRATED_F02_BINDING_V1');
  assert.equal(binding.task, 'NC25-12-F02');
  const inputFiles = await verifyRows(root, binding.inputFiles);
  const candidateSources = await verifyRows(own, binding.candidateSources);
  let inventoryFiles = null;
  try {
    const inventory = JSON.parse(await readFile(new URL('./candidate-inventory.json', import.meta.url), 'utf8'));
    assert.equal(inventory.state, 'FROZEN');
    assert.equal(inventory.task, 'NC25-12-F02');
    inventoryFiles = await verifyRows(own, inventory.files);
  } catch (error) {
    if (error.code !== 'ENOENT' || !error.path?.endsWith('candidate-inventory.json')) throw error;
  }
  return { status: 'PASS', inputFiles, candidateSources, inventoryFiles, scope: 'OFFLINE_SOURCE_BINDING_ONLY' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await verifySourceBinding(), null, 2));
}
