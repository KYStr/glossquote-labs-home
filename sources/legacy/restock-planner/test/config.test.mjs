import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../scripts/lib/files.mjs';
import { buildProduction } from '../scripts/lib/production.mjs';
import { fixture, cleanupFixture, ownedPath } from '../scripts/test-support/fixture.mjs';

const expected = {
  name: 'glossquote-restock-planner',
  compatibility_date: '2026-10-19',
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
  routes: [{ pattern: 'restock.glossquote.com', custom_domain: true }],
  workers_dev: false,
  preview_urls: false,
  send_metrics: false,
  observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } },
};
test('R1 exact static Wrangler contract has no runtime, build, binding, paid resource or telemetry fields', async () => {
  const configPath=path.join(ROOT,'wrangler.jsonc'),stat=await lstat(configPath);
  assert.equal(stat.isFile(),true);assert.equal(stat.isSymbolicLink(),false);assert.equal(stat.nlink,1);
  const config=JSON.parse(await readFile(configPath,'utf8'));
  assert.deepEqual(config,expected);
  assert.equal(path.resolve(ROOT,config.assets.directory),path.join(ROOT,'dist-production'));
});
test('R1 config is outside the production asset set containing the local favicon', async () => {
  const root=await fixture();
  try {
    const production=await buildProduction(root);
    assert.equal(production.files.length,15);
    assert.equal(production.files.some(file=>file.path==='wrangler.jsonc'),false);
    assert.ok(production.files.some(file=>file.path==='_headers'));
    assert.equal(path.resolve(root,expected.assets.directory),ownedPath(root,'dist-production'));
  } finally { await cleanupFixture(root); }
});
