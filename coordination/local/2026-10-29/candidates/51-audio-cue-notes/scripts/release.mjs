import { readdir, lstat, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import {
  ORIGIN, TOOL_SLUG, SOURCE_FILES, SECURITY_SOURCE, SECURITY_HEADERS, PAGE_EXPECTATIONS
} from './release-contract.mjs';

export { ORIGIN, TOOL_SLUG };
const ROOT = new URL('../', import.meta.url);
const SOURCE_PATHS = SOURCE_FILES.map(file => file.path);
export const SITE_PATHS = Object.freeze([...new Set([...SOURCE_PATHS, 'robots.txt', '_headers', 'sitemap.xml'])].sort());
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const record = (path, bytes) => ({ path, bytes: bytes.byteLength, sha256: sha256(bytes) });
const encoded = text => Buffer.from(text, 'utf8');
function reject(code) { const error = new Error(code); error.code = code; throw error; }
async function stats(path, missing = false) {
  try {
    // Strip non-root trailing separators before lstat so a directory URL does
    // not cause POSIX to dereference the final symlink before this check.
    const nativePath = resolve(path instanceof URL ? fileURLToPath(path) : path);
    const value = await lstat(nativePath);
    if (value.isSymbolicLink()) reject('RELEASE_LINKED_ENTRY');
    return value;
  } catch (error) {
    if (missing && error.code === 'ENOENT') return null;
    throw error;
  }
}

// Accept only exact allowlisted entry names before forming their URLs. No
// arbitrary route normalization or recursive deletion; unknown directories fail.
async function closedTree(base, paths) {
  const rootStats = await stats(base);
  if (!rootStats.isDirectory()) reject('RELEASE_NOT_DIRECTORY');
  const seen = [];
  const visit = async (directory, prefix) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = prefix + entry.name;
      if (!paths.includes(path) && !paths.some(allowed => allowed.startsWith(`${path}/`))) reject('RELEASE_EXTRA_ENTRY');
      const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      const info = await stats(target);
      if (info.isDirectory()) {
        if (!paths.some(allowed => allowed.startsWith(`${path}/`))) reject('RELEASE_EXTRA_ENTRY');
        await visit(target, `${path}/`);
      } else {
        if (!info.isFile() || !paths.includes(path)) reject('RELEASE_EXTRA_ENTRY');
        seen.push(path);
      }
    }
  };
  await visit(base, '');
  if (seen.length !== paths.length || paths.some(path => !seen.includes(path))) reject('RELEASE_MISSING_ENTRY');
}

function headParts(html) {
  const opening = [...html.matchAll(/<head\s*>/gi)];
  const closing = [...html.matchAll(/<\/head\s*>/gi)];
  if (opening.length !== 1 || closing.length !== 1 || closing[0].index <= opening[0].index) reject('RELEASE_HTML_STRUCTURE');
  const start = opening[0].index + opening[0][0].length;
  const end = closing[0].index;
  return { before: html.slice(0, start), head: html.slice(start, end), after: html.slice(end) };
}

function releaseHtml(bytes, path) {
  const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const parts = headParts(html);
  const marker = '<meta name="robots" content="noindex, nofollow, noarchive">';
  if (parts.head.split(marker).length !== 2 || /rel\s*=\s*["'](?:canonical|alternate)["']/i.test(parts.head)) reject('RELEASE_PREVIEW_SEO');
  const links = [
    `  <link rel="canonical" href="${ORIGIN}/${path}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`
  ].join('\n');
  const head = parts.head.replace(marker, '<meta name="robots" content="index, follow">');
  return encoded(`${parts.before}${head}${links}\n${parts.after}`);
}

// Static semantic extraction only; this is deliberately not a browser parser or
// browser/assistive-technology claim. Byte equality below also covers the body.
function tags(html, tag) {
  const result = [];
  for (const match of html.matchAll(new RegExp(`<${tag}\\b([^<>]*)>`, 'gi'))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      const name = attr[1].toLowerCase();
      if (Object.hasOwn(attrs, name)) reject('RELEASE_DUPLICATE_ATTRIBUTE');
      attrs[name] = attr[2] ?? attr[3] ?? attr[4] ?? '';
    }
    result.push(attrs);
  }
  return result;
}
const only = values => { if (values.length !== 1) reject('RELEASE_SEO_CARDINALITY'); return values[0]; };

export function inspectReleaseHtml(bytes, path) {
  const expected = PAGE_EXPECTATIONS[path];
  if (!expected) reject('RELEASE_PAGE_UNKNOWN');
  const html = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const parts = headParts(html);
  if (only(tags(html, 'html')).lang !== expected.lang) reject('RELEASE_HTML_LANG');
  const title = only([...parts.head.matchAll(/<title>([^<]*)<\/title>/gi)]);
  const h1 = only([...html.matchAll(/<h1>([^<]*)<\/h1>/gi)]);
  if (title[1] !== expected.title || h1[1] !== expected.h1 || !parts.after.includes(expected.warning)) reject('RELEASE_PAGE_COPY');
  const meta = tags(parts.head, 'meta');
  if (only(meta.filter(tag => tag.name === 'description')).content !== expected.description) reject('RELEASE_DESCRIPTION');
  if (only(meta.filter(tag => tag.name === 'robots')).content !== 'index, follow') reject('RELEASE_ROBOTS');
  const allLinks = tags(html, 'link');
  const links = tags(parts.head, 'link');
  if (only(links.filter(tag => tag.rel === 'canonical')).href !== `${ORIGIN}/${path}`) reject('RELEASE_CANONICAL');
  const alternates = links.filter(tag => tag.rel === 'alternate');
  if (alternates.length !== 3 || allLinks.filter(tag => ['canonical', 'alternate'].includes(tag.rel)).length !== 4) reject('RELEASE_HREFLANG');
  for (const [lang, suffix] of [['zh-Hant', '/index.html'], ['en', '/en/index.html'], ['x-default', '/index.html']]) {
    if (only(alternates.filter(tag => tag.hreflang === lang)).href !== ORIGIN + suffix) reject('RELEASE_HREFLANG');
  }
}

async function pinnedFile(url, expected) {
  const info = await stats(url);
  if (!info.isFile() || info.size !== expected.bytes) reject('RELEASE_SOURCE_CHANGED');
  const bytes = await readFile(url);
  if (sha256(bytes) !== expected.sha256) reject('RELEASE_SOURCE_CHANGED');
  return bytes;
}

async function expectedRelease(base) {
  if (Number(process.versions.node.split('.')[0]) !== 24) reject('RELEASE_NODE24_REQUIRED');
  const origin = new URL(ORIGIN);
  if (origin.protocol !== 'https:' || origin.origin !== ORIGIN || origin.pathname !== '/' || origin.search || origin.hash ||
      origin.username || origin.password || origin.port) reject('RELEASE_FIXED_ORIGIN');
  // The reviewed server file is read and hashed, never imported or started.
  await stats(new URL('scripts/', base));
  await pinnedFile(new URL(SECURITY_SOURCE.path, base), SECURITY_SOURCE);
  const publicRoot = new URL('public/', base);
  await closedTree(publicRoot, SOURCE_PATHS);
  const site = new Map();
  const sourceFiles = [];
  for (const source of SOURCE_FILES) {
    const bytes = await pinnedFile(new URL(source.path, publicRoot), source);
    sourceFiles.push(record(source.path, bytes));
    const output = Object.hasOwn(PAGE_EXPECTATIONS, source.path) ? releaseHtml(bytes, source.path) : bytes;
    if (Object.hasOwn(PAGE_EXPECTATIONS, source.path)) inspectReleaseHtml(output, source.path);
    site.set(source.path, output);
  }
  site.set('robots.txt', encoded(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', encoded(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  site.set('_headers', encoded(`/*\n${Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`));
  const manifest = {
    schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG,
    files: SITE_PATHS.map(path => record(path, site.get(path))), sourceFiles
  };
  return { site, manifest, manifestBytes: encoded(`${JSON.stringify(manifest, null, 2)}\n`) };
}

async function checkExisting(base, expected) {
  const releaseRoot = new URL('release-artifacts/', base);
  // Validates every existing directory/file before reading managed output.
  await closedTree(releaseRoot, ['manifest.json', ...SITE_PATHS.map(path => `site/${path}`)]);
  if ((await stats(new URL('manifest.json', releaseRoot))).size !== expected.manifestBytes.byteLength) reject('RELEASE_MANIFEST_MISMATCH');
  const actualManifest = await readFile(new URL('manifest.json', releaseRoot));
  if (!actualManifest.equals(expected.manifestBytes)) reject('RELEASE_MANIFEST_MISMATCH');
  for (const path of SITE_PATHS) {
    const url = new URL(`site/${path}`, releaseRoot);
    if ((await stats(url)).size !== expected.site.get(path).byteLength) reject('RELEASE_ASSET_MISMATCH');
    const actual = await readFile(url);
    if (!actual.equals(expected.site.get(path))) reject('RELEASE_ASSET_MISMATCH');
    if (Object.hasOwn(PAGE_EXPECTATIONS, path)) inspectReleaseHtml(actual, path);
  }
  return expected.manifest;
}

export async function checkRelease(base = ROOT) {
  const expected = await expectedRelease(base);
  return checkExisting(base, expected);
}

export async function buildRelease(base = ROOT) {
  // Full source and existing-output preflight precedes any write. Rebuilding an
  // intact candidate is a no-op, so modified/unmanaged output is never replaced.
  const expected = await expectedRelease(base);
  const releaseRoot = new URL('release-artifacts/', base);
  const existing = await stats(releaseRoot, true);
  if (existing) return checkExisting(base, expected);
  await mkdir(releaseRoot); // Exclusive creation; fail if another writer won.
  for (const path of SITE_PATHS) {
    const target = new URL(`site/${path}`, releaseRoot);
    await mkdir(new URL('.', target), { recursive: true });
    await writeFile(target, expected.site.get(path), { flag: 'wx' });
  }
  await writeFile(new URL('manifest.json', releaseRoot), expected.manifestBytes, { flag: 'wx' });
  return checkExisting(base, expected);
}

export function parseMode(args) {
  if (args.length !== 1 || !['build', 'check'].includes(args[0])) reject('RELEASE_USAGE');
  return args[0];
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    const mode = parseMode(process.argv.slice(2));
    const manifest = await (mode === 'build' ? buildRelease() : checkRelease());
    console.log(JSON.stringify({ status: 'PASS', mode, origin: ORIGIN, toolSlug: TOOL_SLUG, files: manifest.files.length,
      manifestSha256: sha256(encoded(`${JSON.stringify(manifest, null, 2)}\n`)), published: false }));
  } catch (error) {
    console.error(`Release rejected: ${error.code ?? 'RELEASE_FAILED'}`);
    process.exitCode = error.code === 'RELEASE_USAGE' ? 2 : 1;
  }
}
