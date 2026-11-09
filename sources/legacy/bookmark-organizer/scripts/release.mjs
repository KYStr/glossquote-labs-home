import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { root, PUBLIC_FILES } from './files.mjs';
import { makeHandler } from './serve.mjs';
import { M1_SOURCES } from './release-baseline.mjs';
import { checkDeploymentConfig } from './release-config.mjs';

export const ORIGIN = 'https://bookmarks.glossquote.com';
export const TOOL_SLUG = 'bookmark-organizer';
const RELEASE_ROOT = path.join(root, 'release-artifacts');
const PRE_M2A_MANIFEST_SHA256 = '94ee4bd3206130a3977c5b42f3e3704e4e4f25370c0a153fa500f22c11aab52d';
const ARCHIVE_ROOT = path.join(root, 'evidence', 'm2a', 'pre-m2a-release', 'release-artifacts');
export const RELEASE_REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
const CANDIDATE_BANNERS = Object.freeze({ 'index.html': '<span class="candidate">本機候選版；尚未部署</span>', 'en/index.html': '<span class="candidate">Local candidate; not deployed</span>' });
const PAGES = ['index.html', 'en/index.html'];
const ROBOTS_PREVIEW = '<meta name="robots" content="noindex,nofollow,noarchive">';
const ROBOTS_RELEASE = '<meta name="robots" content="index,follow">';
const HEADER_BASELINE = Object.freeze({
  'Content-Type': 'text/plain; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
});
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const sorted = values => [...values].sort();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
function demand(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
function safeName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_./-]+$/.test(name) && !name.startsWith('/') && !name.split('/').some(part => !part || part === '.' || part === '..');
}
function records(files) {
  return sorted(files.keys()).map(name => ({ path: name, bytes: files.get(name).length, sha256: sha256(files.get(name)) }));
}
function directoriesFor(names) {
  const directories = new Set(['']);
  for (const name of names) {
    demand(safeName(name), 'RELEASE_PATH');
    const parts = name.split('/');
    for (let count = 1; count < parts.length; count++) directories.add(parts.slice(0, count).join('/'));
  }
  return directories;
}
async function scanClosed(directory, names, missingCode) {
  const allowed = new Set(names), directories = directoriesFor(names), files = new Map();
  const visit = async (absolute, relative) => {
    const info = await lstat(absolute);
    demand(!info.isSymbolicLink() && info.isDirectory(), 'RELEASE_SYMLINK_OR_TYPE');
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      const target = path.join(absolute, entry.name);
      const child = await lstat(target);
      demand(!child.isSymbolicLink(), 'RELEASE_SYMLINK_OR_TYPE');
      if (child.isDirectory()) {
        demand(directories.has(name), 'RELEASE_UNKNOWN_DIRECTORY');
        await visit(target, name);
      } else {
        demand(child.isFile() && allowed.has(name), 'RELEASE_UNKNOWN_FILE');
        files.set(name, await readFile(target));
      }
    }
  };
  try { await visit(directory, ''); } catch (error) { if (error.code === 'ENOENT') demand(false, missingCode); throw error; }
  demand(same(sorted(files.keys()), sorted(names)), missingCode);
  return files;
}
function splitDocument(html) {
  const opening = [...html.matchAll(/<head>/g)], closing = [...html.matchAll(/<\/head>/g)];
  demand(opening.length === 1 && closing.length === 1 && opening[0].index < closing[0].index, 'RELEASE_HTML_STRUCTURE');
  const start = opening[0].index + opening[0][0].length, end = closing[0].index;
  return { before: html.slice(0, start), head: html.slice(start, end), after: html.slice(end) };
}
// Small, strict head reader for the known static documents; no HTML engine or DOM execution.
export function readHead(html) {
  const { head } = splitDocument(html);
  const tokens = [];
  let index = 0;
  while (index < head.length) {
    while (index < head.length && /[\t\n\r ]/.test(head[index])) index++;
    if (index === head.length) break;
    demand(head[index] === '<', 'RELEASE_HEAD_TEXT');
    index++;
    const nameMatch = /^[a-z][a-z0-9-]*/i.exec(head.slice(index));
    demand(nameMatch, 'RELEASE_HEAD_TAG');
    const tag = nameMatch[0].toLowerCase(); index += nameMatch[0].length;
    demand(['meta', 'title', 'link', 'script'].includes(tag), 'RELEASE_HEAD_TAG');
    const attrs = Object.create(null);
    while (index < head.length) {
      let spaces = 0;
      while (index < head.length && /[\t\n\r ]/.test(head[index])) { index++; spaces++; }
      if (head[index] === '>') { index++; break; }
      demand(spaces, 'RELEASE_HEAD_ATTRIBUTE');
      const match = /^[a-z][a-z0-9-]*/i.exec(head.slice(index));
      demand(match, 'RELEASE_HEAD_ATTRIBUTE');
      const key = match[0].toLowerCase(); index += match[0].length;
      demand(!Object.hasOwn(attrs, key), 'RELEASE_HEAD_ATTRIBUTE');
      while (index < head.length && /[\t\n\r ]/.test(head[index])) index++;
      demand(head[index++] === '=', 'RELEASE_HEAD_ATTRIBUTE');
      while (index < head.length && /[\t\n\r ]/.test(head[index])) index++;
      const quote = head[index++]; demand(quote === '"' || quote === "'", 'RELEASE_HEAD_ATTRIBUTE');
      const end = head.indexOf(quote, index); demand(end !== -1, 'RELEASE_HEAD_ATTRIBUTE');
      attrs[key] = head.slice(index, end); index = end + 1;
    }
    demand(head[index - 1] === '>', 'RELEASE_HEAD_TAG');
    let text = '';
    if (tag === 'title' || tag === 'script') {
      const end = head.indexOf(`</${tag}>`, index); demand(end !== -1, 'RELEASE_HEAD_TAG');
      text = head.slice(index, end); demand(!text.includes('<') && (tag !== 'script' || text === ''), 'RELEASE_HEAD_TEXT');
      index = end + tag.length + 3;
    }
    tokens.push({ tag, attrs, text });
  }
  return tokens;
}
function seoLinks(page) {
  return [
    `  <link rel="canonical" href="${ORIGIN}/${page}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`
  ].join('\n') + '\n';
}
export function removeReleaseBanner(html, page) {
  demand(Object.hasOwn(CANDIDATE_BANNERS, page), 'RELEASE_BANNER_PAGE');
  const exact = CANDIDATE_BANNERS[page], count = html.split(exact).length - 1;
  demand(count <= 1, 'RELEASE_BANNER_COUNT');
  return count === 1 ? html.replace(exact, '') : html;
}
function makePage(source, page, preserveBanner = false) {
  const html = new TextDecoder('utf-8', { fatal: true }).decode(source), parts = splitDocument(html);
  demand(parts.head.split(ROBOTS_PREVIEW).length === 2 && !/rel="(?:canonical|alternate)"/.test(parts.head), 'RELEASE_PREVIEW_SEO');
  const originalOutput = `${parts.before}${parts.head.replace(ROBOTS_PREVIEW, ROBOTS_RELEASE)}${seoLinks(page)}${parts.after}`;
  const output = preserveBanner ? originalOutput : removeReleaseBanner(originalOutput, page);
  demand(splitDocument(output).before === parts.before && splitDocument(output).after === (preserveBanner ? parts.after : removeReleaseBanner(parts.after, page)), 'RELEASE_BODY_CHANGED');
  return Buffer.from(output);
}
function validateSeo(buffer, page, source, preserveBanner = false) {
  const html = buffer.toString('utf8'), original = source.toString('utf8');
  const parsed = readHead(html), originalHead = readHead(original);
  const one = matches => { demand(matches.length === 1, 'RELEASE_SEO_COUNT'); return matches[0]; };
  const robots = one(parsed.filter(token => token.tag === 'meta' && token.attrs.name === 'robots'));
  demand(robots.attrs.content === 'index,follow', 'RELEASE_SEO_ROBOTS');
  const canonical = one(parsed.filter(token => token.tag === 'link' && token.attrs.rel === 'canonical'));
  demand(same(Object.keys(canonical.attrs).sort(), ['href', 'rel']) && canonical.attrs.href === `${ORIGIN}/${page}`, 'RELEASE_SEO_CANONICAL');
  const alternates = parsed.filter(token => token.tag === 'link' && token.attrs.rel === 'alternate');
  demand(alternates.length === 3, 'RELEASE_SEO_ALTERNATE');
  const actual = alternates.map(token => { demand(same(Object.keys(token.attrs).sort(), ['href', 'hreflang', 'rel']), 'RELEASE_SEO_ALTERNATE'); return [token.attrs.hreflang, token.attrs.href]; }).sort();
  const expected = [['zh-Hant', `${ORIGIN}/index.html`], ['en', `${ORIGIN}/en/index.html`], ['x-default', `${ORIGIN}/index.html`]].sort();
  demand(same(actual, expected), 'RELEASE_SEO_ALTERNATE');
  demand(same(parsed.filter(token => !['canonical', 'alternate'].includes(token.attrs.rel)).map(token => token.tag === 'meta' && token.attrs.name === 'robots' ? { ...token, attrs: { ...token.attrs, content: 'noindex,nofollow,noarchive' } } : token), originalHead), 'RELEASE_NON_SEO_HEAD_CHANGED');
  const parts = splitDocument(html), originalParts = splitDocument(original);
  demand(parts.before === originalParts.before && parts.after === (preserveBanner ? originalParts.after : removeReleaseBanner(originalParts.after, page)), 'RELEASE_BODY_CHANGED');
  demand(html.includes(page === 'index.html' ? '<html lang="zh-Hant">' : '<html lang="en">'), 'RELEASE_LANGUAGE');
  demand(preserveBanner ? html.includes(CANDIDATE_BANNERS[page]) : !html.includes(CANDIDATE_BANNERS[page]), 'RELEASE_CANDIDATE_COPY');
}
function securityHeaders(sources) {
  let status, headers;
  makeHandler(sources)({ method: 'HEAD', url: '/', headers: { host: '127.0.0.1:4229' } }, { writeHead(code, values) { status = code; headers = values; }, end() {} });
  // The handler sets Content-Type according to the requested extension before writeHead.
  demand(status === 200 && same(headers, { ...HEADER_BASELINE, 'Content-Type': 'text/html; charset=utf-8' }), 'RELEASE_HEADER_BASELINE');
  // MIME belongs to each hosted asset. Never apply the HTML Content-Type globally.
  const output = ['/*'];
  for (const [name, value] of Object.entries(headers)) {
    if (name === 'Content-Type') continue;
    output.push(`  ${name}: ${name === 'X-Robots-Tag' ? 'index, follow' : value}`);
  }
  return Buffer.from(output.join('\n') + '\n');
}
async function expectedRelease(preserveBanner = false) {
  const origin = new URL(ORIGIN);
  demand(origin.protocol === 'https:' && origin.origin === ORIGIN && origin.pathname === '/' && !origin.username && !origin.password && !origin.port && !origin.search && !origin.hash, 'RELEASE_ORIGIN');
  demand(same(PUBLIC_FILES, M1_SOURCES.map(file => file.path)), 'RELEASE_ALLOWLIST_CHANGED');
  const sources = await scanClosed(path.join(root, 'public'), PUBLIC_FILES, 'RELEASE_SOURCE_MISSING');
  const sourceFiles = records(sources);
  demand(same(sourceFiles, M1_SOURCES), 'RELEASE_SOURCE_CHANGED');
  const site = new Map(sources);
  for (const page of PAGES) site.set(page, makePage(sources.get(page), page, preserveBanner));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  site.set('_headers', securityHeaders(sources));
  if (!preserveBanner) site.set('_redirects', Buffer.from(RELEASE_REDIRECTS));
  for (const page of PAGES) validateSeo(site.get(page), page, sources.get(page), preserveBanner);
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files: records(site), sourceFiles };
  const expected = { site, sources, manifest, manifestBytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n'), preserveBanner };
  if (preserveBanner) demand(sha256(expected.manifestBytes) === PRE_M2A_MANIFEST_SHA256, 'RELEASE_LEGACY_BASELINE_CHANGED');
  return expected;
}
async function validateOutputs(expected, destination = RELEASE_ROOT) {
  const managedNames = ['manifest.json', ...sorted(expected.site.keys()).map(name => `site/${name}`)];
  const actual = await scanClosed(destination, managedNames, 'RELEASE_OUTPUT_MISSING');
  let manifest;
  try { manifest = JSON.parse(actual.get('manifest.json').toString('utf8')); } catch { demand(false, 'RELEASE_MANIFEST_JSON'); }
  demand(manifest && same(Object.keys(manifest), ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']), 'RELEASE_MANIFEST_SCHEMA');
  demand(manifest.schemaVersion === 1 && manifest.mode === 'release-candidate' && manifest.origin === ORIGIN && manifest.toolSlug === TOOL_SLUG, 'RELEASE_MANIFEST_METADATA');
  const site = new Map(sorted(expected.site.keys()).map(name => [name, actual.get(`site/${name}`)]));
  demand(same(records(site), manifest.files) && same(records(expected.sources), manifest.sourceFiles), 'RELEASE_MANIFEST_INVENTORY');
  for (const page of PAGES) validateSeo(site.get(page), page, expected.sources.get(page), expected.preserveBanner);
  for (const [name, bytes] of expected.site) demand(bytes.equals(site.get(name)), 'RELEASE_ASSET_CHANGED');
  demand(expected.manifestBytes.equals(actual.get('manifest.json')), 'RELEASE_MANIFEST_CHANGED');
  return { status: 'PASS_RELEASE_CANDIDATE', origin: ORIGIN, toolSlug: TOOL_SLUG, files: site.size, sourceFiles: expected.sources.size, siteBytes: [...site.values()].reduce((sum, bytes) => sum + bytes.length, 0), manifestSha256: sha256(actual.get('manifest.json')) };
}
async function ensureOwnedDirectories(directory) {
  const relative = path.relative(root, directory);
  demand(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'RELEASE_ARCHIVE_PATH');
  let current = root;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try { const info = await lstat(current); demand(info.isDirectory() && !info.isSymbolicLink(), 'RELEASE_SYMLINK_OR_TYPE'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await mkdir(current); }
  }
}
async function writeFreshOutput(expected, destination) {
  await mkdir(destination);
  const names = ['manifest.json', ...sorted(expected.site.keys()).map(name => `site/${name}`)];
  const directories = [...directoriesFor(names)].filter(Boolean).sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : 1));
  for (const name of directories) await mkdir(path.join(destination, name));
  for (const name of sorted(expected.site.keys())) await writeFile(path.join(destination, 'site', name), expected.site.get(name), { flag: 'wx' });
  await writeFile(path.join(destination, 'manifest.json'), expected.manifestBytes, { flag: 'wx' });
}
async function upgradeReviewedLegacy(expected) {
  const legacy = await expectedRelease(true);
  await validateOutputs(legacy);
  const names = sorted(expected.site.keys());
  demand(same(names.filter(name => !legacy.site.has(name)), ['_redirects']), 'RELEASE_UPGRADE_SCOPE');
  for (const [name, bytes] of legacy.site) {
    demand(PAGES.includes(name) ? Buffer.from(removeReleaseBanner(bytes.toString('utf8'), name)).equals(expected.site.get(name)) : bytes.equals(expected.site.get(name)), 'RELEASE_UPGRADE_SCOPE');
  }
  await ensureOwnedDirectories(path.dirname(ARCHIVE_ROOT));
  let archived = false;
  try { await lstat(ARCHIVE_ROOT); archived = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!archived) await writeFreshOutput(legacy, ARCHIVE_ROOT);
  await validateOutputs(legacy, ARCHIVE_ROOT);
  // Revalidate immediately before the narrowly authorized replacement. No generic repair.
  await validateOutputs(legacy);
  for (const page of PAGES) await writeFile(path.join(RELEASE_ROOT, 'site', page), expected.site.get(page));
  await writeFile(path.join(RELEASE_ROOT, 'site', '_redirects'), expected.site.get('_redirects'), { flag: 'wx' });
  await writeFile(path.join(RELEASE_ROOT, 'manifest.json'), expected.manifestBytes);
  return { ...await validateOutputs(expected), build: 'upgraded-reviewed-banner-and-entrypoints', previousManifestSha256: PRE_M2A_MANIFEST_SHA256, preservedCopy: 'evidence/m2a/pre-m2a-release/release-artifacts' };
}
export async function runRelease(args) {
  demand(Number(process.versions.node.split('.')[0]) === 24, 'RELEASE_NODE_24');
  demand(args.length === 1 && ['build', 'check'].includes(args[0]), 'RELEASE_ARGUMENTS');
  await checkDeploymentConfig();
  const expected = await expectedRelease();
  if (args[0] === 'check') return validateOutputs(expected);
  let exists = false;
  try { await lstat(RELEASE_ROOT); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) {
    try { return { ...await validateOutputs(expected), build: 'reused-without-writes' }; }
    catch (currentError) {
      try { const legacy = await expectedRelease(true); await validateOutputs(legacy); }
      catch { throw currentError; }
      return upgradeReviewedLegacy(expected);
    }
  }
  const parent = await lstat(root);
  demand(parent.isDirectory() && !parent.isSymbolicLink(), 'RELEASE_SYMLINK_OR_TYPE');
  // All inputs and any prior output are checked before the first mutation.
  // Creation is exclusive. No overwrite, recursive deletion, or rollback deletion.
  await writeFreshOutput(expected, RELEASE_ROOT);
  return { ...await validateOutputs(expected), build: 'created' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(JSON.stringify(await runRelease(process.argv.slice(2)), null, 2) + '\n'); }
  catch (error) { process.stderr.write(`${error.code?.startsWith('RELEASE_') ? error.code : 'RELEASE_IO_ERROR'}\n`); process.exitCode = 1; }
}
