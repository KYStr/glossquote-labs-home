import { ROOT, isMain, verifyDist } from './files.mjs';
import { checkPreview } from './check.mjs';
import { checkProduction } from './check-production.mjs';
import { checkSourceTree } from './source-policy.mjs';
export async function checkRelease(root = ROOT, options = {}) {
  await checkPreview(root); await verifyDist(root); const production = await checkProduction(root);
  const source = await checkSourceTree(root, options);
  return { source, production };
}
if (isMain(import.meta.url)) {
  try { const result = await checkRelease(); process.stdout.write(`PASS release source allowlist: ${result.source.length} regular files; preview 9 + production ${result.production.length}; no publication or deployment performed\n`); }
  catch (error) { process.stderr.write(`FAIL ${error.message}\n`); process.exitCode = 1; }
}
