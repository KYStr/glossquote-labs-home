import { join } from 'node:path';
import { ROOT, checkedTree, sha256, isMain } from './files.mjs';
import { assertProductionInputs, expectedProduction, PRODUCTION_FILES, JSON_LD_HASHES } from './production.mjs';
export async function checkProduction(root = ROOT) {
  await assertProductionInputs(root);
  const manifest = await checkedTree(join(root, 'dist-production'), PRODUCTION_FILES);
  const expected = await expectedProduction(root);
  for (const file of manifest) {
    const bytes = expected.get(file.path);
    if (file.bytes !== bytes.length || file.sha256 !== sha256(bytes)) throw new Error('PRODUCTION_STALE_OR_TAMPERED');
  }
  return manifest;
}
if (isMain(import.meta.url)) {
  try { const manifest = await checkProduction(); process.stdout.write(`PASS production checks: ${manifest.length} fixed assets; closed config, metadata, exact CSP JSON-LD hashes ${JSON_LD_HASHES.join(' ')}\n`); }
  catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}
