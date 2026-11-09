import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { check, root, walkSafe } from './check.mjs';
import { ASSET_FILES, PRODUCTION_FILES, makeProduction } from './model.mjs';
await check();
const source = new Map(); for (const name of ASSET_FILES) source.set(name, await readFile(path.join(root, 'public', name)));
const files = makeProduction(source);
const output = path.join(root, 'dist-production');
await mkdir(output, { recursive: true });
if ((await walkSafe(output)).some(name => !PRODUCTION_FILES.includes(name))) throw Error('Unexpected production output');
for (const [name, bytes] of files) { await mkdir(path.dirname(path.join(output, name)), { recursive: true }); await writeFile(path.join(output, name), bytes); }
for (const [name, bytes] of files) if (!(await readFile(path.join(output, name))).equals(bytes)) throw Error('Stale production output');
process.stdout.write(`PASS: ${files.size} production files; M1 preview untouched\n`);
