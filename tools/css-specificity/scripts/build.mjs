// Deterministic build (SPEC §5): writes dist/ (preview) or dist-production/
// (production) from allowlisted sources only. No timestamps anywhere.
// Production mode requires an explicit validated approved https origin
// (--origin or APPROVED_ORIGIN); without one it exits nonzero and emits
// nothing.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { mode: 'preview', out: null, origin: process.env.APPROVED_ORIGIN || null };
  for (const a of argv) {
    if (a.startsWith('--mode=')) args.mode = a.slice('--mode='.length);
    else if (a.startsWith('--out=')) args.out = a.slice('--out='.length);
    else if (a.startsWith('--origin=')) args.origin = a.slice('--origin='.length);
    else throw new Error('unknown argument: ' + a);
  }
  return args;
}

function validateOrigin(origin) {
  if (typeof origin !== 'string' || origin.length === 0) return null;
  let url;
  try { url = new URL(origin); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.pathname !== '/' || url.search || url.hash) return null;
  return url.origin;
}

function metaFor(mode, origin, page) {
  if (mode === 'preview') return '<meta name="robots" content="noindex, nofollow">';
  const self = page === 'en' ? origin + '/en/' : origin + '/';
  return [
    '<link rel="canonical" href="' + self + '">',
    '<link rel="alternate" hreflang="zh-Hant" href="' + origin + '/">',
    '<link rel="alternate" hreflang="en" href="' + origin + '/en/">',
    '<link rel="alternate" hreflang="x-default" href="' + origin + '/">',
  ].join('\n');
}

const args = parseArgs(process.argv.slice(2));
if (args.mode !== 'preview' && args.mode !== 'production') {
  console.error('build: --mode must be preview or production');
  process.exit(1);
}
let origin = null;
if (args.mode === 'production') {
  origin = validateOrigin(args.origin);
  if (origin === null) {
    console.error('build: production mode requires an explicit validated approved https origin (--origin or APPROVED_ORIGIN); no artifacts emitted');
    process.exit(1);
  }
}
const outDir = args.out
  ? path.resolve(root, args.out)
  : path.join(root, args.mode === 'production' ? 'dist-production' : 'dist');

async function readSrc(rel) {
  return readFile(path.join(root, 'src', rel), 'utf8');
}

const outputs = new Map();
async function put(rel, content) { outputs.set(rel, content); }

const zhHtml = await readSrc('index.html');
const enHtml = await readSrc('en/index.html');
if (!zhHtml.includes('<!--META-->') || !enHtml.includes('<!--META-->')) {
  console.error('build: source HTML is missing the <!--META--> placeholder');
  process.exit(1);
}
await put('index.html', zhHtml.replace('<!--META-->', metaFor(args.mode, origin, 'zh')));
await put('en/index.html', enHtml.replace('<!--META-->', metaFor(args.mode, origin, 'en')));
for (const asset of ['core.mjs', 'controller.mjs', 'app.mjs', 'texts.mjs', 'styles.css']) {
  await put('assets/' + asset, await readSrc('assets/' + asset));
}
await put('_headers', await readSrc('_headers'));
if (args.mode === 'preview') {
  await put('robots.txt', 'User-agent: *\nDisallow: /\n');
  await put('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n');
} else {
  await put('robots.txt', 'User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n');
  await put('sitemap.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '<url><loc>' + origin + '/</loc></url>\n' +
    '<url><loc>' + origin + '/en/</loc></url>\n</urlset>\n');
}

for (const rel of [...outputs.keys()].sort()) {
  const target = path.join(outDir, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, outputs.get(rel), 'utf8');
}
console.log('build ' + args.mode + ': wrote ' + outputs.size + ' files to ' + path.relative(root, outDir) + '/');
