import { lstatSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, closedTree } from './files.mjs';
import { RELEASE_SOURCES } from './release-source.mjs';
import { readDeploymentConfig } from './deployment-config.mjs';

export const ORIGIN = 'https://flashcards.glossquote.com';
export const TOOL_SLUG = 'flashcards';
export const SITE_FILES = Object.freeze([...new Set([...PUBLIC_FILES, 'robots.txt', '_headers', '_redirects', 'sitemap.xml'])].sort());
const TREE_FILES = Object.freeze(['manifest.json', ...SITE_FILES.map(path => `site/${path}`)].sort());
const URLS = Object.freeze({ 'zh-Hant': `${ORIGIN}/index.html`, en: `${ORIGIN}/en/index.html`, 'x-default': `${ORIGIN}/index.html` });
const REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
const CANDIDATES = Object.freeze({ 'zh-Hant': '<p class="candidate">本地候選・未發布</p>', en: '<p class="candidate">Local candidate · unpublished</p>' });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const listSha = files => sha(`${JSON.stringify(files)}\n`);
function fail(code) { throw new Error(code); }
function need(condition, code) { if (!condition) fail(code); }
function utf8(bytes) { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { fail('INVALID_UTF8'); } }
function regularDirectory(path) { const info = lstatSync(path); need(info.isDirectory() && !info.isSymbolicLink(), 'UNSAFE_DIRECTORY'); }
function exactKeys(value, keys) { return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)); }

// The source identity is pinned to the reviewed M1 public files, independently of the output manifest.
function readSources(root) {
  regularDirectory(root);
  need(JSON.stringify([...PUBLIC_FILES].sort()) === JSON.stringify(RELEASE_SOURCES.map(file => file.path)), 'SOURCE_ALLOWLIST_CHANGED');
  closedTree(join(root, 'public'), PUBLIC_FILES);
  const files = new Map();
  for (const record of RELEASE_SOURCES) {
    const path = join(root, 'public', record.path), info = lstatSync(path);
    need(info.isFile() && !info.isSymbolicLink() && info.size === record.bytes, 'SOURCE_CHANGED');
    const bytes = readFileSync(path); need(sha(bytes) === record.sha256, 'SOURCE_CHANGED'); files.set(record.path, bytes);
  }
  return files;
}

function openingTag(text) {
  need(text[0] === '<' && text.at(-1) === '>', 'HEAD_PARSE');
  const nameMatch = /^<([a-z][a-z0-9-]*)/i.exec(text); need(!!nameMatch, 'HEAD_PARSE');
  const attrs = Object.create(null); let index = nameMatch[0].length;
  while (index < text.length - 1) {
    while (/\s/.test(text[index] ?? '') && index < text.length - 1) index++;
    if (index === text.length - 1 || (text[index] === '/' && index === text.length - 2)) break;
    const match = /^[a-z][a-z0-9:_-]*/i.exec(text.slice(index)); need(!!match, 'HEAD_PARSE');
    const name = match[0].toLowerCase(); index += match[0].length;
    need(!Object.hasOwn(attrs, name), 'DUPLICATE_ATTRIBUTE');
    while (/\s/.test(text[index] ?? '') && index < text.length - 1) index++;
    need(text[index++] === '=', 'HEAD_PARSE');
    while (/\s/.test(text[index] ?? '') && index < text.length - 1) index++;
    const quote = text[index++]; need(quote === '"' || quote === "'", 'HEAD_PARSE');
    const end = text.indexOf(quote, index); need(end >= index && end < text.length - 1, 'HEAD_PARSE');
    attrs[name] = text.slice(index, end); index = end + 1;
  }
  return { name: nameMatch[1].toLowerCase(), attrs };
}
function headNodes(html) {
  const start = html.indexOf('<head>'), end = html.indexOf('</head>');
  need(start >= 0 && end > start && html.indexOf('<head>', start + 1) < 0 && html.indexOf('</head>', end + 1) < 0, 'HEAD_STRUCTURE');
  const nodes = []; let cursor = start + 6;
  while (cursor < end) {
    const next = html.indexOf('<', cursor); if (next < 0 || next >= end) break;
    let quote = null, close = next + 1;
    for (; close < end; close++) {
      const char = html[close];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    need(close < end && !quote, 'HEAD_PARSE');
    const tag = html.slice(next, close + 1);
    if (!tag.startsWith('</')) nodes.push(openingTag(tag));
    cursor = close + 1;
  }
  return nodes;
}
export function stripCandidateBanner(html, language) {
  need(Object.hasOwn(CANDIDATES, language), 'RELEASE_LANGUAGE');
  const marker = CANDIDATES[language];
  const candidates = [...html.matchAll(/<[^>]+\bclass\s*=\s*(["'])[^"']*\bcandidate\b[^"']*\1[^>]*>/gi)];
  need(candidates.length <= 1 && (candidates.length === 0 || html.split(marker).length === 2), 'CANDIDATE_BANNER_CHANGED');
  return html.replace(marker, '');
}
function releasePage(bytes, language) {
  const source = stripCandidateBanner(utf8(bytes), language), nodes = headNodes(source);
  need(nodes.filter(node => node.name === 'meta' && node.attrs.name === 'robots' && node.attrs.content === 'noindex,nofollow').length === 1, 'SOURCE_ROBOTS');
  need(!nodes.some(node => node.name === 'link' && ['canonical', 'alternate'].includes(node.attrs.rel)), 'SOURCE_SEO');
  const marker = '<meta name="robots" content="noindex,nofollow">';
  need(source.split(marker).length === 2, 'SOURCE_ROBOTS');
  const links = `<link rel="canonical" href="${URLS[language]}">\n${Object.entries(URLS).map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${href}">`).join('\n')}\n`;
  return Buffer.from(source.replace(marker, '<meta name="robots" content="index,follow">').replace('</head>', `\n${links}</head>`), 'utf8');
}
function releaseHeaders(bytes) {
  const source = utf8(bytes);
  need((source.match(/^  X-Robots-Tag: noindex, nofollow$/gm) ?? []).length === 1, 'SOURCE_HEADERS');
  return Buffer.from(source.replace(/^  X-Robots-Tag: noindex, nofollow$/m, '  X-Robots-Tag: index, follow'), 'utf8');
}
function expected(root) {
  const sources = readSources(root), site = new Map(sources), deployment = readDeploymentConfig(root);
  site.set('index.html', releasePage(sources.get('index.html'), 'zh-Hant'));
  site.set('en/index.html', releasePage(sources.get('en/index.html'), 'en'));
  site.set('_headers', releaseHeaders(sources.get('_headers')));
  site.set('_redirects', Buffer.from(REDIRECTS, 'utf8'));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`, 'utf8'));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${URLS['zh-Hant']}</loc></url>\n  <url><loc>${URLS.en}</loc></url>\n</urlset>\n`, 'utf8'));
  const files = SITE_FILES.map(path => { const bytes = site.get(path); return { path, bytes: bytes.length, sha256: sha(bytes) }; });
  const sourceFiles = RELEASE_SOURCES.map(record => ({ path: record.path, bytes: record.bytes, sha256: record.sha256 }));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files, sourceFiles, deploymentFiles: [deployment] };
  return { sources, site, manifest, manifestBytes: jsonBytes(manifest) };
}

function assertSeo(bytes, sourceBytes, language) {
  const html = utf8(bytes), source = utf8(sourceBytes), nodes = headNodes(html);
  const robots = nodes.filter(node => node.name === 'meta' && node.attrs.name === 'robots');
  need(robots.length === 1 && robots[0].attrs.content === 'index,follow', 'RELEASE_ROBOTS');
  const canonical = nodes.filter(node => node.name === 'link' && node.attrs.rel === 'canonical');
  need(canonical.length === 1 && canonical[0].attrs.href === URLS[language] && exactKeys(canonical[0].attrs, ['rel', 'href']), 'RELEASE_CANONICAL');
  const alternate = nodes.filter(node => node.name === 'link' && node.attrs.rel === 'alternate');
  need(alternate.length === 3, 'RELEASE_HREFLANG');
  for (const [lang, href] of Object.entries(URLS)) {
    const matching = alternate.filter(node => node.attrs.hreflang === lang);
    need(matching.length === 1 && matching[0].attrs.href === href && exactKeys(matching[0].attrs, ['rel', 'hreflang', 'href']), 'RELEASE_HREFLANG');
  }
  const lang = openingTag(html.slice(html.indexOf('<html '), html.indexOf('>', html.indexOf('<html ')) + 1)).attrs.lang;
  const sourceLang = openingTag(source.slice(source.indexOf('<html '), source.indexOf('>', source.indexOf('<html ')) + 1)).attrs.lang;
  need(lang === sourceLang && (language === 'en' ? lang === 'en' : ['zh-TW', 'zh-Hant'].includes(lang)), 'RELEASE_LANGUAGE');
  need(html.slice(html.indexOf('</head>') + 7) === stripCandidateBanner(source.slice(source.indexOf('</head>') + 7), language), 'VISIBLE_CONTENT_CHANGED');
  need(!/<[^>]+\bclass\s*=\s*(["'])[^"']*\bcandidate\b[^"']*\1/i.test(html), 'RELEASE_CANDIDATE_BANNER');
  const nav = /<nav\b[^>]*>([\s\S]*?)<\/nav>/.exec(html); need(!!nav, 'RELEASE_NAVIGATION');
  const anchors = [...nav[1].matchAll(/<a\b[^>]*>/g)].map(match => openingTag(match[0]).attrs);
  const home = language === 'en' ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
  const otherLanguage = language === 'en' ? 'zh-Hant' : 'en';
  const otherPath = language === 'en' ? '../index.html' : './en/index.html';
  need(anchors.filter(attrs => attrs.href === home).length === 1, 'RELEASE_HOME_LINK');
  need(anchors.filter(attrs => attrs.id === 'languageLink' && attrs.href === otherPath && attrs.lang === otherLanguage).length === 1, 'RELEASE_LANGUAGE_LINK');
}
function assertManifest(bytes, model) {
  let value; try { value = JSON.parse(utf8(bytes)); } catch { fail('MANIFEST_SCHEMA'); }
  need(exactKeys(value, ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'deploymentFiles']), 'MANIFEST_SCHEMA');
  need(value.schemaVersion === 1 && value.mode === 'release-candidate' && value.origin === ORIGIN && value.toolSlug === TOOL_SLUG, 'MANIFEST_IDENTITY');
  for (const records of [value.files, value.sourceFiles, value.deploymentFiles]) {
    need(Array.isArray(records), 'MANIFEST_SCHEMA');
    need(records.every(record => exactKeys(record, ['path', 'bytes', 'sha256']) && typeof record.path === 'string' && Number.isSafeInteger(record.bytes) && record.bytes >= 0 && /^[0-9a-f]{64}$/.test(record.sha256)), 'MANIFEST_SCHEMA');
    const paths = records.map(record => record.path);
    need(new Set(paths).size === paths.length && JSON.stringify(paths) === JSON.stringify([...paths].sort()), 'MANIFEST_ORDER');
  }
  need(bytes.equals(model.manifestBytes), 'MANIFEST_MISMATCH');
}
function inspectOutput(root, model) {
  const output = join(root, 'release-artifacts'); closedTree(output, TREE_FILES);
  need(lstatSync(join(output, 'manifest.json')).size === model.manifestBytes.length, 'MANIFEST_MISMATCH');
  assertManifest(readFileSync(join(output, 'manifest.json')), model);
  for (const path of SITE_FILES) {
    need(lstatSync(join(output, 'site', path)).size === model.site.get(path).length, 'ARTIFACT_MISMATCH');
    const bytes = readFileSync(join(output, 'site', path));
    need(bytes.equals(model.site.get(path)), 'ARTIFACT_MISMATCH');
    if (path === 'index.html' || path === 'en/index.html') assertSeo(bytes, model.sources.get(path), path.startsWith('en/') ? 'en' : 'zh-Hant');
  }
  return { status: 'PASS_RELEASE_CANDIDATE_STATIC_ONLY', origin: ORIGIN, toolSlug: TOOL_SLUG, sourceFiles: model.manifest.sourceFiles.length, sourceBytes: model.manifest.sourceFiles.reduce((sum, file) => sum + file.bytes, 0), sourceSha256: listSha(model.manifest.sourceFiles), siteFiles: model.manifest.files.length, siteBytes: model.manifest.files.reduce((sum, file) => sum + file.bytes, 0), siteSha256: listSha(model.manifest.files), manifestSha256: sha(model.manifestBytes), deploymentSha256: model.manifest.deploymentFiles[0].sha256 };
}
export function checkRelease(root = ROOT) { return inspectOutput(root, expected(root)); }
export function buildRelease(root = ROOT) {
  const model = expected(root), output = join(root, 'release-artifacts');
  if (lstatSync(output, { throwIfNoEntry: false })) return inspectOutput(root, model);
  // An absent output root is claimed exclusively. Existing complete candidates are verified and left untouched.
  mkdirSync(output); mkdirSync(join(output, 'site'));
  const directories = [...new Set(SITE_FILES.flatMap(path => { const parts = path.split('/'); parts.pop(); const parents = []; while (parts.length) { parents.push(parts.join('/')); parts.pop(); } return parents; }))].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  for (const path of directories) mkdirSync(join(output, 'site', path));
  for (const path of SITE_FILES) writeFileSync(join(output, 'site', path), model.site.get(path), { flag: 'wx' });
  writeFileSync(join(output, 'manifest.json'), model.manifestBytes, { flag: 'wx' });
  return inspectOutput(root, model);
}
export function parseMode(args) {
  need(args.length === 1 && ['build', 'check'].includes(args[0]), 'INVALID_ARGUMENTS'); return args[0];
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    need(Number(process.versions.node.split('.')[0]) >= 24, 'NODE24_REQUIRED');
    const mode = parseMode(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(mode === 'build' ? buildRelease() : checkRelease())}\n`);
  } catch (error) { process.stderr.write(`RELEASE_FAILED ${/^[A-Z0-9_]+$/.test(error.message) ? error.message : 'IO_OR_CHECK'}\n`); process.exitCode = 1; }
}
