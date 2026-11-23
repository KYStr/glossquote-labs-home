// Static checks for the Food Storage Guide tool directory:
// package contract, JS syntax, banned sinks/APIs in product sources,
// HTML identity strings from the SPEC, and the vendored fixtures shape.

import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`check: ${message}`);
}

async function walk(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), rel));
    else if (entry.isFile()) files.push(rel);
  }
  return files.sort();
}

// --- package contract -------------------------------------------------------
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
if (pkg.type !== 'module') fail('package.json must set "type": "module"');
if (!pkg.engines || pkg.engines.node !== '>=24') fail('package.json engines.node must be ">=24"');
if (Object.keys(pkg.dependencies || {}).length > 0) fail('runtime dependencies are not allowed');
if (Object.keys(pkg.devDependencies || {}).length > 0) fail('dev dependencies are not allowed');
for (const script of ['test', 'check', 'build:preview', 'check:generated:preview']) {
  if (!pkg.scripts || typeof pkg.scripts[script] !== 'string') fail(`package.json is missing script "${script}"`);
}

// --- syntax + banned patterns in product sources ----------------------------
const BANNED = [
  'fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'eval(', 'new Function',
  'innerHTML', 'outerHTML', 'document.write', 'localStorage', 'sessionStorage',
  'indexedDB', 'serviceWorker', 'http://', 'https://',
];
const publicFiles = await walk(path.join(root, 'public'), 'public');
for (const rel of publicFiles) {
  const full = path.join(root, rel);
  const text = await readFile(full, 'utf8');
  if (/\.(mjs|js)$/.test(rel)) {
    try {
      await run(process.execPath, ['--check', full]);
    } catch (error) {
      fail(`syntax error in ${rel}: ${error.stderr || error.message}`);
    }
    for (const pattern of BANNED) {
      if (text.includes(pattern)) fail(`${rel} contains banned pattern ${JSON.stringify(pattern)}`);
    }
  }
  if (/\.html$/.test(rel)) {
    if (/<script(?![^>]*\bsrc=)/.test(text)) fail(`${rel} contains an inline script`);
    if (/\son\w+\s*=/.test(text)) fail(`${rel} contains an inline event handler`);
  }
}
for (const rel of ['scripts/build.mjs', 'scripts/serve.mjs', 'scripts/check-generated.mjs']) {
  try {
    await run(process.execPath, ['--check', path.join(root, rel)]);
  } catch (error) {
    fail(`syntax error in ${rel}: ${error.stderr || error.message}`);
  }
}

// --- HTML identity pinned by the SPEC ---------------------------------------
const zh = await readFile(path.join(root, 'public/index.html'), 'utf8');
const en = await readFile(path.join(root, 'public/en/index.html'), 'utf8');
const EXPECTED = [
  [zh, '<html lang="zh-Hant">', 'zh lang'],
  [zh, '<title>食物保存期限｜Gloss Tools</title>', 'zh title'],
  [zh, '<h1>食物保存期限</h1>', 'zh h1'],
  [zh, '查一樣食物在常溫、冷藏或冷凍能放幾天：對照 USDA FoodKeeper 的保存天數，算出安全期限與剩餘天數。', 'zh description'],
  [zh, '冰箱 ≤ 4°C（40°F），冷凍庫 ≤ −18°C（0°F）。熟食與易腐食物應在 2 小時內冷藏。有疑慮就丟掉，不要憑外觀或氣味判斷。', 'zh safety note'],
  [zh, '開始日期加上該食物該位置保存天數範圍的下限；上限是品質期限。', 'zh FAQ 1'],
  [zh, 'FoodKeeper 對牛奶冷藏以包裝上的使用期限為準，請輸入包裝日期。', 'zh FAQ 3'],
  [en, '<html lang="en">', 'en lang'],
  [en, '<title>Food Storage Guide | Gloss Tools</title>', 'en title'],
  [en, '<h1>Food Storage Guide</h1>', 'en h1'],
  [en, 'Look up how long a food keeps in the pantry, fridge or freezer: USDA FoodKeeper storage times, a safe-until date and days remaining.', 'en description'],
  [en, 'Keep the fridge at or below 4°C (40°F) and the freezer at or below −18°C (0°F). Refrigerate cooked and perishable food within 2 hours. When in doubt, throw it out — do not judge by look or smell.', 'en safety note'],
  [en, 'The start date plus the lower end of the storage-time range for that food and location; the upper end is the quality limit.', 'en FAQ 1'],
  [en, 'FoodKeeper defers to the use-by date on the package for refrigerated milk; enter that date.', 'en FAQ 3'],
];
for (const [html, needle, label] of EXPECTED) {
  if (!html.includes(needle)) fail(`missing pinned string (${label}): ${needle}`);
}
for (const [html, label] of [[zh, 'zh'], [en, 'en']]) {
  if (!html.includes('<!--META-->')) fail(`${label} page is missing the <!--META--> placeholder`);
  if (html.includes('rel="canonical"')) fail(`${label} page must not carry a canonical in the candidate source`);
  if (!html.includes('href="../../index.html"') && !html.includes('href="../../en/index.html"')) {
    fail(`${label} page is missing the same-language home link`);
  }
}

// --- vendored fixtures --------------------------------------------------------
const fixtures = JSON.parse(await readFile(path.join(root, 'test/fixtures.json'), 'utf8'));
if (fixtures.slug !== 'food-storage-guide') fail('fixtures slug mismatch');
if (fixtures.specId !== 'spec-food-storage-guide-20261121') fail('fixtures specId mismatch');
if (!Array.isArray(fixtures.cases) || fixtures.cases.length !== 15) fail('fixtures must hold 15 cases');
const coreCases = fixtures.cases.filter((c) => c.kind === 'core').length;
const controllerCases = fixtures.cases.filter((c) => c.kind === 'controller').length;
if (coreCases !== 12 || controllerCases !== 3) fail(`fixtures split must be 12 core + 3 controller, got ${coreCases} + ${controllerCases}`);

if (failures.length > 0) {
  console.error(`check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('check: all static checks passed');
