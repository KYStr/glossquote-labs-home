import { lstat, readdir, readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, PUBLIC_FILES, closedTree, inspectHtml, tokenizeHtml, validRelativePath } from './check.mjs';
import { SECURITY_HEADERS } from './serve.mjs'; // Importing constants does not start the guarded dev entry.
import { validateDeploymentConfig } from './deployment-config.mjs';
export { WRANGLER_CONFIG, validateDeploymentConfig } from './deployment-config.mjs';

export const RELEASE_ORIGIN = 'https://round-robin.glossquote.com';
export const TOOL_SLUG = 'tournament-scheduler';
export const RELEASE_FILES = Object.freeze([...PUBLIC_FILES, 'robots.txt', '_headers', '_redirects', 'sitemap.xml'].sort());
export const RELEASE_REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';

// Audited M1 public bytes, copied from the frozen M1 candidate manifest. This is
// independent of the writable release manifest and pins runtime/preview inputs.
export const M1_SOURCE_FILES = Object.freeze([
  { path: 'en/index.html', bytes: 8622, sha256: 'c6e6925afea40a35d6f59116cc70df3eac602c54322ce5e9d18d8fe5c907fe34' },
  { path: 'index.html', bytes: 8430, sha256: 'ad6bb2e461108bf5a116a50ce3018c98e55226af11b7f8785c9f47bc27132fdf' },
  { path: 'js/app.js', bytes: 18093, sha256: 'd67041b39b2c58af5ed715b9244c1593f4ea56e52d09e16914293bd5e0d73644' },
  { path: 'js/core/circle.mjs', bytes: 6552, sha256: '6248c56fb47b249b3e3efcc3b59fd061ace7446b4c10c516b629746245b45661' },
  { path: 'js/core/output.mjs', bytes: 5364, sha256: '3ca1ffbd1a717463a6f62c14240483c85cd9f8ae381fcee6c5bc98f9562d7433' },
  { path: 'js/core/teams.mjs', bytes: 2176, sha256: 'f586fd8a8d9cb0b2b965a3f8963e92661820e097a44b99d3de2e35486bad8814' },
  { path: 'js/core/timing.mjs', bytes: 4761, sha256: 'a01805322c5d3987cf1b0cc5f5e0ded67bb0d1afafc329b1d72fa2ede390f77c' },
  { path: 'styles/app.css', bytes: 7734, sha256: '56d9a9fc2937e14593e034f863e1c95667874ba9ea15f7be8de4469f386b7cba' }
].map(Object.freeze));
const M1_SERVE_SHA256 = 'e0247af5969edc1c9d9397c3d2b051b1b7e8ffc3da4c7fe7ed843de34fefceac';
const ORIGINAL_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow', 'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()'
});
const directories = ['site', 'site/en', 'site/js', 'site/js/core', 'site/styles'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const record = (path, bytes) => ({ path, bytes: bytes.length, sha256: sha256(bytes) });
const fail = code => { throw new Error(code); };
const serialize = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const sameKeys = (value, keys) => value && !Array.isArray(value) && Object.keys(value).sort().join('|') === [...keys].sort().join('|');
const normalizedPath = path => process.platform === 'win32' ? path.toLowerCase() : path;

function projectRoot(options) {
  if (!sameKeys(options, ['root']) || typeof options.root !== 'string') fail('RELEASE_OPTIONS');
  return resolve(options.root);
}

async function safeDirectory(path) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('RELEASE_LINK_OR_DIRECTORY');
  if (normalizedPath(await realpath(path)) !== normalizedPath(resolve(path))) fail('RELEASE_LINKED_ANCESTOR');
}

async function sourceContents(root) {
  await safeDirectory(root);
  await validateDeploymentConfig({ root });
  if ([...PUBLIC_FILES].sort().join('|') !== M1_SOURCE_FILES.map(file => file.path).join('|')) fail('RELEASE_ALLOWLIST_CHANGED');
  await closedTree(join(root, 'public'));
  const source = new Map();
  for (const expected of M1_SOURCE_FILES) {
    const bytes = await readFile(join(root, 'public', expected.path));
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) fail('RELEASE_SOURCE_CHANGED');
    if (expected.path.endsWith('.html')) inspectHtml(bytes.toString('utf8'), expected.path);
    source.set(expected.path, bytes);
  }
  await safeDirectory(join(root, 'scripts'));
  const servePath = join(root, 'scripts/serve.mjs');
  const serveStat = await lstat(servePath);
  if (!serveStat.isFile() || serveStat.isSymbolicLink() || sha256(await readFile(servePath)) !== M1_SERVE_SHA256) fail('RELEASE_HEADER_SOURCE_CHANGED');
  if (JSON.stringify(SECURITY_HEADERS) !== JSON.stringify(ORIGINAL_HEADERS)) fail('RELEASE_SECURITY_HEADERS_CHANGED');
  return source;
}

const canonical = file => `${RELEASE_ORIGIN}/${file}`;
const alternates = Object.freeze({ 'zh-Hant': canonical('index.html'), en: canonical('en/index.html'), 'x-default': canonical('index.html') });

function releaseHtml(source, file) {
  const html = source.toString('utf8');
  const robots = '<meta name="robots" content="noindex,nofollow">';
  if (html.split(robots).length !== 2 || html.split('</head>').length !== 2) fail('RELEASE_HEAD_SOURCE');
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const seo = [`  <link rel="canonical" href="${canonical(file)}">`, ...Object.entries(alternates).map(([language, url]) => `  <link rel="alternate" hreflang="${language}" href="${url}">`)];
  const marker = file === 'index.html' ? '<span>Gloss Tools by GlossQuote · 預覽候選</span>' : '<span>Gloss Tools by GlossQuote · Preview candidate</span>';
  const footer = '<span>Gloss Tools by GlossQuote</span>';
  if (html.split(marker).length !== 2 || !html.slice(html.indexOf('</head>')).includes(marker)) fail('RELEASE_BANNER_SOURCE');
  const output = html.replace(robots, '<meta name="robots" content="index,follow">').replace('</head>', `${seo.join(eol)}${eol}</head>`).replace(marker, footer);
  // M2A authorizes only this exact footer marker removal in the body.
  if (output.slice(output.indexOf('</head>')) !== html.slice(html.indexOf('</head>')).replace(marker, footer)) fail('RELEASE_BODY_CHANGED');
  return Buffer.from(output, 'utf8');
}

export function inspectReleaseSeo(bytes, file) {
  const tags = tokenizeHtml(bytes.toString('utf8'));
  const robots = tags.filter(tag => tag.tag === 'meta' && tag.attrs.name === 'robots');
  if (robots.length !== 1 || robots[0].attrs.content !== 'index,follow') fail('RELEASE_ROBOTS_META');
  const canonicalTags = tags.filter(tag => tag.tag === 'link' && tag.attrs.rel === 'canonical');
  if (canonicalTags.length !== 1 || canonicalTags[0].attrs.href !== canonical(file)) fail('RELEASE_CANONICAL');
  const alternateTags = tags.filter(tag => tag.tag === 'link' && tag.attrs.rel === 'alternate');
  if (alternateTags.length !== 3) fail('RELEASE_ALTERNATES');
  for (const [language, url] of Object.entries(alternates)) {
    const found = alternateTags.filter(tag => tag.attrs.hreflang === language && tag.attrs.href === url);
    if (found.length !== 1) fail('RELEASE_HREFLANG');
  }
  const html = tags.filter(tag => tag.tag === 'html');
  if (html.length !== 1 || html[0].attrs.lang !== (file === 'index.html' ? 'zh-Hant' : 'en')) fail('RELEASE_LANG');
  const headStart = bytes.indexOf(Buffer.from('<head>'));
  const headEnd = bytes.indexOf(Buffer.from('</head>'));
  if (headStart < 0 || headEnd < headStart) fail('RELEASE_HEAD');
  const headTags = tokenizeHtml(bytes.subarray(headStart, headEnd + 7).toString('utf8'));
  if (headTags.filter(tag => tag.tag === 'link' && ['canonical', 'alternate'].includes(tag.attrs.rel)).length !== 4) fail('RELEASE_SEO_OUTSIDE_HEAD');
}

async function expectedRelease(root) {
  const source = await sourceContents(root);
  const site = new Map();
  for (const [file, bytes] of source) site.set(file, file.endsWith('.html') ? releaseHtml(bytes, file) : bytes);
  const headers = { ...SECURITY_HEADERS, 'X-Robots-Tag': 'index, follow' };
  site.set('_headers', Buffer.from(`/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`, 'utf8'));
  site.set('_redirects', Buffer.from(RELEASE_REDIRECTS, 'utf8'));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${RELEASE_ORIGIN}/sitemap.xml\n`, 'utf8'));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${canonical('index.html')}</loc></url>\n  <url><loc>${canonical('en/index.html')}</loc></url>\n</urlset>\n`, 'utf8'));
  for (const file of ['index.html', 'en/index.html']) inspectReleaseSeo(site.get(file), file);
  const manifest = {
    schemaVersion: 1, mode: 'release-candidate', origin: RELEASE_ORIGIN, toolSlug: TOOL_SLUG,
    files: RELEASE_FILES.map(file => record(file, site.get(file))),
    sourceFiles: [...source].map(([file, bytes]) => record(file, bytes))
  };
  return { site, manifest, manifestBytes: serialize(manifest) };
}

async function outputTree(root, allowMissing = false) {
  const target = join(root, 'release-artifacts');
  try { await lstat(target); } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return false;
    if (error.code === 'ENOENT') fail('RELEASE_NOT_BUILT');
    throw error;
  }
  await safeDirectory(target);
  const wantedFiles = new Set(['manifest.json', ...RELEASE_FILES.map(file => `site/${file}`)]);
  const wantedDirectories = new Set(directories);
  const actualFiles = [], actualDirectories = [];
  const visit = async prefix => {
    for (const entry of await readdir(join(target, prefix), { withFileTypes: true })) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!validRelativePath(path)) fail('RELEASE_UNSAFE_OUTPUT_PATH');
      const info = await lstat(join(target, path));
      if (info.isSymbolicLink()) fail('RELEASE_OUTPUT_LINK');
      if (info.isDirectory()) {
        if (!wantedDirectories.has(path)) fail('RELEASE_UNKNOWN_OUTPUT_DIRECTORY');
        actualDirectories.push(path);
        await visit(path);
      } else if (info.isFile()) {
        if (!wantedFiles.has(path)) fail('RELEASE_UNKNOWN_OUTPUT_FILE');
        if (info.size > 262144) fail('RELEASE_OUTPUT_SIZE');
        actualFiles.push(path);
      } else fail('RELEASE_OUTPUT_SPECIAL_FILE');
    }
  };
  await visit('');
  if (actualFiles.sort().join('|') !== [...wantedFiles].sort().join('|') || actualDirectories.sort().join('|') !== [...wantedDirectories].sort().join('|')) fail('RELEASE_MISSING_OUTPUT');
  return true;
}

async function verifyOutput(root, expected) {
  await outputTree(root);
  const target = join(root, 'release-artifacts');
  const actualManifest = await readFile(join(target, 'manifest.json'));
  if (!actualManifest.equals(expected.manifestBytes)) fail('RELEASE_MANIFEST_CHANGED');
  // Recompute expected bytes from pinned source; a manifest edited together with
  // a compromised asset cannot authorize that asset.
  for (const file of RELEASE_FILES) {
    const bytes = await readFile(join(target, 'site', file));
    if (!bytes.equals(expected.site.get(file))) fail('RELEASE_ASSET_CHANGED');
    const entry = expected.manifest.files.find(item => item.path === file);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) fail('RELEASE_ASSET_HASH');
    if (file.endsWith('.html')) inspectReleaseSeo(bytes, file);
  }
  return expected.manifest;
}

export async function checkRelease(options = { root: PROJECT_ROOT }) {
  const root = projectRoot(options);
  const expected = await expectedRelease(root);
  return verifyOutput(root, expected);
}

export async function buildRelease(options = { root: PROJECT_ROOT }) {
  const root = projectRoot(options);
  const expected = await expectedRelease(root); // Validate all inputs before any output write.
  if (await outputTree(root, true)) return verifyOutput(root, expected); // Read only when managed output already exists.
  const target = join(root, 'release-artifacts');
  await mkdir(target);
  for (const directory of directories) await mkdir(join(target, directory));
  for (const file of RELEASE_FILES) await writeFile(join(target, 'site', file), expected.site.get(file), { flag: 'wx' });
  await writeFile(join(target, 'manifest.json'), expected.manifestBytes, { flag: 'wx' });
  return checkRelease({ root });
}

export function parseReleaseArgs(args) {
  if (!Array.isArray(args) || args.length !== 1 || !['build', 'check'].includes(args[0])) fail('RELEASE_USAGE: expected exactly build or check; no deployment');
  return args[0];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split('.')[0]) < 24) fail('NODE_24_REQUIRED');
    const mode = parseReleaseArgs(process.argv.slice(2));
    const result = mode === 'build' ? await buildRelease() : await checkRelease();
    process.stdout.write(`PASS: ${mode} assets-only release preparation; ${result.files.length} site files; fixed ${RELEASE_ORIGIN}; not pushed or deployed.\n`);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
