import { readdir, readFile, lstat, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { workerModule } from './build-worker.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(root, 'public');
export async function listFiles(dir) {
  if ((await lstat(dir)).isSymbolicLink()) throw new Error('Symlinks are forbidden');
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (path.resolve(dir) === path.join(root, 'test') && entry.name === '.tmp') continue;
    if (entry.name.startsWith('.') || entry.isSymbolicLink()) throw new Error('Hidden files and symlinks are forbidden');
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(target));
    else if (entry.isFile()) files.push(target);
    else throw new Error('Unsupported filesystem entry');
  }
  return files.sort();
}
async function checkReference(owner, ref) {
  if (/^(?:#|https:\/\/glossquote\.com\/(?:en\/)?index\.html$)/u.test(ref)) return;
  if (path.basename(owner)==='404.html' && ref.startsWith('/')) {
    const target=path.resolve(publicRoot,`.${ref}`);
    const rel=path.relative(publicRoot,target);
    if (rel==='..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error('404 reference escapes public');
    await access(target); return;
  }
  if (/^(?:[a-z]+:|\/\/|\/)/iu.test(ref)) throw new Error('External or absolute executable resource');
  const target = path.resolve(path.dirname(owner), ref.split(/[?#]/u)[0]);
  const rel = path.relative(publicRoot, target);
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error('Reference escapes public');
  await access(target);
}
export async function validatePublic() {
  for (const required of ['index.html', 'styles/tokens.css', 'styles/app.css', 'js/app.mjs']) await access(path.join(publicRoot, required));
  const files = await listFiles(publicRoot);
  if (files.includes(path.join(publicRoot,'js/worker-source.mjs')) && await readFile(path.join(publicRoot,'js/worker-source.mjs'),'utf8') !== await workerModule()) throw new Error('Stale or altered Worker bundle; run npm run build:worker');
  for (const file of files) {
    if (!/\.(?:html|css|mjs|js|json|txt|xml|svg)$/u.test(file) && file!==path.join(publicRoot,'_headers')) throw new Error('Non-allowlisted static file');
    const text = await readFile(file, 'utf8');
    if (file.endsWith('.svg') && /<script|\son[a-z]+\s*=|(?:href|src)=|foreignObject/iu.test(text)) throw new Error('Executable SVG is forbidden');
    if (/\.(?:mjs|js)$/u.test(file)) {
      if (/\b(?:eval|Function|fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\b(?:innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|indexedDB|serviceWorker|sendBeacon)\b/u.test(text)) throw new Error('Forbidden runtime API');
      if (/JSON\.parse/u.test(text) && !file.endsWith(`${path.sep}lexer.mjs`) && !file.endsWith(`${path.sep}worker-source.mjs`)) throw new Error('Only lexer string decoding may use JSON.parse');
      for (const match of text.matchAll(/(?:from\s*|import\s*|new URL\(\s*)['"]([^'"]+)['"]/gu)) await checkReference(file, match[1]);
    }
    if (file.endsWith('.css')) {
      if (/@import|url\(/iu.test(text)) throw new Error('Unreviewed CSS resource');
    }
    if (file.endsWith('.html')) {
      if (!text.includes('<title>') || !text.includes('<h1') || !text.includes('name="description"')) throw new Error('Missing HTML metadata');
      if (/<(?:script|style)[^>]*>[\s\S]*?\S[\s\S]*?<\/(?:script|style)>|\son[a-z]+\s*=|\sstyle\s*=/iu.test(text)) throw new Error('Inline executable content');
      for (const match of text.matchAll(/(?:src|href)="([^"]+)"/gu)) await checkReference(file, match[1]);
    }
  }
  return files;
}
export async function checkProject() {
  const files = await validatePublic();
  const codeFiles = [...files.filter(file => /\.(?:mjs|js)$/u.test(file)), ...await listFiles(path.join(root, 'scripts')), ...await listFiles(path.join(root, 'test'))].filter(file => file.endsWith('.mjs'));
  for (const file of codeFiles) {
    const result = spawnSync(process.execPath, ['--check', file], { shell: false, encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`Syntax check failed: ${path.relative(root, file)}`);
  }
  console.log(`CHECK_PASS ${files.length} static files; ${codeFiles.length} syntax checks; runtime resources and DOM APIs reviewed`);
  return files;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkProject();
