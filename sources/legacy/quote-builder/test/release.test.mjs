import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, copyFile, readFile, writeFile, readdir, lstat, readlink, rm, rename, symlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { root, publicFiles } from '../scripts/files.mjs';
import { buildRelease, checkRelease, inspectReleaseSeo, releaseConfig } from '../scripts/release.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedSiteFiles = ['_headers', '_redirects', 'en/index.html', 'index.html', 'js/app.js', 'js/core/decimal.mjs', 'js/core/import.mjs', 'js/core/quote.mjs', 'js/core/safe-output.mjs', 'robots.txt', 'sitemap.xml', 'styles/app.css'];
async function withProduct(work) {
  const parent = path.resolve(root, 'test/.scratch');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'm1b-owned-'));
  try {
    await copyFile(path.join(root, 'wrangler.jsonc'), path.join(directory, 'wrangler.jsonc'));
    for (const mode of ['public', 'dist']) for (const file of publicFiles) {
      const target = path.join(directory, mode, file);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(path.join(root, mode, file), target);
    }
    await work(directory);
  } finally {
    const verified = path.resolve(directory);
    if (path.dirname(verified) !== parent || !path.basename(verified).startsWith('m1b-owned-')) throw new Error('UNSAFE_TEST_CLEANUP');
    await rm(verified, { recursive: true, force: false });
  }
}
async function snapshot(directory) {
  const entries = [];
  async function walk(relative = '') {
    const absolute = path.join(directory, relative);
    const stat = await lstat(absolute);
    if (stat.isSymbolicLink()) entries.push({ path: relative, link: await readlink(absolute) });
    else if (stat.isDirectory()) { entries.push({ path: relative, directory: true }); for (const name of (await readdir(absolute)).sort()) await walk(relative ? `${relative}/${name}` : name); }
    else entries.push({ path: relative, bytes: stat.size, sha256: digest(await readFile(absolute)), mtimeMs: stat.mtimeMs });
  }
  await walk(); return entries;
}
async function output(rootDirectory) { return JSON.parse(await readFile(path.join(rootDirectory, 'release-artifacts/manifest.json'), 'utf8')); }
async function rejectBothAndPreserve(directory) {
  const before = await snapshot(path.join(directory, 'release-artifacts'));
  await assert.rejects(checkRelease(directory), /RELEASE_/);
  await assert.rejects(buildRelease(directory), /RELEASE_/);
  assert.deepEqual(await snapshot(path.join(directory, 'release-artifacts')), before);
}

test('M2A: reciprocal SEO, same-language home, only exact candidate footer removal; preview/runtime unchanged', async () => withProduct(async directory => {
  const beforePublic = await snapshot(path.join(directory, 'public'));
  const beforeDist = await snapshot(path.join(directory, 'dist'));
  assert.deepEqual(releaseConfig, { origin: 'https://quote.glossquote.com', toolSlug: 'quote-builder' });
  assert.deepEqual(await buildRelease(directory), { files: 12, sourceFiles: 8, reused: false });
  for (const file of publicFiles) {
    const source = await readFile(path.join(directory, 'public', file));
    const release = await readFile(path.join(directory, 'release-artifacts/site', file));
    if (!file.endsWith('.html')) { assert.deepEqual(release, source); continue; }
    const html = release.toString('utf8'), preview = source.toString('utf8');
    const canonical = [...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(match => match[1]);
    assert.deepEqual(canonical, [`https://quote.glossquote.com/${file}`]);
    const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(match => [match[1], match[2]]);
    assert.deepEqual(alternates, [['zh-Hant', 'https://quote.glossquote.com/index.html'], ['en', 'https://quote.glossquote.com/en/index.html'], ['x-default', 'https://quote.glossquote.com/index.html']]);
    assert.equal((html.match(/<meta name="robots" content="index,follow">/g) || []).length, 1);
    const oldFooter = file.startsWith('en/') ? '<span>Local candidate · Drafts are not saved automatically</span>' : '<span>本地候選版本 · 不自動儲存草稿</span>';
    const newFooter = file.startsWith('en/') ? '<span>Drafts are not saved automatically</span>' : '<span>不自動儲存草稿</span>';
    assert.equal(html.slice(html.indexOf('</head>')), preview.slice(preview.indexOf('</head>')).replace(oldFooter, newFooter));
    const undoSeo = html.replace(/  <link rel="(?:canonical|alternate)"[^>]*>\n/g, '').replace('<meta name="robots" content="index,follow">', '<meta name="robots" content="noindex,nofollow">').replace(newFooter, oldFooter);
    assert.equal(undoSeo, preview, 'only approved head and precise footer changes');
    assert.ok(preview.includes('content="noindex,nofollow"'));
    assert.doesNotMatch(preview, /rel="canonical"|hreflang=/);
    assert.equal(html.includes(oldFooter), false);
    assert.ok(html.includes(newFooter));
    assert.ok(preview.includes(oldFooter));
    const home = file.startsWith('en/') ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
    assert.equal([...html.matchAll(/href="([^"]+)"/g)].filter(match => match[1] === home).length, 2);
    const otherHome = file.startsWith('en/') ? 'https://glossquote.com/index.html' : 'https://glossquote.com/en/index.html';
    assert.equal([...html.matchAll(/href="([^"]+)"/g)].filter(match => match[1] === otherHome).length, 0);
  }
  assert.deepEqual(await snapshot(path.join(directory, 'public')), beforePublic);
  assert.deepEqual(await snapshot(path.join(directory, 'dist')), beforeDist);
}));

test('M1B: robots, two-URL sitemap, exact original security headers and closed manifest', async () => withProduct(async directory => {
  await buildRelease(directory);
  const base = path.join(directory, 'release-artifacts/site');
  assert.equal(await readFile(path.join(base, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://quote.glossquote.com/sitemap.xml\n');
  const xml = await readFile(path.join(base, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://quote.glossquote.com/index.html', 'https://quote.glossquote.com/en/index.html']);
  assert.doesNotMatch(xml, /lastmod/);
  assert.equal(await readFile(path.join(base, '_headers'), 'utf8'), "/*\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Cache-Control: no-store\n  X-Robots-Tag: index, follow\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n");
  const manifest = await output(directory);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.mode, 'release-candidate');
  assert.equal(manifest.origin, 'https://quote.glossquote.com'); assert.equal(manifest.toolSlug, 'quote-builder');
  assert.deepEqual(manifest.files.map(entry => entry.path), expectedSiteFiles);
  assert.deepEqual(manifest.sourceFiles.map(entry => entry.path), [...publicFiles].sort());
  for (const [collection, prefix] of [[manifest.files, 'release-artifacts/site'], [manifest.sourceFiles, 'public']]) for (const entry of collection) {
    assert.deepEqual(Object.keys(entry), ['path', 'bytes', 'sha256']);
    const bytes = await readFile(path.join(directory, prefix, entry.path));
    assert.equal(entry.bytes, bytes.length); assert.equal(entry.sha256, digest(bytes));
    assert.equal(entry.path.includes('..'), false); assert.equal(path.isAbsolute(entry.path), false);
  }
  assert.doesNotMatch(JSON.stringify(manifest), /timestamp|createdAt|[A-Z]:\\|manifest\.json/);
  assert.deepEqual(await checkRelease(directory), { files: 12, sourceFiles: 8, reused: true });
}));

test('M1B: reproducible bytes across roots and idempotent rebuild never rewrites managed output', async () => withProduct(async first => {
  await buildRelease(first);
  const snapshotFirst = await snapshot(path.join(first, 'release-artifacts'));
  assert.equal((await buildRelease(first)).reused, true);
  assert.deepEqual(await snapshot(path.join(first, 'release-artifacts')), snapshotFirst);
  await withProduct(async second => {
    await buildRelease(second);
    const clean = entries => entries.map(({ mtimeMs, ...entry }) => entry);
    assert.deepEqual(clean(await snapshot(path.join(second, 'release-artifacts'))), clean(snapshotFirst));
  });
}));

test('M1B: same-size tampered runtime is rejected without output mutation', async () => withProduct(async directory => {
  await buildRelease(directory);
  const file = path.join(directory, 'release-artifacts/site/js/app.js');
  const bytes = await readFile(file); bytes[bytes.length - 1] = 32; await writeFile(file, bytes);
  await rejectBothAndPreserve(directory);
}));
test('M1B: extra output file and extra empty directory are refused and preserved', async () => withProduct(async directory => {
  await buildRelease(directory);
  await writeFile(path.join(directory, 'release-artifacts/site/foreign.txt'), 'preserve unknown data');
  await rejectBothAndPreserve(directory);
  await rm(path.join(directory, 'release-artifacts/site/foreign.txt'));
  await mkdir(path.join(directory, 'release-artifacts/site/foreign-directory'));
  await rejectBothAndPreserve(directory);
}));
test('M1B: missing managed output is refused; no silent repair or overwrite', async () => withProduct(async directory => {
  await buildRelease(directory);
  await rm(path.join(directory, 'release-artifacts/site/robots.txt'));
  await rejectBothAndPreserve(directory);
}));
test('M1B: coordinated manifest + asset tampering cannot bless changed bytes', async () => withProduct(async directory => {
  await buildRelease(directory);
  const file = path.join(directory, 'release-artifacts/site/js/app.js');
  const bytes = Buffer.concat([await readFile(file), Buffer.from('\n// tampered\n')]); await writeFile(file, bytes);
  const manifest = await output(directory);
  const entry = manifest.files.find(item => item.path === 'js/app.js'); entry.bytes = bytes.length; entry.sha256 = digest(bytes);
  await writeFile(path.join(directory, 'release-artifacts/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await rejectBothAndPreserve(directory);
}));
test('M1B: coordinated wrong-domain SEO + manifest and wrong manifest origin are rejected', async () => withProduct(async directory => {
  await buildRelease(directory);
  const file = path.join(directory, 'release-artifacts/site/en/index.html');
  const original = await readFile(file, 'utf8');
  const wrong = original.replace('rel="canonical" href="https://quote.glossquote.com/en/index.html"', 'rel="canonical" href="https://wrong.glossquote.com/en/index.html"');
  assert.throws(() => inspectReleaseSeo(wrong, 'en/index.html'), /RELEASE_CANONICAL/);
  assert.throws(() => inspectReleaseSeo(original.replace('hreflang="zh-Hant"', 'hreflang="xx"'), 'en/index.html'), /RELEASE_ALTERNATES/);
  await writeFile(file, wrong);
  const manifest = await output(directory);
  const entry = manifest.files.find(item => item.path === 'en/index.html'); entry.bytes = Buffer.byteLength(wrong); entry.sha256 = digest(wrong);
  manifest.origin = 'https://wrong.glossquote.com';
  await writeFile(path.join(directory, 'release-artifacts/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await rejectBothAndPreserve(directory);
}));
test('M1B: source change and jointly changed source/output manifest remain pinned to M1', async () => withProduct(async directory => {
  await buildRelease(directory);
  const file = path.join(directory, 'public/js/app.js');
  const bytes = await readFile(file); bytes[bytes.length - 1] = 32; await writeFile(file, bytes);
  const manifest = await output(directory);
  const source = manifest.sourceFiles.find(item => item.path === 'js/app.js'); source.sha256 = digest(bytes);
  await writeFile(path.join(directory, 'release-artifacts/manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await rejectBothAndPreserve(directory);
}));
test('M1B: unknown source and unowned initial output are refused before output writes', async () => withProduct(async directory => {
  await writeFile(path.join(directory, 'public/unknown.txt'), 'unapproved');
  await assert.rejects(buildRelease(directory), /RELEASE_UNKNOWN_FILE/);
  await assert.rejects(lstat(path.join(directory, 'release-artifacts')), { code: 'ENOENT' });
  await rm(path.join(directory, 'public/unknown.txt'));
  await mkdir(path.join(directory, 'release-artifacts'));
  await writeFile(path.join(directory, 'release-artifacts/foreign.txt'), 'preserve this');
  await rejectBothAndPreserve(directory);
}));
test('M1B: source/output junctions are refused; no link targets are modified', async () => withProduct(async directory => {
  const originalEn = path.join(directory, 'original-en');
  await rename(path.join(directory, 'public/en'), originalEn);
  await symlink(originalEn, path.join(directory, 'public/en'), 'junction');
  const beforeTarget = await snapshot(originalEn);
  await assert.rejects(buildRelease(directory), /RELEASE_LINK_REJECTED/);
  assert.deepEqual(await snapshot(originalEn), beforeTarget);
  await rm(path.join(directory, 'public/en'));
  await rename(originalEn, path.join(directory, 'public/en'));
  await symlink(path.join(directory, 'dist'), path.join(directory, 'release-artifacts'), 'junction');
  const beforeDist = await snapshot(path.join(directory, 'dist'));
  await assert.rejects(buildRelease(directory), /RELEASE_LINK_REJECTED/);
  assert.deepEqual(await snapshot(path.join(directory, 'dist')), beforeDist);
}));
test('M1B: missing/unknown/extra CLI arguments fail; no environment origin or deploy route', async () => {
  const executable = path.join(root, 'scripts/release.mjs');
  for (const args of [[], ['deploy'], ['build', 'extra'], ['check', '--origin=https://other.invalid'], ['--help']]) {
    const child = spawnSync(process.execPath, [executable, ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8' });
    assert.equal(child.status, 1); assert.match(child.stderr, /RELEASE_USAGE/);
  }
  const source = await readFile(executable, 'utf8');
  assert.doesNotMatch(source, /process\.env|execSync|execFile|spawn\(|\.listen\(|recursive:\s*true/);
});
