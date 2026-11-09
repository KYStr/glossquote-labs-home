import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PUBLIC_FILES = Object.freeze([
  'en/index.html', 'index.html', 'js/app.mjs', 'js/core/packing-list.mjs',
  'js/i18n.mjs', 'js/state.mjs', 'robots.txt', 'styles/app.css'
]);
const directoryNames = new Set(PUBLIC_FILES.flatMap(path => {
  const parts = path.split('/'); return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
}));
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export function inside(root, target) {
  const path = relative(resolve(root), resolve(target));
  return path === '' || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`));
}

export async function verifyRoot(root) {
  const absolute = resolve(root);
  const stat = await lstat(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('UNSAFE_ROOT');
  if (resolve(await realpath(absolute)).toLowerCase() !== absolute.toLowerCase()) throw new Error('ROOT_ALIAS');
  return absolute;
}

// Every path component must be an ordinary directory/file. Hardlinks are refused.
export async function verifyPath(root, target, { missing = false, directory = false } = {}) {
  root = await verifyRoot(root);
  target = resolve(target);
  if (!inside(root, target)) throw new Error('OUTSIDE_ROOT');
  const parts = relative(root, target).split(/[\\/]/).filter(Boolean);
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    let stat;
    try { stat = await lstat(current); }
    catch (error) { if (error.code === 'ENOENT' && missing) return; throw error; }
    if (stat.isSymbolicLink()) throw new Error('LINK_REFUSED');
    const isDirectory = index < parts.length - 1 || directory;
    if (isDirectory ? !stat.isDirectory() : !stat.isFile()) throw new Error('UNSAFE_PATH_TYPE');
    if (stat.isFile() && stat.nlink !== 1) throw new Error('HARDLINK_REFUSED');
    if (!inside(root, await realpath(current))) throw new Error('OUTSIDE_ROOT');
  }
}

export async function walkAllowed(root, directory, { requireAll = true, missing = false } = {}) {
  await verifyPath(root, directory, { directory: true, missing });
  const files = [];
  async function walk(folder, prefix = '') {
    let entries;
    try { entries = await readdir(folder, { withFileTypes: true }); }
    catch (error) { if (missing && error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const name = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new Error('LINK_REFUSED');
      if (entry.isDirectory()) {
        if (!directoryNames.has(name)) throw new Error('UNKNOWN_DIRECTORY');
        await verifyPath(root, join(folder, entry.name), { directory: true });
        await walk(join(folder, entry.name), name);
      } else {
        if (!PUBLIC_FILES.includes(name)) throw new Error('UNKNOWN_ASSET');
        await verifyPath(root, join(folder, entry.name));
        files.push(name);
      }
    }
  }
  await walk(directory);
  files.sort();
  if (requireAll && JSON.stringify(files) !== JSON.stringify(PUBLIC_FILES)) throw new Error('ASSET_MISSING');
  return files;
}

// A bounded tokenizer for our static HTML subset, not a general browser parser.
// It rejects executable attributes and checks every actual attribute token.
export function htmlTags(html) {
  const tags = [];
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor);
    if (start < 0) break;
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4);
      if (end < 0) throw new Error('HTML_COMMENT');
      cursor = end + 3; continue;
    }
    const head = /^<\/?([a-z][a-z0-9-]*)\b/i.exec(html.slice(start));
    if (!head) {
      if (/^<!doctype html>/i.test(html.slice(start))) { cursor = start + 15; continue; }
      throw new Error('HTML_TAG');
    }
    cursor = start + head[0].length;
    const attrs = new Map();
    for (;;) {
      while (/\s/.test(html[cursor] ?? '') && cursor < html.length) cursor++;
      if (html[cursor] === '>') { cursor++; break; }
      if (html[cursor] === '/' && html[cursor + 1] === '>') { cursor += 2; break; }
      const attribute = /^[a-zA-Z_:][a-zA-Z0-9_:.-]*/.exec(html.slice(cursor));
      if (!attribute) throw new Error('HTML_ATTRIBUTE');
      const name = attribute[0].toLowerCase();
      if (attrs.has(name)) throw new Error('DUPLICATE_ATTRIBUTE');
      cursor += attribute[0].length;
      while (/\s/.test(html[cursor] ?? '') && cursor < html.length) cursor++;
      let value = '';
      if (html[cursor] === '=') {
        cursor++;
        while (/\s/.test(html[cursor] ?? '') && cursor < html.length) cursor++;
        const quote = html[cursor];
        if (quote !== '"' && quote !== "'") throw new Error('HTML_UNQUOTED');
        const end = html.indexOf(quote, cursor + 1);
        if (end < 0) throw new Error('HTML_QUOTE');
        value = html.slice(cursor + 1, end);
        cursor = end + 1;
      }
      attrs.set(name, value);
    }
    if (html[start + 1] !== '/') tags.push({ name: head[1].toLowerCase(), attrs });
  }
  return tags;
}

export function validateHtml(html, language) {
  const tags = htmlTags(html);
  if (tags[0]?.name !== 'html' || tags[0].attrs.get('lang') !== language) throw new Error('HTML_LANGUAGE');
  const ids = tags.filter(tag => tag.attrs.has('id')).map(tag => tag.attrs.get('id'));
  if (new Set(ids).size !== ids.length) throw new Error('DUPLICATE_ID');
  if (!tags.some(tag => tag.name === 'meta' && tag.attrs.get('name') === 'robots' && tag.attrs.get('content') === 'noindex,nofollow')) throw new Error('PREVIEW_ROBOTS');
  let modules = 0;
  for (const { name, attrs } of tags) {
    if (['iframe', 'object', 'embed', 'base', 'form', 'style'].includes(name)) throw new Error('HTML_ACTIVE_TAG');
    if (attrs.has('maxlength')) throw new Error('SILENT_TRUNCATION');
    for (const [attribute, value] of attrs) {
      if (/^on/i.test(attribute) || ['style', 'srcdoc', 'srcset', 'action', 'formaction', 'ping', 'poster'].includes(attribute)) throw new Error('HTML_ACTIVE_ATTRIBUTE');
      if (['src', 'href'].includes(attribute)) {
        if (value.startsWith('#')) {
          if (!ids.includes(value.slice(1))) throw new Error('UNKNOWN_ANCHOR');
        } else if (!value.startsWith('/') || value.startsWith('//') || !PUBLIC_FILES.includes(value.slice(1))) throw new Error('HTML_REFERENCE');
      }
    }
    if (name === 'script') {
      if (attrs.get('src') !== '/js/app.mjs' || attrs.get('type') !== 'module') throw new Error('INLINE_SCRIPT');
      modules++;
    }
    if (name === 'link' && attrs.get('rel') !== 'stylesheet') throw new Error('PREVIEW_LINK');
  }
  if (modules !== 1 || /<script[^>]*>\s*[^<\s]/i.test(html)) throw new Error('SCRIPT_CONTENT');
  return ids;
}

export async function validatePublic(root = PROJECT_ROOT) {
  root = await verifyRoot(root);
  const publicRoot = join(root, 'public');
  const files = await walkAllowed(root, publicRoot);
  const loaded = new Map();
  for (const file of files) loaded.set(file, await readFile(join(publicRoot, file), 'utf8'));
  const zhIds = validateHtml(loaded.get('index.html'), 'zh-Hant');
  const enIds = validateHtml(loaded.get('en/index.html'), 'en');
  if (JSON.stringify(zhIds) !== JSON.stringify(enIds)) throw new Error('LOCALE_PARITY');
  for (const file of files.filter(name => name.endsWith('.mjs'))) {
    const checked = spawnSync(process.execPath, ['--check', join(publicRoot, file)], { encoding: 'utf8', timeout: 10000 });
    if (checked.status !== 0) throw new Error('ESM_SYNTAX');
    const source = loaded.get(file);
    // This scan supplements syntax/reference checks; it is not a complete security proof.
    if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|eval|localStorage|sessionStorage|indexedDB)\b|\.innerHTML\b|\.outerHTML\b|document\.cookie|import\s*\(/.test(source)) throw new Error('FORBIDDEN_BROWSER_API');
    for (const match of source.matchAll(/\b(?:import|export)\s+(?:[^;\n]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
      if (!match[1].startsWith('./') && !match[1].startsWith('../')) throw new Error('ESM_REMOTE_REFERENCE');
      const target = relative(publicRoot, resolve(dirname(join(publicRoot, file)), match[1])).replaceAll('\\', '/');
      if (!PUBLIC_FILES.includes(target)) throw new Error('ESM_REFERENCE');
    }
  }
  const css = loaded.get('styles/app.css');
  if (/@import|url\s*\(/i.test(css)) throw new Error('CSS_REMOTE_REFERENCE');
  await verifyPath(root, join(root, 'package.json'));
  const packageFile = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  if (packageFile.private !== true || packageFile.type !== 'module' || packageFile.engines?.node !== '>=24' ||
      Object.keys(packageFile.dependencies ?? {}).length || Object.keys(packageFile.devDependencies ?? {}).length) throw new Error('PACKAGE_CONTRACT');
  return files;
}
