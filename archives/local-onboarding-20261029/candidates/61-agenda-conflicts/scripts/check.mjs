import { readFile, lstat, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT_ROOT, PUBLIC_FILES, inspectTree, inside, ProjectError } from './files.mjs';
import { checkDeploymentConfig } from './deployment.mjs';

const expected = {
  'index.html': { lang: 'zh-Hant', title: '多軌議程衝突檢查｜Gloss Tools', description: '檢查同日多軌議程的房間重疊、講者撞期和轉場不足，並查看每房間、每位講者的完整時間表。', h1: '在發布前找出多軌議程撞期',
    css: './styles/app.css', script: './js/app.js', other: './en/index.html', home: 'https://glossquote.com/index.html' },
  'en/index.html': { lang: 'en', title: 'Multi-Track Agenda Conflict Checker | Gloss Tools', description: 'Check a single-day multi-track agenda for room overlaps, speaker clashes, and short room transitions, with room and speaker schedules.', h1: 'Find multi-track schedule clashes before publishing',
    css: '../styles/app.css', script: '../js/app.js', other: '../index.html', home: 'https://glossquote.com/en/index.html' }
};
const attributes = tag => {
  const result = {};
  for (const match of tag.matchAll(/\s([\w-]+)\s*=\s*"([^"]*)"/g)) {
    if (Object.hasOwn(result, match[1])) throw new ProjectError('DUPLICATE_ATTRIBUTE');
    result[match[1]] = match[2];
  }
  return result;
};
export function checkPage(html, file) {
  const e = expected[file];
  if (!e) throw new ProjectError('UNKNOWN_PAGE');
  const tags = [...html.matchAll(/<[a-z][^>]*>/gi)].map(match => ({ tag: match[0], name: /^<([a-z][\w-]*)/i.exec(match[0])[1].toLowerCase(), attrs: attributes(match[0]) }));
  const byName = name => tags.filter(tag => tag.name === name);
  const exactly = (regex, value) => { const matches = [...html.matchAll(regex)]; if (matches.length !== 1 || matches[0][1] !== value) throw new ProjectError('PAGE_COPY'); };
  exactly(/<title>([^<]*)<\/title>/g, e.title);
  exactly(/<h1>([^<]*)<\/h1>/g, e.h1);
  if (byName('html').length !== 1 || byName('html')[0].attrs.lang !== e.lang) throw new ProjectError('PAGE_LANGUAGE');
  const meta = name => byName('meta').filter(tag => tag.attrs.name === name);
  if (meta('description').length !== 1 || meta('description')[0].attrs.content !== e.description) throw new ProjectError('PAGE_DESCRIPTION');
  if (meta('robots').length !== 1 || meta('robots')[0].attrs.content !== 'noindex,nofollow') throw new ProjectError('PREVIEW_INDEXING');
  if (byName('link').some(tag => tag.attrs.rel !== 'stylesheet') || byName('base').length) throw new ProjectError('PREVIEW_LINKS');
  if (byName('link').length !== 1 || byName('link')[0].attrs.href !== e.css) throw new ProjectError('PAGE_ASSETS');
  const scripts = byName('script');
  if (scripts.length !== 1 || scripts[0].attrs.type !== 'module' || scripts[0].attrs.src !== e.script
    || !html.includes(`${scripts[0].tag}</script>`)) throw new ProjectError('PAGE_SCRIPT');
  if (byName('summary').length !== 3 || !html.includes('id="transition"') || !html.includes('value="10"')) throw new ProjectError('PAGE_CONTENT');
  const ids = new Set();
  for (const { name, attrs, tag } of tags) {
    if (attrs.id) { if (ids.has(attrs.id)) throw new ProjectError('DUPLICATE_ID'); ids.add(attrs.id); }
    if (/\son[a-z]+\s*=/i.test(tag) || Object.keys(attrs).some(key => key.startsWith('on')) || ['iframe', 'object', 'embed', 'style', 'img', 'audio', 'video'].includes(name)
      || attrs.style || attrs.action || attrs.formaction) throw new ProjectError('UNSAFE_MARKUP');
    if (name === 'a' && ![e.home, e.other, '#workspace'].includes(attrs.href)) throw new ProjectError('PAGE_LINK');
    if (name === 'input' && !['text'].includes(attrs.type)) throw new ProjectError('INPUT_TYPE');
  }
  for (const { attrs } of tags) for (const key of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'for']) {
    if (attrs[key] && attrs[key].split(' ').some(id => !ids.has(id))) throw new ProjectError('BROKEN_LABEL_REFERENCE');
  }
  const anchors = byName('a').map(tag => tag.attrs.href);
  if (!anchors.includes(e.other) || anchors.filter(href => href === e.home).length !== 2) throw new ProjectError('PAGE_NAVIGATION');
}

export async function checkProject(root = PROJECT_ROOT, { syntax = true } = {}) {
  await checkDeploymentConfig(root);
  const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (manifest.private !== true || manifest.type !== 'module' || manifest.engines?.node !== '>=24'
    || Object.keys(manifest.dependencies ?? {}).length || Object.keys(manifest.devDependencies ?? {}).length
    || manifest.scripts?.test !== 'node --test test/*.test.mjs') throw new ProjectError('PACKAGE_CONTRACT');
  const files = await inspectTree(path.join(root, 'public'));
  for (const [file, bytes] of files) {
    const text = bytes.toString('utf8');
    if (file.endsWith('.html')) checkPage(text, file);
    if (/\.(?:m?js)$/.test(file)) {
      const forbidden = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|Function|fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|importScripts|clipboard)\b|\bconsole\s*\.|\bdocument\s*\.\s*write\s*\(|\bwindow\s*\.\s*(?:open|print)\s*\(/;
      if (forbidden.test(text)) throw new ProjectError('UNSAFE_SCRIPT');
      if (/\bimport\s*(?:\(|[^;]*?from\s*)['"](?:https?:|\/\/|data:)/.test(text)) throw new ProjectError('REMOTE_MODULE');
    }
    if (file.endsWith('.css') && /@import|url\s*\(|@font-face/i.test(text)) throw new ProjectError('EXTERNAL_STYLE');
    if (syntax && /\.(?:m?js)$/.test(file)) {
      const child = spawnSync(process.execPath, ['--check', inside(path.join(root, 'public'), file)], { shell: false, windowsHide: true, encoding: 'utf8', timeout: 10000 });
      if (child.status !== 0 || child.error) throw new ProjectError('JS_SYNTAX');
    }
  }
  const scriptEntries = await readdir(path.join(root, 'scripts'), { withFileTypes: true });
  const scripts = scriptEntries.map(entry => entry.name);
  if (['files.mjs', 'check.mjs', 'build.mjs', 'serve.mjs'].some(script => !scripts.includes(script))) throw new ProjectError('SCRIPT_MISSING');
  for (const script of scripts) {
    const location = path.join(root, 'scripts', script);
    if (!/^[a-z-]+\.mjs$/.test(script) || !(await lstat(location)).isFile()) throw new ProjectError('SCRIPT_MISSING');
    if (syntax) {
      const child = spawnSync(process.execPath, ['--check', location], { shell: false, windowsHide: true, encoding: 'utf8', timeout: 10000 });
      if (child.status !== 0 || child.error) throw new ProjectError('JS_SYNTAX');
    }
  }
  return { files: PUBLIC_FILES.length, pages: 2, syntax };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 24) throw new ProjectError('NODE_24_REQUIRED');
    const result = await checkProject();
    process.stdout.write(`PASS check: ${result.files} assets, ${result.pages} bilingual noindex pages; JavaScript syntax and static policy checked. Browser behavior not tested.\n`);
  } catch (error) { process.stderr.write(`FAIL check: ${error instanceof ProjectError ? error.code : 'CHECK_FAILED'}\n`); process.exitCode = 1; }
}
