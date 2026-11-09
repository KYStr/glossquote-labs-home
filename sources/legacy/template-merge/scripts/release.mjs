import { lstat, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, requireNode24 } from './assets.mjs';

export const ORIGIN = 'https://templates.glossquote.com';
export const TOOL_SLUG = 'template-merge';
export const RELEASE_REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
// The reviewed assets-only deployment contract, including every permitted key.
const DEPLOYMENT_CONFIG = {
  name: 'glossquote-template-merge', compatibility_date: '2026-10-24',
  workers_dev: false, preview_urls: false, send_metrics: false,
  routes: [{ pattern: 'templates.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
  build: { command: 'node scripts/release.mjs build' },
};
// Frozen M1/R01 public input; changes require a separately reviewed product task.
export const SOURCE_BASELINE_SHA256 = 'faa77fd2ec6893118a60b4ea23ae0ed34e0971776081b94c72f56aafdede74ee';
const OUTPUT = path.join(ROOT, 'release-artifacts');
const SOURCE_PATHS = Object.freeze([...PUBLIC_FILES].sort());
const SITE_PATHS = Object.freeze([...new Set([...SOURCE_PATHS, 'robots.txt', '_headers', '_redirects', 'sitemap.xml'])].sort());
const OUTPUT_PATHS = Object.freeze(['manifest.json', ...SITE_PATHS.map(file => `site/${file}`)].sort());
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const treeHash = files => sha256(files.map(file => `${file.path}\0${file.bytes}\0${file.sha256}\n`).join(''));
const fail = code => { throw new Error(code); };

function exactConfig(actual, expected) {
  if (expected === null || typeof expected !== 'object') return actual === expected;
  if (Array.isArray(expected)) return Array.isArray(actual) && actual.length === expected.length && expected.every((value, i) => exactConfig(actual[i], value));
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
  return Object.keys(actual).sort().join('\0') === Object.keys(expected).sort().join('\0') &&
    Object.keys(expected).every(key => exactConfig(actual[key], expected[key]));
}
async function checkDeploymentConfig() {
  const file = path.join(ROOT, 'wrangler.jsonc');
  const info = await lstat(file);
  if (info.isSymbolicLink() || !info.isFile() || info.size > 8192) fail('RELEASE_CONFIG_UNSAFE');
  const bytes = await readFile(file);
  let config;
  try { config = JSON.parse(bytes.toString('utf8')); } catch { fail('RELEASE_CONFIG_INVALID'); }
  if (!exactConfig(config, DEPLOYMENT_CONFIG)) fail('RELEASE_CONFIG_CHANGED');
  // JSONC filename for Wrangler; this contract deliberately uses strict JSON.
  // Reject duplicate keys and ambiguous serialization as well as unknown keys.
  if (bytes.toString('utf8') !== `${JSON.stringify(config, null, 2)}\n`) fail('RELEASE_CONFIG_SERIALIZATION');
  return sha256(bytes);
}

function assertPaths(files) {
  if (new Set(files).size !== files.length) fail('RELEASE_DUPLICATE_PATH');
  for (const file of files) {
    if (!file || /[\\:\0]/.test(file) || file.startsWith('/') || path.posix.normalize(file) !== file ||
        file.split('/').some(part => !part || part === '.' || part === '..')) fail('RELEASE_UNSAFE_PATH');
  }
}
function directoryPaths(files) {
  const dirs = new Set();
  for (const file of files) {
    const parts = file.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  return [...dirs].sort((a, b) => a.split('/').length - b.split('/').length || (a < b ? -1 : a > b ? 1 : 0));
}

/** No linked entry, unknown file or unknown (even empty) directory is accepted. */
async function scanTree(root, allowedFiles, { absent = false, complete = true } = {}) {
  assertPaths(allowedFiles);
  let info;
  try { info = await lstat(root); }
  catch (error) { if (error.code === 'ENOENT' && absent) return null; throw error; }
  if (info.isSymbolicLink() || !info.isDirectory()) fail('RELEASE_UNSAFE_ROOT');
  const allowedDirs = new Set(directoryPaths(allowedFiles));
  const files = [];
  async function visit(relative = '') {
    for (const entry of await readdir(path.join(root, relative))) {
      const name = relative ? `${relative}/${entry}` : entry;
      const stat = await lstat(path.join(root, name));
      if (stat.isSymbolicLink()) fail('RELEASE_LINK_REJECTED');
      if (stat.isDirectory()) {
        if (!allowedDirs.has(name)) fail('RELEASE_UNKNOWN_DIRECTORY');
        await visit(name);
      } else if (stat.isFile()) {
        if (!allowedFiles.includes(name)) fail('RELEASE_UNKNOWN_FILE');
        files.push(name);
      } else fail('RELEASE_UNSAFE_ENTRY');
    }
  }
  await visit();
  files.sort();
  if (complete && files.join('\n') !== [...allowedFiles].sort().join('\n')) fail('RELEASE_MISSING_FILE');
  return files;
}

function releaseHtml(bytes, file) {
  const source = bytes.toString('utf8');
  const open = source.indexOf('<head>');
  const close = source.indexOf('</head>', open + 6);
  if (open < 0 || close < 0 || source.indexOf('<head>', open + 6) !== -1 || source.indexOf('</head>', close + 7) !== -1) fail('RELEASE_HTML_HEAD');
  const start = open + 6;
  const head = source.slice(start, close);
  const oldRobots = '<meta name="robots" content="noindex,nofollow">';
  if (head.split(oldRobots).length !== 2 || /rel="canonical"|hreflang=/.test(head)) fail('RELEASE_PREVIEW_SEO');
  const chinese = `${ORIGIN}/index.html`;
  const english = `${ORIGIN}/en/index.html`;
  const links = `  <link rel="canonical" href="${file === 'en/index.html' ? english : chinese}">\n` +
    `  <link rel="alternate" hreflang="zh-Hant" href="${chinese}">\n` +
    `  <link rel="alternate" hreflang="en" href="${english}">\n` +
    `  <link rel="alternate" hreflang="x-default" href="${chinese}">\n`;
  const candidate = file === 'en/index.html' ? 'Local preview candidate' : '本地預覽候選';
  const oldFooter = `<span>Gloss Tools by GlossQuote · ${candidate}</span>`;
  if (source.split(oldFooter).length !== 2) fail('RELEASE_PREVIEW_FOOTER');
  // Only formal SEO and the static candidate footer change; preview/runtime stay frozen.
  return Buffer.from((source.slice(0, start) + head.replace(oldRobots, '<meta name="robots" content="index,follow">') + links + source.slice(close))
    .replace(oldFooter, '<span>Gloss Tools by GlossQuote</span>'));
}

async function expectedRelease() {
  requireNode24();
  const origin = new URL(ORIGIN);
  if (origin.origin !== ORIGIN || origin.protocol !== 'https:' || origin.port || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') fail('RELEASE_ORIGIN_INVALID');
  const rootInfo = await lstat(ROOT);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) fail('RELEASE_UNSAFE_PROJECT_ROOT');
  const configurationSha256 = await checkDeploymentConfig();
  await scanTree(path.join(ROOT, 'public'), SOURCE_PATHS);
  const sources = new Map();
  const sourceFiles = [];
  for (const file of SOURCE_PATHS) {
    const bytes = await readFile(path.join(ROOT, 'public', file));
    sources.set(file, bytes);
    sourceFiles.push({ path: file, bytes: bytes.length, sha256: sha256(bytes) });
  }
  if (treeHash(sourceFiles) !== SOURCE_BASELINE_SHA256) fail('RELEASE_SOURCE_CHANGED');
  const site = new Map(sources);
  site.set('_redirects', Buffer.from(RELEASE_REDIRECTS));
  for (const file of ['index.html', 'en/index.html']) site.set(file, releaseHtml(sources.get(file), file));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `  <url><loc>${ORIGIN}/index.html</loc></url>\n` +
    `  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  const headers = sources.get('_headers').toString('utf8');
  const robotsHeader = /^([ \t]*X-Robots-Tag:[ \t]*)noindex, nofollow(?=\r?$)/gm;
  if ([...headers.matchAll(robotsHeader)].length !== 1) fail('RELEASE_PREVIEW_HEADERS');
  site.set('_headers', Buffer.from(headers.replace(robotsHeader, '$1index, follow')));
  const files = SITE_PATHS.map(file => ({ path: file, bytes: site.get(file).length, sha256: sha256(site.get(file)) }));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files, sourceFiles };
  return { site, manifest, manifestBytes: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`), configurationSha256 };
}

async function verifyOutput(expected) {
  await scanTree(OUTPUT, OUTPUT_PATHS);
  const manifestBytes = await readFile(path.join(OUTPUT, 'manifest.json'));
  // Compare with independently rebuilt expected bytes, never a manifest-owned digest alone.
  if (!manifestBytes.equals(expected.manifestBytes)) fail('RELEASE_MANIFEST_CHANGED');
  for (const [file, bytes] of expected.site) {
    if (!(await readFile(path.join(OUTPUT, 'site', file))).equals(bytes)) fail('RELEASE_ASSET_CHANGED');
  }
  return {
    mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, site: 'release-artifacts/site',
    files: SITE_PATHS.length, sourceFiles: SOURCE_PATHS.length,
    sourceTreeSha256: treeHash(expected.manifest.sourceFiles), artifactTreeSha256: treeHash(expected.manifest.files),
    manifestSha256: sha256(manifestBytes), configurationSha256: expected.configurationSha256,
    notice: 'Offline release candidate; hosting has not been verified.',
  };
}

export async function checkRelease() {
  const expected = await expectedRelease();
  return verifyOutput(expected);
}

export async function buildRelease() {
  // All inputs and all existing outputs are inspected before the first mutation.
  const expected = await expectedRelease();
  if (await scanTree(OUTPUT, OUTPUT_PATHS, { absent: true })) {
    // A valid rebuild is a read-only no-op. Unmanaged/partial/changed output is refused.
    return { ...await verifyOutput(expected), reused: true };
  }
  await mkdir(OUTPUT); // Exclusive directory creation: never adopt a racing existing root.
  for (const directory of directoryPaths(OUTPUT_PATHS)) {
    await scanTree(OUTPUT, OUTPUT_PATHS, { complete: false });
    await mkdir(path.join(OUTPUT, directory));
  }
  for (const [file, bytes] of expected.site) {
    await scanTree(OUTPUT, OUTPUT_PATHS, { complete: false });
    await writeFile(path.join(OUTPUT, 'site', file), bytes, { flag: 'wx' });
  }
  const fresh = await expectedRelease();
  if (!fresh.manifestBytes.equals(expected.manifestBytes) || fresh.configurationSha256 !== expected.configurationSha256) fail('RELEASE_SOURCE_CHANGED_DURING_BUILD');
  await scanTree(OUTPUT, OUTPUT_PATHS, { complete: false });
  await writeFile(path.join(OUTPUT, 'manifest.json'), expected.manifestBytes, { flag: 'wx' });
  return { ...await verifyOutput(expected), reused: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length !== 3 || !['build', 'check'].includes(process.argv[2])) fail('USAGE: node scripts/release.mjs build|check');
    const result = process.argv[2] === 'build' ? await buildRelease() : await checkRelease();
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`${error.code ?? error.message}\n`);
    process.exitCode = 1;
  }
}
