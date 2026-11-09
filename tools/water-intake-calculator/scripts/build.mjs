// Deterministic preview build: copies the allowlisted public/ tree into
// dist/, replacing the <!--META--> placeholder with preview metadata
// (noindex + relative canonical/hreflang cross-links; no invented origin).
// No timestamps anywhere: two runs produce byte-identical output, and
// BUILD-MANIFEST.json records sha256 for every emitted file.
// Production mode is refused: no approved origin exists for this tool yet.

import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { mode: 'preview', out: null, manifest: null };
  for (const a of argv) {
    if (a.startsWith('--mode=')) args.mode = a.slice(7);
    else if (a.startsWith('--mode')) args.mode = argv[argv.indexOf(a) + 1];
    else if (a.startsWith('--out=')) args.out = a.slice(6);
    else if (a.startsWith('--manifest=')) args.manifest = a.slice(11);
    else if (a === '--out' || a === '--manifest') continue;
    else if (a.startsWith('--')) throw new Error('unknown argument: ' + a);
  }
  // support "--mode preview" two-token form
  const i = argv.indexOf('--mode');
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) args.mode = argv[i + 1];
  const j = argv.indexOf('--out');
  if (j !== -1 && argv[j + 1]) args.out = argv[j + 1];
  const k = argv.indexOf('--manifest');
  if (k !== -1 && argv[k + 1]) args.manifest = argv[k + 1];
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.mode !== 'preview') {
  console.error('build: only --mode preview is available; production requires an approved origin and is refused');
  process.exit(1);
}
const outDir = args.out ? path.resolve(root, args.out) : path.join(root, 'dist');
const manifestPath = args.manifest ? path.resolve(root, args.manifest) : path.join(root, 'BUILD-MANIFEST.json');

const META = {
  zh: [
    '<meta name="robots" content="noindex, nofollow">',
    '<link rel="canonical" href="./">',
    '<link rel="alternate" hreflang="zh-Hant" href="./">',
    '<link rel="alternate" hreflang="en" href="en/">',
    '<link rel="alternate" hreflang="x-default" href="./">',
  ].join('\n'),
  en: [
    '<meta name="robots" content="noindex, nofollow">',
    '<link rel="canonical" href="./">',
    '<link rel="alternate" hreflang="zh-Hant" href="../">',
    '<link rel="alternate" hreflang="en" href="./">',
    '<link rel="alternate" hreflang="x-default" href="../">',
  ].join('\n'),
};

async function collectPublic(dir, base, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectPublic(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}

const publicDir = path.join(root, 'public');
const files = await collectPublic(publicDir, publicDir, []);
const outputs = new Map();
for (const rel of files) {
  let content = await readFile(path.join(publicDir, rel));
  if (rel === 'index.html' || rel === path.join('en', 'index.html')) {
    const text = content.toString('utf8');
    if (!text.includes('<!--META-->')) {
      console.error('build: ' + rel + ' is missing the <!--META--> placeholder');
      process.exit(1);
    }
    content = Buffer.from(text.replace('<!--META-->', rel === 'index.html' ? META.zh : META.en), 'utf8');
  }
  outputs.set(rel.split(path.sep).join('/'), content);
}
outputs.set('robots.txt', Buffer.from('User-agent: *\nDisallow: /\n', 'utf8'));
outputs.set('sitemap.xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n', 'utf8'));

await rm(outDir, { recursive: true, force: true });
for (const rel of [...outputs.keys()].sort()) {
  const target = path.join(outDir, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, outputs.get(rel));
}
const manifest = {
  tool: 'water-intake-calculator',
  mode: 'preview',
  files: [...outputs.keys()].sort().map((rel) => ({
    path: rel,
    bytes: outputs.get(rel).length,
    sha256: createHash('sha256').update(outputs.get(rel)).digest('hex'),
  })),
};
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('build preview: wrote ' + outputs.size + ' files to ' + path.relative(root, outDir) + '/');
