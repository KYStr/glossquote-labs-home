import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, cpSync, writeFileSync, readFileSync, readdirSync, lstatSync, readlinkSync, rmSync, unlinkSync, symlinkSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES } from '../scripts/files.mjs';
import { ORIGIN, TOOL_SLUG, SITE_FILES, buildRelease, checkRelease, parseMode, stripCandidateBanner } from '../scripts/release.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function snapshot(directory) {
  if (!lstatSync(directory, { throwIfNoEntry: false })) return null;
  const result = [];
  function visit(path, relative) {
    const info = lstatSync(path);
    if (info.isSymbolicLink()) { result.push({ path: relative, link: readlinkSync(path) }); return; }
    if (info.isDirectory()) { result.push({ path: relative, directory: true }); for (const name of readdirSync(path).sort()) visit(join(path, name), relative ? `${relative}/${name}` : name); }
    else { const bytes = readFileSync(path); result.push({ path: relative, bytes: bytes.length, sha256: hash(bytes), mtime: info.mtimeMs }); }
  }
  visit(directory, ''); return result;
}
function fixture(run) {
  const parent = resolve(ROOT, 'evidence/m2a/fixtures'); mkdirSync(parent, { recursive: true });
  const directory = mkdtempSync(join(parent, 'release-fixture-'));
  try {
    cpSync(join(ROOT, 'public'), join(directory, 'public'), { recursive: true });
    cpSync(join(ROOT, 'wrangler.jsonc'), join(directory, 'wrangler.jsonc'));
    mkdirSync(join(directory, 'scripts'));
    for (const path of ['files.mjs', 'release.mjs', 'release-source.mjs', 'deployment-config.mjs']) cpSync(join(ROOT, 'scripts', path), join(directory, 'scripts', path));
    run(directory);
  } finally {
    const finalPath = resolve(directory);
    assert.ok(finalPath.startsWith(`${parent}${sep}release-fixture-`)); assert.ok(!lstatSync(finalPath).isSymbolicLink());
    rmSync(finalPath, { recursive: true });
  }
}
const manifestPath = directory => join(directory, 'release-artifacts/manifest.json');
const sitePath = (directory, path) => join(directory, 'release-artifacts/site', path);
function changeManifest(directory, transform) {
  const value = JSON.parse(readFileSync(manifestPath(directory), 'utf8')); transform(value);
  writeFileSync(manifestPath(directory), `${JSON.stringify(value, null, 2)}\n`);
}
function assertUnchangedRejection(directory) {
  const output = join(directory, 'release-artifacts'), before = snapshot(output);
  assert.throws(() => checkRelease(directory)); assert.deepEqual(snapshot(output), before);
  assert.throws(() => buildRelease(directory)); assert.deepEqual(snapshot(output), before);
}

test('release is fixed to the approved tool origin and emits the exact isolated file set', () => fixture(directory => {
  assert.equal(ORIGIN, 'https://flashcards.glossquote.com'); assert.equal(TOOL_SLUG, 'flashcards');
  const preview = snapshot(join(directory, 'public'));
  const result = buildRelease(directory), manifest = JSON.parse(readFileSync(manifestPath(directory), 'utf8'));
  assert.equal(result.siteFiles, 16); assert.equal(result.sourceFiles, 14);
  assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'deploymentFiles']);
  assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.mode, 'release-candidate'); assert.equal(manifest.origin, 'https://flashcards.glossquote.com');
  assert.equal(manifest.toolSlug, 'flashcards'); assert.deepEqual(manifest.files.map(file => file.path), [...new Set([...PUBLIC_FILES, 'robots.txt', '_headers', '_redirects', 'sitemap.xml'])].sort());
  assert.deepEqual(SITE_FILES, manifest.files.map(file => file.path));
  assert.deepEqual(manifest.sourceFiles.map(file => file.path), [...PUBLIC_FILES].sort());
  for (const file of manifest.files) { const bytes = readFileSync(sitePath(directory, file.path)); assert.equal(file.bytes, bytes.length); assert.equal(file.sha256, hash(bytes)); }
  for (const file of manifest.sourceFiles) { const bytes = readFileSync(join(directory, 'public', file.path)); assert.equal(file.bytes, bytes.length); assert.equal(file.sha256, hash(bytes)); }
  const config = readFileSync(join(directory, 'wrangler.jsonc'));
  assert.deepEqual(manifest.deploymentFiles, [{ path: 'wrangler.jsonc', bytes: config.length, sha256: hash(config) }]);
  assert.equal(existsSync(sitePath(directory, 'manifest.json')), false); assert.deepEqual(snapshot(join(directory, 'public')), preview);
  assert.deepEqual(checkRelease(directory), result);
}));
test('both languages retain home/language links with unique SEO and only the exact candidate paragraph removed', () => fixture(directory => {
  buildRelease(directory);
  for (const [path, url, lang] of [['index.html', 'https://flashcards.glossquote.com/index.html', 'zh-Hant'], ['en/index.html', 'https://flashcards.glossquote.com/en/index.html', 'en']]) {
    const html = readFileSync(sitePath(directory, path), 'utf8'), source = readFileSync(join(directory, 'public', path), 'utf8');
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    const links = [...head.matchAll(/<link\b([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([a-z-]+)="([^"]*)"/g)].map(attr => [attr[1], attr[2]])));
    assert.deepEqual(links.filter(link => link.rel === 'canonical'), [{ rel: 'canonical', href: url }]);
    assert.deepEqual(links.filter(link => link.rel === 'alternate'), [{ rel: 'alternate', hreflang: 'zh-Hant', href: 'https://flashcards.glossquote.com/index.html' }, { rel: 'alternate', hreflang: 'en', href: 'https://flashcards.glossquote.com/en/index.html' }, { rel: 'alternate', hreflang: 'x-default', href: 'https://flashcards.glossquote.com/index.html' }]);
    assert.equal((head.match(/<meta name="robots" content="index,follow">/g) ?? []).length, 1);
    assert.ok(html.includes(`<html lang="${lang}">`));
    const candidate = lang === 'en' ? '<p class="candidate">Local candidate · unpublished</p>' : '<p class="candidate">本地候選・未發布</p>';
    assert.equal(source.split(candidate).length, 2);
    assert.equal(html.slice(html.indexOf('</head>') + 7), source.slice(source.indexOf('</head>') + 7).replace(candidate, ''));
    assert.equal(html.match(/<title>[^<]+<\/title>/)[0], source.match(/<title>[^<]+<\/title>/)[0]);
    assert.equal(html.match(/<meta name="description" content="[^"]+">/)[0], source.match(/<meta name="description" content="[^"]+">/)[0]);
    assert.ok(!html.includes(candidate)); assert.doesNotMatch(html, /class="candidate"/);
    assert.ok(html.includes(`href="${lang === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html'}"`));
    assert.ok(html.includes(lang === 'en' ? 'id="languageLink" href="../index.html" lang="zh-Hant"' : 'id="languageLink" href="./en/index.html" lang="en"'));
    assert.doesNotMatch(source, /rel="canonical"|rel="alternate"|sitemap\.xml/); assert.ok(source.includes('noindex,nofollow'));
  }
}));
test('candidate removal is exact, optional and refuses changed or duplicated banners', () => {
  for (const [language, marker] of [['en', '<p class="candidate">Local candidate · unpublished</p>'], ['zh-Hant', '<p class="candidate">本地候選・未發布</p>']]) {
    const keep = '<p>Local candidate · unpublished；本地候選・未發布</p>';
    assert.equal(stripCandidateBanner(`${keep}${marker}${keep}`, language), `${keep}${keep}`);
    assert.equal(stripCandidateBanner(keep, language), keep);
    assert.throws(() => stripCandidateBanner(`${marker}${marker}`, language), /CANDIDATE_BANNER_CHANGED/);
    assert.throws(() => stripCandidateBanner(marker.replace('</p>', ' changed</p>'), language), /CANDIDATE_BANNER_CHANGED/);
    assert.throws(() => stripCandidateBanner(marker.replace('class="candidate"', 'class="extra candidate"'), language), /CANDIDATE_BANNER_CHANGED/);
  }
  assert.throws(() => stripCandidateBanner('', 'unknown'), /RELEASE_LANGUAGE/);
});
test('redirects contain only the three exact explicit-file 301 routes with LF termination', () => fixture(directory => {
  buildRelease(directory);
  assert.equal(readFileSync(sitePath(directory, '_redirects'), 'utf8'), '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
  assert.equal(existsSync(join(directory, 'public/_redirects')), false);
}));
test('runtime JS/CSS, 404 and other non-SEO assets remain byte-identical to M1', () => fixture(directory => {
  buildRelease(directory);
  for (const path of PUBLIC_FILES.filter(path => !['index.html', 'en/index.html', '_headers', 'robots.txt'].includes(path))) assert.deepEqual(readFileSync(sitePath(directory, path)), readFileSync(join(directory, 'public', path)));
}));
test('robots/sitemap have only approved production URLs and no invented lastmod', () => fixture(directory => {
  buildRelease(directory);
  assert.equal(readFileSync(sitePath(directory, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://flashcards.glossquote.com/sitemap.xml\n');
  const sitemap = readFileSync(sitePath(directory, 'sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://flashcards.glossquote.com/index.html', 'https://flashcards.glossquote.com/en/index.html']);
  assert.doesNotMatch(sitemap, /lastmod|localhost|127\.0\.0\.1|404/); assert.equal(existsSync(join(directory, 'public/sitemap.xml')), false);
}));
test('security/privacy headers change only X-Robots-Tag', () => fixture(directory => {
  buildRelease(directory);
  const source = readFileSync(join(directory, 'public/_headers'), 'utf8'), output = readFileSync(sitePath(directory, '_headers'), 'utf8');
  assert.equal(output, source.replace('  X-Robots-Tag: noindex, nofollow', '  X-Robots-Tag: index, follow'));
  for (const value of ["connect-src 'none'", "script-src 'self'", "font-src 'none'", "frame-ancestors 'none'", 'nosniff', 'no-referrer', 'Permissions-Policy']) assert.ok(output.includes(value));
}));
test('two fresh builds and an existing-candidate rebuild are byte-deterministic with no rewriting', () => fixture(first => fixture(second => {
  buildRelease(first); buildRelease(second);
  const values = directory => snapshot(join(directory, 'release-artifacts')).map(({ mtime, ...file }) => file);
  assert.deepEqual(values(first), values(second));
  const before = snapshot(join(first, 'release-artifacts')); buildRelease(first); assert.deepEqual(snapshot(join(first, 'release-artifacts')), before);
  const manifest = readFileSync(manifestPath(first), 'utf8'); assert.doesNotMatch(manifest, /[A-Z]:\\|release-fixture|createdAt|generatedAt|timestamp/);
})));
test('check with no output rejects without creating a tree', () => fixture(directory => {
  assert.throws(() => checkRelease(directory)); assert.equal(existsSync(join(directory, 'release-artifacts')), false);
}));
for (const scenario of ['tampered-asset', 'extra-file', 'extra-directory', 'missing-file', 'missing-manifest', 'wrong-domain', 'duplicate-source-record', 'wrong-schema', 'traversal-record', 'runtime-plus-manifest', 'seo-plus-manifest', 'redirect-plus-manifest', 'config-plus-manifest', 'extra-deployment-record', 'unknown-manifest-field']) {
  test(`release refuses ${scenario}; check/build preserve all existing output bytes`, () => fixture(directory => {
    buildRelease(directory);
    if (scenario === 'tampered-asset') writeFileSync(sitePath(directory, 'styles/app.css'), 'FAKE_CHANGED_ASSET');
    else if (scenario === 'extra-file') writeFileSync(sitePath(directory, 'unexpected.txt'), 'FAKE_PRESERVE');
    else if (scenario === 'extra-directory') mkdirSync(sitePath(directory, 'unexpected-directory'));
    else if (scenario === 'missing-file') unlinkSync(sitePath(directory, 'index.html'));
    else if (scenario === 'missing-manifest') unlinkSync(manifestPath(directory));
    else if (scenario === 'wrong-domain') changeManifest(directory, value => { value.origin = 'https://example.invalid'; });
    else if (scenario === 'duplicate-source-record') changeManifest(directory, value => value.sourceFiles.push(value.sourceFiles[0]));
    else if (scenario === 'wrong-schema') changeManifest(directory, value => { value.schemaVersion = 2; });
    else if (scenario === 'traversal-record') changeManifest(directory, value => { value.files[0].path = '../outside.txt'; });
    else if (scenario === 'extra-deployment-record') changeManifest(directory, value => value.deploymentFiles.push({ path: '../wrangler.jsonc', bytes: 0, sha256: hash('') }));
    else if (scenario === 'unknown-manifest-field') changeManifest(directory, value => { value.extra = true; });
    else if (scenario === 'config-plus-manifest') {
      const path = join(directory, 'wrangler.jsonc'), config = JSON.parse(readFileSync(path, 'utf8')); config.assets.run_worker_first = true;
      const bytes = Buffer.from(`${JSON.stringify(config, null, 2)}\n`); writeFileSync(path, bytes);
      changeManifest(directory, value => { value.deploymentFiles[0].bytes = bytes.length; value.deploymentFiles[0].sha256 = hash(bytes); });
    }
    else {
      const path = scenario === 'runtime-plus-manifest' ? 'js/app.mjs' : scenario === 'redirect-plus-manifest' ? '_redirects' : 'en/index.html';
      const bytes = Buffer.from(scenario === 'runtime-plus-manifest' ? '/* fake runtime tamper */' : scenario === 'redirect-plus-manifest' ? '/ /en/index.html 302\n' : readFileSync(sitePath(directory, path), 'utf8').replaceAll('https://flashcards.glossquote.com', 'https://other.example.invalid'));
      writeFileSync(sitePath(directory, path), bytes);
      changeManifest(directory, value => { const record = value.files.find(file => file.path === path); record.bytes = bytes.length; record.sha256 = hash(bytes); });
    }
    assertUnchangedRejection(directory);
  }));
}
for (const scenario of ['changed-source', 'extra-source', 'missing-source', 'source-junction']) {
  test(`release refuses ${scenario} against reviewed source pins, before writing`, () => fixture(directory => {
    buildRelease(directory);
    if (scenario === 'changed-source') { const path = join(directory, 'public/js/app.mjs'); writeFileSync(path, readFileSync(path, 'utf8').replace('createController', 'createControllex')); }
    else if (scenario === 'extra-source') writeFileSync(join(directory, 'public/extra.txt'), 'FAKE');
    else if (scenario === 'missing-source') unlinkSync(join(directory, 'public/404.html'));
    else { mkdirSync(join(directory, 'fake-link-target')); symlinkSync(join(directory, 'fake-link-target'), join(directory, 'public/linked-directory'), process.platform === 'win32' ? 'junction' : 'dir'); }
    assertUnchangedRejection(directory);
  }));
}
test('a source change also prevents first build without creating release-artifacts', () => fixture(directory => {
  writeFileSync(join(directory, 'public/index.html'), 'FAKE_SOURCE_CHANGE');
  assert.throws(() => buildRelease(directory), /SOURCE_CHANGED/); assert.equal(existsSync(join(directory, 'release-artifacts')), false);
}));
test('invalid deployment configuration prevents first build without creating release output', () => fixture(directory => {
  unlinkSync(join(directory, 'wrangler.jsonc'));
  assert.throws(() => buildRelease(directory), /DEPLOY_CONFIG_FILE/); assert.equal(existsSync(join(directory, 'release-artifacts')), false);
}));
test('an empty or incomplete existing output root is not adopted or overwritten', () => fixture(directory => {
  mkdirSync(join(directory, 'release-artifacts')); assertUnchangedRejection(directory);
  writeFileSync(manifestPath(directory), 'FAKE_UNMANAGED_MANIFEST'); assertUnchangedRejection(directory);
}));
test('output root junction and nested symlink are refused without modifying their targets', () => fixture(first => fixture(second => {
  const target = join(first, 'preserve-target'); mkdirSync(target); writeFileSync(join(target, 'keep.txt'), 'FAKE_PRESERVE');
  symlinkSync(target, join(first, 'release-artifacts'), process.platform === 'win32' ? 'junction' : 'dir');
  assertUnchangedRejection(first); assert.equal(readFileSync(join(target, 'keep.txt'), 'utf8'), 'FAKE_PRESERVE');
  buildRelease(second); symlinkSync(target, sitePath(second, 'linked-directory'), process.platform === 'win32' ? 'junction' : 'dir');
  assertUnchangedRejection(second); assert.equal(readFileSync(join(target, 'keep.txt'), 'utf8'), 'FAKE_PRESERVE');
})));
test('CLI rejects missing/unknown/extra arguments and has no output side effects; valid build/check use fixture only', () => fixture(directory => {
  for (const args of [[], ['unknown'], ['build', 'extra'], ['check', '--origin=https://example.invalid'], ['build', 'https://example.invalid'], ['--help']]) {
    const result = spawnSync(process.execPath, [join(directory, 'scripts/release.mjs'), ...args], { cwd: directory, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.match(result.stderr, /^RELEASE_FAILED INVALID_ARGUMENTS\n$/); assert.equal(existsSync(join(directory, 'release-artifacts')), false);
  }
  for (const mode of ['build', 'check']) {
    const result = spawnSync(process.execPath, [join(directory, 'scripts/release.mjs'), mode], { cwd: directory, shell: false, windowsHide: true, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0); assert.equal(JSON.parse(result.stdout).origin, 'https://flashcards.glossquote.com');
  }
  assert.equal(parseMode(['build']), 'build'); assert.equal(parseMode(['check']), 'check');
}));
