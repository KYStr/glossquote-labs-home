// Node 內建語法檢查與來源安全檢查，不需要下載 lint 套件。
import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inspectSource, root } from './files.mjs';
await inspectSource();
for (const directory of ['public', 'scripts', 'test']) {
  for (const name of await readdir(join(root, directory))) {
    if (name.endsWith('.mjs')) execFileSync(process.execPath, ['--check', join(root, directory, name)]);
  }
}
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (pkg.dependencies || pkg.devDependencies) throw new Error('Dependencies are not allowed');
console.log('Syntax, allowlist, preview and runtime safety checks passed.');
