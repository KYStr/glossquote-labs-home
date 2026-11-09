import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PROJECT_ROOT, validatePublic, verifyPath } from './validation.mjs';
import { checkProduction } from './production-check.mjs';
import { SOURCE_FILES } from './source-package.mjs';
export async function checkRelease(root = PROJECT_ROOT) {
  await validatePublic(root); const production = await checkProduction(root);
  assert.equal(new Set(SOURCE_FILES.map(path => path.toLowerCase())).size, SOURCE_FILES.length);
  for (const path of SOURCE_FILES) {
    assert.equal(/(^|\/)(?:\.git|\.runs|\.env(?:\.|$)|node_modules|dist(?:-production)?|\.wrangler|DISPATCH\.json|project\.json|HANDOFF\.md|TASK-ENTRY\.md)(?:\/|$)/.test(path), false);
    await verifyPath(root, join(root, path));
    const source = await readFile(join(root, path), 'utf8');
    assert.equal(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{20,}/.test(source), false);
    if (path.endsWith('.mjs')) assert.equal(spawnSync(process.execPath, ['--check', join(root, path)], { timeout: 10000 }).status, 0, path);
  }
  return { status: 'PASS_RELEASE_CHECK', sourceFileCount: SOURCE_FILES.length, productionDigest: production.digest,
    scanLimit: 'Allowlist and pattern scans supplement review, not complete secret or Network/Storage proof', hosting: 'NOT_RUN' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await checkRelease(), null, 2));
