// Static checks for the dependency-reduction tool:
// package contract, zero runtime dependencies, forbidden sinks, no remote
// assets, core purity, and bilingual page structure. Exit 0 = all pass.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files.sort();
}

const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
check(pkg.type === 'module', 'package.json: type must be "module"');
check(
  typeof pkg.engines?.node === 'string' && pkg.engines.node.includes('24'),
  'package.json: engines.node must require Node >=24',
);
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  check(typeof pkg.scripts?.[script] === 'string', `package.json: missing script ${script}`);
}
check(
  !pkg.dependencies || Object.keys(pkg.dependencies).length === 0,
  'package.json: runtime dependencies must be empty',
);

const publicFiles = await listFiles(path.join(root, 'public'));
const corePrefix = path.join('js', 'core') + path.sep;
check(publicFiles.includes('index.html'), 'public/index.html missing');
check(publicFiles.includes(path.join('en', 'index.html')), 'public/en/index.html missing');
check(publicFiles.some((f) => f.startsWith(corePrefix)), 'public/js/core/ missing');
check(publicFiles.includes(path.join('js', 'app.js')), 'public/js/app.js missing');

const forbidden = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /innerHTML/,
  /outerHTML/,
  /document\.write/,
  /\bfetch\s*\(/,
  /XMLHttpRequest/,
  /WebSocket/,
  /navigator\.sendBeacon/,
  /localStorage/,
  /sessionStorage/,
  /indexedDB/,
  /import\s*\(/,
];
const remote = [/https?:\/\//, /src\s*=\s*["']\/\//, /@import\s+["']https?:/];

for (const file of publicFiles) {
  const full = path.join(root, 'public', file);
  const text = await readFile(full, 'utf8');
  const isCore = file.startsWith(corePrefix);
  for (const pattern of forbidden) {
    check(!pattern.test(text), `${file}: forbidden pattern ${pattern}`);
  }
  // The app's worker bootstrap builds a Blob URL from a fixed string; the
  // only interpolation is the shipped core module URL. User content is never
  // interpolated: the template literal in app.js must not contain a
  // ${...} reference to draft/input values.
  if (file === path.join('js', 'app.js')) {
    check(text.includes('workerSource(coreUrl)'), 'app.js: worker must use the fixed workerSource');
  }
  for (const pattern of remote) {
    // Allow the fixed homepage links (relative) only; any absolute URL is a failure.
    check(!pattern.test(text), `${file}: remote asset reference ${pattern}`);
  }
  if (isCore) {
    check(!/\bdocument\b|\bwindow\b|\blocalStorage\b/.test(text), `${file}: core must not touch DOM/storage`);
    check(!text.includes("from 'node:"), `${file}: core must not import Node built-ins`);
  }
}

// Bilingual page structure: both pages carry the same ids and the exact
// SPEC-pinned metadata; candidate pages carry no production canonical or
// hreflang (SPEC tests section) and are noindex.
const zh = await readFile(path.join(root, 'public', 'index.html'), 'utf8');
const en = await readFile(path.join(root, 'public', 'en', 'index.html'), 'utf8');
for (const [name, html, lang, h1, title, description] of [
  ['zh', zh, 'zh-Hant', '模組依賴冗餘檢查', '模組依賴冗餘檢查｜Gloss Tools', '工程師維護少量 build modules 時，要看哪一條直接依賴已有間接路徑可覆蓋，並找到阻止任何排序的循環。'],
  ['en', en, 'en', 'Module Dependency Reduction', 'Module Dependency Reduction | Gloss Tools', 'Find a cycle or group build modules by dependency stage. Inspect alternate paths that make a direct edge redundant.'],
]) {
  check(html.includes(`lang="${lang}"`), `${name}: lang must be ${lang}`);
  check(html.includes(`<h1>${h1}</h1>`), `${name}: h1 must be the SPEC text`);
  check(html.includes(`<title>${title}</title>`), `${name}: title must be the SPEC text`);
  check(html.includes(`content="${description}"`), `${name}: description must be the SPEC text`);
  check(html.includes('name="robots" content="noindex, nofollow"'), `${name}: robots noindex required`);
  check(!html.includes('rel="canonical"'), `${name}: candidate must not carry a production canonical`);
  check(!html.includes('hreflang'), `${name}: candidate must not carry hreflang`);
  for (const id of ['modules', 'edges', 'audit', 'cancel', 'example', 'reset', 'download', 'status', 'error', 'results', 'audit-form']) {
    check(html.includes(`id="${id}"`), `${name}: missing id="${id}"`);
  }
  check(html.includes('<label for="modules">'), `${name}: modules label missing`);
  check(html.includes('<label for="edges">'), `${name}: edges label missing`);
}
// The worker bootstrap string must be a fixed literal: exactly one
// JSON.stringify(coreUrl) interpolation and no other ${...} inside it.
const appJs = await readFile(path.join(root, 'public', 'js', 'app.js'), 'utf8');
const workerFn = appJs.slice(appJs.indexOf('function workerSource'));
const workerFnEnd = workerFn.indexOf('\n}\n');
const workerBody = workerFn.slice(0, workerFnEnd);
check((workerBody.match(/\$\{/g) || []).length === 1, 'app.js: workerSource must interpolate only coreUrl');

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log('check: all static checks passed');
