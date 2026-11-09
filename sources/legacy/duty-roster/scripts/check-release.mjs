import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import { check, root, walkSafe } from './check.mjs';
import { checkProduction } from './check-production.mjs';
import { M1_FROZEN } from './m1-frozen.mjs';
await check(); await checkProduction();
assert.deepEqual(await walkSafe(path.join(root, 'dist')), M1_FROZEN.map(row => row.path.slice(7)).sort());
for (const row of M1_FROZEN) {
  const bytes = await readFile(path.join(root, 'dist', row.path.slice(7)));
  assert.equal(bytes.length, row.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256, `M1 preview drift: ${row.path}`);
}
process.stdout.write('PASS: release source allowlist, config, frozen M1 and fixed artifacts (offline)\n');
