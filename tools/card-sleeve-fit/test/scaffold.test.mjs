// Scaffold checks: the tool's own files exist, name the fixed spec source
// and registry task, and carry the required handoff/verification records.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFile(join(root, rel), 'utf8');

test('package.json names the tool and the Node 24 ESM contract', async () => {
  const pkg = JSON.parse(await read('package.json'));
  assert.equal(pkg.name, 'glossquote-card-sleeve-fit');
  assert.equal(pkg.type, 'module');
  assert.match(pkg.engines.node, /24/);
  assert.equal(pkg.dependencies, undefined);
  for (const script of ['test', 'check', 'build:preview', 'check:generated:preview', 'serve']) {
    assert.ok(pkg.scripts[script], `missing script ${script}`);
  }
});

test('HANDOFF.md records the fixed spec source and the registry task/claim', async () => {
  const handoff = await read('HANDOFF.md');
  assert.match(handoff, /spec-card-sleeve-fit-20261109/);
  assert.match(handoff, /labs-prod-card-sleeve-fit-20261109/);
  assert.match(handoff, /muse-main-claim-card-sleeve-fit-20261109T081158Z-w4/);
  assert.match(handoff, /tools\/card-sleeve-fit/);
});

test('VERIFICATION.md records results and an explicit NOT_RUN list', async () => {
  const verification = await read('VERIFICATION.md');
  assert.match(verification, /NOT_RUN/);
  assert.match(verification, /npm test/);
  assert.match(verification, /byte-identical/);
});

test('preview robots.txt blocks crawling', async () => {
  const robots = await read('public/robots.txt');
  assert.match(robots, /Disallow: \//);
});

test('both pages carry the SPEC-pinned titles and descriptions', async () => {
  const zh = await read('public/index.html');
  const en = await read('public/en/index.html');
  assert.match(zh, /桌遊牌套庫存分配｜Gloss Tools/);
  assert.match(zh, /用卡片外尺寸、牌套內尺寸和庫存，算出可套張數與缺口。/);
  assert.match(en, /Card Sleeve Stock Fit \| Gloss Tools/);
  assert.match(en, /Match measured card sizes to existing sleeve stock and find the maximum coverage\./);
});

test('app.js wires the worker, the flow machine and textContent-only DOM', async () => {
  const app = await read('public/js/app.js');
  assert.match(app, /new Worker\(/);
  assert.match(app, /createFlow/);
  assert.match(app, /pageshow/);
  assert.doesNotMatch(app, /innerHTML/);
});
