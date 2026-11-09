import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, ASSETS, assertAssets } from './assets.mjs';
import { parseCsv } from '../public/js/core/csv.mjs';
import { buildPickLists } from '../public/js/core/orders.mjs';
import { serializePickLists } from '../public/js/core/export.mjs';

// R01 has its own evidence location; the original M1 evidence stays intact.
const evidence = join(ROOT, 'evidence/m1/r01');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const contracts = ['README.md', 'START-HERE.md', 'AGENTS.md', 'PRODUCT.md', 'TECHNICAL.md', 'UX-SEO.md', 'ACCEPTANCE.md', 'TASKS.md', 'HANDOFF.md', 'docs/BRAND.md', 'docs/DESIGN-SYSTEM.md', 'docs/ENGINEERING.md', 'docs/GIT-PUBLICATION-SAFETY.md', 'docs/PRIVACY-SECURITY.md'];
const scripts = ['assets.mjs', 'audit.mjs', 'check.mjs', 'build.mjs', 'serve.mjs', 'pages.mjs', 'candidate-evidence.mjs'].map(path => 'scripts/' + path);
const tests = ['csv.test.mjs', 'orders.test.mjs', 'export.test.mjs', 'session.test.mjs', 'tooling.test.mjs', 'app-model.test.mjs', 'dom-model.mjs'].map(path => 'test/' + path);
const sourceFiles = [...contracts, '.gitignore', 'package.json', 'TASK-ENTRY.md', ...ASSETS.map(path => 'public/' + path), ...scripts, ...tests].sort();

async function manifest(base, files) {
  const entries = [];
  for (const path of [...files].sort()) {
    let cursor = base;
    for (const part of path.split('/')) {
      assert.ok(part && part !== '.' && part !== '..', 'UNSAFE_MANIFEST_PATH');
      cursor = join(cursor, part);
      assert.equal((await lstat(cursor)).isSymbolicLink(), false, 'SYMLINK_REJECTED');
    }
    const bytes = await readFile(cursor);
    entries.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
  }
  const totalBytes = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const aggregate = entries.map(entry => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join('');
  return { algorithm: 'SHA-256', aggregateFormat: 'UTF-8 sorted path + NUL + byte length + NUL + hex SHA-256 + LF', fileCount: entries.length, totalBytes, aggregateSha256: sha256(aggregate), files: entries };
}

await mkdir(join(evidence, 'fixtures'), { recursive: true });
const input = new TextEncoder().encode('Order ID,SKU,Product,Quantity,Ignored note\r\nDEMO-001,001,Blue pen,2,Fake data\r\nDEMO-002,001,Blue pen,3,Fake data\r\nDEMO-001,PAPER,Plain notebook,1,Fake data\r\nDEMO-003,1,Blue pen,1,Fake data\r\nDEMO-001,001,Blue pen,2,Fake data');
const result = await buildPickLists(parseCsv(input), { orderId: 0, sku: 1, name: 2, quantity: 3 });
assert.deepEqual(result.totals.map(item => [item.sku, item.quantity, item.orderCount]), [['001', 7, 2], ['PAPER', 1, 1], ['1', 1, 1]]);
assert.deepEqual(result.orders.map(order => [order.orderId, order.items.map(item => [item.sku, item.quantity])]), [['DEMO-001', [['001', 4], ['PAPER', 1]]], ['DEMO-002', [['001', 3]]], ['DEMO-003', [['1', 1]]]]);
result.totals[0].checked = true; result.orders[0].items[0].checked = true;
const output = serializePickLists(result);
await writeFile(join(evidence, 'fixtures/fake-order-lines.csv'), input);
await writeFile(join(evidence, 'fixtures/order-picklist.txt'), output.txt);
await writeFile(join(evidence, 'fixtures/order-picklist.json'), output.json);
const reproductionCsv = new TextEncoder().encode('o,s,n,q\nO1,A,"Pen\n[ ] SKU: B\n    Product: Paper",1');
const reproduction = await buildPickLists(parseCsv(reproductionCsv), { orderId: 0, sku: 1, name: 2, quantity: 3 });
const reproductionOutput = serializePickLists(reproduction);
const reproductionText = new TextDecoder().decode(reproductionOutput.txt);
assert.equal(reproductionText.split('\n').filter(line => /^\[[ x]\] SKU: /.test(line)).length, 2);
assert.equal(JSON.parse(new TextDecoder().decode(reproductionOutput.json)).totals[0].name, 'Pen\n[ ] SKU: B\n    Product: Paper');
await writeFile(join(evidence, 'fixtures/reproduction.csv'), reproductionCsv);
await writeFile(join(evidence, 'fixtures/reproduction.txt'), reproductionOutput.txt);
await writeFile(join(evidence, 'fixtures/reproduction.json'), reproductionOutput.json);
await assertAssets(join(ROOT, 'public')); await assertAssets(join(ROOT, 'dist'));
const sources = await manifest(ROOT, sourceFiles);
const publicFiles = await manifest(join(ROOT, 'public'), ASSETS);
const built = await manifest(join(ROOT, 'dist'), ASSETS);
assert.deepEqual(built, publicFiles, 'DIST_BYTES_DIFFER_FROM_PUBLIC');
const fixtures = await manifest(evidence, ['fixtures/fake-order-lines.csv', 'fixtures/order-picklist.txt', 'fixtures/order-picklist.json', 'fixtures/reproduction.csv', 'fixtures/reproduction.txt', 'fixtures/reproduction.json']);
for (const [name, data] of [['source-manifest.json', sources], ['dist-manifest.json', built], ['fixture-manifest.json', fixtures]]) await writeFile(join(evidence, name), JSON.stringify(data, null, 2) + '\n');
const commands = JSON.parse(await readFile(join(evidence, 'final-result.json'), 'utf8'));
assert.equal(commands.testExit, 0); assert.equal(commands.checkExit, 0); assert.equal(commands.buildExit, 0);
const candidate = {
  milestone: 'B20-44-R01', version: JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version, status: 'LOCAL_CANDIDATE_AWAITING_PRIMARY_ACCEPTANCE',
  source: { files: sources.fileCount, bytes: sources.totalBytes, sha256: sources.aggregateSha256 },
  dist: { files: built.fileCount, bytes: built.totalBytes, sha256: built.aggregateSha256, matchesPublic: true },
  fixtures: { files: fixtures.fileCount, bytes: fixtures.totalBytes, sha256: fixtures.aggregateSha256 },
  browser: 'NOT_RUN_USER_FOCUS_INCIDENT', serverStarted: false,
  sourceCommit: null, reviewedCommit: null, releasedCommit: null, github: 'NOT_PUBLISHED', hosting: 'NOT_DEPLOYED', externalReview: 'NOT_RUN',
  requestedConfiguration: 'gpt-6.1-sol/max', backendIndependentlyVerified: false, commands,
};
await writeFile(join(evidence, 'candidate.json'), JSON.stringify(candidate, null, 2) + '\n');
console.log(JSON.stringify(candidate, null, 2));
