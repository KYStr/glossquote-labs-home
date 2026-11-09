import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES } from './files.mjs';
import { inspectPublic } from './check.mjs';
import { REDIRECTS, validateDeployment } from './deployment.mjs';

export const ORIGIN = 'https://shopping-list.glossquote.com';
export const TOOL_SLUG = 'pantry-plan';
// The reviewed M1 public records, including preview SEO/configuration, are pinned.
export const SOURCE_RECORDS_SHA256 = 'bd7f4bed29d52631cc9f24b3b93bcb226e441b3a7657eeb4c274f21dc7db4a56';
export const SOURCE_PATHS = Object.freeze([
  '404.html', '_headers', 'en/index.html', 'index.html',
  'js/app.mjs', 'js/controller.mjs', 'js/core/quantities.mjs', 'js/core/schema.mjs',
  'js/core/session.mjs', 'js/core/shopping.mjs', 'js/locales/en.mjs',
  'js/locales/zh-Hant.mjs', 'robots.txt', 'styles/app.css',
]);
export const SITE_PATHS = Object.freeze([...SOURCE_PATHS, '_redirects', 'sitemap.xml'].sort());
const PACKAGE_PATHS = Object.freeze(['manifest.json', ...SITE_PATHS.map(path => `site/${path}`)].sort());
const CHINESE = `${ORIGIN}/index.html`;
const ENGLISH = `${ORIGIN}/en/index.html`;
const decoder = new TextDecoder('utf-8', { fatal: true });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

class ReleaseError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function requireValue(condition, code) { if (!condition) throw new ReleaseError(code); }
function fixedConfiguration() {
  const parsed = new URL(ORIGIN);
  requireValue(parsed.protocol === 'https:' && parsed.origin === ORIGIN && parsed.pathname === '/' && !parsed.port && !parsed.username && !parsed.password && !parsed.search && !parsed.hash, 'FIXED_ORIGIN_INVALID');
  requireValue(parsed.hostname === 'shopping-list.glossquote.com' && TOOL_SLUG === 'pantry-plan', 'FIXED_TOOL_INVALID');
  requireValue(JSON.stringify([...PUBLIC_FILES].sort()) === JSON.stringify(SOURCE_PATHS), 'SOURCE_ALLOWLIST_CHANGED');
}
function directories(paths) {
  const result = new Set();
  for (const path of paths) {
    const pieces = path.split('/');
    for (let i = 1; i < pieces.length; i++) result.add(pieces.slice(0, i).join('/'));
  }
  return result;
}
async function plainDirectory(path) {
  const stat = await lstat(path);
  requireValue(stat.isDirectory() && !stat.isSymbolicLink(), 'UNSAFE_DIRECTORY');
}
async function exists(path) {
  try { await lstat(path); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function closedTree(root, allowed) {
  await plainDirectory(root);
  const allowedFiles = new Set(allowed), allowedDirs = directories(allowed), found = new Map();
  async function visit(path, prefix = '') {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      requireValue(!rel.includes('\\') && !rel.includes(':') && !rel.startsWith('/') && !rel.split('/').includes('..'), 'UNSAFE_PATH');
      const full = join(path, entry.name), stat = await lstat(full);
      requireValue(!stat.isSymbolicLink(), 'REPARSE_POINT');
      if (stat.isDirectory()) {
        requireValue(allowedDirs.has(rel), 'UNKNOWN_DIRECTORY'); await visit(full, rel);
      } else {
        requireValue(stat.isFile(), 'SPECIAL_FILE');
        requireValue(allowedFiles.has(rel), 'UNKNOWN_FILE');
        found.set(rel, await readFile(full));
      }
    }
  }
  await visit(root);
  requireValue(found.size === allowed.length && allowed.every(path => found.has(path)), 'MISSING_FILE');
  return new Map([...found].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}
function records(files) {
  return [...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) }));
}
async function readSources(root) {
  fixedConfiguration(); await plainDirectory(root);
  await validateDeployment(root);
  const files = await closedTree(join(root, 'public'), SOURCE_PATHS);
  const sourceFiles = records(files);
  requireValue(sha256(Buffer.from(JSON.stringify(sourceFiles))) === SOURCE_RECORDS_SHA256, 'SOURCE_CHANGED_FROM_M1');
  inspectPublic(new Map([...files].map(([path, bytes]) => [path, decoder.decode(bytes)])));
  return { files, sourceFiles };
}

function headRegion(text) {
  const regions = [...text.matchAll(/<head\b[^>]*>[\s\S]*?<\/head>/gi)];
  requireValue(regions.length === 1, 'HEAD_STRUCTURE');
  return regions[0];
}
function seoHTML(bytes, canonical) {
  const text = decoder.decode(bytes), head = headRegion(text);
  const robots = '<meta name="robots" content="noindex,nofollow">';
  requireValue(head[0].split(robots).length === 2, 'PREVIEW_ROBOTS_STRUCTURE');
  requireValue(!/rel\s*=\s*["'](?:canonical|alternate)["']/i.test(head[0]), 'PREVIEW_SEO_LINK');
  const links = [
    `  <link rel="canonical" href="${canonical}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${CHINESE}">`,
    `  <link rel="alternate" hreflang="en" href="${ENGLISH}">`,
    `  <link rel="alternate" hreflang="x-default" href="${CHINESE}">`,
  ].join('\n');
  const replacement = head[0].replace(robots, '<meta name="robots" content="index,follow">').replace(/<\/head>$/i, `${links}\n</head>`);
  let released = text.slice(0, head.index) + replacement + text.slice(head.index + head[0].length);
  const removals = canonical === CHINESE
    ? [' · 預覽候選版', ' · 本地預覽，尚未正式發布']
    : [' · Preview candidate', ' · Local preview, not a live release'];
  for (const marker of removals) {
    requireValue(released.split(marker).length === 2, 'RELEASE_COPY_STRUCTURE');
    released = released.replace(marker, '');
  }
  return Buffer.from(released, 'utf8');
}
function releaseHeaders(bytes) {
  const lines = decoder.decode(bytes).split('\n');
  const robotsLines = lines.map((line, index) => /^\s*X-Robots-Tag:\s*noindex,\s*nofollow\s*$/i.test(line) ? index : -1).filter(index => index >= 0);
  requireValue(robotsLines.length === 1, 'HEADERS_ROBOTS_STRUCTURE');
  const index = robotsLines[0];
  lines[index] = lines[index].replace(/noindex,\s*nofollow/i, 'index, follow');
  return Buffer.from(lines.join('\n'), 'utf8');
}
function attributes(tag) {
  const found = new Map();
  for (const match of tag.matchAll(/([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    const name = match[1].toLowerCase(); requireValue(!found.has(name), 'DUPLICATE_HEAD_ATTRIBUTE');
    found.set(name, match[2] ?? match[3]);
  }
  return found;
}
function validateSEO(site) {
  for (const [path, canonical, lang] of [['index.html', CHINESE, 'zh-Hant'], ['en/index.html', ENGLISH, 'en']]) {
    const text = decoder.decode(site.get(path)), head = headRegion(text)[0];
    requireValue(new RegExp(`<html lang="${lang}"`).test(text), 'HTML_LANGUAGE');
    const tags = [...head.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(?:link|meta)\b[^>]*>/gi)].map(match => attributes(match[0]));
    const canonicalLinks = tags.filter(tag => tag.get('rel') === 'canonical');
    requireValue(canonicalLinks.length === 1 && canonicalLinks[0].get('href') === canonical, 'CANONICAL_MISMATCH');
    const alternatives = tags.filter(tag => tag.get('rel') === 'alternate');
    requireValue(alternatives.length === 3, 'HREFLANG_COUNT');
    for (const [language, href] of [['zh-Hant', CHINESE], ['en', ENGLISH], ['x-default', CHINESE]]) {
      const group = alternatives.filter(tag => tag.get('hreflang') === language);
      requireValue(group.length === 1 && group[0].get('href') === href, 'HREFLANG_MISMATCH');
    }
    const robots = tags.filter(tag => tag.get('name') === 'robots');
    requireValue(robots.length === 1 && robots[0].get('content') === 'index,follow', 'RELEASE_ROBOTS_MISMATCH');
  }
}
async function expectedPackage(root) {
  const { files: source, sourceFiles } = await readSources(root);
  const site = new Map(source);
  site.set('index.html', seoHTML(source.get('index.html'), CHINESE));
  site.set('en/index.html', seoHTML(source.get('en/index.html'), ENGLISH));
  site.set('_headers', releaseHeaders(source.get('_headers')));
  site.set('_redirects', Buffer.from(REDIRECTS));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${CHINESE}</loc></url>\n  <url><loc>${ENGLISH}</loc></url>\n</urlset>\n`));
  validateSEO(site);
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files: records(site), sourceFiles };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  return { site, manifest, manifestBytes };
}
function exactKeys(value, expected) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === expected.length && Object.keys(value).every(key => expected.includes(key)), 'MANIFEST_SCHEMA');
}
function validateManifest(bytes, expected) {
  let manifest;
  try { manifest = JSON.parse(decoder.decode(bytes)); } catch { throw new ReleaseError('MANIFEST_JSON'); }
  exactKeys(manifest, ['schemaVersion', 'mode', 'origin', 'toolSlug', 'files', 'sourceFiles']);
  requireValue(manifest.schemaVersion === 1 && manifest.mode === 'release-candidate' && manifest.origin === ORIGIN && manifest.toolSlug === TOOL_SLUG, 'MANIFEST_IDENTITY');
  for (const key of ['files', 'sourceFiles']) {
    const list = manifest[key]; requireValue(Array.isArray(list), 'MANIFEST_SCHEMA');
    for (const record of list) {
      exactKeys(record, ['path', 'bytes', 'sha256']);
      requireValue(typeof record.path === 'string' && Number.isSafeInteger(record.bytes) && record.bytes >= 0 && /^[a-f0-9]{64}$/.test(record.sha256), 'MANIFEST_RECORD');
    }
    requireValue(JSON.stringify(list) === JSON.stringify(expected.manifest[key]), 'MANIFEST_RECORD_MISMATCH');
  }
  requireValue(bytes.equals(expected.manifestBytes), 'MANIFEST_BYTES_MISMATCH');
}
async function verifyExisting(root, plan) {
  const output = await closedTree(join(root, 'release-artifacts'), PACKAGE_PATHS);
  const site = new Map();
  for (const path of SITE_PATHS) {
    const bytes = output.get(`site/${path}`);
    requireValue(bytes.equals(plan.site.get(path)), 'ARTIFACT_BYTES_MISMATCH'); site.set(path, bytes);
  }
  validateSEO(site);
  validateManifest(output.get('manifest.json'), plan);
  requireValue(JSON.stringify(records(site)) === JSON.stringify(plan.manifest.files), 'ARTIFACT_RECORDS_MISMATCH');
}
function summary(plan, action) {
  return { status: 'PASS', mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, action, files: plan.manifest.files.length, bytes: plan.manifest.files.reduce((sum, file) => sum + file.bytes, 0), sourceFiles: plan.manifest.sourceFiles.length, sourceRecordsSha256: SOURCE_RECORDS_SHA256, manifestBytes: plan.manifestBytes.length, manifestSha256: sha256(plan.manifestBytes) };
}
export async function checkRelease(root = ROOT) {
  requireValue(Number(process.versions.node.split('.')[0]) >= 24, 'NODE_24_REQUIRED');
  const plan = await expectedPackage(root); await verifyExisting(root, plan);
  return summary(plan, 'VERIFIED');
}
export async function buildRelease(root = ROOT) {
  requireValue(Number(process.versions.node.split('.')[0]) >= 24, 'NODE_24_REQUIRED');
  const plan = await expectedPackage(root), output = join(root, 'release-artifacts');
  // A valid existing package is read-only. Tampered, partial or unowned output is never repaired/overwritten.
  if (await exists(output)) { await verifyExisting(root, plan); return summary(plan, 'VERIFIED_EXISTING'); }
  await mkdir(output);
  const dirs = [...directories(PACKAGE_PATHS)].sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : a > b ? 1 : 0));
  for (const path of dirs) { const full = join(output, path); await plainDirectory(dirname(full)); await mkdir(full); }
  for (const [path, bytes] of plan.site) {
    const target = join(output, 'site', path); await plainDirectory(dirname(target));
    await writeFile(target, bytes, { flag: 'wx' });
  }
  await writeFile(join(output, 'manifest.json'), plan.manifestBytes, { flag: 'wx' });
  await checkRelease(root);
  return summary(plan, 'CREATED');
}
export async function runRelease(args) {
  requireValue(args.length === 1 && ['build', 'check'].includes(args[0]), 'USAGE_EXPECTED_BUILD_OR_CHECK');
  return args[0] === 'build' ? buildRelease() : checkRelease();
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(await runRelease(process.argv.slice(2)))); }
  catch (error) { console.error(error instanceof ReleaseError ? error.code : 'RELEASE_IO_ERROR'); process.exitCode = 1; }
}
