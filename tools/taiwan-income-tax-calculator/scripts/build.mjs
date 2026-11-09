// Deterministic preview build for the Taiwan Income Tax Calculator.
//
// - Replaces the <!--META--> placeholder with the preview robots meta.
// - Embeds the fixed worker bundle (export-stripped core source + the fixed
//   message handler) into app.js in place of the __WORKER_SOURCE__ token.
// - Emits only the allowlisted files below; no timestamps, so two builds of
//   the same source are byte-identical.
// Production mode is refused: the production origin is not configured yet
// (see SPEC handoff), and a build must never invent a canonical origin.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = { mode: 'preview', out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--mode') { args.mode = argv[i + 1]; i += 1; } else if (arg.startsWith('--mode=')) args.mode = arg.slice('--mode='.length); else if (arg === '--out') { args.out = argv[i + 1]; i += 1; } else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length); else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.mode !== 'preview') {
  console.error(`build: mode "${args.mode}" is not available; only preview (production origin not configured)`);
  process.exit(1);
}
const outDir = args.out ? path.resolve(args.out) : path.join(root, 'dist-preview');

async function readPublic(rel) {
  return readFile(path.join(root, 'public', rel), 'utf8');
}

// Worker bundle: core source with top-level `export ` prefixes stripped,
// then the fixed message handler appended verbatim.
const coreSource = await readPublic('js/core/core.mjs');
const handlerSource = await readPublic('js/worker-handler.mjs');
const workerBundle = coreSource.replace(/^export /gm, '') + '\n' + handlerSource;

const appSource = await readPublic('js/app.js');
if (!appSource.includes("'__WORKER_SOURCE__'")) {
  console.error('build: app.js is missing the __WORKER_SOURCE__ token');
  process.exit(1);
}
const appBuilt = appSource.replace("'__WORKER_SOURCE__'", JSON.stringify(workerBundle));

const PREVIEW_META = '<meta name="robots" content="noindex, nofollow">';
const outputs = new Map();
for (const [rel, sourceRel] of [['index.html', 'index.html'], ['en/index.html', 'en/index.html']]) {
  const html = await readPublic(sourceRel);
  if (!html.includes('<!--META-->')) {
    console.error(`build: ${sourceRel} is missing the <!--META--> placeholder`);
    process.exit(1);
  }
  outputs.set(rel, html.replace('<!--META-->', PREVIEW_META));
}
outputs.set('js/app.js', appBuilt);
outputs.set('js/core/core.mjs', coreSource);
outputs.set('js/core/controller.mjs', await readPublic('js/core/controller.mjs'));
outputs.set('styles/styles.css', await readPublic('styles/styles.css'));
outputs.set('robots.txt', 'User-agent: *\nDisallow: /\n');
outputs.set('_headers', [
  '/*',
  "  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: no-referrer',
  '  Permissions-Policy: camera=(), microphone=(), geolocation=()',
  '  X-Robots-Tag: noindex, nofollow',
  '',
].join('\n'));

for (const rel of [...outputs.keys()].sort()) {
  const target = path.join(outDir, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, outputs.get(rel), 'utf8');
}
console.log(`build preview: wrote ${outputs.size} files to ${outDir}`);
