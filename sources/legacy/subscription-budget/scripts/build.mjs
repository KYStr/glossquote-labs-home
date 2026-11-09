import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, ASSETS, inside, inspectTree, validateSource, validateBuild } from './validation.mjs';

await validateSource();
const output = path.join(ROOT, 'dist');
await inspectTree(output, { optional: true });
await mkdir(output, { recursive: true });
for (const file of ASSETS) {
  const target = inside(output, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, await readFile(inside(path.join(ROOT, 'public'), file)));
}
await validateBuild();
process.stdout.write(`PASS built ${ASSETS.length} reviewed preview assets to dist/ (noindex,nofollow)\n`);
