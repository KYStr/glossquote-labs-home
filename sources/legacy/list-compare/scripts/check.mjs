import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, readAssets, walkFiles, requireNode24 } from './files.mjs';
import { renderPage } from './pages.mjs';

export async function checkSource() {
  requireNode24();
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  if (Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) throw new Error('Dependencies are not allowed');
  const assets = await readAssets(path.join(ROOT, 'public'));
  for (const [file, language] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    if (assets.get(file).toString('utf8') !== renderPage(language)) throw new Error(`Generated bilingual page differs: ${file}`);
  }
  if (assets.get('robots.txt').toString('utf8').trim() !== 'User-agent: *\nDisallow: /') throw new Error('Preview robots must disallow indexing');
  const forbidden = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|innerHTML|outerHTML|insertAdjacentHTML|eval)\b|document\.cookie|https?:\/\//u;
  for (const [file, bytes] of assets) {
    if (file.endsWith('.mjs') && forbidden.test(bytes.toString('utf8'))) throw new Error(`Forbidden browser capability: ${file}`);
    if (file.endsWith('.css') && /@import|url\s*\(/iu.test(bytes.toString('utf8'))) throw new Error('Remote CSS assets are not allowed');
  }
  const sources = [
    ...await walkFiles(path.join(ROOT, 'public')).then(files => files.filter(f => f.endsWith('.mjs')).map(f => `public/${f}`)),
    ...await walkFiles(path.join(ROOT, 'scripts')).then(files => files.filter(f => f.endsWith('.mjs')).map(f => `scripts/${f}`)),
    ...await walkFiles(path.join(ROOT, 'test')).then(files => files.filter(f => f.endsWith('.mjs')).map(f => `test/${f}`))
  ];
  for (const file of sources) {
    const result = spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Syntax check failed: ${file}`);
  }
  return { assets: assets.size, syntaxFiles: sources.length, dependencies: 0, previewOnly: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await checkSource()));
