import assert from 'node:assert/strict';
import path from 'node:path';
import { lstat, realpath } from 'node:fs/promises';

export async function validateAncestors(target, allowMissing = false) {
  const absolute = path.resolve(target), parsed = path.parse(absolute);
  let current = parsed.root;
  for (const part of ['', ...absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)]) {
    if (part) current = path.join(current, part);
    let info;
    try { info = await lstat(current); } catch (error) { if (allowMissing && error.code === 'ENOENT') return absolute; throw error; }
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), 'Symlink/junction or non-directory ancestor refused');
    const actual = await realpath(current);
    const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value;
    assert.equal(normalize(actual), normalize(current), 'Resolved ancestor outside requested path');
  }
  return absolute;
}

// Deliberately conservative tokenizer for our static HTML dialect. It accepts
// quoted/unquoted attributes and case variants, skips comments, and rejects
// malformed/duplicate attributes and executable raw text instead of guessing.
function decodeEntities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/giu, entity => {
    const name = entity.slice(1, -1).toLowerCase();
    if (name.startsWith('#')) {
      const point = name.startsWith('#x') ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      assert.ok(point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff), 'Invalid HTML entity');
      return String.fromCodePoint(point);
    }
    return { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' }[name];
  });
}
export function htmlTags(html) {
  const tags = [];
  let position = 0;
  while (position < html.length) {
    const start = html.indexOf('<', position);
    if (start < 0) break;
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4); assert.ok(end >= 0, 'Unclosed HTML comment'); position = end + 3; continue;
    }
    if (/^<!doctype\s+html\s*>/iu.test(html.slice(start))) { position = html.indexOf('>', start) + 1; continue; }
    const close = /^<\/([a-z][a-z0-9-]*)\s*>/iu.exec(html.slice(start));
    if (close) { position = start + close[0].length; continue; }
    const open = /^<([a-z][a-z0-9-]*)/iu.exec(html.slice(start)); assert.ok(open, 'Unsupported HTML syntax');
    const name = open[1].toLowerCase(), attrs = Object.create(null);
    let i = start + open[0].length;
    while (true) {
      const spacing = /^\s*/u.exec(html.slice(i))[0]; i += spacing.length;
      if (html[i] === '>') { i++; break; }
      if (html.slice(i, i + 2) === '/>') { i += 2; break; }
      assert.ok(spacing.length > 0, 'Missing attribute separator');
      const attr = /^[a-z_:][a-z0-9_.:-]*/iu.exec(html.slice(i)); assert.ok(attr, 'Malformed HTML attribute');
      const key = attr[0].toLowerCase(); assert.ok(!Object.hasOwn(attrs, key), 'Duplicate HTML attribute'); i += attr[0].length;
      const afterName = i;
      i += /^\s*/u.exec(html.slice(i))[0].length;
      let value = '';
      if (html[i] === '=') {
        i++; i += /^\s*/u.exec(html.slice(i))[0].length;
        const quote = html[i];
        if (quote === '"' || quote === "'") { const end = html.indexOf(quote, i + 1); assert.ok(end >= 0, 'Unclosed HTML attribute'); value = html.slice(i + 1, end); i = end + 1; }
        else { const bare = /^[^\s"'`=<>]+/u.exec(html.slice(i)); assert.ok(bare, 'Missing HTML attribute value'); value = bare[0]; i += value.length; }
      } else i = afterName;
      attrs[key] = decodeEntities(value);
    }
    const tag = { name, attrs, rawText: '' }; tags.push(tag); position = i;
    if (['script', 'style', 'textarea', 'title'].includes(name)) {
      const ending = new RegExp(`</${name}\\s*>`, 'iu').exec(html.slice(i)); assert.ok(ending, 'Unclosed raw-text element');
      tag.rawText = html.slice(i, i + ending.index); if (name === 'title' || name === 'textarea') tag.rawText = decodeEntities(tag.rawText); position = i + ending.index + ending[0].length;
    }
  }
  return tags;
}
export function validateHtml(html, assets, robots = 'noindex,nofollow', origin = null) {
  const tags = htmlTags(html);
  const allowedTags = new Set(['html', 'head', 'meta', 'title', 'link', 'script', 'body', 'a', 'header', 'nav', 'main', 'div', 'section', 'label', 'textarea', 'p', 'button', 'noscript', 'details', 'summary', 'pre', 'dl', 'dt', 'dd', 'h1', 'h2', 'span', 'ol', 'li', 'footer']);
  const allowedAttributes = new Set(['lang', 'charset', 'name', 'content', 'property', 'rel', 'hreflang', 'href', 'src', 'type', 'class', 'id', 'for', 'rows', 'spellcheck', 'autocomplete', 'disabled', 'readonly', 'hidden', 'tabindex', 'role']);
  const meta = tags.filter(tag => tag.name === 'meta' && tag.attrs.name?.toLowerCase() === 'robots');
  assert.equal(meta.length, 1, 'One active robots meta is required');
  assert.equal(meta[0].attrs.content, robots, 'Incorrect active robots metadata');
  const asset = value => {
    assert.ok(typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('&'), 'Nonlocal asset reference');
    assert.ok(assets.includes(value.slice(1)), 'Missing asset reference');
  };
  for (const tag of tags) {
    assert.ok(allowedTags.has(tag.name), 'Unsupported active HTML element');
    for (const key of Object.keys(tag.attrs)) {
      assert.ok(allowedAttributes.has(key) || /^aria-[a-z-]+$/u.test(key) || /^data-[a-z-]+$/u.test(key), 'Unsupported active HTML attribute');
      if (key === 'src') { assert.equal(tag.name, 'script', 'Unexpected resource element'); asset(tag.attrs[key]); }
      if (key === 'href') {
        assert.ok(['a', 'link'].includes(tag.name), 'Unexpected href element');
        if (tag.name === 'a') {
          const value = tag.attrs.href;
          if (value === '#main' || ['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(value)) continue;
        }
        if (tag.name === 'link' && ['canonical', 'alternate'].includes(tag.attrs.rel)) {
          assert.ok(origin && [origin + '/index.html', origin + '/en/index.html'].includes(tag.attrs.href), 'Unknown canonical origin'); continue;
        }
        asset(tag.attrs[key]);
      }
    }
    if (tag.name === 'script') {
      if (tag.attrs.type === 'application/ld+json') {
        assert.ok(origin && tag.attrs.id === 'structured-data' && !Object.hasOwn(tag.attrs, 'src'), 'Unexpected structured data');
        const data = JSON.parse(tag.rawText); assert.equal(data['@context'], 'https://schema.org'); assert.equal(data['@type'], 'WebApplication');
        assert.ok([origin + '/index.html', origin + '/en/index.html'].includes(data.url), 'Structured data origin mismatch');
        assert.ok(!Object.hasOwn(data, 'aggregateRating') && !Object.hasOwn(data, 'review'), 'Unverified rating');
      } else { assert.equal(tag.attrs.type, 'module', 'Only external modules supported'); asset(tag.attrs.src); assert.equal(tag.rawText.trim(), '', 'Inline executable script refused'); }
    }
    if (tag.name === 'link') assert.ok(['stylesheet', ...(origin ? ['canonical', 'alternate'] : [])].includes(tag.attrs.rel), 'Unsupported resource link');
    if (tag.name === 'meta') assert.ok(!Object.hasOwn(tag.attrs, 'http-equiv'), 'HTTP-equiv metadata refused');
  }
  return tags;
}
