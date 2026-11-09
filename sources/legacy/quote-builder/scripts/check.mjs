import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, inspectTree, publicFiles } from './files.mjs';
import { checkDeploymentConfig } from './deployment-config.mjs';

const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (!packageInfo.private || packageInfo.type !== 'module' || packageInfo.engines.node !== '>=24' || packageInfo.dependencies || packageInfo.devDependencies) throw new Error('PACKAGE_CONTRACT');
await checkDeploymentConfig(root);
await inspectTree(path.join(root, 'public'));
const scripts = (await readdir(path.join(root, 'scripts'))).filter(f => f.endsWith('.mjs')).map(f => `scripts/${f}`);
const tests = (await readdir(path.join(root, 'test'))).filter(f => f.endsWith('.mjs')).map(f => `test/${f}`);
const modules = [...publicFiles.filter(f => /\.(?:mjs|js)$/.test(f)).map(f => `public/${f}`), ...scripts, ...tests];
for (const file of modules) {
  const checked = spawnSync(process.execPath, ['--check', path.join(root, file)], { shell: false, windowsHide: true, encoding: 'utf8' });
  if (checked.status !== 0) throw new Error(`SYNTAX:${file}`);
}
for (const file of publicFiles) {
  const source = await readFile(path.join(root, 'public', file), 'utf8');
  if (/\b(?:innerHTML|outerHTML|insertAdjacentHTML|eval|localStorage|sessionStorage|indexedDB|serviceWorker|fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|\bnew\s+Function\b|\bconsole\s*\./.test(source)) throw new Error(`PROHIBITED_API:${file}`);
  if (file.endsWith('.html')) {
    if (!/<meta name="robots" content="noindex,nofollow">/.test(source) || /\b(?:canonical|hreflang)\b/.test(source)) throw new Error('PREVIEW_METADATA');
    for (const match of source.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      const value = match[1];
      if (value.startsWith('#') || ['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(value)) continue;
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), value));
      if (!publicFiles.includes(relative)) throw new Error(`RESOURCE_REJECTED:${file}`);
    }
    if (/<(?:iframe|object|embed)\b|\son\w+=/i.test(source)) throw new Error('UNSAFE_HTML');
  } else if (/https?:|@import|\burl\s*\(/i.test(source)) throw new Error(`REMOTE_RESOURCE:${file}`);
}
console.log(`PASS: ${publicFiles.length} public files; ${modules.length} ESM syntax checks; static local-resource/API and exact assets-only deployment config checks (not browser or hosting evidence).`);
