// Static checks for the Taiwan Income Tax Calculator tool directory:
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
  [zh, '<title>綜合所得稅試算｜Gloss Tools</title>', 'zh title'],
  [zh, '<h1>綜合所得稅試算</h1>', 'zh h1'],
  [zh, '本工具僅就薪資所得一種來源試算，非完整申報計算。', 'zh disclaimer'],
  [en, '<html lang="en">', 'en lang'],
  [en, '<title>Taiwan Income Tax Calculator | Gloss Tools</title>', 'en title'],
  [en, '<h1>Taiwan Income Tax Calculator</h1>', 'en h1'],
  [en, 'This tool estimates tax on salary income only and is not a full tax return.', 'en disclaimer'],
];
for (const [html, needle, label] of EXPECTED) {
  if (!html.includes(needle)) fail(`missing pinned string (${label}): ${needle}`);
}
for (const [html, label] of [[zh, 'zh'], [en, 'en']]) {
  if (!html.includes('<!--META-->')) fail(`${label} page is missing the <!--META--> placeholder`);
  if (html.includes('rel="canonical"')) fail(`${label} page must not carry a canonical in the candidate source`);
}

// --- vendored fixtures --------------------------------------------------------
const fixtures = JSON.parse(await readFile(path.join(root, 'test/fixtures.json'), 'utf8'));
if (fixtures.slug !== 'taiwan-income-tax-calculator') fail('fixtures slug mismatch');
if (fixtures.specId !== 'spec-taiwan-income-tax-calculator-20261109') fail('fixtures specId mismatch');
if (!Array.isArray(fixtures.cases) || fixtures.cases.length !== 15) fail('fixtures must hold 15 cases');
const coreCases = fixtures.cases.filter((c) => c.kind === 'core').length;
const controllerCases = fixtures.cases.filter((c) => c.kind === 'controller').length;
if (coreCases !== 12 || controllerCases !== 3) fail(`fixtures split must be 12 core + 3 controller, got ${coreCases} + ${controllerCases}`);

if (failures.length > 0) {
  console.error(`check: ${failures.length} failure(s)`);
  process.exit(1);
}
console.log('check: all static checks passed');
