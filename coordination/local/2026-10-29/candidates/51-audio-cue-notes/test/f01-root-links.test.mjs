import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, readFile, readdir, lstat, symlink, rmdir, unlink, rm, rename } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { buildStatic } from '../scripts/build.mjs';
import { buildRelease, checkRelease } from '../scripts/release.mjs';

const PRODUCT = new URL('../', import.meta.url);
const LINK_TYPE = process.platform === 'win32' ? 'junction' : 'dir';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let unavailableLink = null;

function owned(root, ...parts) {
  const target = resolve(root, ...parts);
  const rel = relative(resolve(root), target);
  assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel), 'Target must stay in this task-owned fixture.');
  return target;
}

async function treeSnapshot(root) {
  // No trailing separator and no traversal through any linked entry.
  const records = [];
  const visit = async (folder, prefix = '') => {
    assert.equal((await lstat(resolve(folder))).isSymbolicLink(), false);
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = owned(root, prefix + entry.name);
      const info = await lstat(path);
      assert.equal(info.isSymbolicLink(), false, 'Snapshot must never follow a link.');
      if (info.isDirectory()) { records.push({ path: `${prefix}${entry.name}/`, type: 'directory' }); await visit(path, `${prefix}${entry.name}/`); }
      else {
        assert.equal(info.isFile(), true);
        const bytes = await readFile(path);
        records.push({ path: prefix + entry.name, bytes: bytes.length, sha256: hash(bytes) });
      }
    }
  };
  await visit(resolve(root));
  return records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

async function fixture(action) {
  if (unavailableLink) throw new Error('Owned link capability failed earlier; no further link creation attempted.', { cause: unavailableLink });
  const parent = fileURLToPath(new URL('evidence/f01/scratch/', PRODUCT));
  await mkdir(parent, { recursive: true });
  const project = await mkdtemp(join(parent, 'root link # '));
  const links = [];
  const makeLink = async (target, link) => {
    // Both resolved absolute paths are checked before creating any link.
    owned(project, relative(project, target)); owned(project, relative(project, link));
    try { await symlink(target, link, LINK_TYPE); }
    catch (error) { unavailableLink = error; throw error; }
    links.push(link);
    assert.equal((await lstat(resolve(link))).isSymbolicLink(), true, 'The native no-slash path must be a real link.');
  };
  try {
    await mkdir(owned(project, 'targets'));
    await mkdir(owned(project, 'scripts'));
    await cp(new URL('scripts/serve.mjs', PRODUCT), owned(project, 'scripts/serve.mjs'));
    const base = pathToFileURL(project + sep);
    assert.ok(base.href.endsWith('/'), 'Regression must exercise trailing-slash file URL roots.');
    await action({ project, base, makeLink });
  } finally {
    // Remove only positively identified owned links, never recurse through them.
    for (const link of links.reverse()) {
      owned(project, relative(project, link));
      assert.equal((await lstat(resolve(link))).isSymbolicLink(), true, 'Cleanup target must still be an owned link.');
      if (process.platform === 'win32') await rmdir(link);
      else await unlink(link);
    }
    const rel = relative(resolve(parent), resolve(project));
    assert.ok(rel && !rel.startsWith('..') && !isAbsolute(rel));
    // Any unexpected residual link stops cleanup rather than following a target.
    await treeSnapshot(project);
    await rm(project, { recursive: true, force: false });
  }
}

async function unchanged(t, id, target, action, expected, expectedFiles) {
  const before = await treeSnapshot(target);
  assert.equal(before.filter(entry => Object.hasOwn(entry, 'bytes')).length, expectedFiles);
  await assert.rejects(action, expected);
  const after = await treeSnapshot(target);
  assert.deepEqual(after, before, 'Rejected operation must not change any target directory or file bytes.');
  t.diagnostic(JSON.stringify({ id, platform: process.platform, linkType: LINK_TYPE, trailingSlashFileUrl: true,
    expectedRejection: expected instanceof RegExp ? expected.source : expected.code,
    targetFilesBefore: expectedFiles, targetFilesAfter: after.filter(entry => Object.hasOwn(entry, 'bytes')).length,
    targetTreeSha256Before: hash(JSON.stringify(before)), targetTreeSha256After: hash(JSON.stringify(after)), status: 'PASS' }));
}

test('F01-01: empty linked dist root rejects buildStatic before creating any target file', async t => {
  await fixture(async ({ project, base, makeLink }) => {
    await cp(new URL('public/', PRODUCT), owned(project, 'public'), { recursive: true });
    const target = owned(project, 'targets/dist-empty'); await mkdir(target);
    await makeLink(target, owned(project, 'dist'));
    await unchanged(t, 'F01-01', target, () => buildStatic(base), /Refusing linked tree root\./, 0);
    assert.deepEqual(await readdir(target), []);
  });
});

test('F01-02: valid linked public root rejects preview build with every source byte preserved', async t => {
  await fixture(async ({ project, base, makeLink }) => {
    const target = owned(project, 'targets/public-valid');
    await cp(new URL('public/', PRODUCT), target, { recursive: true });
    await makeLink(target, owned(project, 'public'));
    await unchanged(t, 'F01-02', target, () => buildStatic(base), /Refusing linked tree root\./, 13);
    await assert.rejects(lstat(owned(project, 'dist')), { code: 'ENOENT' });
  });
});

test('F01-03: fully valid linked release-artifacts root rejects check without target mutation', async t => {
  await fixture(async ({ project, base, makeLink }) => {
    await cp(new URL('public/', PRODUCT), owned(project, 'public'), { recursive: true });
    const built = await buildRelease(base); assert.equal(built.files.length, 16);
    const original = owned(project, 'release-artifacts'), target = owned(project, 'targets/release-valid');
    // This directory move is entirely inside the already verified owned fixture.
    assert.equal((await lstat(original)).isSymbolicLink(), false);
    await rename(original, target);
    await makeLink(target, original);
    await unchanged(t, 'F01-03', target, () => checkRelease(base), { code: 'RELEASE_LINKED_ENTRY' }, 17);
  });
});

test('F01-04: valid linked public root rejects release build before making outputs', async t => {
  await fixture(async ({ project, base, makeLink }) => {
    const target = owned(project, 'targets/public-valid');
    await cp(new URL('public/', PRODUCT), target, { recursive: true });
    await makeLink(target, owned(project, 'public'));
    await unchanged(t, 'F01-04', target, () => buildRelease(base), { code: 'RELEASE_LINKED_ENTRY' }, 13);
    await assert.rejects(lstat(owned(project, 'release-artifacts')), { code: 'ENOENT' });
  });
});
