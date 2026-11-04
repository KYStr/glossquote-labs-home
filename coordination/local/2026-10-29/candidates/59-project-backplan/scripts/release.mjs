import { lstat, realpath, readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, inspectTree } from './files.mjs';
import { SECURITY_HEADERS } from './serve.mjs'; // importing constants does not execute its main/listen block

export const ORIGIN = 'https://backplan.glossquote.com';
export const TOOL_SLUG = 'project-backplan';
export const REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
export const CONFIG_TEXT = JSON.stringify({
  name: 'glossquote-project-backplan', compatibility_date: '2026-10-24',
  workers_dev: false, preview_urls: false, send_metrics: false,
  build: { command: 'node scripts/release.mjs build' },
  routes: [{ pattern: 'backplan.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' }
}, null, 2) + '\n';
export const PINNED_SOURCES = Object.freeze([
  { path: 'en/index.html', bytes: 7178, sha256: '02d96f16e04408b76edb330a56185958de5013f5131b1466c82286df7af37aa5' },
  { path: 'index.html', bytes: 6897, sha256: '989cb7604bf5253ee5a6f8bf70287eb6856598f9dd796239a6cb7e2247e11f0d' },
  { path: 'js/app.js', bytes: 26481, sha256: '89cf2ef0fb5d39a4ad9fe02b68d979f2098c1cfd89327a2ebf235d8a789ccda3' },
  { path: 'js/core/backplan.mjs', bytes: 4429, sha256: '2c8b9beda971d4c9dd78131259c0d1fbeb17cef58fe4911c684dca77c8588e1f' },
  { path: 'js/core/calendar.mjs', bytes: 4096, sha256: '9ae663722cad9e12ce8f24df6d796ed84f5a20405307a1c7dbeeea5abc415e7f' },
  { path: 'js/core/graph.mjs', bytes: 3558, sha256: '56bcb9fe2168615c0b493bee792c2ada4f06a36691f416f9391434894b14f5d5' },
  { path: 'js/core/output.mjs', bytes: 3541, sha256: 'beb34624d06fc3da75867b180e43e7c8a19e47fcbb193a68636793c89d6975f4' },
  { path: 'js/core/validate.mjs', bytes: 4593, sha256: 'e1346479ad96812b86fbefd01904277e7980b42a2f8c30491b3feac08340b845' },
  { path: 'js/planner-worker.js', bytes: 1364, sha256: '2d9ea027d2cf2842347d854850d4bec7ae3678d17be2bd2039c4e487f35d0eaf' },
  { path: 'styles/app.css', bytes: 8487, sha256: '58f6f4f557d9ad5ce5c09e621fc2b37171247bb6a6200ee8a5850d0bc0cffc13' }
].map(file => Object.freeze(file)));
const PINNED_SERVE = Object.freeze({ bytes: 2903, sha256: 'b5c5e7b1e85b77fe2943b28863234afe68da3260edcaf73cfa91371d2316b49a' });
export const SITE_FILES = Object.freeze([...PINNED_SOURCES.map(file => file.path), 'robots.txt', '_headers', '_redirects', 'sitemap.xml'].sort());
const CANONICALS = Object.freeze({ 'zh-Hant': `${ORIGIN}/index.html`, en: `${ORIGIN}/en/index.html` });
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export class ReleaseError extends Error {
  constructor(code) { super(code); this.code = code; }
}
const reject = code => { throw new ReleaseError(code); };

async function existing(path) {
  try { return await lstat(path); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function safeDirectory(path) {
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(path) !== resolve(path)) reject('RELEASE_UNSAFE_DIRECTORY');
}

async function exactFile(path, expected, code) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink() || await realpath(path) !== resolve(path)) reject('RELEASE_UNSAFE_FILE');
  if (stat.size !== expected.bytes) reject(code);
  const bytes = await readFile(path);
  if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) reject(code);
  return bytes;
}

export async function verifyDeploymentConfig(root = ROOT) {
  const expected = Buffer.from(CONFIG_TEXT);
  await exactFile(join(resolve(root), 'wrangler.jsonc'), { bytes: expected.length, sha256: sha256(expected) }, 'RELEASE_CONFIG_MISMATCH');
  return { path: 'wrangler.jsonc', bytes: expected.length, sha256: sha256(expected) };
}

// Constrained head tokenizer, used for semantic checks separately from byte reconstruction.
function headTags(html) {
  if ((html.match(/<head>/g) ?? []).length !== 1 || (html.match(/<\/head>/g) ?? []).length !== 1) reject('RELEASE_HTML_HEAD');
  const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
  const tags = [];
  for (const tag of head.matchAll(/<(meta|link)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi)) {
    const attributes = new Map();
    const attributeText = tag[2];
    let consumed = '';
    let cursor = 0;
    for (const attr of attributeText.matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      consumed += attributeText.slice(cursor, attr.index);
      cursor = attr.index + attr[0].length;
      const name = attr[1].toLowerCase();
      if (attributes.has(name)) reject('RELEASE_HTML_DUPLICATE_ATTRIBUTE');
      attributes.set(name, attr[2] ?? attr[3]);
    }
    consumed += attributeText.slice(cursor);
    if (consumed.replace(/\s|\//g, '') !== '') reject('RELEASE_HTML_ATTRIBUTE');
    tags.push({ name: tag[1].toLowerCase(), attributes });
  }
  return tags;
}

export function verifyReleaseSeo(html, file) {
  const language = file === 'index.html' ? 'zh-Hant' : file === 'en/index.html' ? 'en' : null;
  if (!language) reject('RELEASE_HTML_PATH');
  const tags = headTags(html);
  const robots = tags.filter(t => t.name === 'meta' && t.attributes.get('name')?.toLowerCase() === 'robots');
  if (robots.length !== 1 || robots[0].attributes.get('content') !== 'index,follow') reject('RELEASE_ROBOTS_META');
  const links = tags.filter(t => t.name === 'link');
  const rel = (tag, value) => (tag.attributes.get('rel') ?? '').toLowerCase().split(/\s+/).includes(value);
  const canonical = links.filter(t => rel(t, 'canonical'));
  if (canonical.length !== 1 || canonical[0].attributes.get('href') !== CANONICALS[language]) reject('RELEASE_CANONICAL');
  const alternates = links.filter(t => rel(t, 'alternate'));
  const expected = { ...CANONICALS, 'x-default': CANONICALS['zh-Hant'] };
  if (alternates.length !== 3) reject('RELEASE_ALTERNATES');
  const seen = new Set();
  for (const link of alternates) {
    const lang = link.attributes.get('hreflang');
    if (!Object.hasOwn(expected, lang) || seen.has(lang) || link.attributes.get('href') !== expected[lang]) reject('RELEASE_ALTERNATES');
    seen.add(lang);
  }
}

function releaseHtml(source, file) {
  const html = new TextDecoder('utf-8', { fatal: true }).decode(source);
  const marker = '<meta name="robots" content="noindex,nofollow">';
  const start = html.indexOf('<head>');
  const end = html.indexOf('</head>');
  const head = html.slice(start + 6, end);
  if (start < 0 || end < start || head.split(marker).length !== 2 || /canonical|hreflang/i.test(head)) reject('RELEASE_SOURCE_HEAD');
  const language = file === 'index.html' ? 'zh-Hant' : 'en';
  const seo = [
    `  <link rel="canonical" href="${CANONICALS[language]}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${CANONICALS['zh-Hant']}">`,
    `  <link rel="alternate" hreflang="en" href="${CANONICALS.en}">`,
    `  <link rel="alternate" hreflang="x-default" href="${CANONICALS['zh-Hant']}">`
  ].join('\n') + '\n';
  const candidateFooter = `<span>Gloss Tools by GlossQuote · ${language === 'zh-Hant' ? '本地預覽候選' : 'Local preview candidate'}</span>`;
  if (html.split(candidateFooter).length !== 2) reject('RELEASE_CANDIDATE_MARKER');
  const transformed = (html.slice(0, start + 6) + head.replace(marker, '<meta name="robots" content="index,follow">') + seo + html.slice(end))
    .replace(candidateFooter, '<span>Gloss Tools by GlossQuote</span>');
  verifyReleaseSeo(transformed, file);
  return Buffer.from(transformed, 'utf8');
}

function releaseHeaders() {
  if (SECURITY_HEADERS['X-Robots-Tag'] !== 'noindex, nofollow' || SECURITY_HEADERS['Content-Security-Policy'] !== "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'") reject('RELEASE_SECURITY_HEADERS');
  return Buffer.from('/*\n' + Object.entries(SECURITY_HEADERS).map(([name, value]) => `  ${name}: ${name === 'X-Robots-Tag' ? 'index, follow' : value}\n`).join(''));
}

function describe(files) {
  return [...files.keys()].sort().map(path => ({ path, bytes: files.get(path).length, sha256: sha256(files.get(path)) }));
}

export async function prepareRelease(root = ROOT) {
  root = resolve(root);
  await safeDirectory(root);
  const configFile = await verifyDeploymentConfig(root);
  if (ORIGIN !== 'https://backplan.glossquote.com' || TOOL_SLUG !== 'project-backplan' ||
      [...PUBLIC_FILES].sort().join('\0') !== PINNED_SOURCES.map(file => file.path).join('\0')) reject('RELEASE_POLICY');
  await safeDirectory(join(root, 'scripts'));
  await exactFile(join(root, 'scripts', 'serve.mjs'), PINNED_SERVE, 'RELEASE_HEADER_SOURCE_CHANGED');
  try { await inspectTree(join(root, 'public')); }
  catch { reject('RELEASE_SOURCE_TREE'); }
  const source = new Map();
  for (const file of PINNED_SOURCES) source.set(file.path, await exactFile(join(root, 'public', file.path), file, 'RELEASE_SOURCE_CHANGED'));
  const site = new Map(source);
  for (const file of ['index.html', 'en/index.html']) site.set(file, releaseHtml(source.get(file), file));
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  site.set('_headers', releaseHeaders());
  site.set('_redirects', Buffer.from(REDIRECTS));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${CANONICALS['zh-Hant']}</loc></url>\n  <url><loc>${CANONICALS.en}</loc></url>\n</urlset>\n`));
  const manifest = { schemaVersion: 1, mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files: describe(site), sourceFiles: describe(source), configFiles: [configFile] };
  return { source, site, manifest, manifestBytes: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') };
}

async function inspectSite(directory) {
  await safeDirectory(directory);
  const allowed = new Set(SITE_FILES);
  const directories = new Set(SITE_FILES.flatMap(file => {
    const parts = file.split('/');
    return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
  }));
  const files = [];
  async function walk(relative) {
    for (const entry of await readdir(join(directory, relative), { withFileTypes: true })) {
      const file = relative ? `${relative}/${entry.name}` : entry.name;
      const path = resolve(directory, file);
      if (!path.startsWith(resolve(directory) + sep) || entry.isSymbolicLink()) reject('RELEASE_UNSAFE_ENTRY');
      const stat = await lstat(path);
      if (stat.isSymbolicLink() || await realpath(path) !== path) reject('RELEASE_UNSAFE_ENTRY');
      if (stat.isDirectory()) {
        if (!directories.has(file)) reject('RELEASE_UNKNOWN_DIRECTORY');
        await walk(file);
      } else if (stat.isFile() && allowed.has(file)) files.push(file);
      else reject('RELEASE_UNKNOWN_FILE');
    }
  }
  await walk('');
  if (files.sort().join('\0') !== SITE_FILES.join('\0')) reject('RELEASE_MISSING_FILE');
}

async function verifyManaged(root, expected) {
  const directory = join(root, 'release-artifacts');
  await safeDirectory(directory);
  const names = (await readdir(directory)).sort();
  if (names.join('\0') !== ['manifest.json', 'site'].join('\0')) reject('RELEASE_UNMANAGED_OUTPUT');
  await inspectSite(join(directory, 'site'));
  const manifestBytes = await exactFile(join(directory, 'manifest.json'), { bytes: expected.manifestBytes.length, sha256: sha256(expected.manifestBytes) }, 'RELEASE_MANIFEST_MISMATCH');
  if (!manifestBytes.equals(expected.manifestBytes)) reject('RELEASE_MANIFEST_MISMATCH');
  for (const file of expected.manifest.files) {
    const bytes = await exactFile(join(directory, 'site', file.path), file, 'RELEASE_ARTIFACT_MISMATCH');
    if (!bytes.equals(expected.site.get(file.path))) reject('RELEASE_ARTIFACT_MISMATCH');
    if (file.path.endsWith('.html')) verifyReleaseSeo(bytes.toString('utf8'), file.path);
  }
}

function summary(expected, disposition) {
  return { mode: 'release-candidate', origin: ORIGIN, toolSlug: TOOL_SLUG, files: expected.manifest.files.length, sourceFiles: expected.manifest.sourceFiles.length,
    siteBytes: expected.manifest.files.reduce((sum, file) => sum + file.bytes, 0), manifestSha256: sha256(expected.manifestBytes), disposition };
}

export async function checkRelease(root = ROOT) {
  root = resolve(root);
  const expected = await prepareRelease(root); // Reconstruct bytes from pinned source; never trust the output manifest.
  await verifyManaged(root, expected);
  return summary(expected, 'verified');
}

export async function buildRelease(root = ROOT) {
  root = resolve(root);
  const expected = await prepareRelease(root);
  const directory = join(root, 'release-artifacts');
  if (await existing(directory)) {
    await verifyManaged(root, expected); // Entire existing tree must be exact before any write; valid rebuild is a no-op.
    return summary(expected, 'verified-existing');
  }
  await mkdir(directory); // Exclusive new tree; failures preserve existing files and never recursively delete.
  await mkdir(join(directory, 'site'));
  for (const file of SITE_FILES) {
    const path = join(directory, 'site', file);
    const parent = dirname(path);
    if (!(await existing(parent))) await mkdir(parent, { recursive: true });
    await safeDirectory(parent);
    await writeFile(path, expected.site.get(file), { flag: 'wx' });
  }
  await writeFile(join(directory, 'manifest.json'), expected.manifestBytes, { flag: 'wx' });
  await verifyManaged(root, expected);
  return summary(expected, 'created');
}

export function parseReleaseArgs(args) {
  if (args.length !== 1 || !['build', 'check'].includes(args[0])) reject('RELEASE_ARGUMENTS');
  return args[0];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const mode = parseReleaseArgs(process.argv.slice(2));
    const result = mode === 'build' ? await buildRelease() : await checkRelease();
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    process.stderr.write(`Release rejected: ${error instanceof ReleaseError ? error.code : 'RELEASE_IO'}\n`);
    process.exitCode = 1;
  }
}
