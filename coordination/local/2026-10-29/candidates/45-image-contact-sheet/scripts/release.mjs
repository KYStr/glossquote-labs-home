import { createHash } from 'node:crypto';
import { lstat, readdir, readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES } from './files.mjs';

export const RELEASE_ORIGIN = 'https://contact-sheet.glossquote.com';
export const TOOL_SLUG = 'image-contact-sheet';
export const SITE_FILES = Object.freeze([...new Set([...PUBLIC_FILES, 'robots.txt', '_headers', '_redirects', 'sitemap.xml'])].sort());
const OUTPUT_FILES = Object.freeze(['manifest.json', ...SITE_FILES.map((name) => 'site/' + name)].sort());
const LANGUAGES = Object.freeze({ 'zh-Hant': '/index.html', en: '/en/index.html', 'x-default': '/index.html' });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
export class ReleaseError extends Error { constructor(code) { super(code); this.code = code; } }
const deny = (code) => { throw new ReleaseError(code); };
const requireValue = (value, code) => { if (!value) deny(code); };
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));

// Fixed assets-only deployment contract. No Worker entry point, bindings, vars or environment overrides.
const DEPLOYMENT_CONFIG = Buffer.from(JSON.stringify({
  name: 'glossquote-image-contact-sheet', compatibility_date: '2026-10-24',
  workers_dev: false, preview_urls: false, send_metrics: false,
  routes: [{ pattern: 'contact-sheet.glossquote.com', custom_domain: true }],
  build: { command: 'node scripts/release.mjs build' },
  assets: { directory: './release-artifacts/site', run_worker_first: false, html_handling: 'none', not_found_handling: 'none' },
  observability: { enabled: false, logs: { enabled: false, invocation_logs: false }, traces: { enabled: false } },
}, null, 2) + '\n');
const REDIRECTS = Buffer.from('/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n');
const CANDIDATE_LABELS = Object.freeze({
  '/index.html': ['<span>照片聯絡表 · 本地候選預覽</span>', '<span>照片聯絡表</span>'],
  '/en/index.html': ['<span>Photo contact sheet · Local candidate preview</span>', '<span>Photo contact sheet</span>'],
});

export async function validateDeploymentConfig({ root = ROOT } = {}) {
  await realDirectory(root);
  for (const alternate of ['wrangler.json', 'wrangler.toml', 'cloudflare.config.ts']) {
    let stat;
    try { stat = await lstat(path.join(root, alternate)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    requireValue(!stat, 'ALTERNATE_DEPLOYMENT_CONFIG');
  }
  const target = path.join(root, 'wrangler.jsonc');
  let stat;
  try { stat = await lstat(target); } catch (error) { if (error.code === 'ENOENT') deny('DEPLOYMENT_CONFIG_MISSING'); throw error; }
  requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.size === DEPLOYMENT_CONFIG.length, 'DEPLOYMENT_CONFIG_CHANGED');
  const bytes = await readFile(target);
  requireValue(same(bytes, DEPLOYMENT_CONFIG), 'DEPLOYMENT_CONFIG_CHANGED');
  return { path: 'wrangler.jsonc', bytes: bytes.length, sha256: sha(bytes) };
}

async function realDirectory(directory) {
  const absolute = path.resolve(directory);
  const stat = await lstat(absolute);
  requireValue(stat.isDirectory() && !stat.isSymbolicLink(), 'UNSAFE_DIRECTORY');
  requireValue((await realpath(absolute)).toLowerCase() === absolute.toLowerCase(), 'ALIASED_DIRECTORY');
}

// Inspect every directory and file before reading file contents or writing output.
async function closedTree(root, allowed, optional = false) {
  let stat;
  try { stat = await lstat(root); } catch (error) {
    if (optional && error.code === 'ENOENT') return { exists: false, files: new Map(), directories: [] };
    throw error;
  }
  requireValue(stat.isDirectory() && !stat.isSymbolicLink(), 'UNSAFE_DIRECTORY');
  await realDirectory(root);
  const files = new Map(), directories = [];
  const dirs = new Set();
  for (const name of allowed) {
    requireValue(/^[A-Za-z0-9._/-]+$/u.test(name) && !name.split('/').some((part) => part === '.' || part === '..'), 'UNSAFE_ALLOWLIST');
    const parts = name.split('/');
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  }
  async function walk(relative = '') {
    for (const name of (await readdir(path.join(root, relative))).sort()) {
      const portable = relative ? relative + '/' + name : name;
      const absolute = path.join(root, portable);
      const entry = await lstat(absolute);
      requireValue(!entry.isSymbolicLink(), 'UNSAFE_LINK');
      if (entry.isDirectory()) {
        requireValue(dirs.has(portable), 'UNKNOWN_DIRECTORY');
        await realDirectory(absolute); directories.push(portable); await walk(portable);
      } else {
        requireValue(entry.isFile() && allowed.includes(portable), 'UNKNOWN_FILE');
        files.set(portable, { absolute, bytes: entry.size });
      }
    }
  }
  await walk();
  return { exists: true, files, directories };
}

async function pinnedSources(root) {
  await realDirectory(root);
  const pinsUrl = new URL('./release-inputs.json', import.meta.url);
  const pinStat = await lstat(pinsUrl);
  requireValue(pinStat.isFile() && !pinStat.isSymbolicLink() && pinStat.size <= 65_536, 'INVALID_SOURCE_PINS');
  const pins = JSON.parse(await readFile(pinsUrl, 'utf8'));
  requireValue(pins.schemaVersion === 1 && pins.version === '0.1.0-m1' && Array.isArray(pins.files), 'INVALID_SOURCE_PINS');
  const expectedNames = PUBLIC_FILES.slice().sort();
  requireValue(JSON.stringify(pins.files.map((f) => f.path)) === JSON.stringify(expectedNames), 'INVALID_SOURCE_PINS');
  const tree = await closedTree(path.join(root, 'public'), expectedNames);
  requireValue(tree.files.size === expectedNames.length, 'SOURCE_FILES_MISSING');
  const sources = new Map();
  for (const pin of pins.files) {
    requireValue(Number.isSafeInteger(pin.bytes) && pin.bytes >= 0 && /^[a-f0-9]{64}$/u.test(pin.sha256), 'INVALID_SOURCE_PINS');
    const entry = tree.files.get(pin.path);
    requireValue(entry && entry.bytes === pin.bytes, 'SOURCE_CHANGED');
    const bytes = await readFile(entry.absolute);
    requireValue(bytes.length === pin.bytes && sha(bytes) === pin.sha256, 'SOURCE_CHANGED');
    sources.set(pin.path, bytes);
  }
  return sources;
}

function headParts(html) {
  const start = html.indexOf('<head>'), end = html.indexOf('</head>');
  requireValue(start >= 0 && end > start && (html.match(/<head\b/giu) ?? []).length === 1 && (html.match(/<\/head>/giu) ?? []).length === 1, 'INVALID_HTML_HEAD');
  return { prefix: html.slice(0, start + 6), head: html.slice(start + 6, end), suffix: html.slice(end) };
}

// Small strict tokenizer for this pinned static head. Comments are skipped, duplicate attributes
// rejected, and quoted values may contain '>'. It is not a browser/layout implementation.
export function headElements(html) {
  const { head } = headParts(html), tags = [];
  let offset = 0;
  while (offset < head.length) {
    if (head[offset] !== '<') { offset++; continue; }
    if (head.startsWith('<!--', offset)) {
      const end = head.indexOf('-->', offset + 4); requireValue(end >= 0, 'INVALID_HEAD_TAG'); offset = end + 3; continue;
    }
    if (head[offset + 1] === '/') {
      const end = head.indexOf('>', offset); requireValue(end >= 0, 'INVALID_HEAD_TAG'); offset = end + 1; continue;
    }
    const start = offset;
    const tag = /^<([A-Za-z][A-Za-z0-9-]*)/u.exec(head.slice(offset));
    requireValue(tag, 'INVALID_HEAD_TAG'); offset += tag[0].length;
    const attrs = Object.create(null);
    for (;;) {
      while (/\s/u.test(head[offset] ?? '') && offset < head.length) offset++;
      if (head[offset] === '>') { offset++; break; }
      if (head.startsWith('/>', offset)) { offset += 2; break; }
      const attr = /^([A-Za-z_:][A-Za-z0-9_:.-]*)\s*=\s*(["'])/u.exec(head.slice(offset));
      requireValue(attr, 'INVALID_HEAD_ATTRIBUTE'); offset += attr[0].length;
      const end = head.indexOf(attr[2], offset); requireValue(end >= 0, 'INVALID_HEAD_ATTRIBUTE');
      const name = attr[1].toLowerCase(); requireValue(!Object.hasOwn(attrs, name), 'DUPLICATE_HEAD_ATTRIBUTE');
      attrs[name] = head.slice(offset, end); offset = end + 1;
    }
    tags.push({ name: tag[1].toLowerCase(), attrs, raw: head.slice(start, offset), start, end: offset });
  }
  return tags;
}
function isRel(tag, name) { return tag.name === 'link' && (tag.attrs.rel ?? '').split(/\s+/u).includes(name); }
export function assertReleaseSeo(html, canonicalPath) {
  const tags = headElements(html);
  const robots = tags.filter((t) => t.name === 'meta' && t.attrs.name?.toLowerCase() === 'robots');
  requireValue(robots.length === 1 && robots[0].attrs.content === 'index,follow', 'INVALID_RELEASE_ROBOTS');
  const canonicals = tags.filter((t) => isRel(t, 'canonical'));
  requireValue(canonicals.length === 1 && canonicals[0].attrs.href === RELEASE_ORIGIN + canonicalPath, 'INVALID_CANONICAL');
  const alternates = tags.filter((t) => isRel(t, 'alternate'));
  requireValue(alternates.length === 3, 'INVALID_ALTERNATES');
  for (const [language, route] of Object.entries(LANGUAGES)) {
    const links = alternates.filter((t) => t.attrs.hreflang === language);
    requireValue(links.length === 1 && links[0].attrs.href === RELEASE_ORIGIN + route, 'INVALID_ALTERNATES');
  }
}
function releaseHtml(bytes, canonicalPath) {
  const html = bytes.toString('utf8'); requireValue(same(Buffer.from(html), bytes), 'INVALID_HTML_ENCODING');
  const parts = headParts(html), tags = headElements(html);
  const robots = tags.filter((t) => t.name === 'meta' && t.attrs.name === 'robots');
  requireValue(robots.length === 1 && robots[0].attrs.content === 'noindex,nofollow', 'INVALID_PREVIEW_ROBOTS');
  requireValue(!tags.some((t) => isRel(t, 'canonical') || isRel(t, 'alternate')), 'PREVIEW_HAS_RELEASE_LINKS');
  const robot = robots[0];
  const replacement = robot.raw.replace('noindex,nofollow', 'index,follow');
  let head = parts.head.slice(0, robot.start) + replacement + parts.head.slice(robot.end);
  head += `  <link rel="canonical" href="${RELEASE_ORIGIN}${canonicalPath}">\n`;
  for (const [language, route] of Object.entries(LANGUAGES)) head += `  <link rel="alternate" hreflang="${language}" href="${RELEASE_ORIGIN}${route}">\n`;
  const [candidateLabel, productionLabel] = CANDIDATE_LABELS[canonicalPath];
  requireValue(parts.suffix.split(candidateLabel).length === 2, 'CANDIDATE_LABEL_MISMATCH');
  const productionSuffix = parts.suffix.replace(candidateLabel, productionLabel);
  const output = parts.prefix + head + productionSuffix;
  assertReleaseSeo(output, canonicalPath);
  requireValue(headParts(output).suffix === productionSuffix, 'VISIBLE_HTML_CHANGED');
  return Buffer.from(output);
}
function releaseHeaders(bytes) {
  const text = bytes.toString('utf8'); requireValue(same(Buffer.from(text), bytes), 'INVALID_HEADER_ENCODING');
  const pattern = /^([ \t]*X-Robots-Tag:[ \t]*)([^\r\n]+)$/gimu;
  const matches = [...text.matchAll(pattern)];
  requireValue(matches.length === 1 && matches[0][2] === 'noindex, nofollow', 'INVALID_PREVIEW_HEADERS');
  return Buffer.from(text.replace(pattern, '$1index, follow'));
}
function fileRecords(map) {
  return [...map.keys()].sort().map((name) => ({ path: name, bytes: map.get(name).length, sha256: sha(map.get(name)) }));
}

export async function expectedRelease({ root = ROOT } = {}) {
  const origin = new URL(RELEASE_ORIGIN);
  requireValue(origin.protocol === 'https:' && origin.origin === RELEASE_ORIGIN && origin.pathname === '/' && !origin.username && !origin.password && !origin.port && !origin.search && !origin.hash, 'INVALID_FIXED_ORIGIN');
  const deployment = await validateDeploymentConfig({ root: path.resolve(root) });
  const sources = await pinnedSources(path.resolve(root));
  const site = new Map(sources);
  site.set('index.html', releaseHtml(sources.get('index.html'), '/index.html'));
  site.set('en/index.html', releaseHtml(sources.get('en/index.html'), '/en/index.html'));
  site.set('_headers', releaseHeaders(sources.get('_headers')));
  site.set('_redirects', REDIRECTS);
  site.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${RELEASE_ORIGIN}/sitemap.xml\n`));
  site.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${RELEASE_ORIGIN}/index.html</loc></url>\n  <url><loc>${RELEASE_ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  requireValue(JSON.stringify([...site.keys()].sort()) === JSON.stringify(SITE_FILES), 'UNEXPECTED_SITE_PLAN');
  const manifest = { schemaVersion: 2, mode: 'production', origin: RELEASE_ORIGIN, toolSlug: TOOL_SLUG, files: fileRecords(site), sourceFiles: fileRecords(sources), deploymentFiles: [deployment] };
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const outputs = new Map([...site].map(([name, bytes]) => ['site/' + name, bytes])); outputs.set('manifest.json', manifestBytes);
  return { site, sources, manifest, manifestBytes, outputs };
}
async function verifyOutputs(tree, expected) {
  requireValue(tree.exists && tree.files.size === OUTPUT_FILES.length, 'RELEASE_FILES_MISSING');
  for (const [name, wanted] of expected.outputs) {
    const entry = tree.files.get(name);
    requireValue(entry && entry.bytes === wanted.length, 'RELEASE_BYTES_CHANGED');
    requireValue(same(await readFile(entry.absolute), wanted), name === 'manifest.json' ? 'RELEASE_MANIFEST_CHANGED' : 'RELEASE_BYTES_CHANGED');
  }
}
export async function checkRelease({ root = ROOT } = {}) {
  const expected = await expectedRelease({ root });
  const tree = await closedTree(path.join(root, 'release-artifacts'), OUTPUT_FILES, true);
  await verifyOutputs(tree, expected);
  return expected.manifest;
}
async function ensureDirectory(directory, projectRoot) {
  const relative = path.relative(path.resolve(projectRoot), path.resolve(directory));
  requireValue(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'UNSAFE_OUTPUT_PATH');
  let current = path.resolve(projectRoot);
  await realDirectory(current);
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    try { await mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    await realDirectory(current);
  }
}
export async function buildRelease({ root = ROOT } = {}) {
  // Complete input and existing-output validation precedes the first mkdir/write.
  const expected = await expectedRelease({ root });
  const destination = path.join(root, 'release-artifacts');
  const tree = await closedTree(destination, OUTPUT_FILES, true);
  if (tree.files.size || tree.directories.length) {
    await verifyOutputs(tree, expected); // A valid deterministic rebuild is a byte-preserving no-op.
    return expected.manifest;
  }
  for (const name of [...SITE_FILES.map((file) => 'site/' + file), 'manifest.json']) {
    const target = path.join(destination, name);
    await ensureDirectory(path.dirname(target), root);
    // Never overwrite an unowned file or repair a modified/missing existing release.
    await writeFile(target, expected.outputs.get(name), { flag: 'wx' });
  }
  await verifyOutputs(await closedTree(destination, OUTPUT_FILES), expected);
  return expected.manifest;
}
export async function runRelease(args) {
  requireValue(args.length === 1 && ['build', 'check'].includes(args[0]), 'EXPECTED_BUILD_OR_CHECK_ONLY');
  return args[0] === 'build' ? buildRelease() : checkRelease();
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const manifest = await runRelease(process.argv.slice(2));
    console.log(`PASS production ${process.argv[2]}: ${manifest.files.length} site files, ${manifest.sourceFiles.length} pinned public inputs, ${manifest.deploymentFiles.length} fixed deployment config; prepared only, not deployed.`);
  } catch (error) {
    console.error(`RELEASE_FAILED ${error instanceof ReleaseError ? error.code : 'IO_OR_INPUT_ERROR'}`);
    process.exitCode = 1;
  }
}
