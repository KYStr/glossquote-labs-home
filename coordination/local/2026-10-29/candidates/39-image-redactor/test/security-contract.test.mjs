import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSource } from '../scripts/check.mjs';
test('P01 source scan: closed assets, syntax, same-origin resources, CSP and prohibited APIs', async () => {
  assert.equal(await checkSource(), 12);
});
