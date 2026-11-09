import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

// Every component is inspected before traversing, reading or copying a tree.
export async function safeDirectory(directory) {
  const absolute = path.resolve(directory);
  const parsed = path.parse(absolute);
  let cursor = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const stat = await lstat(cursor);
    if (!stat.isDirectory() || stat.isSymbolicLink() || path.resolve(await realpath(cursor)).toLowerCase() !== cursor.toLowerCase()) throw new Error('UNSAFE_DIRECTORY');
  }
  return absolute;
}

export function htmlTags(source) {
  if (/<!--(?![\s\S]*?-->)/.test(source)) throw new Error('UNCLOSED_COMMENT');
  const active = source.replace(/<!--[\s\S]*?-->/g, '');
  const tags = [];
  const pattern = /<(\/?[a-z][a-z0-9-]*)(\s+(?:[^"'<>]|"[^"]*"|'[^']*')*?|\s*)>/gi;
  for (const match of active.matchAll(pattern)) {
    if (match[1].startsWith('/')) continue;
    const attrs = new Map(), raw = match[2];
    const attrPattern = /\s+([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gi;
    let end = 0;
    for (const attr of raw.matchAll(attrPattern)) {
      if (raw.slice(end, attr.index).trim()) throw new Error('HTML_ATTRIBUTE_SYNTAX');
      const name = attr[1].toLowerCase();
      if (attrs.has(name)) throw new Error('DUPLICATE_ATTRIBUTE');
      attrs.set(name, attr[2] ?? attr[3] ?? attr[4] ?? ''); end = attr.index + attr[0].length;
    }
    if (raw.slice(end).trim().replace(/^\/$/, '')) throw new Error('HTML_ATTRIBUTE_SYNTAX');
    tags.push({ tag: match[1].toLowerCase(), attrs });
  }
  // Reject syntax outside our supported tag grammar instead of silently skipping it.
  const remainder = active.replace(pattern, '').replace(/<!doctype html>/gi, '');
  if (/<[a-z!/?]/i.test(remainder)) throw new Error('HTML_TAG_SYNTAX');
  return tags;
}

export function validateHtml(source, assets, { production = false } = {}) {
  const tags = htmlTags(source);
  const robots = tags.filter(t => t.tag === 'meta' && t.attrs.get('name')?.toLowerCase() === 'robots');
  if (robots.length !== 1 || robots[0].attrs.get('content') !== (production ? 'index,follow' : 'noindex,nofollow')) throw new Error('ROBOTS_META');
  for (const { tag, attrs } of tags) {
    for (const [name, value] of attrs) {
      if (/^on/i.test(name) || ['style', 'srcset', 'srcdoc', 'action', 'formaction', 'background', 'poster', 'data'].includes(name)) throw new Error('HTML_UNSUPPORTED_RESOURCE');
      if (!['href', 'src'].includes(name)) continue;
      if (/[&\\\x00-\x20]/.test(value)) throw new Error('RESOURCE_SYNTAX');
      if (tag === 'a' && name === 'href' && ['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(value)) continue;
      if (production && name === 'href' && tag === 'link' && ['canonical', 'alternate'].includes(attrs.get('rel')) && ['https://split.glossquote.com/index.html', 'https://split.glossquote.com/en/index.html'].includes(value)) continue;
      if (!value.startsWith('/') || value.startsWith('//') || !assets.has(value.slice(1))) throw new Error('BAD_REFERENCE');
      if (name === 'src' && !(tag === 'script' && value.endsWith('.mjs') && attrs.get('type') === 'module')) throw new Error('UNAPPROVED_RESOURCE');
      if (tag === 'link' && !['stylesheet', 'canonical', 'alternate'].includes(attrs.get('rel'))) throw new Error('UNAPPROVED_RESOURCE');
    }
    if (tag === 'script' && !attrs.has('src') && attrs.get('type') !== 'application/ld+json') throw new Error('INLINE_SCRIPT');
    if (['iframe', 'object', 'embed', 'base', 'img', 'audio', 'video'].includes(tag)) throw new Error('UNAPPROVED_TAG');
    if (tag === 'meta' && attrs.get('http-equiv')) throw new Error('HTTP_EQUIV');
  }
  return tags;
}
export function validateCss(source) {
  const active = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/\\|@\s*import\b|\burl\s*\(|\bexpression\s*\(/i.test(active)) throw new Error('CSS_RESOURCE');
}
