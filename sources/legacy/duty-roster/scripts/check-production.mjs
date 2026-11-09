import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { root, walkSafe } from './check.mjs';
import { ASSET_FILES, PRODUCTION_FILES, EXPECTED_CONFIG, makeProduction, productionResponse, robotsAllows } from './model.mjs';
import { M1_FROZEN } from './m1-frozen.mjs';
export async function checkProduction() {
  const config = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  assert.deepEqual(config, EXPECTED_CONFIG);
  const source = new Map();
  for (const row of M1_FROZEN) {
    const bytes = await readFile(path.join(root, row.path));
    assert.equal(bytes.length, row.bytes); assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, `M1 drift: ${row.path}`);
    source.set(row.path.slice(7), bytes);
  }
  assert.deepEqual([...source.keys()].sort(), ASSET_FILES);
  const expected = makeProduction(source); const actual = new Map();
  assert.deepEqual(await walkSafe(path.join(root, 'dist-production')), PRODUCTION_FILES);
  for (const [name, bytes] of expected) {
    const current = await readFile(path.join(root, 'dist-production', name)); assert.equal(current.equals(bytes), true, `Production drift: ${name}`); actual.set(name, current);
  }
  for (const route of ['/index.html', '/en/index.html']) {
    const response = productionResponse(actual, route); assert.equal(response.status, 200); assert.equal(response.headers['x-robots-tag'], 'index,follow'); assert.equal(response.headers['content-security-policy'].includes('noindex'), false);
  }
  const robots = actual.get('robots.txt').toString('utf8');
  for (const name of ASSET_FILES) assert.equal(robotsAllows(robots, `/${name}`), true, `robots blocks ${name}`);
  assert.equal(robotsAllows(robots, '/404.html'), false);
  return actual;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkProduction(); process.stdout.write('PASS: fixed config, frozen M1 assets, exact production bytes, headers and robots\n');
}
