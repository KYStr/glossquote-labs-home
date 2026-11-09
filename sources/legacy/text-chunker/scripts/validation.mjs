import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const PUBLIC_FILES = Object.freeze([
  'en/index.html', 'index.html', 'js/app.mjs', 'js/core/text-chunker.mjs',
  'js/i18n.mjs', 'js/state.mjs', 'robots.txt', 'styles/app.css'
]);
export const MIME = Object.freeze({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' });
const canonical = value => process.platform === 'win32' ? value.toLowerCase() : value;
const fail = code => { throw new Error(code); };

export async function assertPlainPath(root, relative = '') {
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, relative);
  if (absolute !== absoluteRoot && !absolute.startsWith(absoluteRoot + path.sep)) fail('PATH_OUTSIDE_ROOT');
  const steps = relative ? [absoluteRoot, ...relative.split('/').map((_, i, parts) => path.join(absoluteRoot, ...parts.slice(0, i + 1)))] : [absoluteRoot];
  for (const step of steps) {
    const info = await lstat(step);
    if (info.isSymbolicLink()) fail('LINK_REJECTED');
    if (canonical(await realpath(step)) !== canonical(path.resolve(step))) fail('RESOLVED_PATH_CHANGED');
    if (info.isFile() && info.nlink !== 1) fail('HARDLINK_REJECTED');
    if (!info.isFile() && !info.isDirectory()) fail('SPECIAL_FILE_REJECTED');
  }
  return absolute;
}

export async function walkPlain(root, prefix = '') {
  await assertPlainPath(root, prefix);
  const output = [];
  const directory = path.join(root, prefix);
  for (const name of (await readdir(directory)).sort()) {
    const relative = prefix ? `${prefix}/${name}` : name;
    const absolute = await assertPlainPath(root, relative);
    const info = await lstat(absolute);
    if (info.isDirectory()) output.push(...await walkPlain(root, relative));
    else output.push(relative);
  }
  return output;
}

export async function validateTree(root, { complete = true, files = PUBLIC_FILES } = {}) {
  await assertPlainPath(root);
  const allowedDirectories = new Set(files.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
  async function visit(prefix = '') {
    for (const name of await readdir(path.join(root, prefix))) {
      const relative = prefix ? `${prefix}/${name}` : name;
      const absolute = await assertPlainPath(root, relative);
      const info = await lstat(absolute);
      if (info.isDirectory()) {
        if (!allowedDirectories.has(relative)) fail('UNKNOWN_PUBLIC_DIRECTORY');
        await visit(relative);
      } else if (!files.includes(relative)) fail('UNKNOWN_PUBLIC_FILE');
    }
  }
  await visit();
  if (complete) for (const file of files) {
    const absolute = await assertPlainPath(root, file);
    if (!(await lstat(absolute)).isFile()) fail('REQUIRED_FILE_NOT_REGULAR');
  }
}

// A bounded parser for the authored HTML subset, not a general HTML security audit.
export function parseMarkup(html) {
  const tags = [];
  const stack = [];
  const voidTags = new Set(['meta', 'link', 'input']);
  let cursor = 0;
  while (cursor < html.length) {
    const start = html.indexOf('<', cursor);
    if (start < 0) break;
    if (/^<!doctype html>/i.test(html.slice(start))) { cursor = start + '<!doctype html>'.length; continue; }
    let end = start + 1;
    let quote = '';
    for (; end < html.length; end += 1) {
      const char = html[end];
      if (quote) { if (char === quote) quote = ''; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === html.length) fail('MALFORMED_HTML');
    const body = html.slice(start + 1, end);
    cursor = end + 1;
    const closing = /^\/([a-z][a-z0-9-]*)\s*$/i.exec(body);
    if (closing) {
      if (stack.pop() !== closing[1].toLowerCase()) fail('UNBALANCED_HTML');
      continue;
    }
    const opening = /^([a-z][a-z0-9-]*)\b/i.exec(body);
    if (!opening) fail('UNSUPPORTED_MARKUP');
    const name = opening[1].toLowerCase();
    const attrs = Object.create(null);
    let rest = body.slice(opening[0].length);
    while (rest.trim()) {
      const attribute = /^\s+([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/.exec(rest);
      if (!attribute) fail('MALFORMED_ATTRIBUTE');
      const key = attribute[1].toLowerCase();
      if (Object.hasOwn(attrs, key)) fail('DUPLICATE_ATTRIBUTE');
      attrs[key] = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
      rest = rest.slice(attribute[0].length);
    }
    tags.push({ name, attrs });
    if (!voidTags.has(name)) stack.push(name);
  }
  if (stack.length) fail('UNBALANCED_HTML');
  return tags;
}

export function validateMarkup(html, language) {
  const tags = parseMarkup(html);
  const ids = new Map();
  const allowedTags = new Set(['html', 'head', 'meta', 'title', 'link', 'script', 'body', 'a', 'header', 'nav', 'span', 'main', 'h1', 'h2', 'p', 'form', 'div', 'label', 'textarea', 'input', 'select', 'option', 'button', 'section', 'ol', 'details', 'summary', 'noscript', 'footer']);
  let styles = 0;
  let scripts = 0;
  for (const tag of tags) {
    if (!allowedTags.has(tag.name)) fail('UNREVIEWED_HTML_ELEMENT');
    if (Object.keys(tag.attrs).some(key => key.startsWith('on') || ['style', 'srcdoc', 'action', 'formaction'].includes(key))) fail('INLINE_ACTIVE_CONTENT');
    if (tag.attrs.id) {
      if (ids.has(tag.attrs.id)) fail('DUPLICATE_ID');
      ids.set(tag.attrs.id, tag);
    }
    if (Object.hasOwn(tag.attrs, 'src') && !(tag.name === 'script' && tag.attrs.src === '/js/app.mjs' && tag.attrs.type === 'module')) fail('UNREVIEWED_ACTIVE_URL');
    if (tag.name === 'script') {
      if (tag.attrs.src !== '/js/app.mjs' || tag.attrs.type !== 'module') fail('INLINE_OR_UNREVIEWED_SCRIPT');
      scripts += 1;
    }
    if (tag.name === 'link') {
      if (tag.attrs.rel !== 'stylesheet' || tag.attrs.href !== '/styles/app.css') fail('UNREVIEWED_LINK');
      styles += 1;
    }
    if (tag.name === 'a') {
      const local = ['#main', '/index.html', '/en/index.html'];
      const home = language === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
      if (!local.includes(tag.attrs.href) && tag.attrs.href !== home) fail('UNREVIEWED_NAVIGATION_URL');
    }
  }
  const required = ['main', 'chunk-form', 'source', 'source-hint', 'source-count', 'source-error', 'limit', 'limit-range', 'limit-hint', 'limit-error', 'mode', 'mode-hint', 'mode-error', 'split', 'clear', 'status', 'refresh-notice', 'results', 'results-title', 'empty', 'result-summary', 'pagination', 'page-range', 'previous', 'page-choice', 'next', 'chunks', 'help-title'];
  for (const id of required) if (!ids.has(id)) fail('MISSING_UI_ID');
  if (scripts !== 1 || styles !== 1) fail('ASSET_COUNT');
  if (tags.find(tag => tag.name === 'html')?.attrs.lang !== language) fail('WRONG_LANGUAGE');
  if (tags.filter(tag => tag.name === 'h1').length !== 1) fail('H1_COUNT');
  if (!tags.some(tag => tag.name === 'meta' && tag.attrs.name === 'robots' && tag.attrs.content === 'noindex,nofollow')) fail('PREVIEW_NOINDEX_REQUIRED');
  if (!tags.some(tag => tag.name === 'meta' && tag.attrs.name === 'viewport' && tag.attrs.content.includes('width=device-width'))) fail('VIEWPORT_REQUIRED');
  if (ids.get('source').name !== 'textarea' || ids.get('limit').attrs.type !== 'text') fail('RAW_FIELD_REQUIRED');
  if (Object.hasOwn(ids.get('source').attrs, 'maxlength') || Object.hasOwn(ids.get('limit').attrs, 'maxlength')) fail('SILENT_TRUNCATION_ATTRIBUTE');
  for (const id of ['source', 'limit', 'mode', 'page-choice']) if (!tags.some(tag => tag.name === 'label' && tag.attrs.for === id)) fail('VISIBLE_LABEL_REQUIRED');
  for (const id of ['source', 'limit', 'mode']) if (!ids.get(id).attrs['aria-describedby']?.includes(`${id}-error`)) fail('ERROR_ASSOCIATION_REQUIRED');
  if (ids.get('status').attrs.role !== 'status') fail('LIVE_STATUS_REQUIRED');
  return [...ids.keys()].sort();
}

export async function manifest(root, files) {
  const records = [];
  for (const file of [...files].sort()) {
    const absolute = await assertPlainPath(root, file);
    const bytes = await readFile(absolute);
    records.push({ path: file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return { algorithm: 'sha256', digest: createHash('sha256').update(JSON.stringify(records) + '\n').digest('hex'), records };
}

export async function validateProject(projectRoot) {
  const publicRoot = path.join(projectRoot, 'public');
  await validateTree(publicRoot);
  const pkg = JSON.parse(await readFile(await assertPlainPath(projectRoot, 'package.json'), 'utf8'));
  if (pkg.type !== 'module' || pkg.private !== true || pkg.engines?.node !== '>=24' || Object.keys(pkg.dependencies ?? {}).length || Object.keys(pkg.devDependencies ?? {}).length) fail('PACKAGE_CONTRACT');
  const pages = [];
  for (const [file, language] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    pages.push(validateMarkup(await readFile(path.join(publicRoot, file), 'utf8'), language));
  }
  if (JSON.stringify(pages[0]) !== JSON.stringify(pages[1])) fail('LANGUAGE_STRUCTURE_MISMATCH');
  if ((await readFile(path.join(publicRoot, 'robots.txt'), 'utf8')).trim() !== 'User-agent: *\nDisallow: /') fail('PREVIEW_ROBOTS_REQUIRED');
  const stylesheet = await readFile(path.join(publicRoot, 'styles/app.css'), 'utf8');
  if (/@import|url\s*\(/i.test(stylesheet)) fail('UNREVIEWED_CSS_ASSET');
  const scripts = (await walkPlain(path.join(projectRoot, 'scripts'))).filter(file => file.endsWith('.mjs')).map(file => `scripts/${file}`);
  const serverSource = await readFile(await assertPlainPath(projectRoot, 'scripts/serve.mjs'), 'utf8');
  // Fixed authored configuration, paired with actual loopback bind/fallback tests.
  if (!serverSource.includes("export const HOST = '127.0.0.1';") || !serverSource.includes('export const PORT = 4203;')) fail('LOOPBACK_CONFIGURATION_REQUIRED');
  const tests = (await walkPlain(path.join(projectRoot, 'test'))).filter(file => file.endsWith('.mjs')).map(file => `test/${file}`);
  const modules = [...PUBLIC_FILES.filter(file => file.endsWith('.mjs')).map(file => `public/${file}`), ...scripts, ...tests];
  for (const file of modules) {
    const absolute = await assertPlainPath(projectRoot, file);
    const check = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8', timeout: 10000 });
    if (check.status !== 0 || check.error) fail('MODULE_SYNTAX_FAILED');
    if (file.startsWith('public/')) {
      const code = await readFile(absolute, 'utf8');
      if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|eval)\b|\b(?:innerHTML|outerHTML)\b|\bdocument\s*\.\s*cookie\b|\bconsole\s*\.|new\s+Function\b/.test(code)) fail('FORBIDDEN_RUNTIME_API');
      if (/\bimport\s*\(/.test(code)) fail('DYNAMIC_IMPORT_REJECTED');
      for (const match of code.matchAll(/\b(?:import|export)\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g)) {
        const specifier = match[1] ?? match[2];
        if (!specifier.startsWith('./') && !specifier.startsWith('../')) fail('NONLOCAL_MODULE_IMPORT');
        const dependency = path.relative(publicRoot, path.resolve(path.dirname(absolute), specifier)).replaceAll(path.sep, '/');
        if (!PUBLIC_FILES.includes(dependency)) fail('UNKNOWN_MODULE_IMPORT');
      }
    }
  }
  return { ok: true, stage: 'M1-preview', syntaxModules: modules.length, runtime: await manifest(publicRoot, PUBLIC_FILES) };
}
