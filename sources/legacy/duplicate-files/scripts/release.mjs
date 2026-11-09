import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HEADERS } from './serve.mjs';
import { ORIGIN, TOOL_SLUG, APPROVED_PUBLIC, SERVE_SHA256, PAGES } from './release-policy.mjs';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE_FILES = Object.freeze([...APPROVED_PUBLIC.map(file => file.path), 'robots.txt', '_headers', '_redirects', 'sitemap.xml'].sort());
const ARTIFACT_FILES = Object.freeze(['manifest.json', ...SITE_FILES.map(path => `site/${path}`)].sort());
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const record = (path, bytes) => ({ path, bytes: bytes.length, sha256: digest(bytes) });
const serialize = object => Buffer.from(JSON.stringify(object, null, 2) + '\n');
function requireValue(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
async function optionalStat(path) { try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; } }
async function directory(path) { const stat = await lstat(path); requireValue(stat.isDirectory() && !stat.isSymbolicLink(), 'RELEASE_DIRECTORY_REQUIRED'); }

// No links are followed. Even an empty directory must be part of the allowlist.
async function readTree(root, allowed, prefix = '') {
  await directory(root);
  const files = new Map();
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = prefix + entry.name, location = resolve(root, entry.name);
    requireValue(!entry.isSymbolicLink(), 'RELEASE_LINK_REJECTED');
    if (entry.isDirectory()) {
      requireValue(allowed.some(file => file.startsWith(path + '/')), 'RELEASE_UNKNOWN_DIRECTORY');
      for (const [name, bytes] of await readTree(location, allowed, path + '/')) files.set(name, bytes);
    } else {
      requireValue(entry.isFile() && allowed.includes(path), 'RELEASE_UNKNOWN_FILE');
      const stat = await lstat(location);
      requireValue(stat.isFile() && !stat.isSymbolicLink(), 'RELEASE_LINK_REJECTED');
      files.set(path, await readFile(location));
    }
  }
  return new Map([...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

function attributes(source) {
  const parsed = Object.create(null);
  let rest = source;
  for (const match of source.matchAll(/([a-z][a-z0-9-]*)\s*=\s*"([^"]*)"/gi)) {
    const key = match[1].toLowerCase();
    requireValue(!(key in parsed), 'RELEASE_DUPLICATE_ATTRIBUTE');
    parsed[key] = match[2]; rest = rest.replace(match[0], '');
  }
  requireValue(!rest.trim(), 'RELEASE_INVALID_ATTRIBUTE');
  return parsed;
}
const tags = (text, name) => [...text.matchAll(new RegExp(`<${name}\\b([^>]*)>`, 'gi'))].map(match => attributes(match[1]));

export function validateReleaseHTML(html, path) {
  const expected = PAGES[path]; requireValue(Boolean(expected), 'RELEASE_UNKNOWN_PAGE');
  const heads = [...html.matchAll(/<head>([\s\S]*?)<\/head>/gi)];
  requireValue(heads.length === 1, 'RELEASE_HEAD_COUNT');
  const head = heads[0][1], htmlTags = tags(html, 'html');
  requireValue(htmlTags.length === 1 && htmlTags[0].lang === expected.lang, 'RELEASE_LANGUAGE');
  const titles = [...html.matchAll(/<title>([\s\S]*?)<\/title>/gi)];
  requireValue(titles.length === 1 && titles[0][1] === expected.title && head.includes(titles[0][0]), 'RELEASE_TITLE');
  const h1s = [...html.matchAll(/<h1>([\s\S]*?)<\/h1>/gi)];
  requireValue(h1s.length === 1 && h1s[0][1] === expected.h1, 'RELEASE_H1');
  const allMeta = tags(html, 'meta'), headMeta = tags(head, 'meta');
  const descriptions = allMeta.filter(tag => tag.name?.toLowerCase() === 'description');
  requireValue(descriptions.length === 1 && descriptions[0].content === expected.description
    && headMeta.some(tag => tag.name === 'description' && tag.content === expected.description), 'RELEASE_DESCRIPTION');
  const robots = allMeta.filter(tag => tag.name?.toLowerCase() === 'robots');
  requireValue(robots.length === 1 && robots[0].content === 'index,follow'
    && headMeta.some(tag => tag.name === 'robots' && tag.content === 'index,follow'), 'RELEASE_ROBOTS');
  const allLinks = tags(html, 'link'), links = tags(head, 'link');
  const canonicals = allLinks.filter(tag => tag.rel?.toLowerCase() === 'canonical');
  requireValue(canonicals.length === 1 && canonicals[0].href === `${ORIGIN}/${path}`
    && links.some(tag => tag.rel === 'canonical' && tag.href === `${ORIGIN}/${path}`), 'RELEASE_CANONICAL');
  const alternate = allLinks.filter(tag => tag.hreflang !== undefined);
  requireValue(alternate.length === 3, 'RELEASE_HREFLANG_COUNT');
  for (const [lang, href] of [['zh-Hant', `${ORIGIN}/index.html`], ['en', `${ORIGIN}/en/index.html`], ['x-default', `${ORIGIN}/index.html`]]) {
    requireValue(alternate.filter(tag => tag.rel === 'alternate' && tag.hreflang === lang && tag.href === href).length === 1
      && links.some(tag => tag.rel === 'alternate' && tag.hreflang === lang && tag.href === href), 'RELEASE_HREFLANG');
  }
  requireValue(!html.includes(expected.candidate), 'RELEASE_CANDIDATE_NOTICE');
  const body = html.slice(heads[0].index + heads[0][0].length);
  requireValue(digest(Buffer.from(body)) === expected.releaseBodySha256, 'RELEASE_BODY_CHANGED');
}

function releaseHTML(bytes, path) {
  const source = bytes.toString('utf8');
  const head = source.match(/<head>([\s\S]*?)<\/head>/);
  const previewRobots = '<meta name="robots" content="noindex,nofollow,noarchive">';
  requireValue(head && head[1].split(previewRobots).length === 2 && !/<link\b[^>]*\b(?:rel="canonical"|hreflang=)/i.test(head[1]), 'RELEASE_PREVIEW_HEAD');
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const banner = `      <p class="candidate">${PAGES[path].candidate}</p>${newline}`;
  requireValue(source.split(banner).length === 2 && source.slice(head.index + head[0].length).includes(banner), 'RELEASE_EXACT_BANNER_REQUIRED');
  const replacement = [
    '<meta name="robots" content="index,follow">',
    `<link rel="canonical" href="${ORIGIN}/${path}">`,
    `<link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `<link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`
  ].join(newline + '  ');
  const transformedHead = head[0].replace(previewRobots, replacement);
  const withReleaseHead = source.slice(0, head.index) + transformedHead + source.slice(head.index + head[0].length);
  const transformed = withReleaseHead.replace(banner, '');
  validateReleaseHTML(transformed, path);
  return Buffer.from(transformed);
}

async function expectedArtifacts(root) {
  const origin = new URL(ORIGIN);
  requireValue(ORIGIN === 'https://duplicates.glossquote.com' && origin.origin === ORIGIN && origin.protocol === 'https:' && origin.pathname === '/' && !origin.username && !origin.password && !origin.port && !origin.search && !origin.hash, 'RELEASE_ORIGIN_POLICY');
  await directory(root); await directory(resolve(root, 'scripts'));
  const servePath = resolve(root, 'scripts/serve.mjs'), serveStat = await lstat(servePath);
  requireValue(serveStat.isFile() && !serveStat.isSymbolicLink(), 'RELEASE_HEADER_SOURCE_LINK');
  requireValue(digest(await readFile(servePath)) === SERVE_SHA256, 'RELEASE_HEADER_SOURCE_CHANGED');
  const publicNames = APPROVED_PUBLIC.map(file => file.path);
  const source = await readTree(resolve(root, 'public'), publicNames);
  requireValue(source.size === APPROVED_PUBLIC.length, 'RELEASE_SOURCE_MISSING');
  for (const approved of APPROVED_PUBLIC) {
    const bytes = source.get(approved.path);
    requireValue(bytes && bytes.length === approved.bytes && digest(bytes) === approved.sha256, 'RELEASE_SOURCE_CHANGED');
  }
  const site = new Map();
  for (const [path, bytes] of source) site.set(path, path.endsWith('.html') ? releaseHTML(bytes, path) : bytes);
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  const headers = { ...HEADERS, 'X-Robots-Tag': 'index, follow' };
  requireValue(Object.keys(headers).length === 5 && headers['Content-Security-Policy'] === "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'RELEASE_HEADER_POLICY');
  site.set('_headers', Buffer.from('/*\n' + Object.entries(headers).map(([name, value]) => `  ${name}: ${value}\n`).join('')));
  site.set('_redirects', Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n'));
  const sorted = new Map([...site].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG,
    files: [...sorted].map(([path, bytes]) => record(path, bytes)), sourceFiles: [...source].map(([path, bytes]) => record(path, bytes)) };
  return { site: sorted, manifest, manifestBytes: serialize(manifest) };
}

async function verifyOutput(root, expected) {
  const output = await readTree(resolve(root, 'release-artifacts'), ARTIFACT_FILES);
  requireValue(output.size === ARTIFACT_FILES.length, 'RELEASE_OUTPUT_MISSING');
  const manifestBytes = output.get('manifest.json');
  requireValue(manifestBytes?.equals(expected.manifestBytes), 'RELEASE_MANIFEST_MISMATCH');
  for (const [path, bytes] of expected.site) {
    const actual = output.get(`site/${path}`);
    requireValue(actual?.equals(bytes), 'RELEASE_ASSET_MISMATCH');
    if (path.endsWith('.html')) validateReleaseHTML(actual.toString('utf8'), path);
  }
  return expected.manifest;
}

export async function checkRelease(root = ROOT) {
  return verifyOutput(root, await expectedArtifacts(root));
}

export async function buildRelease(root = ROOT) {
  const expected = await expectedArtifacts(root), outputRoot = resolve(root, 'release-artifacts');
  if (await optionalStat(outputRoot)) {
    // A complete independently verified output is reused byte-for-byte.
    // Unknown, partial, modified, or linked outputs are never repaired in place.
    await verifyOutput(root, expected); return expected.manifest;
  }
  const madeDirectories = [], madeFiles = [];
  async function makeDirectory(path) {
    try { await mkdir(path); madeDirectories.push(path); }
    catch (error) { if (error.code !== 'EEXIST') throw error; await directory(path); }
  }
  try {
    // Exclusive root creation avoids claiming another process's output.
    await mkdir(outputRoot); madeDirectories.push(outputRoot);
    await makeDirectory(resolve(outputRoot, 'site'));
    for (const [path, bytes] of expected.site) {
      let parent = resolve(outputRoot, 'site');
      for (const part of path.split('/').slice(0, -1)) { parent = resolve(parent, part); await makeDirectory(parent); }
      const target = resolve(outputRoot, 'site', path);
      await writeFile(target, bytes, { flag: 'wx' }); madeFiles.push({ path: target, bytes });
    }
    const target = resolve(outputRoot, 'manifest.json');
    await writeFile(target, expected.manifestBytes, { flag: 'wx' }); madeFiles.push({ path: target, bytes: expected.manifestBytes });
    return await verifyOutput(root, expected);
  } catch (error) {
    // Best-effort cleanup is limited to exact files this build created and whose
    // bytes still match; no recursive delete and no unknown output is removed.
    for (const file of madeFiles.reverse()) {
      const stat = await optionalStat(file.path);
      if (stat?.isFile() && !stat.isSymbolicLink() && (await readFile(file.path)).equals(file.bytes)) await unlink(file.path);
    }
    for (const path of madeDirectories.reverse()) {
      try { await rmdir(path); } catch (cleanupError) { if (!['ENOTEMPTY', 'EEXIST', 'ENOENT'].includes(cleanupError.code)) throw cleanupError; }
    }
    throw error;
  }
}

export function parseMode(args) {
  requireValue(args.length === 1 && ['build', 'check'].includes(args[0]), 'RELEASE_USAGE_BUILD_OR_CHECK_ONLY');
  return args[0];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const mode = parseMode(process.argv.slice(2));
    requireValue(Number(process.versions.node.split('.')[0]) === 24, 'RELEASE_NODE24_REQUIRED');
    const manifest = mode === 'build' ? await buildRelease() : await checkRelease();
    console.log(`PASS release ${mode}: ${manifest.files.length} files; ${ORIGIN}; offline candidate, not deployed`);
  } catch (error) { console.error(`RELEASE_REJECTED: ${String(error.code ?? '').startsWith('RELEASE_') ? error.code : 'RELEASE_IO_FAILED'}`); process.exitCode = 1; }
}
