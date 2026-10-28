import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, readFile, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildStatic } from '../scripts/build.mjs';
import { PUBLIC_FILES, root } from '../scripts/files.mjs';
import { route } from '../scripts/serve.mjs';
import { messages } from '../public/js/i18n.js';

test('server route contract only: no listener started; exact routes/host/method and traversal denial', () => {
  assert.deepEqual(route('GET', '127.0.0.1:4231', '/'), { status: 200, file: 'index.html', type: 'text/html; charset=utf-8' });
  assert.equal(route('HEAD', 'localhost:4231', '/en/index.html').status, 200);
  assert.equal(route('GET', 'evil.invalid:4231', '/').status, 403);
  assert.equal(route('POST', '127.0.0.1:4231', '/').status, 405);
  for (const path of ['/../AGENTS.md', '/%2e%2e/AGENTS.md', '/js/../index.html', '/en/', '/package.json', '/.git/config', '/index.html?q=x', '//index.html', '/js\\app.js']) {
    assert.equal(route('GET', '127.0.0.1:4231', path).status, 404, path);
  }
});

async function temporaryProject(fn) {
  const parent = fileURLToPath(new URL('evidence/m1b/scratch/', root));
  await mkdir(parent, { recursive: true });
  const project = await mkdtemp(join(parent, 'offline-build-'));
  try {
    await cp(new URL('public/', root), join(project, 'public'), { recursive: true });
    await fn(project, pathToFileURL(`${project}/`));
  } finally {
    const rel = relative(resolve(parent), resolve(project));
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw new Error('Unsafe test cleanup target.');
    await rm(project, { recursive: true, force: false });
  }
}

test('build copies closed allowlist byte-for-byte; evidence, docs and tests never enter dist', async () => {
  await temporaryProject(async (project, base) => {
    const manifest = await buildStatic(base);
    assert.equal(manifest.length, 13);
    for (const entry of manifest) {
      assert.ok(PUBLIC_FILES.includes(entry.path));
      assert.deepEqual(await readFile(join(project, 'public', entry.path)), await readFile(join(project, 'dist', entry.path)));
    }
    assert.deepEqual((await readdir(join(project, 'dist'))).sort(), ['css', 'en', 'index.html', 'js']);
  });
});

test('unknown/stale dist is refused before overwriting files; unrelated output preserved', async () => {
  await temporaryProject(async (project, base) => {
    await mkdir(join(project, 'dist'));
    await writeFile(join(project, 'dist', 'index.html'), 'existing bytes');
    await writeFile(join(project, 'dist', 'unexpected.txt'), 'preserve me');
    await assert.rejects(buildStatic(base), /Unknown file/);
    assert.equal(await readFile(join(project, 'dist', 'index.html'), 'utf8'), 'existing bytes');
    assert.equal(await readFile(join(project, 'dist', 'unexpected.txt'), 'utf8'), 'preserve me');
  });
});

test('unknown source and missing noindex are refused without producing dist', async () => {
  await temporaryProject(async (project, base) => {
    await writeFile(join(project, 'public', 'unexpected.txt'), 'fake');
    await assert.rejects(buildStatic(base), /Unknown file/);
    await assert.rejects(readFile(join(project, 'dist', 'index.html')), { code: 'ENOENT' });
  });
  await temporaryProject(async (project, base) => {
    await writeFile(join(project, 'public', 'index.html'), '<html><h1>fake</h1></html>');
    await assert.rejects(buildStatic(base), /Preview robots missing/);
    await assert.rejects(readFile(join(project, 'dist', 'index.html')), { code: 'ENOENT' });
  });
});

test('junction output tree is rejected; its target is preserved', async () => {
  await temporaryProject(async (project, base) => {
    const target = join(project, 'preserved-target');
    await mkdir(target);
    await writeFile(join(target, 'keep.txt'), 'unchanged');
    await symlink(target, join(project, 'dist'), 'junction');
    await assert.rejects(buildStatic(base), /Refusing linked tree root/);
    assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'unchanged');
  });
});

test('bilingual static SEO, FAQ, navigation warnings, CSP and no remote assets', async () => {
  const expectations = [
    ['index.html', 'zh-Hant', '錄音時間戳筆記｜Gloss Tools', '邊聽錄音，邊記下時間戳', './en/index.html', 'https://glossquote.com/index.html'],
    ['en/index.html', 'en', 'Timestamped Audio Notes | Gloss Tools', 'Take notes while listening to audio', '../index.html', 'https://glossquote.com/en/index.html']
  ];
  for (const [file, lang, title, heading, language, home] of expectations) {
    const html = await readFile(new URL(`public/${file}`, root), 'utf8');
    assert.ok(html.includes(`<html lang="${lang}">`));
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`<h1>${heading}</h1>`));
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow, noarchive">'));
    assert.ok(html.includes(`href="${language}"`));
    assert.ok(html.includes(`href="${home}"`));
    assert.ok(html.includes(messages[lang].languageWarning));
    assert.equal((html.match(/<details>/g) ?? []).length, 6);
    assert.ok(html.includes("connect-src 'none'"));
    assert.equal(/(?:src|href)="https?:\/\//.test(html.replaceAll(`href="${home}"`, '')), false);
    assert.equal(/\bautoplay\b/.test(html), false);
  }
});

test('all core error codes have concrete bilingual text; UI code uses plain-text rendering', async () => {
  assert.deepEqual(Object.keys(messages.en.errors).sort(), Object.keys(messages['zh-Hant'].errors).sort());
  for (const [code, text] of Object.entries(messages.en.errors)) {
    assert.ok(text.length > 25, code);
    assert.ok(messages['zh-Hant'].errors[code].length > 15, code);
  }
  const ui = await readFile(new URL('public/js/ui.js', root), 'utf8');
  assert.ok(ui.includes('text.textContent = note.text'));
  assert.equal(/innerHTML|outerHTML|insertAdjacentHTML/.test(ui), false);
  const app = await readFile(new URL('public/js/app.js', root), 'utf8');
  assert.ok(app.includes("window.addEventListener('pagehide'"));
  assert.ok(app.includes('workspace.reset()'));
});
