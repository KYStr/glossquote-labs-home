import * as fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export class ValidationError extends Error {
  constructor(code) { super(code); this.name = 'ValidationError'; this.code = code; }
}
export function requireCondition(condition, code) {
  if (!condition) throw new ValidationError(code);
}
export function containedPath(root, relative) {
  const target = path.resolve(root, relative);
  const delta = path.relative(path.resolve(root), target);
  requireCondition(delta !== '..' && !delta.startsWith(`..${path.sep}`) && !path.isAbsolute(delta), 'PATH_OUTSIDE_ROOT');
  return target;
}
function equivalentPaths(left, right) {
  return process.platform === 'win32'
    ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
    : path.resolve(left) === path.resolve(right);
}

// Check every existing ancestor, including ancestors above the project/public root.
export async function assertSafePath(target, { allowMissing = false } = {}) {
  const absolute = path.resolve(target);
  const root = path.parse(absolute).root;
  const parts = absolute.slice(root.length).split(path.sep).filter(Boolean);
  let current = root;
  let stat = await fs.lstat(root);
  for (let index = 0; index < parts.length; index += 1) {
    requireCondition(stat.isDirectory(), 'ANCESTOR_NOT_DIRECTORY');
    current = path.join(current, parts[index]);
    try { stat = await fs.lstat(current); }
    catch (error) {
      if (error.code === 'ENOENT' && allowMissing) return null;
      throw error;
    }
    requireCondition(!stat.isSymbolicLink(), 'SYMLINK_FORBIDDEN');
  }
  requireCondition(equivalentPaths(await fs.realpath(absolute), absolute), 'PATH_ALIAS_FORBIDDEN');
  return stat;
}
export async function readSafeFile(target) {
  const before = await assertSafePath(target);
  requireCondition(before.isFile(), 'REGULAR_FILE_REQUIRED');
  requireCondition(before.nlink === 1, 'HARDLINK_FORBIDDEN');
  const handle = await fs.open(target, 'r');
  try {
    const opened = await handle.stat();
    requireCondition(opened.isFile() && opened.nlink === 1 && opened.ino === before.ino && opened.dev === before.dev, 'SOURCE_CHANGED');
    const bytes = await handle.readFile();
    const after = await assertSafePath(target);
    requireCondition(after.ino === before.ino && after.dev === before.dev && after.nlink === 1
      && after.size === before.size && after.mtimeMs === before.mtimeMs && bytes.length === before.size, 'SOURCE_CHANGED');
    return bytes;
  } finally { await handle.close(); }
}

export function approvedDirectories(assets) {
  const directories = new Set(['']);
  for (const asset of assets) {
    requireCondition(/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\.[a-zA-Z0-9]+$/.test(asset)
      && asset.split('/').every(part => !part.startsWith('.')), 'INVALID_ALLOWLIST');
    let directory = path.posix.dirname(asset);
    while (directory !== '.') {
      directories.add(directory);
      directory = path.posix.dirname(directory);
    }
  }
  return directories;
}
export async function inspectTree(root, assets, { requireAll = true, allowMissing = false } = {}) {
  const allowedFiles = new Set(assets);
  requireCondition(allowedFiles.size === assets.length, 'DUPLICATE_ALLOWLIST');
  const allowedDirectories = approvedDirectories(assets);
  const rootStat = await assertSafePath(root, { allowMissing });
  if (!rootStat) return [];
  requireCondition(rootStat.isDirectory(), 'DIRECTORY_REQUIRED');
  const files = [];
  async function walk(relative) {
    const directory = containedPath(root, relative);
    await assertSafePath(directory);
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const target = containedPath(root, name);
      const stat = await assertSafePath(target);
      if (stat.isDirectory()) {
        requireCondition(allowedDirectories.has(name), 'UNAPPROVED_DIRECTORY');
        await walk(name);
      } else {
        requireCondition(stat.isFile(), 'REGULAR_FILE_REQUIRED');
        requireCondition(allowedFiles.has(name), 'UNAPPROVED_ASSET');
        requireCondition(stat.nlink === 1, 'HARDLINK_FORBIDDEN');
        files.push(name);
      }
    }
  }
  await walk('');
  if (requireAll) requireCondition(files.length === allowedFiles.size && assets.every(asset => files.includes(asset)), 'MISSING_ASSET');
  return files.sort();
}
export async function makeSafeDirectory(target) {
  const stat = await assertSafePath(target, { allowMissing: true });
  if (stat) { requireCondition(stat.isDirectory(), 'DIRECTORY_REQUIRED'); return; }
  const parent = await assertSafePath(path.dirname(target));
  requireCondition(parent.isDirectory(), 'DIRECTORY_REQUIRED');
  await fs.mkdir(target);
  await assertSafePath(target);
}
export async function writeOwnedFile(root, relative, bytes) {
  const target = containedPath(root, relative);
  const existing = await assertSafePath(target, { allowMissing: true });
  requireCondition(!existing || (existing.isFile() && existing.nlink === 1), 'UNSAFE_DESTINATION');
  await assertSafePath(path.dirname(target));
  const temporary = containedPath(root, path.join(path.dirname(relative), `.build-${randomUUID()}.tmp`));
  try {
    await fs.writeFile(temporary, bytes, { flag: 'wx' });
    await assertSafePath(path.dirname(target));
    const current = await assertSafePath(target, { allowMissing: true });
    requireCondition(!current || (current.isFile() && current.nlink === 1), 'UNSAFE_DESTINATION');
    await fs.rename(temporary, target);
  } finally {
    const leftover = await assertSafePath(temporary, { allowMissing: true });
    if (leftover) {
      requireCondition(leftover.isFile() && leftover.nlink === 1, 'UNSAFE_TEMPORARY');
      await fs.unlink(temporary);
    }
  }
}

function decodeAttribute(value) {
  const names = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', colon: ':', tab: '\t', newline: '\n' };
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);?/gi, (_, entity) => {
    if (!entity.startsWith('#')) {
      const result = names[entity.toLowerCase()];
      requireCondition(result !== undefined, 'HTML_ENTITY_INVALID');
      return result;
    }
    const number = entity[1].toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    requireCondition(number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff), 'HTML_ENTITY_INVALID');
    return String.fromCodePoint(number);
  });
}

// A deliberately bounded HTML tokenizer: comments are inert; quoted attributes,
// script raw text and title/textarea RCDATA are consumed as units. Unsupported
// syntax fails rather than relying on the browser's error-recovery parser.
export function tokenizeHtml(source) {
  const tokens = [];
  let offset = 0;
  while (offset < source.length) {
    const start = source.indexOf('<', offset);
    const textEnd = start === -1 ? source.length : start;
    const text = source.slice(offset, textEnd);
    if (/\S/.test(text)) tokens.push({ name: '#text', text });
    if (start === -1) break;
    if (source.startsWith('<!--', start)) {
      const end = source.indexOf('-->', start + 4);
      requireCondition(end !== -1 && !source.slice(start + 4, end).includes('--'), 'HTML_COMMENT_INVALID');
      offset = end + 3; continue;
    }
    const doctype = source.slice(start).match(/^<!doctype\s+html\s*>/i);
    if (doctype) { offset = start + doctype[0].length; continue; }
    const tag = source.slice(start).match(/^<(\/)?([a-z][a-z0-9-]*)/i);
    requireCondition(tag, 'HTML_TAG_INVALID');
    const name = tag[2].toLowerCase();
    const closing = Boolean(tag[1]);
    const attrs = new Map();
    let cursor = start + tag[0].length;
    let selfClosing = false;
    while (true) {
      const whitespace = source.slice(cursor).match(/^[\t\n\f\r ]*/)[0];
      cursor += whitespace.length;
      if (source.startsWith('/>', cursor)) { selfClosing = true; cursor += 2; break; }
      if (source[cursor] === '>') { cursor += 1; break; }
      requireCondition(!closing && whitespace.length > 0, 'HTML_ATTRIBUTE_INVALID');
      const attribute = source.slice(cursor).match(/^[a-z_:][a-z0-9_:.-]*/i);
      requireCondition(attribute, 'HTML_ATTRIBUTE_INVALID');
      const key = attribute[0].toLowerCase();
      requireCondition(!attrs.has(key), 'HTML_DUPLICATE_ATTRIBUTE');
      cursor += attribute[0].length;
      const afterName = cursor;
      cursor += source.slice(cursor).match(/^[\t\n\f\r ]*/)[0].length;
      let value = '';
      if (source[cursor] === '=') {
        cursor += 1;
        cursor += source.slice(cursor).match(/^[\t\n\f\r ]*/)[0].length;
        const quote = source[cursor];
        if (quote === '"' || quote === "'") {
          const end = source.indexOf(quote, cursor + 1);
          requireCondition(end !== -1, 'HTML_ATTRIBUTE_INVALID');
          value = source.slice(cursor + 1, end); cursor = end + 1;
        } else {
          const unquoted = source.slice(cursor).match(/^[^\s"'`=<>]+/);
          requireCondition(unquoted, 'HTML_ATTRIBUTE_INVALID');
          value = unquoted[0]; cursor += value.length;
        }
      } else {
        cursor = afterName;
      }
      attrs.set(key, decodeAttribute(value));
    }
    requireCondition(!closing || !selfClosing, 'HTML_TAG_INVALID');
    const token = { name, closing, selfClosing, attrs, start, end: cursor, content: null };
    tokens.push(token);
    offset = cursor;
    if (!closing && ['script', 'title', 'textarea'].includes(name)) {
      requireCondition(!selfClosing, 'HTML_TEXT_ELEMENT_INVALID');
      const endTag = new RegExp(`</${name}[\\t\\n\\f\\r ]*>`, 'gi');
      endTag.lastIndex = offset;
      const match = endTag.exec(source);
      requireCondition(match, 'HTML_TEXT_ELEMENT_INVALID');
      token.content = source.slice(offset, match.index);
      tokens.push({ name, closing: true, selfClosing: false, attrs: new Map(), start: match.index, end: endTag.lastIndex, content: null });
      offset = endTag.lastIndex;
    }
  }
  return tokens;
}

export function resolveLocalReference(page, reference, assets) {
  requireCondition(typeof reference === 'string' && reference.length > 0
    && !/[\s\\?#%:]/.test(reference) && !reference.startsWith('//'), 'LOCAL_REFERENCE_REQUIRED');
  const segments = reference.startsWith('/') ? [] : page.split('/').slice(0, -1);
  for (const segment of reference.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') { requireCondition(segments.length > 0, 'REFERENCE_OUTSIDE_ROOT'); segments.pop(); }
    else { requireCondition(/^[a-zA-Z0-9_.-]+$/.test(segment) && !segment.startsWith('.'), 'LOCAL_REFERENCE_REQUIRED'); segments.push(segment); }
  }
  const result = segments.join('/');
  requireCondition(assets.includes(result), 'REFERENCE_MISSING');
  return result;
}

// noscript is intentionally unsupported by this preview grammar. Its parsing
// depends on scripting state; failing closed prevents inert metadata spoofing.
const TAGS = new Set('html head meta title link script body header nav main section h1 h2 h3 p strong small div label input textarea button output pre code span bdi details summary footer a ul li br'.split(' '));
const VOID_TAGS = new Set(['meta', 'link', 'input', 'br']);
const HEAD_TAGS = new Set(['meta', 'title', 'link', 'script']);
function validateDocumentStructure(tokens) {
  const stack = [];
  let htmlSeen = false;
  let headSeen = false;
  let bodySeen = false;
  for (const token of tokens) {
    if (token.name === '#text') {
      requireCondition(stack.includes('body'), 'HTML_TEXT_OUTSIDE_BODY');
      continue;
    }
    if (token.closing) {
      requireCondition(stack.at(-1) === token.name, 'HTML_STRUCTURE_INVALID');
      stack.pop();
      continue;
    }
    token.parent = stack.at(-1) ?? null;
    if (token.name === 'html') {
      requireCondition(!htmlSeen && stack.length === 0, 'HTML_STRUCTURE_INVALID'); htmlSeen = true;
    } else if (token.name === 'head') {
      requireCondition(token.parent === 'html' && !headSeen && !bodySeen, 'HTML_STRUCTURE_INVALID'); headSeen = true;
    } else if (token.name === 'body') {
      requireCondition(token.parent === 'html' && headSeen && !bodySeen, 'HTML_STRUCTURE_INVALID'); bodySeen = true;
    } else {
      requireCondition(stack.includes('head') || stack.includes('body'), 'HTML_STRUCTURE_INVALID');
      if (stack.includes('head')) requireCondition(token.parent === 'head' && HEAD_TAGS.has(token.name), 'HTML_HEAD_CONTENT_INVALID');
      if (['meta', 'title', 'link'].includes(token.name)) requireCondition(token.parent === 'head', 'HTML_METADATA_OUTSIDE_HEAD');
    }
    requireCondition(!token.selfClosing || VOID_TAGS.has(token.name), 'HTML_STRUCTURE_INVALID');
    if (!VOID_TAGS.has(token.name)) stack.push(token.name);
  }
  requireCondition(htmlSeen && headSeen && bodySeen && stack.length === 0, 'HTML_STRUCTURE_INVALID');
}
const FORBIDDEN_ATTRIBUTES = /^(?:on|style$|srcdoc$|ping$|action$|formaction$|http-equiv$|srcset$|background$)/;
export function validatePreviewHtml(source, page, assets, { mode = 'scaffold' } = {}) {
  const locale = page === 'index.html' ? 'zh-Hant' : 'en';
  const tokens = tokenizeHtml(source);
  const active = tokens.filter(token => token.name !== '#text' && !token.closing);
  const ids = new Set();
  for (const token of tokens) {
    if (token.name === '#text') continue;
    requireCondition(TAGS.has(token.name), 'HTML_ELEMENT_FORBIDDEN');
    for (const key of token.attrs.keys()) requireCondition(!FORBIDDEN_ATTRIBUTES.test(key), 'HTML_ATTRIBUTE_FORBIDDEN');
    if (token.attrs.has('id')) {
      const id = token.attrs.get('id');
      requireCondition(!ids.has(id), 'HTML_DUPLICATE_ID'); ids.add(id);
    }
  }
  validateDocumentStructure(tokens);
  const html = active.filter(token => token.name === 'html');
  requireCondition(html.length === 1 && html[0].attrs.get('lang') === locale, 'HTML_LOCALE_INVALID');
  const robots = active.filter(token => token.name === 'meta' && token.parent === 'head' && token.attrs.get('name')?.toLowerCase() === 'robots');
  requireCondition(robots.length === 1, 'PREVIEW_ROBOTS_REQUIRED');
  const directives = robots[0].attrs.get('content')?.toLowerCase().split(/[\s,]+/).filter(Boolean).sort();
  requireCondition(JSON.stringify(directives) === JSON.stringify(['nofollow', 'noindex']), 'PREVIEW_ROBOTS_INVALID');
  requireCondition(active.some(token => token.name === 'meta' && token.attrs.get('charset')?.toLowerCase() === 'utf-8'), 'UTF8_REQUIRED');
  requireCondition(active.some(token => token.name === 'title') && active.some(token => token.name === 'meta' && token.attrs.get('name') === 'description' && token.attrs.get('content')), 'HTML_METADATA_REQUIRED');
  const headings = active.filter(token => token.name === 'h1');
  const closingHeading = tokens.find(token => token.name === 'h1' && token.closing);
  const expectedHeading = locale === 'zh-Hant' ? '檔案 SHA-256 校驗' : 'File SHA-256 Checksum';
  requireCondition(headings.length === 1 && closingHeading && source.slice(headings[0].end, closingHeading.start).trim() === expectedHeading, 'HTML_HEADING_INVALID');
  const home = locale === 'zh-Hant' ? 'https://glossquote.com/index.html' : 'https://glossquote.com/en/index.html';
  requireCondition(active.some(token => token.name === 'a' && token.attrs.get('href') === home), 'LOCALE_HOME_REQUIRED');
  const scripts = active.filter(token => token.name === 'script');
  requireCondition(scripts.length === 1, 'MODULE_SCRIPT_REQUIRED');
  for (const token of active) {
    if (token.name === 'script') {
      requireCondition(token.attrs.get('type') === 'module' && token.content.trim() === '', 'INLINE_SCRIPT_FORBIDDEN');
      const script = resolveLocalReference(page, token.attrs.get('src'), assets);
      requireCondition(script.endsWith('.mjs'), 'MODULE_SCRIPT_REQUIRED');
    } else if (token.attrs.has('src')) requireCondition(false, 'HTML_SOURCE_FORBIDDEN');
    if (token.attrs.has('href')) {
      const ref = token.attrs.get('href');
      if (token.name === 'a' && ref === home) continue;
      if (token.name === 'a' && ref.startsWith('#')) { requireCondition(ids.has(ref.slice(1)), 'ANCHOR_MISSING'); continue; }
      const resolved = resolveLocalReference(page, ref, assets);
      if (token.name === 'link') requireCondition(token.attrs.get('rel') === 'stylesheet' && resolved.endsWith('.css'), 'STYLESHEET_REQUIRED');
      else requireCondition(token.name === 'a' && resolved.endsWith('.html'), 'NAVIGATION_INVALID');
    }
  }
  const controls = active.filter(token => ['input', 'textarea', 'button'].includes(token.name));
  requireCondition(['scaffold', 'tool'].includes(mode), 'HTML_MODE_INVALID');
  const expectedIds = mode === 'scaffold' ? ['calculate', 'cancel', 'clear', 'copy', 'download', 'expected', 'file']
    : ['calculate', 'cancel', 'checksum', 'clear', 'copy', 'download', 'expected', 'file'];
  if (mode === 'scaffold') requireCondition(controls.length === 7 && controls.every(token => token.attrs.has('disabled')), 'SCAFFOLD_CONTROLS_MUST_BE_DISABLED');
  else {
    requireCondition(controls.length === 8, 'TOOL_CONTROL_IDS');
    for (const id of ['file', 'expected', 'clear']) requireCondition(controls.some(token => token.attrs.get('id') === id && !token.attrs.has('disabled')), 'TOOL_INPUT_MUST_BE_AVAILABLE');
    for (const id of ['calculate', 'cancel', 'copy', 'download', 'checksum']) requireCondition(controls.some(token => token.attrs.get('id') === id && token.attrs.has('disabled')), 'TOOL_INITIAL_RESULT_MUST_BE_DISABLED');
    const checksum = controls.find(token => token.attrs.get('id') === 'checksum');
    requireCondition(checksum.name === 'textarea' && checksum.attrs.has('readonly') && checksum.content === '', 'READONLY_EMPTY_RESULT_REQUIRED');
    const expected = controls.find(token => token.attrs.get('id') === 'expected');
    requireCondition(!expected.attrs.has('maxlength') && expected.content === '', 'EXPECTED_DRAFT_MUST_NOT_TRUNCATE');
    for (const id of ['comparison', 'output-status', 'expected-error', 'support-notice', 'file-meta', 'file-name', 'full-name', 'file-size', 'name-details', 'startup-notice']) requireCondition(ids.has(id), 'TOOL_STATUS_ELEMENT_REQUIRED');
    for (const id of ['file-name', 'full-name']) requireCondition(active.some(token => token.name === 'bdi' && token.attrs.get('id') === id), 'FILENAME_BDI_REQUIRED');
    requireCondition(active.some(token => token.name === 'label' && token.attrs.get('for') === 'checksum'), 'VISIBLE_LABEL_REQUIRED');
    requireCondition(expected.attrs.get('aria-describedby')?.split(' ').includes('expected-error'), 'EXPECTED_ERROR_ASSOCIATION_REQUIRED');
  }
  requireCondition(JSON.stringify(controls.map(token => token.attrs.get('id')).sort()) === JSON.stringify(expectedIds), 'SCAFFOLD_CONTROL_IDS');
  const file = controls.find(token => token.attrs.get('id') === 'file');
  requireCondition(file.attrs.get('type') === 'file' && !file.attrs.has('accept') && !file.attrs.has('multiple'), 'SINGLE_ANY_FILE_REQUIRED');
  for (const id of ['file', 'expected']) requireCondition(active.some(token => token.name === 'label' && token.attrs.get('for') === id), 'VISIBLE_LABEL_REQUIRED');
  requireCondition(active.some(token => token.attrs.get('id') === 'status' && token.attrs.get('aria-live') === 'polite'), 'LIVE_STATUS_REQUIRED');
  for (const token of active) for (const key of ['aria-labelledby', 'aria-describedby']) {
    if (token.attrs.has(key)) requireCondition(token.attrs.get(key).split(/\s+/).every(id => ids.has(id)), 'ARIA_REFERENCE_MISSING');
  }
  return controls.map(token => `${token.attrs.get('id')}:${token.name}:${token.attrs.get('type') ?? ''}`).sort();
}
