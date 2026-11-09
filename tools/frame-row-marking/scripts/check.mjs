// Static source checks for frame-row-marking (no build, no network).
// Verifies the package contract, both language pages' head/SEO, core
// purity, and that no forbidden capability (fetch, storage, innerHTML,
// remote assets) appears in the shipped source.
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
check(pkg.type === 'module', 'package.json is ESM');
check(pkg.engines?.node === '>=24', 'package.json requires Node >=24');
check(!pkg.dependencies || Object.keys(pkg.dependencies).length === 0, 'zero runtime dependencies');
for (const s of ['test', 'check', 'build:preview', 'check:generated:preview', 'build:production', 'check:generated:production']) {
  check(typeof pkg.scripts?.[s] === 'string', `script ${s} defined`);
}

const zh = await readFile(join(root, 'public/index.html'), 'utf8');
const en = await readFile(join(root, 'public/en/index.html'), 'utf8');
for (const [name, html, lang, title, desc] of [
  ['zh page', zh, 'zh-Hant', '相框掛點定位｜Gloss Tools', '輸入相框尺寸、可用牆寬和掛點偏移，計算等距排列及每個掛點座標。'],
  ['en page', en, 'en', 'Frame Row Marking | Gloss Tools', 'Lay out a row of frames with equal gaps and measure each hook from one wall origin.'],
]) {
  check(html.includes(`<html lang="${lang}">`), `${name} lang=${lang}`);
  check(html.includes(`<title>${title}</title>`), `${name} title`);
  check(html.includes(`content="${desc}"`), `${name} description`);
  check(html.includes('<meta name="robots" content="noindex,nofollow">'), `${name} preview noindex`);
  check(html.includes('rel="canonical"'), `${name} canonical`);
  check(html.includes('hreflang="zh-Hant"'), `${name} hreflang zh-Hant`);
  check(html.includes('hreflang="en"'), `${name} hreflang en`);
  check(html.includes('hreflang="x-default"'), `${name} hreflang x-default`);
  check(html.includes('<h1>'), `${name} has h1`);
  check(html.includes('id="mark-form"'), `${name} has the form`);
  check(html.includes('id="marks-body"'), `${name} has the results table`);
  check(html.includes('id="wall"'), `${name} has the diagram`);
}
check(zh.includes('href="https://glossquote.com/index.html"'), 'zh page links to the same-language home');
check(en.includes('href="https://glossquote.com/en/index.html"'), 'en page links to the same-language home');
check(zh.includes('href="en/index.html"'), 'zh page links to the en page');
check(en.includes('href="../index.html"'), 'en page links to the zh page');

const srcFiles = (await listFiles(join(root, 'public'))).filter((f) => /\.(html|js|mjs|css)$/.test(f));
const forbidden = [
  'fetch(', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB',
  'innerHTML', 'document.write', 'http://', 'https://cdn', 'google-analytics',
  'Math.random', 'new Function', 'eval(',
];
for (const file of srcFiles) {
  const text = await readFile(file, 'utf8');
  for (const bad of forbidden) {
    check(!text.includes(bad), `no ${bad} in ${file.split('public/')[1]}`);
  }
}
// The spec's own canonical/home URLs are the only https:// strings allowed.
for (const file of srcFiles) {
  const text = await readFile(file, 'utf8');
  const urls = [...text.matchAll(/https:\/\/[^\s"'<>]+/g)].map((m) => m[0]);
  check(urls.every((u) => u.startsWith('https://glossquote.com/')), `only glossquote.com https URLs in ${file.split('public/')[1]}`);
}

const core = await readFile(join(root, 'public/js/core/frame-row-marking.mjs'), 'utf8');
check(!/document|window|navigator|localStorage/.test(core), 'core is DOM/network/storage-free');
check(core.includes('export function solve'), 'core exports solve');
check(core.includes('export function createFlow'), 'core exports createFlow');
check(core.includes("SPEC_ID = 'spec-frame-row-marking-20261109'"), 'core pins the spec id');

const app = await readFile(join(root, 'public/js/app.js'), 'utf8');
check(app.includes("document.documentElement.lang === 'en'"), 'app reads the page language');
check(!app.includes('innerHTML'), 'app never uses innerHTML');

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log('All static checks passed.');
