import { readFile, lstat } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, ASSETS, checkedTree, isMain, verifyDist } from './files.mjs';
import { renderPage } from './pages.mjs';

export async function checkPreview(root = ROOT, { dist = true } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (pkg.type !== 'module' || pkg.private !== true || Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) throw new Error('PACKAGE_BOUNDARY');
  for (const [key, value] of Object.entries({ dev: 'node scripts/serve.mjs', test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs' })) {
    if (pkg.scripts[key] !== value) throw new Error('SCRIPT_CONTRACT');
  }
  const manifest = await checkedTree(join(root, 'public'));
  for (const file of ASSETS) {
    const source = await readFile(join(root, 'public', file), 'utf8');
    if (file.endsWith('.mjs')) {
      if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|caches|sendBeacon|serviceWorker|innerHTML|outerHTML|insertAdjacentHTML|eval|console)\b|document\s*\.\s*cookie|\bnew\s+Function\b|history\s*\./.test(source)) throw new Error('FORBIDDEN_BROWSER_API');
      const parsed = spawnSync(process.execPath, ['--check', join(root, 'public', file)], { encoding: 'utf8', windowsHide: true });
      if (parsed.status !== 0) throw new Error('JS_SYNTAX');
      for (const match of source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
        if (!match[1].startsWith('./') || !ASSETS.includes(posix.normalize(posix.join(posix.dirname(file), match[1])))) throw new Error('NONLOCAL_IMPORT');
      }
      if (/\bimport\s*\(/.test(source)) throw new Error('DYNAMIC_IMPORT');
    }
    if (file.endsWith('.html')) {
      const locale = file.startsWith('en/') ? 'en' : 'zh-Hant';
      if (source !== renderPage(locale)) throw new Error('PAGE_TEMPLATE_DRIFT');
      if (!source.includes('<meta name="robots" content="noindex,nofollow">') || /<link[^>]+(?:canonical|alternate)|<base\b|\son[a-z]+\s*=|<iframe\b|<style\b|style\s*=/.test(source)) throw new Error('PREVIEW_BOUNDARY');
      if ((source.match(/<h1>/g) ?? []).length !== 1 || (source.match(/<details>/g) ?? []).length < 3) throw new Error('CONTENT_MISSING');
      if (!source.includes('<fieldset id="input-controls" disabled>') || !/<button id="create" type="submit"[^>]*\bdisabled>/.test(source)) throw new Error('UNSAFE_UNINITIALIZED_FORM');
      if ((source.match(/<script\b/g) ?? []).length !== 1 || !source.includes('<script type="module" src="/js/app.mjs"></script>')) throw new Error('SCRIPT_BOUNDARY');
      for (const match of source.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const url = match[1];
        if (!url.startsWith('#') && !['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(url) && !ASSETS.includes(url.slice(1))) throw new Error('UNAPPROVED_URL');
      }
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(source)) throw new Error('REMOTE_STYLE');
  }
  if (await readFile(join(root, 'public/robots.txt'), 'utf8') !== 'User-agent: *\nDisallow: /\n') throw new Error('ROBOTS_BOUNDARY');
  if (dist) {
    let exists = false;
    try { await lstat(join(root, 'dist')); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (exists) await verifyDist(root);
  }
  return manifest;
}

if (isMain(import.meta.url)) {
  try { const manifest = await checkPreview(); process.stdout.write(`PASS preview checks: ${manifest.length} allowlisted assets; no dependencies or data APIs\n`); }
  catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}
