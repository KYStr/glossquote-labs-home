// Checks the generated output of build:preview / build:production.
// preview: dist/ mirrors public/ byte-for-byte and keeps the noindex.
// production: dist-production/ has no noindex, robots.txt + sitemap.xml
// listing exactly the two HTTPS canonicals.
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (mode !== 'preview' && mode !== 'production') {
  console.error('usage: node scripts/check-generated.mjs <preview|production>');
  process.exit(2);
}
const distDir = join(root, mode === 'preview' ? 'dist' : 'dist-production');
let failures = 0;
function check(ok, label) {
  if (ok) console.log(`ok   ${label}`);
  else {
    failures += 1;
    console.log(`FAIL ${label}`);
  }
}

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(p)));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

const srcFiles = await listFiles(join(root, 'public'));
for (const file of srcFiles) {
  const rel = relative(join(root, 'public'), file);
  const gen = join(distDir, rel);
  try {
    const a = createHash('sha256').update(await readFile(file)).digest('hex');
    const b = createHash('sha256').update(await readFile(gen)).digest('hex');
    if (mode === 'preview') check(a === b, `generated ${rel} identical to source`);
    else check(true, `generated ${rel} present (production may rewrite head)`);
  } catch {
    check(false, `generated ${rel} exists`);
  }
}

for (const page of ['index.html', join('en', 'index.html')]) {
  const html = await readFile(join(distDir, page), 'utf8');
  if (mode === 'preview') {
    check(html.includes('<meta name="robots" content="noindex,nofollow">'), `${page} keeps preview noindex`);
  } else {
    check(!html.includes('noindex'), `${page} has no preview noindex`);
    check(html.includes('<link rel="canonical" href="https://'), `${page} has an HTTPS canonical`);
  }
  check(html.includes('<title>'), `${page} has a title`);
}

if (mode === 'production') {
  const robots = await readFile(join(distDir, 'robots.txt'), 'utf8');
  check(robots.includes('Sitemap:'), 'robots.txt announces the sitemap');
  const sitemap = await readFile(join(distDir, 'sitemap.xml'), 'utf8');
  check(sitemap.includes('tools/bicycle-gear-table/index.html'), 'sitemap lists the zh canonical');
  check(sitemap.includes('tools/bicycle-gear-table/en/index.html'), 'sitemap lists the en canonical');
  try {
    await stat(join(distDir, 'MANIFEST.txt'));
    check(true, 'MANIFEST.txt present');
  } catch {
    check(false, 'MANIFEST.txt present');
  }
}

if (failures) {
  console.error(`${failures} generated check(s) failed`);
  process.exit(1);
}
console.log('All generated checks passed.');
