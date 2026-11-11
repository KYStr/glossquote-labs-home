import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { posix } from 'node:path';

const root = new URL('./', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.fileCountExcludingManifest, manifest.files.length);
const permitted = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?\.(?:md|mjs|json|txt)$/;
const wanted = new Set(['manifest.json']);
const subdirectories = new Set();

for (const entry of manifest.files) {
  const { path, bytes, sha256, gitBlob } = entry;
  assert(permitted.test(path) && !wanted.has(path), 'Unsafe or duplicate path: ' + path);
  wanted.add(path);
  if (path.includes('/')) subdirectories.add(posix.dirname(path));
  const url = new URL(path, root);
  const stat = await lstat(url);
  assert(stat.isFile() && !stat.isSymbolicLink(), 'Non-regular file: ' + path);
  const file = await readFile(url);
  assert.equal(file.length, bytes, path + ' length');
  assert.equal(createHash('sha256').update(file).digest('hex'), sha256, path + ' SHA-256');
  assert.equal(createHash('sha1').update('blob ' + file.length + '\0').update(file).digest('hex'), gitBlob, path + ' Git blob');
}

const found = [];
for (const child of await readdir(root, { withFileTypes: true })) {
  if (child.isDirectory() && subdirectories.has(child.name)) {
    for (const nested of await readdir(new URL(child.name + '/', root), { withFileTypes: true })) {
      assert(nested.isFile(), 'Non-regular package entry ' + child.name + '/' + nested.name);
      found.push(child.name + '/' + nested.name);
    }
  } else {
    assert(child.isFile(), 'Non-regular package entry ' + child.name);
    found.push(child.name);
  }
}
assert.deepEqual(found.sort(), [...wanted].sort(), 'File list or filename case differs');
let links = 0;
for (const path of wanted) {
  if (!path.endsWith('.md')) continue;
  const markdown = await readFile(new URL(path, root), 'utf8');
  for (const [, link] of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    if (link.startsWith('https://')) continue;
    const [relative] = link.split('#');
    if (relative === '') continue;
    assert(!relative.includes('\\') && !relative.startsWith('/'), 'Absolute link in ' + path);
    const target = posix.normalize(posix.join(posix.dirname(path), relative));
    assert(wanted.has(target), 'Broken or out-of-package link in ' + path + ': ' + link);
    links++;
  }
}
console.log('PASS ' + wanted.size + ' package files and ' + links + ' relative links');
