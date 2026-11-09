import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { PRODUCTION_FILES } from './model.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const publicFiles = [
  'index.html', 'en/index.html', 'styles/app.css', 'js/app.js',
  'js/core/roster.js', 'js/core/report.js',
];
const optionalHelpers = ['js/core/schema.js', 'js/core/ui-state.js'];
export const sourceFiles = [
  'package.json', '.gitignore', 'ACCEPTANCE.md', 'AGENTS.md', 'HANDOFF.md',
  'PRODUCT.md', 'README.md', 'START-HERE.md', 'TASK-ENTRY.md', 'TASKS.md',
  'TECHNICAL.md', 'UX-SEO.md', 'project.json',
  ...['BRAND', 'DESIGN-SYSTEM', 'ENGINEERING', 'GIT-PUBLICATION-SAFETY',
    'PRIVACY-SECURITY', 'RELEASE', 'RELEASE-CANDIDATE'].map(n => `docs/${n}.md`),
  'scripts/serve.mjs', 'scripts/check.mjs', 'scripts/build.mjs',
  'test/roster.test.mjs', 'test/report.test.mjs', 'test/ui-state.test.mjs',
  'test/security-contract.test.mjs', 'test/browser-checklist.md',
  'scripts/model.mjs', 'scripts/m1-frozen.mjs', 'scripts/build-production.mjs', 'scripts/check-production.mjs', 'scripts/preview-production.mjs', 'scripts/check-release.mjs',
  'test/production.test.mjs', 'test/seo.test.mjs', 'wrangler.jsonc',
  ...publicFiles.map(n => `public/${n}`), ...optionalHelpers.map(n => `public/${n}`),
];

export async function walkSafe(directory, prefix = '') {
  const stat = await lstat(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory() || path.resolve(await realpath(directory)).toLowerCase() !== path.resolve(directory).toLowerCase()) throw Error('Unsafe directory');
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const relative = prefix + entry.name;
    const item = await lstat(filename);
    if (item.isSymbolicLink()) throw Error('Linked path rejected');
    if (!prefix && path.resolve(directory) === path.resolve(root) && entry.name === '.git' && item.isDirectory()) continue;
    if (item.isDirectory()) files.push(...await walkSafe(filename, `${relative}/`));
    else if (item.isFile() && item.nlink === 1) files.push(relative);
    else throw Error('Non-regular or hard-linked file rejected');
  }
  return files.sort();
}

export async function check({ verifyDist = true } = {}) {
  if (Number(process.versions.node.split('.')[0]) < 24) throw Error('Node 24 required');
  const all = await walkSafe(root);
  for (const name of all) {
    if (!sourceFiles.includes(name) && ![...publicFiles, ...optionalHelpers].some(p => name === `dist/${p}`) && !PRODUCTION_FILES.some(p => name === `dist-production/${p}`)) throw Error(`Unknown file: ${name}`);
  }
  for (const name of sourceFiles) {
    if (!all.includes(name)) throw Error(`Missing file: ${name}`);
  }
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (!pkg.private || pkg.type !== 'module' || pkg.engines?.node !== '>=24' || ['dependencies', 'devDependencies', 'optionalDependencies'].some(k => Object.keys(pkg[k] ?? {}).length)) throw Error('Package contract');
  const commands = { dev: 'node scripts/serve.mjs', test: 'node --test', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', 'build:production': 'node scripts/build-production.mjs', 'check:production': 'node scripts/check-production.mjs', 'preview:production': 'node scripts/preview-production.mjs', 'release:check': 'node scripts/check-release.mjs' };
  if (JSON.stringify(pkg.scripts) !== JSON.stringify(commands)) throw Error('Unexpected scripts');
  const files = all.filter(n => n.startsWith('public/'));
  for (const name of files) {
    const code = await readFile(path.join(root, name), 'utf8');
    if (name.endsWith('.js')) {
      if (/\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|caches|serviceWorker|sendBeacon|innerHTML|outerHTML|insertAdjacentHTML|pushState|replaceState)\b|document\s*\.\s*cookie|console\s*\.|clipboard\s*\.\s*read|\bimport\s*\(/.test(code)) throw Error(`Forbidden browser API: ${name}`);
      if (/\bimport\b[^;]*\bfrom\s*['"](?!\.{1,2}\/)[^'"]+['"]/.test(code)) throw Error('Non-local module');
      for (const match of code.matchAll(/\b(?:import|export)\b[^;]*?\bfrom\s*['"]([^'"]+)['"]/g)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1]));
        if (!match[1].endsWith('.js') || !target.startsWith('public/') || !files.includes(target)) throw Error('Invalid ESM import target');
      }
    }
    if (name.endsWith('.html')) {
      if (!/<meta name="robots" content="noindex,nofollow">/.test(code) || /rel="(?:canonical|alternate)"|application\/ld\+json|<base\b|<form\b[^>]*\baction=|\bname="(?!viewport|description|robots)[^"]+"/i.test(code)) throw Error(`Preview HTML contract: ${name}`);
      const scripts = [...code.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
      if (scripts.length !== 1 || !/type="module"/.test(scripts[0][1]) || !/src="\/js\/app.js"/.test(scripts[0][1]) || scripts[0][2].trim()) throw Error('Script allowlist');
      if (/\bon[a-z]+\s*=|\bstyle\s*=|<(?:iframe|object|embed)\b|<input\b[^>]*\bname=|<textarea\b[^>]*\bname=/i.test(code)) throw Error('Unsafe HTML');
      for (const match of code.matchAll(/<(?:input|button|textarea|select)\b[^>]*>/g)) if (!/\bdisabled\b/.test(match[0])) throw Error('Initial control must fail closed');
      for (const match of code.matchAll(/<link\b[^>]*>/g)) if (!/rel="stylesheet"/.test(match[0]) || !/href="\/styles\/app.css"/.test(match[0])) throw Error('Link resource allowlist');
      for (const match of code.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
        if (!['/styles/app.css', '/js/app.js', '/index.html', '/en/index.html', '#main', 'https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(match[1])) throw Error('External or unexpected asset/link');
      }
    }
    if (name.endsWith('.css') && /@import|url\s*\(/i.test(code)) throw Error('External CSS resource');
  }
  if (verifyDist && all.some(n => n.startsWith('dist/'))) {
    const outputFiles = all.filter(n => n.startsWith('dist/')).map(n => n.slice(5));
    const expected = files.map(n => n.slice(7)).sort();
    if (JSON.stringify(outputFiles) !== JSON.stringify(expected)) throw Error('Incomplete or stale preview build; run build');
    for (const name of expected) if (!(await readFile(path.join(root, 'dist', name))).equals(await readFile(path.join(root, 'public', name)))) throw Error('Stale preview build; run build');
  }
  for (const name of all.filter(n => /\.(?:mjs|js)$/.test(n) && !n.startsWith('dist/') && !n.startsWith('dist-production/'))) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, name)], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw Error(`Syntax check failed: ${name}`);
  }
  return files.map(n => n.slice(7)).sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const files = await check(); process.stdout.write(`PASS: source allowlist, safe paths, package, ESM and browser security (${files.length} public files)\n`); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
