import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, ASSETS } from './lib/files.mjs';
import { validatePublic } from './lib/validate.mjs';

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
if (pkg.private !== true || pkg.type !== 'module' || pkg.dependencies || pkg.devDependencies) throw new Error('Package contract failed');
if (Number(process.versions.node.split('.')[0]) < 24 || pkg.engines?.node !== '>=24') throw new Error('Node 24 or newer required');
const code = ASSETS.filter(file => /\.(?:js|mjs)$/.test(file)).map(file => `public/${file}`);
async function collect(relative) {
  for (const entry of await readdir(path.join(ROOT, relative), { withFileTypes: true })) {
    const file = `${relative}/${entry.name}`;
    const stat = await lstat(path.join(ROOT,file));
    if (stat.isSymbolicLink()) throw new Error('Linked development file');
    if (stat.isDirectory()) await collect(file);
    else if (!stat.isFile() || stat.nlink !== 1) throw new Error('Linked or nonregular development file');
    else if (/\.(?:js|mjs)$/.test(file)) code.push(file);
  }
}
await collect('scripts'); await collect('test');
for (const file of code) {
  if (spawnSync(process.execPath, ['--check', path.join(ROOT, file)], { stdio: 'inherit', windowsHide: true }).status !== 0) throw new Error('Syntax check failed');
}
const list = await validatePublic(path.join(ROOT, 'public'));
process.stdout.write(`PASS static checks: ${list.length} closed preview assets; ${code.length} syntax checks\n`);
