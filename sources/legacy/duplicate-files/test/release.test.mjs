import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, readdir, lstat, rm, unlink, rmdir, symlink } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { buildRelease, checkRelease, parseMode, validateReleaseHTML } from '../scripts/release.mjs';
import { ROOT, PUBLIC_FILES } from '../scripts/check.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const origin = 'https://duplicates.glossquote.com';
const names = ['_headers', '_redirects', 'css/app.css', 'en/index.html', 'index.html', 'js/analysis-worker.js', 'js/app.js', 'js/core/analyze.js', 'js/core/compare.js', 'js/core/limits.js', 'js/core/report.js', 'js/core/session.js', 'js/ui.js', 'robots.txt', 'sitemap.xml'];
async function sandbox(callback) {
  const root = await mkdtemp(resolve(ROOT, 'test/.tmp-release-'));
  try {
    for (const path of ['package.json', ...PUBLIC_FILES.map(file => `public/${file}`), 'scripts/release.mjs', 'scripts/release-policy.mjs', 'scripts/serve.mjs', 'scripts/check.mjs']) {
      const target = resolve(root, path); await mkdir(dirname(target), { recursive: true }); await copyFile(resolve(ROOT, path), target);
    }
    // A clean clone has no generated dist. Seed this isolated preview fixture
    // from its fixed public bytes; real preview builds have their own tests.
    for (const file of PUBLIC_FILES) {
      const target = resolve(root, 'dist', file); await mkdir(dirname(target), { recursive: true });
      await copyFile(resolve(root, 'public', file), target);
    }
    await callback(root);
  } finally {
    const inside = relative(resolve(ROOT, 'test'), root);
    assert(!isAbsolute(inside) && inside.startsWith('.tmp-release-') && !inside.includes('..') && !/[\\/]/.test(inside), 'Cleanup must stay inside this test-owned sandbox');
    const stat = await lstat(root); assert(stat.isDirectory() && !stat.isSymbolicLink());
    await rm(root, { recursive: true });
  }
}
async function snapshot(root, folder = '') {
  const records = [];
  for (const entry of await readdir(resolve(root, folder), { withFileTypes: true })) {
    const path = folder ? `${folder}/${entry.name}` : entry.name;
    assert(!entry.isSymbolicLink(), 'Snapshot never follows links');
    if (entry.isDirectory()) records.push(...await snapshot(root, path));
    else { const bytes = await readFile(resolve(root, path)); records.push({ path, bytes: bytes.length, sha256: sha(bytes) }); }
  }
  return records.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}
async function rejectedWithoutChanges(root) {
  const before = await snapshot(root, 'release-artifacts');
  await assert.rejects(checkRelease(root)); await assert.rejects(buildRelease(root));
  assert.deepEqual(await snapshot(root, 'release-artifacts'), before);
}
async function updateManifest(root, callback) {
  const path = resolve(root, 'release-artifacts/manifest.json'), manifest = JSON.parse(await readFile(path, 'utf8'));
  callback(manifest); await writeFile(path, JSON.stringify(manifest, null, 2) + '\n');
}

test('M1B CLI rejects no/unknown/extra arguments before output; fixed scripts retain original commands', async () => {
  assert.equal(parseMode(['build']), 'build'); assert.equal(parseMode(['check']), 'check');
  for (const args of [[], ['release'], ['build', '--origin', 'https://wrong.test'], ['check', 'build'], ['--help']]) assert.throws(() => parseMode(args), /RELEASE_USAGE/);
  await sandbox(async root => {
    for (const args of [[], ['wrong'], ['build', 'https://wrong.test'], ['check', '--extra']]) {
      const result = spawnSync(process.execPath, [resolve(root, 'scripts/release.mjs'), ...args], { cwd: root, shell: false, windowsHide: true, encoding: 'utf8' });
      assert.equal(result.status, 1); assert.match(result.stderr, /RELEASE_USAGE_BUILD_OR_CHECK_ONLY/);
    }
    await assert.rejects(lstat(resolve(root, 'release-artifacts')), { code: 'ENOENT' });
    const packageJSON = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    assert.deepEqual(packageJSON.scripts, { dev: 'node scripts/serve.mjs', test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', 'build:release': 'node scripts/release.mjs build', 'check:release': 'node scripts/release.mjs check' });
  });
});

test('M1B bilingual SEO uses exact origin, self canonicals and mutual zh-Hant/en/x-default', async () => {
  await sandbox(async root => {
    await buildRelease(root);
    for (const [path, lang, title, description, h1] of [
      ['index.html', 'zh-Hant', '重複檔案找出來｜本機檔案比對', '在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。', '找出內容相同的檔案'],
      ['en/index.html', 'en', 'Find Duplicate Files — Local File Comparison', 'Find byte-identical files in your browser, choose which copy to keep, and download a report.', 'Find files with identical content']
    ]) {
      const html = await readFile(resolve(root, 'release-artifacts/site', path), 'utf8');
      const head = html.match(/<head>([\s\S]*?)<\/head>/)[1];
      assert(html.includes(`<html lang="${lang}">`)); assert(head.includes(`<title>${title}</title>`));
      assert(head.includes(`<meta name="description" content="${description}">`)); assert(html.includes(`<h1>${h1}</h1>`));
      assert.equal((head.match(/rel="canonical"/g) ?? []).length, 1);
      assert(head.includes(`<link rel="canonical" href="${origin}/${path}">`));
      const alternatives = [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(match => [match[1], match[2]]);
      assert.deepEqual(alternatives, [['zh-Hant', `${origin}/index.html`], ['en', `${origin}/en/index.html`], ['x-default', `${origin}/index.html`]]);
      assert(head.includes('<meta name="robots" content="index,follow">'));
      const preview = await readFile(resolve(root, 'public', path), 'utf8');
      const exactBanner = path === 'index.html' ? '      <p class="candidate">本機候選版；尚未部署</p>\n' : '      <p class="candidate">Local candidate; not deployed</p>\n';
      assert.equal(preview.split(exactBanner).length, 2);
      assert.equal(html.slice(html.indexOf('</head>') + 7), preview.slice(preview.indexOf('</head>') + 7).replace(exactBanner, ''));
    }
  });
});

test('M2A preserves public/dist candidate banners and all nine runtime assets; formal release omits only the banners', async () => {
  await sandbox(async root => {
    const publicBefore = await snapshot(root, 'public'), distBefore = await snapshot(root, 'dist');
    const manifest = await buildRelease(root);
    assert.deepEqual(await snapshot(root, 'public'), publicBefore); assert.deepEqual(await snapshot(root, 'dist'), distBefore);
    assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
    assert.equal(manifest.schemaVersion, 1); assert.equal(manifest.mode, 'release-candidate'); assert.equal(manifest.origin, origin); assert.equal(manifest.toolSlug, 'duplicate-files');
    assert.deepEqual(manifest.files.map(file => file.path), names); assert.equal(manifest.sourceFiles.length, 11);
    assert.deepEqual(manifest.sourceFiles.map(file => file.path), [...PUBLIC_FILES].sort());
    for (const record of [...manifest.files, ...manifest.sourceFiles]) assert.deepEqual(Object.keys(record), ['path', 'bytes', 'sha256']);
    for (const path of PUBLIC_FILES.filter(path => !path.endsWith('.html'))) assert((await readFile(resolve(root, 'release-artifacts/site', path))).equals(await readFile(resolve(root, 'public', path))));
    for (const [path, candidate] of [['index.html', '本機候選版；尚未部署'], ['en/index.html', 'Local candidate; not deployed']]) {
      assert(!(await readFile(resolve(root, 'release-artifacts/site', path), 'utf8')).includes(candidate));
      const preview = await readFile(resolve(root, 'dist', path), 'utf8'); assert(preview.includes('noindex,nofollow,noarchive')); assert(!preview.includes('rel="canonical"'));
      assert(preview.includes(candidate));
    }
    const output = await snapshot(root, 'release-artifacts'); assert.equal(output.length, 16);
    assert(!output.some(file => /test|evidence|HANDOFF|package/.test(file.path)));
  });
});

test('M1B robots, two-URL sitemap and all original security headers are exact', async () => {
  await sandbox(async root => {
    await buildRelease(root);
    const site = resolve(root, 'release-artifacts/site');
    assert.equal(await readFile(resolve(site, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://duplicates.glossquote.com/sitemap.xml\n');
    const sitemap = await readFile(resolve(site, 'sitemap.xml'), 'utf8');
    assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [`${origin}/index.html`, `${origin}/en/index.html`]);
    assert(sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')); assert(!sitemap.includes('lastmod'));
    assert.equal(await readFile(resolve(site, '_headers'), 'utf8'), "/*\n  X-Content-Type-Options: nosniff\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Robots-Tag: index, follow\n  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'\n");
  });
});

test('M1B valid rebuild is byte-deterministic; check independently hashes every source/site file', async () => {
  await sandbox(async root => {
    await buildRelease(root); const before = await snapshot(root, 'release-artifacts');
    await buildRelease(root); assert.deepEqual(await snapshot(root, 'release-artifacts'), before);
    const manifest = await checkRelease(root);
    for (const [folder, files] of [['release-artifacts/site', manifest.files], ['public', manifest.sourceFiles]]) for (const file of files) {
      const bytes = await readFile(resolve(root, folder, file.path)); assert.equal(file.bytes, bytes.length); assert.equal(file.sha256, sha(bytes));
    }
    const raw = await readFile(resolve(root, 'release-artifacts/manifest.json'), 'utf8');
    assert(!/timestamp|lastmod|[A-Z]:\\|\/Users\/|\/home\//.test(raw));
  });
});

test('M1B modified/missing/extra output is rejected and build never repairs or removes it', async () => {
  for (const mutation of ['modified', 'missing', 'extra', 'unknown-directory', 'missing-manifest']) {
    await sandbox(async root => {
      await buildRelease(root);
      if (mutation === 'modified') await writeFile(resolve(root, 'release-artifacts/site/js/app.js'), '// SYNTHETIC TAMPER');
      if (mutation === 'missing') await unlink(resolve(root, 'release-artifacts/site/sitemap.xml'));
      if (mutation === 'extra') await writeFile(resolve(root, 'release-artifacts/site/not-managed.txt'), 'SYNTHETIC KEEP');
      if (mutation === 'unknown-directory') await mkdir(resolve(root, 'release-artifacts/site/not-managed'));
      if (mutation === 'missing-manifest') await unlink(resolve(root, 'release-artifacts/manifest.json'));
      await rejectedWithoutChanges(root);
      if (mutation === 'unknown-directory') assert((await lstat(resolve(root, 'release-artifacts/site/not-managed'))).isDirectory());
    });
  }
});

test('M1B manifest origin/slug/schema/duplicates/unknown keys/source hashes cannot be trusted', async () => {
  for (const mutation of [
    manifest => { manifest.origin = 'https://wrong.glossquote.com'; }, manifest => { manifest.toolSlug = 'wrong'; },
    manifest => { manifest.schemaVersion = 2; }, manifest => { manifest.files.push(manifest.files[0]); },
    manifest => { manifest.timestamp = 'SYNTHETIC'; }, manifest => { manifest.sourceFiles[0].sha256 = '0'.repeat(64); },
    manifest => { manifest.files[0].path = '../outside'; }
  ]) await sandbox(async root => { await buildRelease(root); await updateManifest(root, mutation); await rejectedWithoutChanges(root); });
});

test('M1B simultaneous asset+manifest tamper fails reconstructed expected bytes', async () => {
  for (const path of ['index.html', 'en/index.html', 'js/app.js', '_headers', '_redirects', 'robots.txt', 'sitemap.xml']) {
    await sandbox(async root => {
      await buildRelease(root); const location = resolve(root, 'release-artifacts/site', path);
      const content = await readFile(location, 'utf8');
      const changed = path.endsWith('.html') ? content.replaceAll('https://duplicates.glossquote.com', 'https://wrong.glossquote.com') : content + '\nSYNTHETIC_TAMPER';
      const bytes = Buffer.from(changed); await writeFile(location, bytes);
      await updateManifest(root, manifest => { const file = manifest.files.find(file => file.path === path); file.bytes = bytes.length; file.sha256 = sha(bytes); });
      await rejectedWithoutChanges(root);
    });
  }
});

test('M1B source mutation is rejected even if source/site/manifest hashes are updated together', async () => {
  await sandbox(async root => {
    await buildRelease(root); const bytes = Buffer.from((await readFile(resolve(root, 'public/js/app.js'), 'utf8')) + '\n// SYNTHETIC SOURCE CHANGE');
    await writeFile(resolve(root, 'public/js/app.js'), bytes); await writeFile(resolve(root, 'release-artifacts/site/js/app.js'), bytes);
    await updateManifest(root, manifest => { for (const files of [manifest.files, manifest.sourceFiles]) { const file = files.find(file => file.path === 'js/app.js'); file.bytes = bytes.length; file.sha256 = sha(bytes); } });
    await rejectedWithoutChanges(root);
  });
  await sandbox(async root => {
    await writeFile(resolve(root, 'public/css/app.css'), '/* SYNTHETIC */'); await assert.rejects(buildRelease(root), /RELEASE_SOURCE_CHANGED/);
    await assert.rejects(lstat(resolve(root, 'release-artifacts')), { code: 'ENOENT' });
  });
});

test('M1B source/header-source missing, changed or extra fail before creating output', async () => {
  for (const change of ['missing', 'extra', 'directory', 'header']) await sandbox(async root => {
    if (change === 'missing') await unlink(resolve(root, 'public/js/app.js'));
    if (change === 'extra') await writeFile(resolve(root, 'public/extra.txt'), 'SYNTHETIC');
    if (change === 'directory') await mkdir(resolve(root, 'public/not-managed'));
    if (change === 'header') await writeFile(resolve(root, 'scripts/serve.mjs'), '// SYNTHETIC CHANGED HEADER SOURCE');
    await assert.rejects(buildRelease(root)); await assert.rejects(lstat(resolve(root, 'release-artifacts')), { code: 'ENOENT' });
  });
});

test('M1B rejects existing unmanaged/empty output without overwriting originals', async () => {
  for (const sentinel of [false, true]) await sandbox(async root => {
    await mkdir(resolve(root, 'release-artifacts'));
    if (sentinel) await writeFile(resolve(root, 'release-artifacts/KEEP.txt'), 'SYNTHETIC KEEP');
    await rejectedWithoutChanges(root);
  });
});

test('M1B input/output junctions are rejected without following or changing their targets', async () => {
  await sandbox(async root => {
    await mkdir(resolve(root, 'linked-input')); await copyFile(resolve(root, 'public/en/index.html'), resolve(root, 'linked-input/index.html'));
    await unlink(resolve(root, 'public/en/index.html')); await rmdir(resolve(root, 'public/en'));
    const link = resolve(root, 'public/en');
    try { await symlink(resolve(root, 'linked-input'), link, process.platform === 'win32' ? 'junction' : 'dir'); await assert.rejects(buildRelease(root)); }
    finally { await unlink(link); }
    assert((await readFile(resolve(root, 'linked-input/index.html'), 'utf8')).includes('noindex,nofollow,noarchive'));
  });
  await sandbox(async root => {
    await mkdir(resolve(root, 'linked-output')); await writeFile(resolve(root, 'linked-output/KEEP.txt'), 'SYNTHETIC KEEP');
    const link = resolve(root, 'release-artifacts');
    try { await symlink(resolve(root, 'linked-output'), link, process.platform === 'win32' ? 'junction' : 'dir'); await assert.rejects(buildRelease(root)); await assert.rejects(checkRelease(root)); }
    finally { await unlink(link); }
    assert.equal(await readFile(resolve(root, 'linked-output/KEEP.txt'), 'utf8'), 'SYNTHETIC KEEP');
  });
});

test('M1B semantic SEO checker rejects wrong metadata, duplicate/out-of-head canonical and bad hreflang', async () => {
  await sandbox(async root => {
    await buildRelease(root); const html = await readFile(resolve(root, 'release-artifacts/site/index.html'), 'utf8');
    const canonical = `<link rel="canonical" href="${origin}/index.html">`;
    for (const changed of [
      html.replace('<h1>找出內容相同的檔案</h1>', '<h1>Wrong</h1>'), html.replace('<title>重複檔案找出來｜本機檔案比對</title>', '<title>Wrong</title>'),
      html.replace('name="description" content="在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。"', 'name="description" content="Wrong"'),
      html.replace(canonical, canonical + canonical), html.replace(canonical, '').replace('</body>', canonical + '</body>'),
      html.replace('hreflang="en"', 'hreflang="fr"'), html.replace('name="robots" content="index,follow"', 'name="robots" content="noindex"'),
      html.replace('hreflang="x-default" href="https://duplicates.glossquote.com/index.html"', 'hreflang="x-default" href="https://duplicates.glossquote.com/en/index.html"')
    ]) assert.throws(() => validateReleaseHTML(changed, 'index.html'));
  });
});

test('M1B actual CLI build/check uses its own module root and produces only offline release files', async () => {
  await sandbox(async root => {
    for (const mode of ['build', 'check', 'build']) {
      const result = spawnSync(process.execPath, [resolve(root, 'scripts/release.mjs'), mode], { cwd: ROOT, shell: false, windowsHide: true, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /15 files; https:\/\/duplicates\.glossquote\.com; offline candidate, not deployed/);
    }
    assert.equal((await snapshot(root, 'release-artifacts')).length, 16);
  });
});

test('M2A complete-body guard rejects banner reintroduction, unrelated copy changes and co-tampered manifest', async () => {
  await sandbox(async root => {
    await buildRelease(root);
    for (const [path, banner, original, changed] of [
      ['index.html', '<p class="candidate">本機候選版；尚未部署</p>', '工具不會刪檔。', 'SYNTHETIC_UNAUTHORIZED_BODY'],
      ['en/index.html', '<p class="candidate">Local candidate; not deployed</p>', 'this tool never deletes files.', 'SYNTHETIC_UNAUTHORIZED_BODY']
    ]) {
      const location = resolve(root, 'release-artifacts/site', path), html = await readFile(location, 'utf8');
      assert(html.includes(original));
      assert.throws(() => validateReleaseHTML(html.replace('</body>', banner + '</body>'), path), /RELEASE_CANDIDATE_NOTICE/);
      const bad = html.replace(original, changed);
      assert.throws(() => validateReleaseHTML(bad, path), /RELEASE_BODY_CHANGED/);
      await writeFile(location, bad);
      await updateManifest(root, manifest => { const file = manifest.files.find(file => file.path === path); file.bytes = Buffer.byteLength(bad); file.sha256 = sha(Buffer.from(bad)); });
      await rejectedWithoutChanges(root);
      // The fixture is task-owned; restore it solely to test the other locale.
      await writeFile(location, html);
      await updateManifest(root, manifest => { const file = manifest.files.find(file => file.path === path); file.bytes = Buffer.byteLength(html); file.sha256 = sha(Buffer.from(html)); });
    }
  });
});

test('M2A entry redirects are exactly three LF-terminated 301 rules to the existing canonical files', async () => {
  await sandbox(async root => {
    const manifest = await buildRelease(root);
    const actual = await readFile(resolve(root, 'release-artifacts/site/_redirects'));
    const expected = Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n', 'utf8');
    assert(actual.equals(expected)); assert.equal(actual.length, 65);
    assert.deepEqual(actual.toString('utf8').split('\n'), ['/ /index.html 301', '/en /en/index.html 301', '/en/ /en/index.html 301', '']);
    assert.deepEqual(manifest.files.find(file => file.path === '_redirects'), { path: '_redirects', bytes: 65, sha256: sha(expected) });
    for (const [path, href] of [['index.html', 'https://duplicates.glossquote.com/index.html'], ['en/index.html', 'https://duplicates.glossquote.com/en/index.html']]) {
      const html = await readFile(resolve(root, 'release-artifacts/site', path), 'utf8'); assert(html.includes(`<link rel="canonical" href="${href}">`));
    }
    await checkRelease(root);
  });
});

test('M2A entry rejects missing or altered redirects even when the manifest is changed with them', async () => {
  const exact = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
  const invalid = [
    exact.replace('301', '302'), exact.replace('/ /index.html', '/ /wrong.html'),
    exact.replace('/en/ /en/index.html 301\n', ''), exact + '/* /index.html 200\n',
    exact.replace('/en /en/index.html', '/en https://external.invalid/'),
    exact.replaceAll('\n', '\r\n'), exact.replaceAll('\n', '\\n'), exact.trimEnd(),
    exact + '/ /index.html 301\n'
  ];
  for (const content of invalid) await sandbox(async root => {
    await buildRelease(root); const bytes = Buffer.from(content);
    await writeFile(resolve(root, 'release-artifacts/site/_redirects'), bytes);
    await updateManifest(root, manifest => { const file = manifest.files.find(file => file.path === '_redirects'); file.bytes = bytes.length; file.sha256 = sha(bytes); });
    await rejectedWithoutChanges(root);
  });
  await sandbox(async root => {
    await buildRelease(root); await unlink(resolve(root, 'release-artifacts/site/_redirects'));
    await updateManifest(root, manifest => { manifest.files = manifest.files.filter(file => file.path !== '_redirects'); });
    await rejectedWithoutChanges(root);
  });
});
