import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('T00: zero-dependency Node24 ESM scaffold', async () => {
  const config = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
  assert.equal(config.private, true);
  assert.equal(config.engines.node, '>=24');
  assert.equal(config.dependencies, undefined);
  assert.equal(config.devDependencies, undefined);
});
