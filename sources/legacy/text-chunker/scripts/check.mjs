import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateProject } from './validation.mjs';
import { checkProduction } from './release.mjs';

if (Number(process.versions.node.split('.')[0]) < 24) throw new Error('NODE_24_REQUIRED');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--production')) throw new Error('UNKNOWN_CHECK_ARGUMENT');
  console.log(JSON.stringify(await (args.length ? checkProduction(root) : validateProject(root)), null, 2));
} catch (error) {
  console.error(`CHECK_FAILED: ${error.code ?? error.message}`);
  process.exitCode = 1;
}
