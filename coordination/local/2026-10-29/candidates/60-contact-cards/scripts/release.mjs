import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ORIGIN = 'https://contacts.glossquote.com';
export const TOOL_SLUG = 'contact-cards';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const REDIRECTS_TEXT = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
export const WRANGLER_CONFIG_TEXT = JSON.stringify({
  name: 'glossquote-contact-cards', compatibility_date: '2026-10-24',
  workers_dev: false, preview_urls: false, send_metrics: false,
  build: { command: 'node scripts/release.mjs build' },
  routes: [{ pattern: 'contacts.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }
}, null, 2) + '\n';
// Reviewed M1 public bytes, pinned here instead of trusting a mutable output manifest.
const SOURCE_LOCK = Object.freeze([
  ['_headers', 364, '680f31b8870497c399a23d45243c1085e51776606df0c7562835cc0b42f12c7f'],
  ['en/index.html', 8058, '538f5b6c10cb508b4d5624793a9d3ac09d382745ec7705065ab3bef4711dcbe3'],
  ['index.html', 7665, 'e3066f6ac6d88f23f8dca221f453c8d19b958ce7641e713ab27d67c0c686f162'],
  ['js/app.js', 19935, '749a31b7fb4ca69e7524103e62ec77ca7a44cc51575648dda15343e423f72bbb'],
  ['js/core/csv.mjs', 3195, '1262b6c2afd7826648a289f84e9f6c283787fc26adbbba3c829e8003a843f450'],
  ['js/core/map-contacts.mjs', 4603, '8712b516ba966f8108c23cabd2cda57856166d8ac9d1952c6ba50388c797b039'],
  ['js/core/vcard.mjs', 3368, '7f75dbe9cb58e3c8599a3921d761c2016914a6ba1ef3d5daae35813edec987f5'],
  ['robots.txt', 26, '331ea9090db0c9f6f597bd9840fd5b171830f6e0b3ba1cb24dfa91f0c95aedc1'],
  ['styles/app.css', 8908, 'bc7e6ca2645f375cc8f860e91303d6fa42362cfd576cb3e91b8caacfe2cec751']
].map(([path, bytes, sha256]) => Object.freeze({ path, bytes, sha256 })));
export const SOURCE_PATHS = Object.freeze(SOURCE_LOCK.map((file) => file.path));
export const SITE_PATHS = Object.freeze([...new Set([...SOURCE_PATHS, 'sitemap.xml', '_redirects'])].sort());

export class ReleaseError extends Error {
  constructor(code) { super(code); this.name = 'ReleaseError'; this.code = code; }
}
const fail = (code) => { throw new ReleaseError(code); };
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function maybeStat(path) {
  try { return await lstat(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function safeRoot(root) {
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('UNSAFE_ROOT');
}
async function closedTree(root, names) {
  const stat = await maybeStat(root);
  if (!stat) fail('MISSING_TREE');
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('UNSAFE_TREE');
  const allowed = new Set(names), allowedDirectories = new Set();
  for (const name of names) {
    let parent = posix.dirname(name);
    while (parent !== '.') { allowedDirectories.add(parent); parent = posix.dirname(parent); }
  }
  const files = new Map();
  async function walk(relative = '') {
    for (const entry of await readdir(join(root, relative))) {
      const path = relative ? `${relative}/${entry}` : entry;
      const item = await lstat(join(root, path));
      if (item.isSymbolicLink()) fail('LINK_REJECTED');
      if (item.isDirectory()) {
        if (!allowedDirectories.has(path)) fail('EXTRA_DIRECTORY');
        await walk(path);
      } else if (item.isFile()) {
        if (!allowed.has(path)) fail('EXTRA_FILE');
        if (item.nlink !== 1) fail('HARDLINK_REJECTED');
        files.set(path, await readFile(join(root, path)));
      } else fail('UNSAFE_FILE');
    }
  }
  await walk();
  if (files.size !== allowed.size || names.some((name) => !files.has(name))) fail('MISSING_FILE');
  return new Map([...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}
function descriptor(path, bytes) { return { path, bytes: bytes.length, sha256: sha(bytes) }; }
export async function validateReleaseConfig(root = ROOT) {
  const path = join(root, 'wrangler.jsonc'), stat = await maybeStat(path);
  if (!stat) fail('CONFIG_MISSING');
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) fail('CONFIG_UNSAFE');
  const bytes = await readFile(path);
  try { JSON.parse(bytes.toString('utf8')); } catch { fail('CONFIG_JSON'); }
  if (!bytes.equals(Buffer.from(WRANGLER_CONFIG_TEXT))) fail('CONFIG_MISMATCH');
  return descriptor('wrangler.jsonc', bytes);
}
function releaseHtml(source, canonicalPath) {
  const html = new TextDecoder('utf-8', { fatal: true }).decode(source);
  const start = html.indexOf('<head>') + 6, end = html.indexOf('</head>');
  if (start < 6 || end <= start || html.indexOf('<head>', start) !== -1 || html.indexOf('</head>', end + 7) !== -1) fail('SOURCE_HEAD');
  const head = html.slice(start, end);
  const robots = '<meta name="robots" content="noindex,nofollow">';
  if (head.split(robots).length !== 2 || /rel=["'](?:canonical|alternate)["']/i.test(head)) fail('SOURCE_SEO');
  const links = [
    `  <link rel="canonical" href="${ORIGIN}${canonicalPath}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`
  ].join('\n') + '\n';
  const seo = html.slice(0, start) + head.replace(robots, '<meta name="robots" content="index,follow">') + links + html.slice(end);
  const prefix = canonicalPath === '/index.html' ? '<p class="preview-label">本地候選版本 · ' : '<p class="preview-label">Local candidate · ';
  return Buffer.from(seo.replace(prefix, '<p class="preview-label">'));
}
async function expectedRelease(root) {
  await safeRoot(root);
  const configFile = await validateReleaseConfig(root);
  const sources = await closedTree(join(root, 'public'), SOURCE_PATHS);
  for (const locked of SOURCE_LOCK) {
    const bytes = sources.get(locked.path);
    if (bytes.length !== locked.bytes || sha(bytes) !== locked.sha256) fail('SOURCE_CHANGED');
  }
  const files = new Map(sources);
  files.set('index.html', releaseHtml(sources.get('index.html'), '/index.html'));
  files.set('en/index.html', releaseHtml(sources.get('en/index.html'), '/en/index.html'));
  const headers = sources.get('_headers').toString('utf8');
  const oldRobots = '  X-Robots-Tag: noindex, nofollow';
  if (headers.split(oldRobots).length !== 2) fail('SOURCE_HEADERS');
  files.set('_headers', Buffer.from(headers.replace(oldRobots, '  X-Robots-Tag: index, follow')));
  files.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  files.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  files.set('_redirects', Buffer.from(REDIRECTS_TEXT));
  const sorted = new Map(SITE_PATHS.map((path) => [path, files.get(path)]));
  const manifest = {
    schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG,
    files: [...sorted].map(([path, bytes]) => descriptor(path, bytes)),
    sourceFiles: [...sources].map(([path, bytes]) => descriptor(path, bytes)),
    configFiles: [configFile]
  };
  return { files: sorted, manifest, manifestBytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') };
}
async function verifyExisting(root, expected) {
  const tree = await closedTree(join(root, 'release-artifacts'), ['manifest.json', ...SITE_PATHS.map((path) => `site/${path}`)]);
  // Recreate expected bytes from the pinned source. Output hashes are evidence, not authority.
  if (!tree.get('manifest.json').equals(expected.manifestBytes)) fail('MANIFEST_MISMATCH');
  for (const [path, bytes] of expected.files) if (!tree.get(`site/${path}`).equals(bytes)) fail('ARTIFACT_MISMATCH');
  return { files: expected.files.size, sourceFiles: expected.manifest.sourceFiles.length, manifestSha256: sha(expected.manifestBytes), origin: ORIGIN, mode: 'release-candidate' };
}

export async function checkRelease(root = ROOT) {
  const expected = await expectedRelease(root);
  return verifyExisting(root, expected);
}
export async function buildRelease(root = ROOT) {
  const expected = await expectedRelease(root);
  const output = join(root, 'release-artifacts');
  if (await maybeStat(output)) return { ...await verifyExisting(root, expected), unchanged: true };
  // All inputs and existing output were checked before the first mutation.
  // Exclusive creation refuses a path that appears after preflight; no output is ever deleted.
  await mkdir(output);
  await mkdir(join(output, 'site'));
  const directories = new Set();
  for (const [path, bytes] of expected.files) {
    const parent = posix.dirname(path);
    if (parent !== '.' && !directories.has(parent)) {
      const segments = parent.split('/');
      for (let i = 1; i <= segments.length; i++) {
        const directory = segments.slice(0, i).join('/');
        if (!directories.has(directory)) { await mkdir(join(output, 'site', directory)); directories.add(directory); }
      }
    }
    await writeFile(join(output, 'site', path), bytes, { flag: 'wx' });
  }
  await writeFile(join(output, 'manifest.json'), expected.manifestBytes, { flag: 'wx' });
  return { ...await verifyExisting(root, expected), unchanged: false };
}
export async function runReleaseCli(args) {
  if (args.length !== 1 || !['build', 'check'].includes(args[0])) fail('USAGE_BUILD_OR_CHECK_ONLY');
  return args[0] === 'build' ? buildRelease() : checkRelease();
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runReleaseCli(process.argv.slice(2));
    process.stdout.write(`release ${process.argv[2]} PASS ${JSON.stringify(result)}; offline candidate, not deployed\n`);
  } catch (error) {
    process.stderr.write(`release rejected: ${error instanceof ReleaseError ? error.code : 'FILESYSTEM_ERROR'}\n`);
    process.exitCode = 1;
  }
}
