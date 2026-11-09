import { access, copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { assets, inspectSource, inspectTree, root } from './files.mjs';

await inspectSource();
try { await access(join(root, 'dist')); await inspectTree('dist'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
await rm(join(root, 'dist'), { recursive: true, force: true });
for (const asset of assets) {
  const destination = join(root, 'dist', asset);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, 'public', asset), destination);
}
await inspectTree('dist');
for (const asset of assets) if (!(await readFile(join(root, 'public', asset))).equals(await readFile(join(root, 'dist', asset)))) throw new Error('Stale preview output');
console.log(`Built noindex preview: ${assets.length} allowlisted assets.`);
