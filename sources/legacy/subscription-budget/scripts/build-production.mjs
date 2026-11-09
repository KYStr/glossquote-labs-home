import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, inside, inspectTree } from './validation.mjs';
import { PRODUCTION_ASSETS, renderProduction, validateProduction } from './production.mjs';

const files = await renderProduction();
const output = path.join(ROOT, 'dist-production');
await inspectTree(output, { optional: true, allowed: PRODUCTION_ASSETS });
await mkdir(output, { recursive: true });
for (const file of PRODUCTION_ASSETS) {
  const target = inside(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, files.get(file));
}
await validateProduction();
process.stdout.write(`PASS built ${files.size} production assets (separate from noindex preview)\n`);
