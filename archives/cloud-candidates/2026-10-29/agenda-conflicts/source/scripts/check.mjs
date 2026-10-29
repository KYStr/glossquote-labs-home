// 靜態掃描只是機械 gate，不等同瀏覽器或網路驗收。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { validateProject } from './semantics.mjs';
import { readRegular, snapshotProject } from './files.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
assert.ok(Number(process.versions.node.split('.')[0]) >= 24);
assert.equal(process.argv.length, 2);
const snapshot = snapshotProject(root);
validateProject(snapshot);
const assets = snapshot.assets;
for (const path of ['scripts/files.mjs', 'scripts/build.mjs', 'scripts/check.mjs', 'scripts/semantics.mjs']) {
  readRegular(join(root, path));
  assert.equal(spawnSync(process.execPath, ['--check', join(root, path)]).status, 0);
}
console.log(`Static checks passed: ${assets.size} allowlisted noindex assets; no browser certification.`);
