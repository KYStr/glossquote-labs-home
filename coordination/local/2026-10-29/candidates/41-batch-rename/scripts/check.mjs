import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC_FILES = Object.freeze([
  'en/index.html', 'index.html', 'js/app.mjs', 'js/core/filename-planner.mjs', 'js/core/zip-store.mjs', 'js/i18n.mjs',
  'styles/app.css', 'styles/tokens.css',
]);
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";

export function inside(parent, child) {
  const rel = relative(resolve(parent), resolve(child));
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !resolve(child).startsWith('\\\\') && !rel.includes(':');
}

export async function inspectTree(root) {
  const base = resolve(root);
  const found = [];
  async function walk(folder) {
    const stat = await lstat(folder);
    if (stat.isSymbolicLink() || !stat.isDirectory() || resolve(await realpath(folder)).toLowerCase() !== resolve(folder).toLowerCase()) throw new Error('UNSAFE_DIRECTORY');
    const names = await readdir(folder);
    if (folder !== base && names.length === 0) throw new Error('EMPTY_DIRECTORY');
    for (const name of names) {
      if (name.startsWith('.')) throw new Error('HIDDEN_PATH');
      const file = join(folder, name);
      if (!inside(base, file)) throw new Error('OUTSIDE_ROOT');
      const info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error('SYMLINK');
      if (info.isDirectory()) await walk(file);
      else if (info.isFile()) found.push(relative(base, file).split(sep).join('/'));
      else throw new Error('UNSUPPORTED_FILE');
    }
  }
  await walk(base);
  return found.sort();
}

export async function assertPublicTree(root = join(ROOT, 'public')) {
  const files = await inspectTree(root);
  if (JSON.stringify(files) !== JSON.stringify([...PUBLIC_FILES].sort())) throw new Error('PUBLIC_ALLOWLIST');
  return files;
}

export async function check() {
  if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  if (pkg.private !== true || pkg.type !== 'module' || pkg.engines.node !== '>=24' || Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) throw new Error('PACKAGE_CONTRACT');
  const files = await assertPublicTree();
  for (const file of files) {
    const contents = await readFile(join(ROOT, 'public', file), 'utf8');
    if (file.endsWith('.html')) {
      if (!contents.includes('content="noindex, nofollow"') || !contents.includes(CSP)) throw new Error('PREVIEW_POLICY');
      if ((contents.match(/<h1[\s>]/g) ?? []).length !== 1 || !contents.includes('name="description"')) throw new Error('PAGE_SEMANTICS');
      if (/canonical|hreflang|application\/ld\+json/i.test(contents)) throw new Error('PREMATURE_RELEASE_SEO');
      for (const match of contents.matchAll(/(?:src|href)="([^"]*)"/g)) {
        const value = match[1];
        if (value.startsWith('#')) continue;
        if (value === 'https://glossquote.com/index.html' || value === 'https://glossquote.com/en/index.html') continue;
        if (!value.startsWith('/') || value.startsWith('//') || !files.includes(value.slice(1))) throw new Error('UNREVIEWED_RESOURCE');
      }
      if (/<script(?![^>]*src=)|\son[a-z]+\s*=|<iframe|<style[\s>]/i.test(contents)) throw new Error('INLINE_EXECUTION');
    }
    if (file.endsWith('.css') && /@import|url\s*\(/i.test(contents)) throw new Error('CSS_RESOURCE');
    if (file.endsWith('.mjs')) {
      if (/innerHTML|outerHTML|insertAdjacentHTML|DOMParser|\beval\s*\(|new\s+Function|import\s*\(|\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|document\.cookie|console\./.test(contents)) throw new Error('PROHIBITED_API');
      for (const match of contents.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
        const target = resolve(dirname(join(ROOT, 'public', file)), match[1]);
        if (!match[1].startsWith('.') || !inside(join(ROOT, 'public'), target) || !files.includes(relative(join(ROOT, 'public'), target).split(sep).join('/'))) throw new Error('UNREVIEWED_IMPORT');
      }
    }
  }
  const scriptFiles = (await inspectTree(join(ROOT, 'scripts'))).filter(f => f.endsWith('.mjs')).map(f => join(ROOT, 'scripts', f));
  const testFiles = (await inspectTree(join(ROOT, 'test'))).filter(f => f.endsWith('.mjs')).map(f => join(ROOT, 'test', f));
  for (const file of [...files.filter(f => f.endsWith('.mjs')).map(f => join(ROOT, 'public', f)), ...scriptFiles, ...testFiles]) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8', windowsHide: true, shell: false, timeout: 10000 });
    if (result.status !== 0) throw new Error('JS_SYNTAX');
  }
  return { status: 'PASS', publicFiles: files.length, syntax: 'PASS', preview: 'noindex', browser: 'NOT_RUN_USER_FOCUS_INCIDENT' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await check())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
