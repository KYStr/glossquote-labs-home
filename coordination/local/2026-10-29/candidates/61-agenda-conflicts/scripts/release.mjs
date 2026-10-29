import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { PROJECT_ROOT, PUBLIC_FILES, inside, inspectTree, ProjectError } from './files.mjs';
import { checkPage } from './check.mjs';
import { SECURITY_HEADERS } from './serve.mjs';
import { checkDeploymentConfig, ENTRY_REDIRECTS } from './deployment.mjs';

export const RELEASE_ORIGIN = 'https://agenda-check.glossquote.com';
export const TOOL_SLUG = 'agenda-conflicts';
export const RELEASE_FILES = Object.freeze([...new Set([...PUBLIC_FILES, 'robots.txt', '_headers', 'sitemap.xml', '_redirects'])].sort());
// The M1 public snapshot is the trusted input, separate from the generated manifest.
// A product change requires a separately reviewed task, not regeneration of pins.
export const M1_PUBLIC = Object.freeze([
  ['en/index.html', 10229, 'a16b65b307bdc85b06f72a3367d8a1e8f30dfc6475c0105b3a4e33c810f075ed'],
  ['index.html', 9743, 'ea0b910abf739e4f3a1de3a5991d371e9aee9e8c47aeece2af72ce8353e900ec'],
  ['js/app.js', 31444, 'dd46b9277e70b5528cb59d4ba72c3523af9fbfa2fd2f2f3dd7ce9803231d365a'],
  ['js/conflict-worker.js', 1744, '07372ce0e8686a13416f85eb5a9fcfeb28893235f603748a6d98d3eb0bc5afa9'],
  ['js/core/analyse.mjs', 3571, '5e7fcdb2181d2d59f805076746e92af285f1303c17c7fccc161b909fb972805c'],
  ['js/core/output.mjs', 6913, '15eb93e7650f66e9917566b2078b0643915c42c86a6dc7ae8ea6f0eef98b5d53'],
  ['js/core/validate.mjs', 5504, 'f2536978033b5596989379a6c05af75bebf8569916362994ec612415136eaf2f'],
  ['styles/app.css', 10681, '7c545e349f57d9dcf988b8ae6dee99ccc93ce1e10b08b3d28b4ad854afbcfb3f']
].map(([file, bytes, sha256]) => Object.freeze({ path: file, bytes, sha256 })));
export const HEADER_SOURCE = Object.freeze({ path: 'scripts/serve.mjs', bytes: 3185,
  sha256: '8146d25031de53e5f2d0565c2c49b8faf805da4d3ee2e2bc199b63b30d340585' });

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new ProjectError(code); };
const sorted = entries => entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
const entriesFor = files => sorted([...files].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: digest(bytes) })));
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const equal = (actual, expected, code) => { if (!isDeepStrictEqual(actual, expected)) fail(code); };
const canonical = file => `${RELEASE_ORIGIN}/${file}`;
const alternates = Object.freeze([
  ['zh-Hant', canonical('index.html')], ['en', canonical('en/index.html')], ['x-default', canonical('index.html')]
]);

export function removeCandidateFooter(html, file) {
  const markers = {
    'index.html': '<span>Gloss Tools by GlossQuote · 本地候選預覽</span>',
    'en/index.html': '<span>Gloss Tools by GlossQuote · Local candidate preview</span>'
  };
  const marker = markers[file];
  if (!marker || html.split(marker).length !== 2) fail('RELEASE_CANDIDATE_MARKER');
  return html.replace(marker, '<span>Gloss Tools by GlossQuote</span>');
}

function headOf(html) {
  const heads = [...html.matchAll(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/gi)];
  if (heads.length !== 1) fail('RELEASE_SEO_HEAD');
  const match = heads[0];
  return { full: match[0], content: match[1], index: match.index, end: match.index + match[0].length };
}

// Reads quoted attributes and boolean attributes without executing any HTML.
// Exact expected-byte comparison below also covers the entire document body.
function startTags(html) {
  const tags = [];
  const pattern = /<!--[\s\S]*?-->|<![^>]*>|<\/[^>]*>|<([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  for (const match of html.matchAll(pattern)) {
    if (!match[1]) continue;
    const attrs = Object.create(null);
    const tail = match[2];
    let offset = 0;
    while (offset < tail.length) {
      while (/\s/.test(tail[offset] ?? '') && offset < tail.length) offset++;
      if (offset === tail.length || tail.slice(offset) === '/') break;
      const name = /^[A-Za-z_:][\w:.-]*/.exec(tail.slice(offset));
      if (!name) fail('RELEASE_HTML_ATTRIBUTE');
      const key = name[0].toLowerCase();
      if (Object.hasOwn(attrs, key)) fail('RELEASE_HTML_ATTRIBUTE');
      offset += name[0].length;
      while (offset < tail.length && /\s/.test(tail[offset])) offset++;
      let value = true;
      if (tail[offset] === '=') {
        offset++;
        while (offset < tail.length && /\s/.test(tail[offset])) offset++;
        const quote = tail[offset++];
        if (quote !== '"' && quote !== "'") fail('RELEASE_HTML_ATTRIBUTE');
        const end = tail.indexOf(quote, offset);
        if (end < 0) fail('RELEASE_HTML_ATTRIBUTE');
        value = tail.slice(offset, end); offset = end + 1;
      }
      attrs[key] = value;
    }
    tags.push({ name: match[1].toLowerCase(), attrs });
  }
  return tags;
}

export function inspectReleaseSeo(html, original, file) {
  const actualHead = headOf(html), sourceHead = headOf(original);
  const productionBody = removeCandidateFooter(original, file);
  const productionHead = headOf(productionBody);
  if (html.slice(0, actualHead.index) !== original.slice(0, sourceHead.index)
    || html.slice(actualHead.end) !== productionBody.slice(productionHead.end)) fail('RELEASE_NON_HEAD_CHANGE');
  const tags = startTags(html), headTags = startTags(actualHead.content), sourceTags = startTags(original);
  const named = (list, name) => list.filter(tag => tag.name === name);
  const root = named(tags, 'html'), sourceRoot = named(sourceTags, 'html');
  if (root.length !== 1 || sourceRoot.length !== 1 || root[0].attrs.lang !== sourceRoot[0].attrs.lang
    || root[0].attrs.lang !== (file === 'en/index.html' ? 'en' : 'zh-Hant')) fail('RELEASE_SEO_LANGUAGE');
  for (const tagName of ['title', 'h1']) {
    const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}\\s*>`, 'gi');
    const actual = [...html.matchAll(pattern)], source = [...original.matchAll(pattern)];
    if (actual.length !== 1 || source.length !== 1 || actual[0][1] !== source[0][1]) fail('RELEASE_SEO_COPY');
  }
  const description = named(tags, 'meta').filter(tag => tag.attrs.name === 'description');
  const sourceDescription = named(sourceTags, 'meta').filter(tag => tag.attrs.name === 'description');
  if (description.length !== 1 || sourceDescription.length !== 1 || description[0].attrs.content !== sourceDescription[0].attrs.content) fail('RELEASE_SEO_COPY');
  const robots = named(tags, 'meta').filter(tag => tag.attrs.name === 'robots');
  const headRobots = named(headTags, 'meta').filter(tag => tag.attrs.name === 'robots');
  if (robots.length !== 1 || headRobots.length !== 1 || robots[0].attrs.content !== 'index,follow' || headRobots[0].attrs.content !== 'index,follow') fail('RELEASE_SEO_ROBOTS');
  const links = named(tags, 'link');
  const headLinks = named(headTags, 'link');
  const canonicalLinks = links.filter(tag => tag.attrs.rel === 'canonical');
  if (canonicalLinks.length !== 1 || canonicalLinks[0].attrs.href !== canonical(file)
    || headLinks.filter(tag => tag.attrs.rel === 'canonical').length !== 1) fail('RELEASE_SEO_CANONICAL');
  const alternateLinks = links.filter(tag => tag.attrs.rel === 'alternate');
  if (alternateLinks.length !== 3 || headLinks.filter(tag => tag.attrs.rel === 'alternate').length !== 3) fail('RELEASE_SEO_ALTERNATES');
  for (const [language, href] of alternates) {
    const matches = alternateLinks.filter(tag => tag.attrs.hreflang === language);
    if (matches.length !== 1 || matches[0].attrs.href !== href) fail('RELEASE_SEO_ALTERNATES');
  }
  if (links.length !== named(sourceTags, 'link').length + 4) fail('RELEASE_SEO_LINKS');
}

function releaseHtml(original, file) {
  checkPage(original, file);
  const head = headOf(original);
  const robots = '<meta name="robots" content="noindex,nofollow">';
  if (head.content.split(robots).length !== 2) fail('RELEASE_SOURCE_ROBOTS');
  const links = [`  <link rel="canonical" href="${canonical(file)}">`,
    ...alternates.map(([language, href]) => `  <link rel="alternate" hreflang="${language}" href="${href}">`)].join('\n');
  const replacement = head.full.replace(robots, '<meta name="robots" content="index,follow">')
    .replace(/<\/head\s*>$/i, `${links}\n</head>`);
  const html = removeCandidateFooter(original.slice(0, head.index) + replacement + original.slice(head.end), file);
  inspectReleaseSeo(html, original, file);
  return Buffer.from(html, 'utf8');
}

function expectedHeaders() {
  return `/*\n${Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${name === 'X-Robots-Tag' ? 'index, follow' : value}`).join('\n')}\n`;
}

function inspectHeaders(text) {
  const lines = text.split('\n');
  if (lines.shift() !== '/*' || lines.pop() !== '') fail('RELEASE_HEADERS');
  const found = {};
  for (const line of lines) {
    const match = /^  ([A-Za-z-]+): (.+)$/.exec(line);
    if (!match || Object.hasOwn(found, match[1])) fail('RELEASE_HEADERS');
    found[match[1]] = match[2];
  }
  equal(found, { ...SECURITY_HEADERS, 'X-Robots-Tag': 'index, follow' }, 'RELEASE_HEADERS');
}

export async function expectedRelease(root = PROJECT_ROOT) {
  if (Number(process.versions.node.split('.')[0]) < 24) fail('NODE_24_REQUIRED');
  const parsedOrigin = new URL(RELEASE_ORIGIN);
  if (parsedOrigin.protocol !== 'https:' || parsedOrigin.origin !== RELEASE_ORIGIN || parsedOrigin.pathname !== '/'
    || parsedOrigin.port || parsedOrigin.username || parsedOrigin.password || parsedOrigin.search || parsedOrigin.hash) fail('RELEASE_ORIGIN');
  const rootInfo = await lstat(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) fail('RELEASE_ROOT_LINK');
  const configFiles = [await checkDeploymentConfig(root)];
  equal([...PUBLIC_FILES].sort(), M1_PUBLIC.map(entry => entry.path), 'RELEASE_ALLOWLIST');
  const source = await inspectTree(path.join(root, 'public'));
  const sourceFiles = entriesFor(source);
  equal(sourceFiles, M1_PUBLIC, 'RELEASE_SOURCE_CHANGED');
  const scriptsInfo = await lstat(path.join(root, 'scripts'));
  const headerPath = inside(root, HEADER_SOURCE.path);
  const headerInfo = await lstat(headerPath);
  if (!scriptsInfo.isDirectory() || scriptsInfo.isSymbolicLink() || !headerInfo.isFile() || headerInfo.isSymbolicLink()) fail('RELEASE_HEADER_SOURCE');
  const headerBytes = await readFile(headerPath);
  if (headerBytes.length !== HEADER_SOURCE.bytes || digest(headerBytes) !== HEADER_SOURCE.sha256) fail('RELEASE_HEADER_SOURCE');
  const site = new Map(source);
  for (const file of ['index.html', 'en/index.html']) site.set(file, releaseHtml(source.get(file).toString('utf8'), file));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${RELEASE_ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${canonical('index.html')}</loc></url>\n  <url><loc>${canonical('en/index.html')}</loc></url>\n</urlset>\n`));
  site.set('_headers', Buffer.from(expectedHeaders()));
  site.set('_redirects', Buffer.from(ENTRY_REDIRECTS));
  inspectHeaders(site.get('_headers').toString('utf8'));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: RELEASE_ORIGIN, toolSlug: TOOL_SLUG,
    files: entriesFor(site), sourceFiles, configFiles };
  return { source, site, manifest, manifestBytes: jsonBytes(manifest) };
}

async function readOutput(root, optional = false) {
  const directory = path.join(root, 'release-artifacts');
  let info;
  try { info = await lstat(directory); } catch (error) { if (optional && error.code === 'ENOENT') return null; fail('RELEASE_OUTPUT_MISSING'); }
  if (!info.isDirectory() || info.isSymbolicLink()) fail('RELEASE_OUTPUT_LINK');
  const allowedDirectories = new Set(['site', 'site/en', 'site/styles', 'site/js', 'site/js/core']);
  const allowedFiles = new Set(['manifest.json', ...RELEASE_FILES.map(file => `site/${file}`)]);
  const found = new Map();
  async function visit(relative = '') {
    for (const entry of await readdir(relative ? inside(directory, relative) : directory)) {
      const file = relative ? `${relative}/${entry}` : entry;
      const target = inside(directory, file);
      const child = await lstat(target);
      if (child.isSymbolicLink()) fail('RELEASE_OUTPUT_LINK');
      if (child.isDirectory()) {
        if (!allowedDirectories.has(file)) fail('RELEASE_OUTPUT_EXTRA');
        await visit(file);
      } else if (child.isFile()) {
        if (!allowedFiles.has(file)) fail('RELEASE_OUTPUT_EXTRA');
        if (child.size > (file === 'manifest.json' ? 65536 : 524288)) fail('RELEASE_OUTPUT_SIZE');
        found.set(file, await readFile(target));
      } else fail('RELEASE_OUTPUT_LINK');
    }
  }
  await visit();
  if (found.size !== allowedFiles.size || [...allowedFiles].some(file => !found.has(file))) fail('RELEASE_OUTPUT_INCOMPLETE');
  return found;
}

function verifyOutput(found, expected) {
  let manifest;
  try { manifest = JSON.parse(found.get('manifest.json').toString('utf8')); } catch { fail('RELEASE_MANIFEST'); }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)
    || !isDeepStrictEqual(Object.keys(manifest).sort(), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles', 'configFiles'].sort())
    || manifest.schemaVersion !== 1 || manifest.mode !== 'release-candidate' || manifest.origin !== RELEASE_ORIGIN || manifest.toolSlug !== TOOL_SLUG) fail('RELEASE_MANIFEST');
  equal(manifest.sourceFiles, expected.manifest.sourceFiles, 'RELEASE_MANIFEST_SOURCE');
  equal(manifest.configFiles, expected.manifest.configFiles, 'RELEASE_MANIFEST_CONFIG');
  const actualSite = new Map(RELEASE_FILES.map(file => [file, found.get(`site/${file}`)]));
  equal(manifest.files, entriesFor(actualSite), 'RELEASE_MANIFEST_FILES');
  for (const file of ['index.html', 'en/index.html']) inspectReleaseSeo(actualSite.get(file).toString('utf8'), expected.source.get(file).toString('utf8'), file);
  inspectHeaders(actualSite.get('_headers').toString('utf8'));
  if (!actualSite.get('_redirects').equals(Buffer.from(ENTRY_REDIRECTS))) fail('RELEASE_REDIRECTS');
  for (const [file, bytes] of expected.site) if (!actualSite.get(file).equals(bytes)) fail('RELEASE_SITE_BYTES');
  // The manifest can be changed together with a site asset, so it is also compared
  // with fresh source-derived bytes, never treated as an authority for the site.
  if (!found.get('manifest.json').equals(expected.manifestBytes)) fail('RELEASE_MANIFEST_BYTES');
  return { files: expected.site.size, bytes: [...expected.site.values()].reduce((total, bytes) => total + bytes.length, 0),
    sourceFiles: expected.manifest.sourceFiles.length, sourceHash: digest(jsonBytes(expected.manifest.sourceFiles)),
    manifestHash: digest(expected.manifestBytes), siteHash: digest(jsonBytes(expected.manifest.files)) };
}

export async function checkRelease(root = PROJECT_ROOT) {
  const expected = await expectedRelease(root);
  return verifyOutput(await readOutput(root), expected);
}

export async function buildRelease(root = PROJECT_ROOT) {
  const expected = await expectedRelease(root);
  const existing = await readOutput(root, true);
  if (existing) return { ...verifyOutput(existing, expected), reused: true };
  // All inputs and pre-existing outputs have been checked before creating files.
  // Exclusive writes never overwrite a raced, unmanaged or partially built file.
  const directory = path.join(root, 'release-artifacts');
  await mkdir(directory);
  for (const subdirectory of ['site', 'site/en', 'site/styles', 'site/js', 'site/js/core']) await mkdir(inside(directory, subdirectory));
  for (const [file, bytes] of expected.site) await writeFile(inside(directory, `site/${file}`), bytes, { flag: 'wx' });
  await writeFile(path.join(directory, 'manifest.json'), expected.manifestBytes, { flag: 'wx' });
  return { ...verifyOutput(await readOutput(root), expected), reused: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !['build', 'check'].includes(args[0])) fail('RELEASE_USAGE');
    const result = args[0] === 'build' ? await buildRelease() : await checkRelease();
    process.stdout.write(`PASS release ${args[0]}: ${result.files} files, ${result.bytes} bytes; planned origin ${RELEASE_ORIGIN}; not deployed.\nManifest SHA-256: ${result.manifestHash}\n`);
  } catch (error) {
    process.stderr.write(`FAIL release: ${error instanceof ProjectError ? error.code : 'RELEASE_FAILED'}\n`);
    process.exitCode = 1;
  }
}
