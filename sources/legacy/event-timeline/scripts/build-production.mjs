import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { root, inspectTree } from './files.mjs';
import { productionAssets, renderProductionAssets, checkProduction } from './production.mjs';

const outputs = await renderProductionAssets();
try { await access(join(root, 'dist-production')); await inspectTree('dist-production', productionAssets); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await rm(join(root, 'dist-production'), { recursive: true, force: true });
for (const [path, bytes] of outputs) {
  const destination = join(root, 'dist-production', path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
await checkProduction();
console.log(`Built ${productionAssets.length} production assets; all 12 M1 public hashes preserved.`);
