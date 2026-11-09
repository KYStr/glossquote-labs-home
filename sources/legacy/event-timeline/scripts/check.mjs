import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assets, inspectSource, inspectTree, root, scriptFiles } from './files.mjs';

await inspectSource();
await inspectTree('scripts', scriptFiles);
await inspectTree('test', ['helpers.mjs', 'validation.test.mjs', 'schedule.test.mjs', 'report.test.mjs', 'app-harness.mjs', 'app.test.mjs', 'toolchain.test.mjs', 'production.test.mjs']);
const packageInfo = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
if (packageInfo.type !== 'module' || packageInfo.private !== true || packageInfo.engines.node !== '>=24' || packageInfo.dependencies || packageInfo.devDependencies) throw new Error('Package policy mismatch');
const scripts = (await readdir(join(root, 'scripts'))).filter(path => path.endsWith('.mjs')).map(path => `scripts/${path}`);
const tests = (await readdir(join(root, 'test'))).filter(path => path.endsWith('.mjs')).map(path => `test/${path}`);
for (const path of [...scripts, ...tests, ...assets.filter(path => path.endsWith('.js')).map(path => `public/${path}`)]) {
  const result = spawnSync(process.execPath, ['--check', join(root, path)], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Syntax check failed: ${path}`);
}
console.log(`PASS: ${assets.length} preview assets, closed metadata/header policy, local resources and ESM syntax (bounded static checks).`);
