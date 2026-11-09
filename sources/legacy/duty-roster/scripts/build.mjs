import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { check, root, walkSafe } from './check.mjs';

const files = await check({ verifyDist: false });
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
const previous = await walkSafe(output);
if (previous.some(n => !files.includes(n))) throw Error('Stale or unexpected build file');
for (const name of files) {
  await mkdir(path.dirname(path.join(output, name)), { recursive: true });
  await writeFile(path.join(output, name), await readFile(path.join(root, 'public', name)));
}
if (JSON.stringify(await walkSafe(output)) !== JSON.stringify(files)) throw Error('Incomplete build');
for (const name of files) {
  if (!(await readFile(path.join(output, name))).equals(await readFile(path.join(root, 'public', name)))) throw Error('Stale build content');
}
process.stdout.write(`PASS: deterministic preview build, ${files.length} files, noindex,nofollow\n`);
