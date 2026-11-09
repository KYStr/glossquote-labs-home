import { lstat, readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_FILES = Object.freeze([
  'index.html', 'en/index.html', 'css/app.css', 'js/app.js', 'js/ui.js',
  'js/analysis-worker.js', 'js/core/limits.js', 'js/core/analyze.js',
  'js/core/compare.js', 'js/core/report.js', 'js/core/session.js'
]);
const PAGES = Object.freeze({
  'index.html': { lang: 'zh-Hant', title: '重複檔案找出來｜本機檔案比對', description: '在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。', h1: '找出內容相同的檔案', language: '/en/index.html', home: 'https://glossquote.com/index.html', warning: '切換語言會離開此頁；未下載的報告和分析結果會遺失。' },
  'en/index.html': { lang: 'en', title: 'Find Duplicate Files — Local File Comparison', description: 'Find byte-identical files in your browser, choose which copy to keep, and download a report.', h1: 'Find files with identical content', language: '/index.html', home: 'https://glossquote.com/en/index.html', warning: 'Changing language leaves this page. Selected files and undownloaded reports will be lost.' }
});

export async function inventory(directory, prefix = '') {
  const stats = await lstat(directory);
  assert(stats.isDirectory() && !stats.isSymbolicLink(), 'Expected an ordinary directory');
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Links are not allowed');
    const relative = prefix + entry.name;
    if (entry.isDirectory()) {
      assert(PUBLIC_FILES.some(name => name.startsWith(relative + '/')), 'Unknown directory');
      files.push(...await inventory(resolve(directory, entry.name), relative + '/'));
    } else {
      assert(entry.isFile() && PUBLIC_FILES.includes(relative), 'Unknown file');
      files.push(relative);
    }
  }
  return files.sort();
}

export async function checkPublic(root = ROOT) {
  const files = await inventory(resolve(root, 'public'));
  assert.deepEqual(files, [...PUBLIC_FILES].sort(), 'Public allowlist must be closed');
  for (const file of files) {
    const source = await readFile(resolve(root, 'public', file), 'utf8');
    assert(!/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|caches|sendBeacon|serviceWorker)\b/.test(source), 'Network or storage API');
    assert(!/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval)\b|document\.write|new\s+Function|console\./.test(source), 'Unsafe content or logging API');
    if (file.endsWith('.js')) {
      const syntax = spawnSync(process.execPath, ['--check', resolve(root, 'public', file)], { shell: false, windowsHide: true, encoding: 'utf8' });
      assert.equal(syntax.status, 0, 'JavaScript syntax must pass');
      assert(!/https?:\/\//.test(source), 'No remote origins in JavaScript');
      for (const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)) {
        assert(match[1].startsWith('./') || match[1].startsWith('../'), 'Local ESM imports only');
        assert(PUBLIC_FILES.includes(posix.normalize(posix.join(posix.dirname(file), match[1]))), 'ESM graph must close');
      }
    }
    if (file.endsWith('.css')) assert(!/@import|url\(/i.test(source), 'No external CSS resources');
    if (file.endsWith('.html')) {
      const page = PAGES[file];
      assert(source.includes(`<html lang="${page.lang}">`), 'Document language');
      assert(source.includes(`<title>${page.title}</title>`), 'Exact local title');
      assert(source.includes(`<meta name="description" content="${page.description}">`), 'Exact local description');
      assert.equal((source.match(/<h1>/g) ?? []).length, 1, 'One H1');
      assert(source.includes(`<h1>${page.h1}</h1>`), 'Exact local H1');
      assert(source.includes(`href="${page.language}"`), 'Ordinary language anchor');
      assert(source.includes(page.warning), 'Language data-loss warning');
      assert(source.includes(`href="${page.home}"`), 'Matching-language homepage');
      const ids = [...source.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
      assert.equal(ids.length, new Set(ids).size, 'Unique IDs');
      for (const target of source.matchAll(/(?:for|aria-describedby|aria-labelledby)="([^"]+)"/g)) {
        for (const id of target[1].split(' ')) assert(ids.includes(id), 'Reference points to an existing ID');
      }
      assert.match(source, /<meta name="robots" content="noindex,nofollow,noarchive">/);
      assert(!/rel="canonical"/.test(source), 'Preview has no canonical');
      assert(!/\son\w+\s*=|<iframe|<img/i.test(source), 'No inline handlers or embedded media');
      for (const match of source.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const target = match[1];
        assert(target.startsWith('/') || target.startsWith('#') || ['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(target), 'Unknown resource or link');
      }
    }
  }
  const pages = await Promise.all(Object.keys(PAGES).map(file => readFile(resolve(root, 'public', file), 'utf8')));
  const ids = pages.map(page => [...page.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]).sort());
  assert.deepEqual(ids[0], ids[1], 'Bilingual interfaces expose the same controls');
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(Number(process.versions.node.split('.')[0]), 24, 'This M1 candidate is checked on Node24');
  const manifest = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, 'module');
  assert(!manifest.dependencies && !manifest.devDependencies, 'Zero dependencies');
  const files = await checkPublic();
  for (const directory of ['scripts', 'test']) {
    for (const name of await readdir(resolve(ROOT, directory))) {
      if (!name.endsWith('.mjs')) continue;
      const syntax = spawnSync(process.execPath, ['--check', resolve(ROOT, directory, name)], { shell: false, windowsHide: true, encoding: 'utf8' });
      assert.equal(syntax.status, 0, 'Toolchain syntax must pass');
    }
  }
  console.log(`PASS check: ${files.length} closed public files; syntax and static invariants (not browser proof)`);
}
