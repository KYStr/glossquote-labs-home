import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, readFile, writeFile, rm, readdir, lstat, symlink, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildRelease, checkRelease, inspectReleaseHtml, parseMode } from '../scripts/release.mjs';

const PRODUCT = new URL('../', import.meta.url);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const site = (project, path) => join(project, 'release-artifacts', 'site', path);
const manifestPath = project => join(project, 'release-artifacts', 'manifest.json');
const readManifest = async project => JSON.parse(await readFile(manifestPath(project), 'utf8'));

async function removeOwnedDirectory(project, child) {
  const target = resolve(project, child);
  const rel = relative(resolve(project), target);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Unsafe fixture removal target.');
  await rm(target, { recursive: true, force: false });
}

async function fixture(fn) {
  const parent = fileURLToPath(new URL('evidence/m1b/scratch/', PRODUCT));
  await mkdir(parent, { recursive: true });
  const project = await mkdtemp(join(parent, 'release-case-'));
  try {
    await cp(new URL('public/', PRODUCT), join(project, 'public'), { recursive: true });
    await cp(new URL('dist/', PRODUCT), join(project, 'dist'), { recursive: true });
    await mkdir(join(project, 'scripts'));
    for (const file of ['release.mjs', 'release-contract.mjs', 'serve.mjs']) {
      await cp(new URL(`scripts/${file}`, PRODUCT), join(project, 'scripts', file));
    }
    await fn(project, pathToFileURL(`${project}/`));
  } finally {
    const rel = relative(resolve(parent), resolve(project));
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Unsafe release test cleanup target.');
    await rm(project, { recursive: true, force: false });
  }
}

async function snapshot(project) {
  const records = [];
  const walk = async (folder, prefix = '') => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) records.push([prefix + entry.name, 'LINK']);
      else if (info.isDirectory()) { records.push([prefix + entry.name, 'DIR']); await walk(path, `${prefix}${entry.name}/`); }
      else records.push([prefix + entry.name, hash(await readFile(path))]);
    }
  };
  await walk(project);
  return records.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}

async function rewriteAssetAndManifest(project, path, text) {
  const bytes = Buffer.from(text, 'utf8');
  await writeFile(site(project, path), bytes);
  const manifest = await readManifest(project);
  const entry = manifest.files.find(file => file.path === path);
  entry.bytes = bytes.byteLength; entry.sha256 = hash(bytes);
  await writeFile(manifestPath(project), `${JSON.stringify(manifest, null, 2)}\n`);
}

test('release: exact origin, bilingual canonical/hreflang, metadata/body and candidate notices', async () => {
  await fixture(async (project, base) => {
    const manifest = await buildRelease(base);
    assert.equal(manifest.origin, 'https://audio-notes.glossquote.com');
    assert.equal(manifest.toolSlug, 'audio-cue-notes');
    assert.equal(manifest.mode, 'release-candidate');
    assert.equal(manifest.schemaVersion, 1);
    for (const [path, lang, title, heading, description, notice] of [
      ['index.html', 'zh-Hant', '錄音時間戳筆記｜Gloss Tools', '邊聽錄音，邊記下時間戳', '本機播放訪談或課程錄音，按一下記下目前時間與重點，點筆記回跳，下載或重新匯入筆記。', '本地候選'],
      ['en/index.html', 'en', 'Timestamped Audio Notes | Gloss Tools', 'Take notes while listening to audio', 'Play an audio file locally, capture notes at the current time, jump back to a note, and export or re-import your notes.', 'Local candidate']
    ]) {
      const html = await readFile(site(project, path), 'utf8');
      const preview = await readFile(join(project, 'public', path), 'utf8');
      assert.ok(html.includes(`<html lang="${lang}">`));
      assert.ok(html.includes(`<title>${title}</title>`));
      assert.ok(html.includes(`<h1>${heading}</h1>`));
      assert.ok(html.includes(`<meta name="description" content="${description}">`));
      assert.ok(html.includes(`<meta name="robots" content="index, follow">`));
      assert.ok(html.includes(notice));
      assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
      assert.ok(html.includes(`<link rel="canonical" href="https://audio-notes.glossquote.com/${path}">`));
      const alternates = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(match => [match[1], match[2]]);
      assert.deepEqual(alternates, [
        ['zh-Hant', 'https://audio-notes.glossquote.com/index.html'],
        ['en', 'https://audio-notes.glossquote.com/en/index.html'],
        ['x-default', 'https://audio-notes.glossquote.com/index.html']
      ]);
      assert.equal(html.slice(html.indexOf('</head>')), preview.slice(preview.indexOf('</head>')));
      const restoredHead = html.slice(0, html.indexOf('</head>')).replace('content="index, follow"', 'content="noindex, nofollow, noarchive"')
        .replace(/^  <link rel="(?:canonical|alternate)"[^\n]*\n/gm, '');
      assert.equal(restoredHead, preview.slice(0, preview.indexOf('</head>')));
    }
    assert.deepEqual(await checkRelease(base), manifest);
  });
});

test('release: public/dist byte preservation and runtime assets copied verbatim', async () => {
  await fixture(async (project, base) => {
    const before = await snapshot(project);
    const manifest = await buildRelease(base);
    for (const file of manifest.sourceFiles.filter(file => !file.path.endsWith('.html'))) {
      assert.deepEqual(await readFile(site(project, file.path)), await readFile(join(project, 'public', file.path)));
    }
    const after = (await snapshot(project)).filter(([path]) => !path.startsWith('release-artifacts'));
    assert.deepEqual(after, before);
    for (const folder of ['public', 'dist']) {
      for (const path of ['index.html', 'en/index.html']) {
        const html = await readFile(join(project, folder, path), 'utf8');
        assert.ok(html.includes('content="noindex, nofollow, noarchive"'));
        assert.equal(html.includes('rel="canonical"'), false);
      }
    }
  });
});

test('release: exact robots/sitemap and unchanged serve security headers except indexing', async () => {
  await fixture(async (project, base) => {
    await buildRelease(base);
    assert.equal(await readFile(site(project, 'robots.txt'), 'utf8'), 'User-agent: *\nAllow: /\nSitemap: https://audio-notes.glossquote.com/sitemap.xml\n');
    const xml = await readFile(site(project, 'sitemap.xml'), 'utf8');
    assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [
      'https://audio-notes.glossquote.com/index.html', 'https://audio-notes.glossquote.com/en/index.html'
    ]);
    assert.equal(/lastmod|<script|localhost/.test(xml), false);
    const headers = await readFile(site(project, '_headers'), 'utf8');
    const directives = Object.fromEntries(headers.trimEnd().split('\n').slice(1).map(line => {
      const colon = line.indexOf(':'); return [line.slice(2, colon), line.slice(colon + 2)];
    }));
    assert.deepEqual(directives, {
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
      'X-Robots-Tag': 'index, follow',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; media-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'Permissions-Policy': 'microphone=(), camera=(), geolocation=()'
    });
  });
});

test('release: manifest is closed, sorted, exact, deterministic and absent from site', async () => {
  await fixture(async (project, base) => {
    const manifest = await buildRelease(base);
    assert.deepEqual(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
    assert.equal(manifest.files.length, 16);
    assert.equal(manifest.sourceFiles.length, 13);
    assert.deepEqual(manifest.files.map(file => file.path), manifest.files.map(file => file.path).sort());
    assert.deepEqual(manifest.sourceFiles.map(file => file.path), manifest.sourceFiles.map(file => file.path).sort());
    assert.equal(new Set(manifest.files.map(file => file.path)).size, 16);
    for (const file of manifest.files) {
      const bytes = await readFile(site(project, file.path));
      assert.deepEqual(Object.keys(file), ['path', 'bytes', 'sha256']);
      assert.equal(file.bytes, bytes.byteLength); assert.equal(file.sha256, hash(bytes));
    }
    await assert.rejects(readFile(site(project, 'manifest.json')), { code: 'ENOENT' });
    const before = await snapshot(project);
    await buildRelease(base); await checkRelease(base);
    assert.deepEqual(await snapshot(project), before);
    assert.equal(/createdAt|timestamp|[A-Z]:\\|\/Users\//.test(await readFile(manifestPath(project), 'utf8')), false);
  });
});

test('release: modified asset is rejected without overwriting any existing bytes', async () => {
  await fixture(async (project, base) => {
    await buildRelease(base); await writeFile(site(project, 'js/app.js'), 'tampered');
    const before = await snapshot(project);
    await assert.rejects(checkRelease(base), { code: 'RELEASE_ASSET_MISMATCH' });
    await assert.rejects(buildRelease(base), { code: 'RELEASE_ASSET_MISMATCH' });
    assert.deepEqual(await snapshot(project), before);
  });
});

test('release: asset plus matching manifest hash tampering cannot pass expected-byte verification', async () => {
  await fixture(async (project, base) => {
    await buildRelease(base);
    await rewriteAssetAndManifest(project, 'js/app.js', 'malicious synthetic runtime');
    const before = await snapshot(project);
    await assert.rejects(checkRelease(base), { code: 'RELEASE_MANIFEST_MISMATCH' });
    await assert.rejects(buildRelease(base), { code: 'RELEASE_MANIFEST_MISMATCH' });
    assert.deepEqual(await snapshot(project), before);
  });
});

test('release: missing output rejected; no missing file is silently regenerated over damaged state', async () => {
  await fixture(async (project, base) => {
    await buildRelease(base); await unlink(site(project, 'en/index.html'));
    const before = await snapshot(project);
    await assert.rejects(checkRelease(base), { code: 'RELEASE_MISSING_ENTRY' });
    await assert.rejects(buildRelease(base), { code: 'RELEASE_MISSING_ENTRY' });
    assert.deepEqual(await snapshot(project), before);
  });
});

test('release: extra files and even empty unknown directories are refused and retained', async () => {
  for (const extra of ['root-file', 'site-file', 'site-directory']) {
    await fixture(async (project, base) => {
      await buildRelease(base);
      if (extra === 'root-file') await writeFile(join(project, 'release-artifacts', 'unknown.txt'), 'preserve');
      if (extra === 'site-file') await writeFile(site(project, 'unexpected.txt'), 'preserve');
      if (extra === 'site-directory') await mkdir(site(project, 'unknown'));
      const before = await snapshot(project);
      await assert.rejects(checkRelease(base), { code: 'RELEASE_EXTRA_ENTRY' });
      await assert.rejects(buildRelease(base), { code: 'RELEASE_EXTRA_ENTRY' });
      assert.deepEqual(await snapshot(project), before);
    });
  }
});

test('release: unrecognized/partial output root never overwritten, and check does not build missing output', async () => {
  await fixture(async (project, base) => {
    await assert.rejects(checkRelease(base), { code: 'ENOENT' });
    await assert.rejects(lstat(join(project, 'release-artifacts')), { code: 'ENOENT' });
    await mkdir(join(project, 'release-artifacts'));
    const before = await snapshot(project);
    await assert.rejects(buildRelease(base), { code: 'RELEASE_MISSING_ENTRY' });
    assert.deepEqual(await snapshot(project), before);
  });
});

test('release: changed public source rejected even with modified manifest/source table', async () => {
  await fixture(async (project, base) => {
    await buildRelease(base);
    const path = join(project, 'public/js/app.js');
    const changed = Buffer.from('changed source, not an approved M1 revision');
    await writeFile(path, changed);
    const manifest = await readManifest(project);
    Object.assign(manifest.sourceFiles.find(file => file.path === 'js/app.js'), { bytes: changed.length, sha256: hash(changed) });
    await writeFile(manifestPath(project), JSON.stringify(manifest));
    const before = await snapshot(project);
    await assert.rejects(checkRelease(base), { code: 'RELEASE_SOURCE_CHANGED' });
    await assert.rejects(buildRelease(base), { code: 'RELEASE_SOURCE_CHANGED' });
    assert.deepEqual(await snapshot(project), before);
  });
});

test('release: unknown source and changed security source fail before creating outputs', async () => {
  for (const type of ['extra-source', 'changed-serve']) {
    await fixture(async (project, base) => {
      if (type === 'extra-source') await writeFile(join(project, 'public', 'unexpected.txt'), 'fake');
      else await writeFile(join(project, 'scripts/serve.mjs'), 'not the reviewed security source');
      const before = await snapshot(project);
      await assert.rejects(buildRelease(base), { code: type === 'extra-source' ? 'RELEASE_EXTRA_ENTRY' : 'RELEASE_SOURCE_CHANGED' });
      assert.deepEqual(await snapshot(project), before);
      await assert.rejects(lstat(join(project, 'release-artifacts')), { code: 'ENOENT' });
    });
  }
});

test('release: wrong origin/mode/extra keys/traversal/duplicate manifest entries fail closed', async () => {
  for (const change of [
    value => { value.origin = 'https://wrong.example'; }, value => { value.mode = 'published'; },
    value => { value.unexpected = true; }, value => { value.files[0].path = '../outside'; },
    value => { value.files.push(value.files[0]); }, value => { value.sourceFiles.reverse(); }
  ]) {
    await fixture(async (project, base) => {
      await buildRelease(base); const value = await readManifest(project); change(value);
      await writeFile(manifestPath(project), `${JSON.stringify(value, null, 2)}\n`);
      await assert.rejects(checkRelease(base), { code: 'RELEASE_MANIFEST_MISMATCH' });
    });
  }
});

test('release: wrong SEO/header/robots/sitemap plus rehashed manifest are still rejected', async () => {
  for (const [path, change] of [
    ['index.html', text => text.replace('href="https://audio-notes.glossquote.com/index.html"', 'href="https://wrong.example/index.html"')],
    ['en/index.html', text => text.replace('hreflang="x-default"', 'hreflang="fr"')],
    ['en/index.html', text => text.replace('content="index, follow"', 'content="noindex"')],
    ['en/index.html', text => text.replace('Take notes while listening to audio', 'Published and browser verified')],
    ['_headers', text => text.replace("connect-src 'none'", 'connect-src *')],
    ['robots.txt', text => text.replace('Allow: /', 'Disallow: /')],
    ['sitemap.xml', text => text.replace('https://audio-notes.glossquote.com/en/index.html', 'https://wrong.example/en/index.html')]
  ]) {
    await fixture(async (project, base) => {
      await buildRelease(base); await rewriteAssetAndManifest(project, path, change(await readFile(site(project, path), 'utf8')));
      await assert.rejects(checkRelease(base), { code: 'RELEASE_MANIFEST_MISMATCH' });
    });
  }
});

test('release: independent semantic parser refuses wrong title/description/h1/lang/canonical/hreflang/duplicates', async () => {
  await fixture(async (project, base) => {
    await buildRelease(base);
    const original = await readFile(site(project, 'en/index.html'), 'utf8');
    const mutations = [
      text => text.replace('<title>Timestamped Audio Notes | Gloss Tools</title>', '<title>Wrong</title>'),
      text => text.replace('name="description"', 'name="wrong-description"'),
      text => text.replace('<h1>Take notes while listening to audio</h1>', '<h1>Wrong</h1>'),
      text => text.replace('<html lang="en">', '<html lang="fr">'),
      text => text.replace('rel="canonical" href="https://audio-notes.glossquote.com/en/index.html"', 'rel="canonical" href="https://wrong.example/"'),
      text => text.replace('hreflang="x-default"', 'hreflang="fr"'),
      text => text.replace('rel="canonical"', 'rel="canonical" rel="alternate"'),
      text => text.replace('</head>', '<link rel="canonical" href="https://audio-notes.glossquote.com/en/index.html"></head>')
    ];
    for (const mutate of mutations) assert.throws(() => inspectReleaseHtml(Buffer.from(mutate(original)), 'en/index.html'));
  });
});

test('release: junction output and source trees refused without following or changing targets', async () => {
  for (const linked of ['output', 'source']) {
    await fixture(async (project, base) => {
      const target = join(project, 'task-owned-target'); await mkdir(target); await writeFile(join(target, 'keep.txt'), 'preserve');
      if (linked === 'output') await symlink(target, join(project, 'release-artifacts'), 'junction');
      else {
        await cp(join(project, 'public'), join(target, 'public'), { recursive: true });
        await removeOwnedDirectory(project, 'public');
        await symlink(join(target, 'public'), join(project, 'public'), 'junction');
      }
      await assert.rejects(buildRelease(base), { code: 'RELEASE_LINKED_ENTRY' });
      assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'preserve');
    });
  }
});

test('release: CLI rejects no mode, unknown mode, extra arguments and arbitrary origin without artifacts', async () => {
  await fixture(async (project) => {
    for (const args of [[], ['deploy'], ['build', 'extra'], ['check', 'extra'], ['--origin=https://wrong.example']]) {
      const answer = spawnSync(process.execPath, [join(project, 'scripts/release.mjs'), ...args], {
        cwd: project, shell: false, windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024
      });
      assert.equal(answer.status, 2, JSON.stringify(args));
      assert.match(answer.stderr, /RELEASE_USAGE/);
      await assert.rejects(lstat(join(project, 'release-artifacts')), { code: 'ENOENT' });
    }
    assert.equal(parseMode(['build']), 'build'); assert.equal(parseMode(['check']), 'check');
  });
});

test('M1B verification preload rejects native shell expansion and keeps direct Node CLI usable', () => {
  const probe = `import {spawnSync} from 'node:child_process';
    let rejected = false;
    try { spawnSync('must-not-execute', [], {shell:true}); } catch(error) { rejected = error.code === 'M1B_SHELL_DISABLED'; }
    if (!rejected) process.exit(7);
    const answer = spawnSync(process.execPath, ['--version'], {encoding:'utf8'});
    if (answer.status !== 0 || !answer.stdout.startsWith('v24.')) process.exit(8);
    process.stdout.write('PRELOAD_PASS');`;
  const answer = spawnSync(process.execPath, ['--import', new URL('../scripts/hidden-process.mjs', import.meta.url).href, '--input-type=module', '-e', probe], {
    shell: false, windowsHide: true, encoding: 'utf8'
  });
  assert.equal(answer.status, 0, answer.stderr);
  assert.equal(answer.stdout, 'PRELOAD_PASS');
});
