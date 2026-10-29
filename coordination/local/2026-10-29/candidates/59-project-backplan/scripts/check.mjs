import { readFile, readdir, lstat } from 'node:fs/promises';
import { join, dirname, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT, PUBLIC_FILES, sourceBytes } from './files.mjs';
import { verifyDeploymentConfig } from './release.mjs';

export async function checkSources(root = ROOT) {
  await verifyDeploymentConfig(root);
  const files = await sourceBytes(join(root, 'public'));
  const fail = code => { throw new Error(code); };
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (!manifest.private || manifest.type !== 'module' || manifest.engines?.node !== '>=24' ||
      ['dependencies', 'devDependencies', 'optionalDependencies'].some(key => Object.keys(manifest[key] ?? {}).length)) fail('MANIFEST_POLICY');
  const expectedScripts = { test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', dev: 'node scripts/serve.mjs', 'build:release': 'node scripts/release.mjs build', 'check:release': 'node scripts/release.mjs check' };
  if (JSON.stringify(manifest.scripts) !== JSON.stringify(expectedScripts)) fail('SCRIPT_POLICY');
  let syntaxFiles = 0;
  const checkSyntax = file => {
    const child = spawnSync(process.execPath, ['--check', file], { shell: false, windowsHide: true, encoding: 'utf8', timeout: 10000 });
    if (child.error || child.status !== 0) fail('ESM_SYNTAX');
    syntaxFiles += 1;
  };
  for (const [file, bytes] of files) {
    const source = bytes.toString('utf8');
    if (source.includes('\uFFFD') || source.includes('\u0000')) fail('TEXT_ENCODING');
    if (/\.(?:mjs|js)$/.test(file)) {
      checkSyntax(join(root, 'public', file));
      if (/\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\b(?:innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|indexedDB|serviceWorker)\b|\bconsole\s*\.|document\s*\.\s*write|\bhistory\s*\.|\blocation\s*\./u.test(source)) fail('FORBIDDEN_RUNTIME_API');
      for (const match of source.matchAll(/\b(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
        const target = posix.normalize(posix.join(posix.dirname(file), match[1]));
        if (!match[1].startsWith('./') && !match[1].startsWith('../') || !PUBLIC_FILES.includes(target)) fail('IMPORT_BOUNDARY');
      }
      if (/\bimport\s*\(/.test(source)) fail('DYNAMIC_IMPORT');
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(source)) fail('EXTERNAL_STYLE_RESOURCE');
  }
  const expected = {
    'index.html': { lang: 'zh-Hant', title: '專案期限倒排｜Gloss Tools', h1: '從交件日倒排一份可檢查的日程',
      description: '輸入交件日、工作週、休假與任務依賴，計算最早/最晚日期、工作日餘裕和關鍵路徑。', home: 'https://glossquote.com/index.html', language: './en/index.html', base: '.' },
    'en/index.html': { lang: 'en', title: 'Deadline Back-Planner | Gloss Tools', h1: 'Work backward from a deadline to a reviewable plan',
      description: 'Enter a deadline, workweek, holidays, tasks, and dependencies to calculate early/late dates, workday slack, and the critical path.', home: 'https://glossquote.com/en/index.html', language: '../index.html', base: '..' }
  };
  const idSets = [];
  for (const [file, e] of Object.entries(expected)) {
    const html = files.get(file).toString('utf8');
    if (!html.startsWith('<!doctype html>') || !html.includes(`<html lang="${e.lang}">`) ||
        !html.includes(`<title>${e.title}</title>`) || !html.includes(`<h1>${e.h1}</h1>`) ||
        !html.includes(`<meta name="description" content="${e.description}">`) ||
        !html.includes('<meta name="robots" content="noindex,nofollow">') || /canonical|sitemap|index,follow/i.test(html)) fail('PAGE_METADATA');
    if ((html.match(/<h1>/g) ?? []).length !== 1 || (html.match(/<title>/g) ?? []).length !== 1) fail('PAGE_HIERARCHY');
    if (/\son[a-z]+\s*=|<iframe|<object|<embed|<base|<style|<img|<link[^>]+(?:preconnect|prefetch)/i.test(html)) fail('HTML_ACTIVE_RESOURCE');
    if (!html.includes(`<script type="module" src="${e.base}/js/app.js"></script>`) || !html.includes(`<link rel="stylesheet" href="${e.base}/styles/app.css">`)) fail('PAGE_ASSETS');
    if (!html.includes(`href="${e.home}"`) || !html.includes(`href="${e.language}"`)) fail('PAGE_NAVIGATION');
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const link = match[1];
      if (link.startsWith('#') || link === e.home) continue;
      const target = posix.normalize(posix.join(posix.dirname(file), link));
      if (!PUBLIC_FILES.includes(target)) fail('PAGE_LINK_BOUNDARY');
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    if (new Set(ids).size !== ids.length) fail('DUPLICATE_HTML_ID');
    for (const match of html.matchAll(/\b(?:for|aria-controls|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
      if (match[1].split(' ').some(id => !ids.includes(id))) fail('MISSING_HTML_ASSOCIATION');
    }
    idSets.push(ids.sort().join(','));
    if (!html.includes('id="calculate"') || !html.includes('id="project-form" novalidate autocomplete="off"')) fail('INITIAL_STATE');
  }
  if (idSets[0] !== idSets[1]) fail('LANGUAGE_CONTROL_PARITY');
  for (const directory of ['scripts', 'test']) {
    for (const name of await readdir(join(root, directory))) {
      const file = join(root, directory, name);
      const stat = await lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile()) fail('TOOL_SOURCE_BOUNDARY');
      if (name.endsWith('.mjs')) checkSyntax(file);
    }
  }
  return { publicFiles: files.size, syntaxFiles, scope: 'static and Node syntax only; browser gates NOT_RUN_USER_FOCUS_INCIDENT' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.stdout.write(`${JSON.stringify(await checkSources())}\n`); }
  catch (error) { process.stderr.write(`Check rejected: ${error.message}\n`); process.exitCode = 1; }
}
