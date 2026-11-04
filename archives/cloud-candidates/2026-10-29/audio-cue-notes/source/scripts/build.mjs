// 只複製已審核的公開白名單，不產生 production 或部署設定。
import { copyFile, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { assets, inspectSource, inspectTree, root } from './files.mjs';
await inspectSource();
try { await inspectTree('dist'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
await rm(join(root, 'dist'), { recursive: true, force: true });
for (const asset of assets) {
  const target = join(root, 'dist', asset);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(root, 'public', asset), target);
}
await inspectTree('dist');
for (const asset of assets) if (!(await readFile(join(root, 'public', asset))).equals(await readFile(join(root, 'dist', asset)))) throw new Error('Preview byte mismatch');
console.log(`Built ${assets.length} noindex preview assets.`);
